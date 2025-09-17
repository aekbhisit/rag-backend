import { Router } from 'express';
import type { Pool } from 'pg';
import { getPostgresPool } from '../../adapters/db/postgresClient';
import { promptService } from '../../services/promptService';
import { AgentMasterService } from '../../services/agentMasterService';

// Import skill handler functions
import { 
  executeWebSearchHandler,
  executeHttpRequestHandler,
  executeRagSearchHandler,
  executeTextSummarizeHandler,
  executeTimeNowHandler,
  executeRagPlaceHandler,
  executeRagContextsHandler,
  executeDataParseCSVHandler,
  executeDataParseJSONHandler,
  executeWebBrowseHandler,
  executeWebCrawlHandler
} from './toolTest';

export function buildAgentsTestAdminRouter(pool: Pool) {
  const router = Router();
  const pg = pool || getPostgresPool();
  const masterService = new AgentMasterService(pg);

  // List Agents Test conversations (scoped by tenant/user)
  router.get('/agents-test/conversations', async (req, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string | undefined;
      const userId = req.headers['x-user-id'] as string | undefined;
      if (!tenantId || !userId) return res.status(400).json({ error: 'Tenant ID and User ID required' });

      const q = await pg.query(
        `SELECT id, tenant_id, session_id, user_id, title, status, metadata, agent_key, created_at, updated_at
         FROM agent_master_conversations
         WHERE tenant_id = $1 AND user_id = $2
           AND (
             (metadata ->> 'source') = 'agents-test'
             OR title LIKE 'Test: %'
           )
         ORDER BY updated_at DESC`,
        [tenantId, userId]
      );
      return res.json(q.rows);
    } catch (e) {
      return res.status(500).json({ error: (e as Error).message });
    }
  });

  // Create Agents Test conversation
  router.post('/agents-test/conversations', async (req, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string | undefined;
      const userId = req.headers['x-user-id'] as string | undefined;
      const { title, sessionId, agentKey } = req.body || {};
      if (!tenantId || !userId) return res.status(400).json({ error: 'Tenant ID and User ID required' });
      if (!title || !agentKey) return res.status(400).json({ error: 'title and agentKey required' });

      const conversationId = await masterService.createConversation(tenantId, userId, title, sessionId, agentKey);
      // Tag metadata without touching title/status
      await pg.query(
        `UPDATE agent_master_conversations
         SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"source":"agents-test"}'::jsonb,
             updated_at = now()
         WHERE id = $1`,
        [conversationId]
      );
      return res.json({ conversationId });
    } catch (e) {
      return res.status(500).json({ error: (e as Error).message });
    }
  });

  // Delete Agents Test conversation
  router.delete('/agents-test/conversations/:conversationId', async (req, res) => {
    try {
      const { conversationId } = req.params;
      await masterService.deleteConversation(conversationId);
      return res.json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: (e as Error).message });
    }
  });

  // Validate agent tool function parameters schemas for OpenAI compatibility
  router.get('/agents-test/tools/validate', async (req, res) => {
    try {
      const agentKey = (req.query.agentKey as string) || undefined;
      const q: any[] = [];
      let sql = `SELECT id, agent_key, tool_key, function_name, function_parameters FROM agent_tools`;
      if (agentKey) { sql += ` WHERE agent_key = $1`; q.push(agentKey); }
      sql += ` ORDER BY agent_key, id`;
      const { rows } = await pg.query(sql, q);

      const allowedTypes = new Set(['string','number','boolean','object','array']);

      function validateParams(params: any): string[] {
        const errors: string[] = [];
        const p = typeof params === 'string' ? (() => { try { return JSON.parse(params); } catch { return null; } })() : params;
        if (!p) { errors.push('parameters not valid JSON'); return errors; }
        if (p.type !== 'object') errors.push("root.type must be 'object'");
        if (p.required && !Array.isArray(p.required)) errors.push('root.required must be an array');
        const props = p.properties;
        if (!props || typeof props !== 'object') {
          errors.push('root.properties missing or not object');
          return errors;
        }
        const required: string[] = Array.isArray(p.required) ? p.required : [];
        for (const r of required) {
          if (!(r in props)) errors.push(`required key '${r}' missing in properties`);
        }
        for (const [k, v] of Object.entries<any>(props)) {
          const t = v?.type;
          if (!allowedTypes.has(t)) errors.push(`property '${k}' has invalid type '${t}'`);
          if (t === 'array') {
            const items = v.items;
            if (!items || typeof items !== 'object') errors.push(`property '${k}' array missing items`);
            else if (!allowedTypes.has(items.type)) errors.push(`property '${k}' items.type invalid '${items.type}'`);
          }
          if (t === 'object' && v.required) {
            if (!Array.isArray(v.required)) errors.push(`property '${k}' required must be array`);
            const subProps = v.properties;
            if (!subProps || typeof subProps !== 'object') errors.push(`property '${k}' object missing properties`);
            else for (const rr of v.required as any[]) if (!(rr in subProps)) errors.push(`property '${k}' required key '${rr}' missing in properties`);
          }
          if (v.enum) {
            if (!Array.isArray(v.enum) || v.enum.length === 0) errors.push(`property '${k}' enum must be non-empty array`);
          }
        }
        return errors;
      }

      const items = rows.map((r: any) => {
        const errs = validateParams(r.function_parameters);
        return { id: r.id, agent_key: r.agent_key, tool_key: r.tool_key, function_name: r.function_name, errors: errs };
      }).filter((x: any) => x.errors.length > 0);

      return res.json({ total: rows.length, invalidCount: items.length, items });
    } catch (e) {
      return res.status(500).json({ error: (e as Error).message });
    }
  });

  router.post('/agents-test/chat', async (req, res) => {
    try {
      const tenantId = (req.headers['x-tenant-id'] as string) || null;
      const { message, agentKey } = req.body || {};
      if (!message || !agentKey) {
        return res.status(400).json({ error: 'agentKey and message required' });
      }

      // Resolve AI config via existing service
      const aiConfig = await masterService.getTenantAiConfig(tenantId as string);

      // Load prompts
      const sysPromptRec = await promptService.getInitialSystemPrompt(agentKey, { tenantId });
      const basePromptRec = !sysPromptRec ? await promptService.getBasePrompt(agentKey, { tenantId }) : null;
      const guidance = `\n\nTOOLS USAGE GUIDELINES:\n- For crawl: pass the target URL in 'url' (or provide any field containing a full https URL).\n- For search: pass the search text in 'query'. Optionally include keywords like brand or site (e.g., 'site:example.com').\n- Prefer Thai or English to match the user's language.\n- When a user asks for packages/options/pricing for a brand, construct a focused search query (e.g., 'ShopUp packages pricing site:shopup.com').\n- After a tool returns data, extract concise answers (e.g., phone numbers) and respond clearly.`;
      const systemPrompt = (sysPromptRec?.content || basePromptRec?.content || `You are the agent "${agentKey}". Answer helpfully and execute tools when appropriate.`) + guidance;

      // Helper: sanitize OpenAI function parameters schema
      function sanitizeParameters(params: any): any {
        let p = params;
        if (typeof p === 'string') {
          try { p = JSON.parse(p); } catch { p = {}; }
        }
        if (!p || typeof p !== 'object') p = {};
        if (p.type !== 'object') p.type = 'object';
        if (!p.properties || typeof p.properties !== 'object') p.properties = {};
        if (p.required && !Array.isArray(p.required)) p.required = [];

        const allowed = new Set(['string','number','boolean','object','array']);
        const walk = (node: any) => {
          if (!node || typeof node !== 'object') return;
          // Ensure type valid
          if (node.type && !allowed.has(node.type)) node.type = 'string';
          // Fix arrays
          if (node.type === 'array') {
            if (!node.items || typeof node.items !== 'object') node.items = { type: 'string' };
            if (!node.items.type || !allowed.has(node.items.type)) node.items.type = 'string';
          }
          // Fix objects
          if (node.type === 'object') {
            if (!node.properties || typeof node.properties !== 'object') node.properties = {};
            if (node.required && !Array.isArray(node.required)) node.required = [];
            for (const [k, v] of Object.entries(node.properties)) {
              if (!v || typeof v !== 'object') {
                (node.properties as any)[k] = { type: 'string', description: 'auto-fixed' };
                continue;
              }
              if (!v.type || !allowed.has((v as any).type)) (v as any).type = 'string';
              if ((v as any).type === 'array') {
                if (!(v as any).items || typeof (v as any).items !== 'object') (v as any).items = { type: 'string' };
                if (!(v as any).items.type || !allowed.has((v as any).items.type)) (v as any).items.type = 'string';
              }
              if ((v as any).type === 'object') {
                if (!(v as any).properties || typeof (v as any).properties !== 'object') (v as any).properties = {};
                if ((v as any).required && !Array.isArray((v as any).required)) (v as any).required = [];
                walk(v);
              }
            }
          }
        };

        walk(p);
        return p;
      }

      // Load tools for this agent
      const toolsQuery = await pg.query(
        `SELECT function_name, function_description, function_parameters, parameter_mapping, tool_key
         FROM agent_tools
         WHERE agent_key = $1 AND (enabled IS NULL OR enabled = true)
         ORDER BY position ASC`,
        [agentKey]
      );
      const toolRows = toolsQuery.rows || [];
      const tools = toolRows
        .filter(r => r.function_name && r.function_parameters)
        .map((r: any) => ({
          type: 'function',
          function: {
            name: String(r.function_name),
            description: r.function_description || undefined,
            parameters: sanitizeParameters(r.function_parameters)
          }
        }));

      // Helper: execute a subset of tools (crawl, http_get) for demo/testing
      const fnLookup = new Map<string, any>();
      for (const r of toolRows) {
        fnLookup.set(String(r.function_name), r);
      }

      async function executeAgentTool(fnName: string, aiArgs: any, userMessage?: string): Promise<any> {
        const rec = fnLookup.get(fnName);
        if (!rec) return { error: `Tool not found for function ${fnName}` };
        // Map AI arg names back to original param names using parameter_mapping
        let args = aiArgs || {};
        if (rec.parameter_mapping) {
          try {
            const mapping = typeof rec.parameter_mapping === 'string' ? JSON.parse(rec.parameter_mapping) : rec.parameter_mapping;
            const realArgs: any = {};
            for (const [aiKey, realKey] of Object.entries(mapping || {})) {
              if (aiKey in args) realArgs[String(realKey)] = (args as any)[aiKey];
            }
            // carry any extras
            for (const [k, v] of Object.entries<any>(args)) if (!(k in (mapping || {}))) realArgs[k] = v;
            args = realArgs;
          } catch {}
        }

        const key = String(rec.tool_key || '').toLowerCase();
        const name = String(fnName).toLowerCase();

        const pickUrl = (obj: any): string | undefined => {
          if (!obj || typeof obj !== 'object') return undefined;
          const direct = obj.url || obj.link || obj.target || obj.href || obj.uri || obj.address || obj.param_1 || obj.param_2;
          if (typeof direct === 'string' && direct.trim()) return direct.trim();
          // Heuristic: first string value that looks like URL
          for (const v of Object.values(obj)) {
            if (typeof v === 'string' && /https?:\/\//i.test(v)) return v.trim();
          }
          return undefined;
        };

        const pickQuery = (obj: any): string | undefined => {
          if (!obj || typeof obj !== 'object') return userMessage?.trim();
          const direct = obj.query || obj.q || obj.keywords || obj.text || obj.search || obj.param_1 || obj.param_2;
          if (typeof direct === 'string' && direct.trim()) return direct.trim();
          // Fallback: first non-empty string value
          for (const v of Object.values(obj)) {
            if (typeof v === 'string' && v.trim()) return v.trim();
          }
          return userMessage?.trim();
        };

        // Use skill handler execution instead of simplified implementations
        try {
          const startTime = Date.now();
          let result;
          
          switch (key) {
            case 'skill.web.search':
              result = await executeWebSearchHandler(args, rec);
              break;
            case 'skill.http.request':
              result = await executeHttpRequestHandler(args, rec);
              break;
            case 'skill.rag.search':
              result = await executeRagSearchHandler(args, rec);
              break;
            case 'skill.text.summarize':
              result = await executeTextSummarizeHandler(args, rec);
              break;
            case 'skill.time.now':
              result = await executeTimeNowHandler(args, rec);
              break;
            case 'skill.rag.place':
              result = await executeRagPlaceHandler(args, rec);
              break;
            case 'skill.rag.contexts':
              result = await executeRagContextsHandler(args, rec);
              break;
            case 'skill.data.parse.csv':
              result = await executeDataParseCSVHandler(args, rec);
              break;
            case 'skill.data.parse.json':
              result = await executeDataParseJSONHandler(args, rec);
              break;
            case 'skill.web.browse':
              result = await executeWebBrowseHandler(args, rec);
              break;
            case 'skill.web.crawl':
              result = await executeWebCrawlHandler(args, rec);
              break;
            default:
              // Fallback to simplified implementations for unknown tools
              if (key.includes('crawl') || name === 'crawl') {
                const url = pickUrl(args);
                if (!url) return { error: 'Missing url' };
                try {
                  const r = await fetch(url, { method: 'GET' });
                  const html = await r.text();
                  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
                  const title = titleMatch ? titleMatch[1].trim() : url;
                  const cleaned = html
                    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
                    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                  const preview = cleaned.slice(0, 1200);
                  return { success: true, title, text_preview: preview, bytes: html.length };
                } catch (e: any) {
                  return { error: e?.message || String(e) };
                }
              }
              
              if (key.includes('search') || name === 'search') {
                const q = pickQuery(args);
                if (!q) return { error: 'Missing query' };
                const site = (args.site as string) || '';
                const finalQ = site ? `${q} site:${site}` : q;
                try {
                  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(finalQ)}`;
                  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 AgentsTestBot' } });
                  const html = await res.text();
                  const items: Array<{ title: string; url: string }>=[];
                  const regex = /<a[^>]+class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
                  let m: RegExpExecArray | null;
                  while ((m = regex.exec(html)) && items.length < 8) {
                    const u = m[1];
                    const t = m[2].replace(/<[^>]+>/g,'').trim();
                    if (u && t) items.push({ title: t, url: u });
                  }
                  return { success: true, query: finalQ, results: items };
                } catch (e: any) {
                  return { error: e?.message || String(e) };
                }
              }
              
              return { error: `Execution not implemented for tool_key=${rec.tool_key || 'unknown'}` };
          }
          
          const executionTime = Date.now() - startTime;
          return { ...result, executionTime };
          
        } catch (handlerError) {
          return {
            success: false,
            error: handlerError instanceof Error ? handlerError.message : 'Handler execution failed'
          };
        }
      }

      // Call OpenAI Chat Completions
      const body: any = {
        model: aiConfig.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: String(message) }
        ],
        temperature: aiConfig.temperature ?? 0.2,
        max_tokens: Math.min(aiConfig.maxTokens ?? 512, 2048),
      };
      if (tools.length > 0) body.tools = tools;

      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiConfig.apiKey}`,
        },
        body: JSON.stringify(body)
      });

      if (!resp.ok) {
        const txt = await resp.text();
        return res.status(500).json({ error: `OpenAI HTTP ${resp.status}`, details: txt });
      }

      const data = await resp.json();
      const msg = data?.choices?.[0]?.message || {};
      const assistantText = msg?.content || '';
      const toolCalls = Array.isArray(msg?.tool_calls) ? msg.tool_calls : [];

      // Map tool_calls to function_calls compatible with Agents Test UI
      const function_calls = [] as any[];
      for (const tc of toolCalls) {
        const fn = tc?.function?.name as string;
        const args = (() => { try { return JSON.parse(tc?.function?.arguments || '{}'); } catch { return { _raw: tc?.function?.arguments }; } })();
        const result = await executeAgentTool(fn, args, message as string);
        function_calls.push({ function_name: fn, function_args: args, status: result?.error ? 'error' : 'completed', function_result: result });
      }

      // If we executed tools, try to synthesize a helpful final answer (e.g., extract phone numbers)
      let finalMessage = assistantText;
      if (function_calls.length > 0) {
        const previews: string[] = [];
        for (const fc of function_calls) {
          const pr = fc?.function_result?.text_preview as string | undefined;
          if (typeof pr === 'string' && pr.trim()) previews.push(pr);
        }
        if (previews.length > 0) {
          const text = previews.join('\n');
          const phoneRegex = /(\+?\d[\d\s\-]{7,}\d)/g; // simple phone pattern
          const raw = text.match(phoneRegex) || [];
          const cleaned = Array.from(new Set(raw.map(s => s.replace(/\s+/g, ' ').trim()))).slice(0, 10);
          if (cleaned.length > 0) {
            finalMessage = `จากการตรวจหน้าเว็บ พบหมายเลขติดต่อที่เป็นไปได้:\n- ${cleaned.join('\n- ')}`;
          } else {
            finalMessage = assistantText || 'ดำเนินการสำเร็จ แต่ไม่พบเบอร์ติดต่อที่ชัดเจนในเนื้อหาที่ดึงมา';
          }
        }

        // If search results are available, summarize top hits
        if ((!finalMessage || /ดำเนินการสำเร็จ/.test(finalMessage)) && function_calls.some(fc => Array.isArray(fc?.function_result?.results))) {
          const results = function_calls.flatMap(fc => fc?.function_result?.results || []).slice(0, 5);
          if (results.length > 0) {
            finalMessage = `ผลการค้นหาที่เกี่ยวข้อง:\n` + results.map((r: any, i: number) => `${i+1}. ${r.title} - ${r.url}`).join('\n');
          }
        }
        // If still no content, fallback textualization of function results
        if (!finalMessage && function_calls.length > 0) {
          finalMessage = 'ดำเนินการเครื่องมือเสร็จสิ้น แต่ไม่พบข้อมูลสรุปที่ชัดเจน';
        }
      }

      return res.json({ message: finalMessage, function_calls });
    } catch (e) {
      console.error('agents-test chat error:', e);
      return res.status(500).json({ error: (e as Error).message });
    }
  });

  return router;
}


