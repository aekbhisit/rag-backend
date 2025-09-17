import { NextResponse } from 'next/server';
import { CORE_SCHEMAS, UI_SCHEMAS } from '@/app/agents/core/functions';
import { navigateHandler } from '@/app/agents/core/functions/handlers/ui/navigation';
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

      // Inject CORE and UI schemas – exclude intentionChange for ALL agents (avoid noisy tool)
      let coreAndUiSchemas = [...CORE_SCHEMAS, ...UI_SCHEMAS].filter((s: any) => s.name !== 'intentionChange');
      const coreAndUiSchemasFormatted = coreAndUiSchemas.map((s: any) => ({ type: 'function', function: s }));

      // Do not augment agent instructions here; use DB-provided content only

      // Build DB tools and optionally filter for specific agents to prove routing
      let dbTools = (tools || []).map((t: any) => ({
        type: 'function',
        function: {
          name: t.function_name,
          description: t.function_description,
          parameters: t.function_parameters || { type: 'object', properties: {} }
        }
      }));
      // Do not filter tools by specific agent names; rely solely on DB
      const augmentedTools = dbTools; // Use only database tools, no duplicates

      // Build toolLogic dynamically from DB skills (map any alias to handler by tool_key)
      // Note: Functions cannot be serialized through JSON, so the actual mapping happens on the client side
      const toolLogicMap: Record<string, any> = { navigate: navigateHandler };
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
        tools: [...coreAndUiSchemasFormatted, ...augmentedTools],
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


