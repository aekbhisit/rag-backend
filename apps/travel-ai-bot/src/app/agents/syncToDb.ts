/**
 * Node script to sync hard-coded agents (under @agents) to backend DB via admin APIs.
 * Usage (from travel-ai-bot): tsx src/app/agents/syncToDb.ts
 */
import 'cross-fetch/polyfill';

async function loadAllAgentSets(): Promise<Record<string, any[]>> {
  const map: Record<string, any[]> = {};
  const entries: Array<[string, string]> = [
    ['default', './default'],
    ['thaiResortGuide', './thaiResortGuide'],
    ['customerServiceRetail', './customerServiceRetail'],
    ['frontDeskAuthentication', './frontDeskAuthentication'],
    ['placeGuide', './placeGuide'],
    ['tourTaxi', './tourTaxi'],
  ];
  for (const [key, modPath] of entries) {
    try {
      const mod = await import(modPath);
      const exported = mod?.default;
      let primary: any | null = null;
      if (Array.isArray(exported)) {
        primary = exported[0] || null; // only import the first (primary) agent from each folder
      } else if (exported && typeof exported === 'object') {
        primary = exported;
      }
      if (primary) map[key] = [primary];
    } catch (e) {
      // ignore missing modules
    }
  }
  return map;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:3001';
const API = `${BACKEND_URL}/api/admin`;

async function ensureAgent(agent: any) {
  const body = {
    agent_key: agent.key || agent.name?.toLowerCase().replace(/\s+/g,'_') || `agent_${Date.now()}`,
    name: agent.name || agent.key,
    public_description: agent.publicDescription || agent.description || '',
    is_enabled: true,
    is_default: !!agent.isDefault,
  };

  // Create or update
  let createdKey = body.agent_key;
  const getRes = await fetch(`${API}/agents/${encodeURIComponent(body.agent_key)}`);
  if (getRes.ok) {
    await fetch(`${API}/agents/${encodeURIComponent(body.agent_key)}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
  } else {
    const res = await fetch(`${API}/agents`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`Create agent failed ${res.status}`);
  }
  return createdKey;
}

async function upsertPrompt(agent_key: string, category: 'initial_system' | 'base', content: string) {
  if (!content) return;
  // try update existing by listing prompts
  const list = await fetch(`${API}/agents/${encodeURIComponent(agent_key)}/prompts?category=${category}`);
  if (list.ok) {
    const rows = await list.json();
    const existing = Array.isArray(rows) ? rows.find((r: any) => r.category === category) : null;
    if (existing) {
      await fetch(`${API}/agents/${encodeURIComponent(agent_key)}/prompts/${existing.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, is_published: true })
      }).catch(() => {});
      return;
    }
  }
  await fetch(`${API}/agents/${encodeURIComponent(agent_key)}/prompts`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category, content, is_published: true })
  }).catch(() => {});
}

async function upsertTools(agent_key: string, tools: any[] = []) {
  for (const t of tools) {
    const function_name = t?.function?.name || t?.name;
    const function_description = t?.function?.description || t?.description || '';
    const function_parameters = t?.function?.parameters || t?.parameters || { type: 'object', properties: {} };
    const payload = {
      tool_key: t.tool_key || function_name,
      alias: t.alias || t.name || t.tool_key,
      enabled: true,
      position: 0,
      arg_defaults: {},
      arg_templates: {},
      guardrails: {},
      overrides: {},
      function_name,
      function_description,
      function_parameters,
      parameter_mapping: t.parameter_mapping || null,
    };
    await fetch(`${API}/agents/${encodeURIComponent(agent_key)}/tools`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    }).catch(() => {});
  }
}

async function main() {
  const allAgentSets = await loadAllAgentSets();
  for (const [setKey, agents] of Object.entries(allAgentSets)) {
    for (const agent of agents) {
      const key = await ensureAgent({
        key: agent.key || agent.name,
        name: agent.name,
        publicDescription: agent.publicDescription,
        isDefault: agent.isDefault || false,
      });
      const instr = agent.instructions || (agent as any).systemPrompt || '';
      const baseContent = (agent as any).basePrompt || instr;
      await upsertPrompt(key, 'initial_system', instr);
      await upsertPrompt(key, 'base', baseContent);
      await upsertTools(key, agent.tools || []);
      // Simple log
      console.log(`Synced agent: ${key}`);
    }
  }
  console.log('Sync completed.');
}

main().catch(e => { console.error(e); process.exit(1); });


