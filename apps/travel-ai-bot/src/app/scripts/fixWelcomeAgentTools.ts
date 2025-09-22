/*
  One-off fixer: ensure welcomeAgent has UI navigate tool and clean null tools.
  Usage:
    cd apps/travel-ai-bot
    pnpm tsx src/app/scripts/fixWelcomeAgentTools.ts
*/
import 'cross-fetch/polyfill';

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:3001';
const API = `${BASE}/api/admin`;

async function ensureNavigateTool(agentKey: string) {
  // Load current tools
  const res = await fetch(`${API}/agents/${encodeURIComponent(agentKey)}/tools`);
  const tools = res.ok ? await res.json() : [];

  // Delete rows with null/empty function_name (bad data)
  for (const t of tools) {
    const name = t.function_name;
    if (!name || String(name).trim() === '') {
      await fetch(`${API}/agents/${encodeURIComponent(agentKey)}/tools/${encodeURIComponent(t.id)}`, { method: 'DELETE' }).catch(() => {});
      console.log('Deleted null-function tool id=', t.id);
    }
  }

  // Reload after cleanup
  const res2 = await fetch(`${API}/agents/${encodeURIComponent(agentKey)}/tools`);
  const tools2 = res2.ok ? await res2.json() : [];
  const hasNavigate = tools2.some((t: any) => t.function_name === 'navigate' || t.tool_key === 'ui.navigate');

  if (!hasNavigate) {
    const payload = {
      tool_key: 'ui.navigate',
      enabled: true,
      position: tools2.length,
      function_name: 'navigate',
      function_description: 'Navigate to an in-app URI, e.g. /travel/taxi',
      function_parameters: {
        type: 'object',
        properties: { uri: { type: 'string', description: "Target URI like '/travel/taxi'" } },
        required: ['uri']
      },
      parameter_mapping: { uri: 'uri' },
      arg_defaults: {},
      arg_templates: {},
      guardrails: {},
      overrides: {}
    };
    const add = await fetch(`${API}/agents/${encodeURIComponent(agentKey)}/tools`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!add.ok) throw new Error(`Failed to add navigate tool: ${add.status}`);
    console.log('Added ui.navigate to', agentKey);
  } else {
    console.log('Navigate tool already present');
  }

  const final = await fetch(`${API}/agents/${encodeURIComponent(agentKey)}/tools`);
  const list = final.ok ? await final.json() : [];
  console.log('Final tools:', list.map((t: any) => ({ id: t.id, tool_key: t.tool_key, function_name: t.function_name })));
}

async function main() {
  await ensureNavigateTool('welcomeAgent');
}

main().catch(e => { console.error(e); process.exit(1); });


