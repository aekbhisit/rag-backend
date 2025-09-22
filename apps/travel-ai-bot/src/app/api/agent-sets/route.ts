import { NextResponse } from 'next/server';
import { ragPlaceSearchHandler } from '@/app/agents/core/functions/handlers/skill/rag-place';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:3001';

async function fetchJson(url: string) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) return { ok: false, status: r.status } as any;
  const j = await r.json();
  return { ok: true, json: j } as any;
}

export async function GET() {
  try {
    console.log('[Agent-Sets API] 🔄 Fetching agent sets...');
    // 1) list agents (admin endpoint)
    const agentsRes = await fetchJson(`${BACKEND_URL}/api/admin/agents`);
    if (!agentsRes.ok) return NextResponse.json({ error: `load agents ${agentsRes.status}` }, { status: 500 });
    const agents = Array.isArray(agentsRes.json) ? agentsRes.json.filter((a: any) => a.is_enabled) : [];

    // 0) Load tool registry once to enrich definitions by tool_key
    const registryRes = await fetchJson(`${BACKEND_URL}/api/admin/tool-registry`);
    const registryArr = registryRes.ok && Array.isArray(registryRes.json) ? registryRes.json : [];
    const slug = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
    const registryByKey = new Map<string, any>();
    try {
      for (const r of registryArr) {
        const k = slug(r.tool_key || r.key || r.name || '');
        if (k) registryByKey.set(k, r);
      }
    } catch {}

    const set: Record<string, any[]> = { default: [] };

    for (const a of agents) {
      const key = a.agent_key as string;
      // 2) prompt: load once (base category)
      const base = await fetchJson(`${BACKEND_URL}/api/agents/${encodeURIComponent(key)}/prompt?category=base`);
      let instructions = base.ok ? (base.json?.content || '') : '';

      // 3) tools (admin endpoint)
      const toolsRes = await fetchJson(`${BACKEND_URL}/api/admin/agents/${encodeURIComponent(key)}/tools`);
      const tools = toolsRes.ok ? toolsRes.json : [];

      // 4) navigation pages (admin endpoint)
      const navPagesRes = await fetchJson(`${BACKEND_URL}/api/admin/navigation-pages/${encodeURIComponent(key)}/active`);
      const navPages = navPagesRes.ok ? navPagesRes.json : [];

      // Do not inject core/ui schemas here; voice/text modes should use ONLY DB tools
      // Do not augment agent instructions here; use DB-provided content only

      // Build DB tools only, with fallbacks for missing function fields (parity with text-mode)
      const mapDbTool = (t: any) => {
        const key = slug(t.tool_key || t.toolKey || t.key || t.tool || t.name || t.function_name || '');
        let name = t.function_name;
        let description = t.function_description;
        let parameters = t.function_parameters;
        const ensure = (nm: string, desc: string, params: any) => {
          name = name || nm;
          description = description || desc;
          parameters = parameters || params;
        };
        // Enrich from registry by tool_key when available
        try {
          const reg = key ? registryByKey.get(key) : null;
          if (reg) {
            // prefer DB function_name; do NOT fall back to registry display name
            name = name || reg.function_name || name;
            description = description || reg.description || description;
            parameters = parameters || reg.parameters || parameters;
          }
        } catch {}
        const normalizeByKey = () => {
          if (key.includes('uinavigate')) {
            ensure('navigate', 'Navigate within the app by path or uri', {
              type: 'object', properties: { uri: { type: 'string', description: 'Path e.g., /travel/taxi' } }, required: ['uri']
            });
          } else if (key.includes('uinavigatetomain')) {
            ensure('navigateToMain', 'Navigate to the main app page', { type: 'object', properties: {}, required: [] });
          } else if (key.includes('uinavigatetoprevious')) {
            ensure('navigateToPrevious', 'Navigate to previous page', { type: 'object', properties: { steps: { type: 'number' } }, required: [] });
          } else if (key.includes('uiextractcontent')) {
            ensure('extractContent', 'Extract visible content from current page scope', {
              type: 'object', properties: { scope: { type: 'string' }, limit: { type: 'number' }, detail: { type: 'boolean' } }, required: []
            });
          } else if (key.includes('uiselectitem')) {
            ensure('selectItem', 'Select an item in the UI by id or text', {
              type: 'object', properties: { id: { type: 'string' }, text: { type: 'string' } }, required: []
            });
          } else if (key.includes('uitoast')) {
            ensure('toast', 'Show a toast notification', {
              type: 'object', properties: { message: { type: 'string' }, status: { type: 'string' } }, required: ['message']
            });
          } else if (key.includes('uifiltercontent')) {
            ensure('filterContent', 'Filter items/content on the current page', {
              type: 'object', properties: { query: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } } }, required: []
            });
          } else if (key.includes('uiswitchview')) {
            ensure('switchView', 'Switch the current UI view', {
              type: 'object', properties: { view: { type: 'string' } }, required: []
            });
          } else if (key.includes('coreintentionchange')) {
            ensure('intentionChange', 'Change conversation intention/state', { type: 'object', properties: { target: { type: 'string' } }, required: [] });
          } else if (key.includes('coretransferagents')) {
            ensure('transferAgents', 'Transfer the conversation to another agent (generic)', {
              type: 'object', properties: { destination_agent: { type: 'string' } }, required: []
            });
          } else if (key.includes('coretransferback')) {
            ensure('transferBack', 'Transfer the conversation back to the previous agent', {
              type: 'object', properties: { rationale_for_transfer: { type: 'string' } }, required: []
            });
          } else if (key.includes('skillhttprequest')) {
            ensure('httpRequest', 'Perform an HTTP request', {
              type: 'object',
              properties: {
                method: { type: 'string', enum: ['GET','POST','PUT','PATCH','DELETE'] },
                url: { type: 'string' },
                headers: { type: 'object', additionalProperties: { type: 'string' } },
                body: { type: 'string' }
              },
              required: ['method','url']
            });
          } else if (key.includes('skilldataparsecsv')) {
            ensure('parseCSV', 'Parse CSV text into structured rows', {
              type: 'object', properties: { text: { type: 'string' }, delimiter: { type: 'string' } }, required: ['text']
            });
          } else if (key.includes('skilldataparsejson')) {
            ensure('parseJSON', 'Parse JSON text into an object', {
              type: 'object', properties: { text: { type: 'string' } }, required: ['text']
            });
          } else if (key.includes('skillragplace')) {
            ensure('placeKnowledgeSearch', 'Search place knowledge base', {
              type: 'object', properties: { query: { type: 'string' }, lat: { type: 'number' }, long: { type: 'number' } }, required: ['query']
            });
          } else if (key.includes('skillragcontexts')) {
            ensure('ragContexts', 'Fetch RAG contexts by filter', {
              type: 'object', properties: { category: { type: 'string' }, page_size: { type: 'number' } }, required: []
            });
          } else if (key.includes('skillragsearch')) {
            ensure('ragSearchSummary', 'Search and summarize RAG contents', {
              type: 'object', properties: { query: { type: 'string' }, limit: { type: 'number' } }, required: ['query']
            });
          } else if (key.includes('skillfsreadtext')) {
            ensure('readTextFile', 'Read a text file from the server filesystem', {
              type: 'object', properties: { path: { type: 'string' }, encoding: { type: 'string' } }, required: ['path']
            });
          } else if (key.includes('skillfswritetext')) {
            ensure('writeTextFile', 'Write text content to a server filesystem file', {
              type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' }, encoding: { type: 'string' } }, required: ['path','content']
            });
          } else if (key.includes('skilltextsummarize')) {
            ensure('textSummarize', 'Summarize text content', {
              type: 'object', properties: { text: { type: 'string' }, max_sentences: { type: 'number' } }, required: ['text']
            });
          } else if (key.includes('skillwebbrowse')) {
            ensure('webBrowse', 'Browse a web page and extract content', {
              type: 'object', properties: { url: { type: 'string' } }, required: ['url']
            });
          } else if (key.includes('skillwebcrawl')) {
            ensure('webCrawl', 'Crawl a website for content', {
              type: 'object', properties: { url: { type: 'string' }, depth: { type: 'number' } }, required: ['url']
            });
          }
        };
        // If function name missing OR looks like a display label (contains spaces/invalid identifier), normalize by key
        const isInvalidIdentifier = !name || /\s/.test(String(name)) || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(String(name));
        if (isInvalidIdentifier) {
          normalizeByKey();
        }
        // If still missing after normalization, run fallback one more time
        if (!name) normalizeByKey();
        return {
          type: 'function',
          function: {
            name,
            description,
            parameters: parameters || { type: 'object', properties: {} }
          }
        };
      };
      let dbTools = (tools || []).map(mapDbTool);
      // No schema augmentation; rely solely on DB selection
      const augmentedTools = dbTools;

      // Build toolLogic dynamically from DB skills (map any alias to handler by tool_key)
      // Note: Functions cannot be serialized through JSON, so the actual mapping happens on the client side
      const toolLogicMap: Record<string, any> = {};
      // Additionally expose function -> skill key map for client-side resolution
      const functionSkillKeys: Record<string, string> = {};
      for (const t of (tools || [])) {
        const fnName = t.function_name;
        const toolKey = t.tool_key || t.skill_id || t.skill || t.skillId;
        if (fnName && toolKey) {
          functionSkillKeys[fnName] = toolKey;
        }
        if (toolKey === 'skill.rag.place') {
          toolLogicMap[fnName] = ragPlaceSearchHandler;
        }
      }

      set.default.push({
        name: a.name,
        key,
        publicDescription: a.public_description,
        instructions,
        tools: [...augmentedTools],
        toolLogic: toolLogicMap,
        functionSkillKeys,
        downstreamAgents: []
      });
    }

    // Build downstreamAgents list (enable transfers between agents in the same set)
    const downstream = set.default.map(a => ({ name: a.name, publicDescription: a.publicDescription }));
    set.default = set.default.map(agent => ({
      ...agent,
      downstreamAgents: downstream.filter(d => d.name !== agent.name)
    }));

    // Note: Transfer tools are now injected in the frontend (both text and voice modes)
    // This ensures consistent behavior across all channels

    return NextResponse.json({ agentSets: set, defaultSetKey: 'default' });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server error' }, { status: 500 });
  }
}


