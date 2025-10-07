/**
 * Node script to sync agent configurations from code to backend DB via admin APIs.
 * Now database-driven: only syncs agents that exist in both DB and code modules.
 * Usage (from travel-ai-bot): tsx src/app/agents/syncToDb.ts
 */
import 'cross-fetch/polyfill';

async function loadAllAgentSets(): Promise<Record<string, any[]>> {
  const map: Record<string, any[]> = {};
  
  // Get agents from database instead of hardcoded list
  try {
    const agentsRes = await fetch(`${PUBLIC_API}/agents`);
    if (agentsRes.ok) {
      const dbAgents = await agentsRes.json();
      console.log(`[syncToDb] Found ${dbAgents.length} agents in database:`, dbAgents.map((a: any) => a.agent_key));
      
      // Only sync agents that exist in both DB and code
      const codeAgentMap: Record<string, string> = {
        'default': './default',
        'welcomeagent': './default', // welcomeAgent is in default folder
        // 'thairesortguide': './thaiResortGuide', // Removed - using database agents only
        'customerserviceretail': './customerServiceRetail',
        'frontdeskauthentication': './frontDeskAuthentication',
        'placeguide': './placeGuide',
        'tourtaxi': './tourTaxi',
      };
      
      for (const dbAgent of dbAgents) {
        const agentKey = dbAgent.agent_key?.toLowerCase();
        const modPath = codeAgentMap[agentKey];
        
        if (modPath) {
          try {
            const mod = await import(modPath);
            const exported = mod?.default;
            let primary: any | null = null;
            if (Array.isArray(exported)) {
              primary = exported[0] || null;
            } else if (exported && typeof exported === 'object') {
              primary = exported;
            }
            if (primary) {
              map[dbAgent.agent_key] = [primary];
              console.log(`[syncToDb] Loaded agent from code: ${dbAgent.agent_key}`);
            }
          } catch (e) {
            console.warn(`[syncToDb] Failed to load agent module for ${dbAgent.agent_key}:`, e);
          }
        } else {
          console.log(`[syncToDb] Skipping agent ${dbAgent.agent_key} - no code module found`);
        }
      }
    } else {
      console.error('[syncToDb] Failed to fetch agents from database:', agentsRes.status);
    }
  } catch (e) {
    console.error('[syncToDb] Error fetching agents from database:', e);
  }
  
  return map;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:3001';
const API = `${BACKEND_URL}/api/admin`;
const PUBLIC_API = `${BACKEND_URL}/api`;

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

async function upsertPrompt(agent_key: string, category: 'initial_system' | 'system', content: string) {
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
  console.log(`[syncToDb] Syncing ${tools.length} tools for agent: ${agent_key}`);
  
  // Get available tools from registry to validate tool keys
  let availableTools: string[] = [];
  try {
    const registryRes = await fetch(`${API}/tool-registry`);
    if (registryRes.ok) {
      const registry = await registryRes.json();
      availableTools = registry.map((t: any) => t.tool_key);
    }
  } catch (e) {
    console.warn(`[syncToDb] Could not fetch tool registry, skipping tool validation`);
  }
  
  for (const t of tools) {
    const function_name = t?.function?.name || t?.name;
    const function_description = t?.function?.description || t?.description || '';
    const function_parameters = t?.function?.parameters || t?.parameters || { type: 'object', properties: {} };
    const tool_key = t.tool_key || function_name;
    
    // Skip tools that don't have a valid tool_key
    if (!tool_key || typeof tool_key !== 'string' || tool_key.trim() === '') {
      console.log(`[syncToDb] Skipping tool with invalid key: ${function_name}`);
      continue;
    }
    
    // Skip tools that don't exist in the tool registry
    if (availableTools.length > 0 && !availableTools.includes(tool_key)) {
      console.log(`[syncToDb] Skipping tool not in registry: ${tool_key}`);
      continue;
    }
    
    const payload = {
      tool_key,
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
    
    try {
      const response = await fetch(`${API}/agents/${encodeURIComponent(agent_key)}/tools`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[syncToDb] Failed to sync tool ${tool_key} for ${agent_key}: ${response.status} - ${errorText}`);
        // Continue with other tools instead of failing completely
      } else {
        console.log(`[syncToDb] Successfully synced tool: ${tool_key}`);
      }
    } catch (error) {
      console.warn(`[syncToDb] Error syncing tool ${tool_key} for ${agent_key}:`, error);
    }
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
      const systemContent = (agent as any).systemPrompt || instr;
      await upsertPrompt(key, 'initial_system', instr);
      await upsertPrompt(key, 'system', systemContent);
      await upsertTools(key, agent.tools || []);
      // Simple log
      console.log(`Synced agent: ${key}`);
    }
  }
  console.log('Sync completed.');
}

main().catch(e => { console.error(e); process.exit(1); });


