"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

// Tool configuration interface for backend data
interface BackendToolData {
  id: string;
  tool_key: string;
  alias?: string;
  enabled: boolean;
  position: number;
  arg_defaults: string | Record<string, any>;
  arg_templates: string | Record<string, any>;
  guardrails: string | Record<string, any>;
  overrides: string | Record<string, any>;
  config?: {
    type: string;
    endpoint?: string;
    credentials?: Record<string, string>;
    parameters: ToolParameter[];
    [key: string]: any;
  };
}

interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum' | 'object';
  description: string;
  required: boolean;
  enum?: string[];
  default?: any;
  pattern?: string;
}

interface ConfigField {
  name: string;
  type: 'string' | 'number';
  label: string;
  description: string;
  required: boolean;
  placeholder?: string;
  default?: any;
  min?: number;
  max?: number;
  example?: string;
}

interface ToolTypeDefinition {
  name: string;
  description: string;
  category: string;
  runtime: string;
  parameters: ToolParameter[];
  configFields: ConfigField[];
  examples: {
    arg_defaults: Record<string, any>;
    arg_templates: Record<string, any>;
    guardrails: Record<string, any>;
    overrides: Record<string, any>;
  };
}

// Tool type definitions with user-friendly forms
const TOOL_TYPES: Record<string, ToolTypeDefinition> = {
  'skill.http.request': {
    name: 'HTTP Request',
    description: 'Make HTTP requests to configured endpoints',
    category: 'skill',
    runtime: 'server',
    parameters: [
      { name: 'method', type: 'enum', description: 'HTTP method to use', required: true, enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
      { name: 'path', type: 'string', description: 'API path (relative to base URL)', required: true },
      { name: 'body', type: 'object', description: 'Request body data (JSON)', required: false },
      { name: 'headers', type: 'object', description: 'Additional HTTP headers', required: false }
    ],
    configFields: [
      { name: 'baseUrl', type: 'string', label: 'Base URL', description: 'The base URL for all API requests', required: true, placeholder: 'https://api.example.com', example: 'https://api.example.com' },
      { name: 'apiKey', type: 'string', label: 'API Key', description: 'Authentication key for the API', required: false, placeholder: 'Bearer token or API key', example: 'sk-1234567890abcdef' },
      { name: 'timeout', type: 'number', label: 'Timeout (ms)', description: 'Maximum time to wait for response', required: false, default: 8000, min: 1000, max: 60000, example: '8000' }
    ],
    examples: {
      arg_defaults: { method: 'GET', path: '/users' },
      arg_templates: { path: 'userRequestedEndpoint' },
      guardrails: { allowedDomains: ['api.example.com'], maxRequestSize: '1MB' },
      overrides: { timeout: 10000 }
    }
  },
  'skill.rag.search': {
    name: 'RAG Search',
    description: 'Search knowledge base with semantic queries',
    category: 'skill',
    runtime: 'server',
    parameters: [
      { name: 'query', type: 'string', description: 'Search query text', required: true },
      { name: 'topK', type: 'number', description: 'Number of results to return', required: false, default: 5 },
      { name: 'filters', type: 'object', description: 'Metadata filters for search', required: false }
    ],
    configFields: [
      { name: 'indexName', type: 'string', label: 'Index Name', description: 'Name of the search index to use', required: true, placeholder: 'knowledge-base', example: 'knowledge-base' },
      { name: 'embeddingModel', type: 'string', label: 'Embedding Model', description: 'AI model for text embeddings', required: false, default: 'text-embedding-ada-002', example: 'text-embedding-ada-002' }
    ],
    examples: {
      arg_defaults: { topK: 5, filters: { category: 'general' } },
      arg_templates: { query: 'userQuestion' },
      guardrails: { maxQueryLength: 1000, allowedIndexes: ['knowledge-base'] },
      overrides: { embeddingModel: 'text-embedding-ada-002' }
    }
  },
  'skill.text.summarize': {
    name: 'Text Summarization',
    description: 'Summarize text content using AI',
    category: 'skill',
    runtime: 'server',
    parameters: [
      { name: 'text', type: 'string', description: 'Text to summarize', required: true },
      { name: 'maxLength', type: 'number', description: 'Maximum summary length', required: false, default: 150 },
      { name: 'style', type: 'enum', description: 'Summary style', required: false, enum: ['bullet', 'paragraph', 'executive'] }
    ],
    configFields: [
      { name: 'model', type: 'string', label: 'AI Model', description: 'AI model to use for summarization', required: false, default: 'gpt-3.5-turbo', example: 'gpt-3.5-turbo' },
      { name: 'temperature', type: 'number', label: 'Temperature', description: 'Creativity level (0=factual, 2=creative)', required: false, default: 0.3, min: 0, max: 2, example: '0.3' }
    ],
    examples: {
      arg_defaults: { maxLength: 150, style: 'paragraph' },
      arg_templates: { text: 'userProvidedText' },
      guardrails: { maxInputLength: 10000, allowedStyles: ['bullet', 'paragraph', 'executive'] },
      overrides: { model: 'gpt-4' }
    }
  },
  'core.time.now': {
    name: 'Current Time',
    description: 'Get current timestamp and timezone info',
    category: 'core',
    runtime: 'server',
    parameters: [
      { name: 'timezone', type: 'string', description: 'IANA timezone identifier', required: false },
      { name: 'format', type: 'enum', description: 'Output format', required: false, enum: ['ISO', 'RFC2822', 'local'] }
    ],
    configFields: [
      { name: 'defaultTimezone', type: 'string', label: 'Default Timezone', description: 'Default timezone when none specified', required: false, default: 'UTC', example: 'UTC' }
    ],
    examples: {
      arg_defaults: { format: 'ISO' },
      arg_templates: { timezone: 'userTimezone' },
      guardrails: { allowedTimezones: ['UTC', 'America/New_York', 'Europe/London'] },
      overrides: { defaultTimezone: 'America/New_York' }
    }
  },
  'core.intentionChange': {
    name: 'Intention Change',
    description: 'Change the current conversation intention',
    category: 'core',
    runtime: 'server',
    parameters: [
      { name: 'newIntention', type: 'string', description: 'New intention to set', required: true },
      { name: 'reason', type: 'string', description: 'Reason for the change', required: false }
    ],
    configFields: [],
    examples: {
      arg_defaults: { reason: 'User requested change' },
      arg_templates: { newIntention: 'userIntention' },
      guardrails: { allowedIntentions: ['help', 'search', 'create', 'analyze'] },
      overrides: {}
    }
  },
  'ui.navigate': {
    name: 'Navigate UI',
    description: 'Navigate to different UI sections',
    category: 'ui',
    runtime: 'client',
    parameters: [
      { name: 'route', type: 'string', description: 'Route to navigate to', required: true },
      { name: 'params', type: 'object', description: 'Navigation parameters', required: false }
    ],
    configFields: [],
    examples: {
      arg_defaults: { params: {} },
      arg_templates: { route: 'userRequestedPage' },
      guardrails: { allowedRoutes: ['/dashboard', '/profile', '/settings'] },
      overrides: {}
    }
  },

  'travel.tour.searchPackages': {
    name: 'Search Tour Packages',
    description: 'Search for available tour packages',
    category: 'travel',
    runtime: 'server',
    parameters: [
      { name: 'destination', type: 'string', description: 'Travel destination', required: true },
      { name: 'dates', type: 'string', description: 'Travel dates', required: false },
      { name: 'budget', type: 'number', description: 'Maximum budget', required: false }
    ],
    configFields: [
      { name: 'apiEndpoint', type: 'string', label: 'API Endpoint', description: 'Tour booking API endpoint', required: true, example: 'https://api.tours.com' },
      { name: 'currency', type: 'string', label: 'Currency', description: 'Default currency for prices', required: false, default: 'USD', example: 'USD' }
    ],
    examples: {
      arg_defaults: { currency: 'USD' },
      arg_templates: { destination: 'userDestination' },
      guardrails: { maxBudget: 10000, allowedDestinations: ['Europe', 'Asia', 'America'] },
      overrides: { currency: 'EUR' }
    }
  }
};

export default function AgentToolsPage() {
  const params = useParams();
  const router = useRouter();
  const agentKey = decodeURIComponent(String(params?.agentKey || ''));
  const apiBase = useMemo(() => `${BACKEND_URL}/api/admin`, []);
  const [tools, setTools] = useState<BackendToolData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true); 
    setError('');
    try {
      const res = await fetch(`${apiBase}/agents/${encodeURIComponent(agentKey)}/tools`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load tools');
      const data = await res.json();
      setTools(data);
    } catch (e: any) { 
      setError(e?.message || 'Load failed'); 
    } finally { 
      setLoading(false); 
    }
  }

  useEffect(() => { 
    load(); 
  }, [agentKey]);

  async function saveTool(t: BackendToolData) {
    try {
      const body: any = {
        alias: t.alias || null,
        enabled: !!t.enabled,
        position: Number(t.position || 0),
        arg_defaults: typeof t.arg_defaults === 'string' ? JSON.parse(t.arg_defaults) : (t.arg_defaults || {}),
        arg_templates: typeof t.arg_templates === 'string' ? JSON.parse(t.arg_templates) : (t.arg_templates || {}),
        guardrails: typeof t.guardrails === 'string' ? JSON.parse(t.guardrails) : (t.guardrails || {}),
        overrides: typeof t.overrides === 'string' ? JSON.parse(t.overrides) : (t.overrides || {})
      };
      const res = await fetch(`${apiBase}/agents/${encodeURIComponent(agentKey)}/tools/${encodeURIComponent(t.id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Save failed');
      await load();
    } catch (e: any) { alert(e?.message || 'Save tool failed'); }
  }

  async function removeTool(id: string) {
    if (!confirm('Remove tool?')) return;
    const res = await fetch(`${apiBase}/agents/${encodeURIComponent(agentKey)}/tools/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (res.ok) load(); else alert('Delete failed');
  }

  function getToolDisplayName(toolKey: string): string {
    return TOOL_TYPES[toolKey]?.name || toolKey;
  }

  function getToolCategory(toolKey: string): string {
    return TOOL_TYPES[toolKey]?.category || 'unknown';
  }

  function getToolRuntime(toolKey: string): string {
    return TOOL_TYPES[toolKey]?.runtime || 'unknown';
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4">
      <nav className="text-sm text-gray-600">
        <a href="/admin" className="underline">Admin</a>
        <span className="mx-2">/</span>
        <a href="/admin/agents" className="underline">Agents</a>
        <span className="mx-2">/</span>
        <a href={`/admin/agents/${encodeURIComponent(agentKey)}/edit`} className="underline">{agentKey}</a>
        <span className="mx-2">/</span>
        <span className="text-gray-900">Tools</span>
      </nav>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Agent Tools: {agentKey}</h1>
        <p className="text-sm text-gray-600">Core & UI tools are automatically available, skill tools are user-configurable</p>
        <button 
          onClick={() => router.push(`/admin/agents/${encodeURIComponent(agentKey)}/tools/add`)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add Skill Tool
        </button>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>}
      
      {/* Automatically Available Tools */}
      <div className="bg-green-50 border border-green-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b bg-green-100">
          <h2 className="text-lg font-medium text-green-900">🔄 Automatically Available Tools</h2>
          <p className="text-sm text-green-700 mt-1">
            These essential tools are automatically available to all agents and cannot be removed.
          </p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Core Tools */}
            <div className="space-y-2">
              <h3 className="font-medium text-green-900">Core Tools (Server)</h3>
              <div className="space-y-1 text-sm text-green-800">
                <div>• Intention Change - Manage conversation flow</div>
                <div>• Transfer Agents - Switch between agents</div>
                <div>• Transfer Back - Return to previous agent</div>
                <div>• Variables - Store conversation state</div>
              </div>
            </div>
            
            {/* UI Tools */}
            <div className="space-y-2">
              <h3 className="font-medium text-green-900">UI Tools (Client)</h3>
              <div className="space-y-1 text-sm text-green-800">
                <div>• Navigate - Switch between UI sections</div>
                <div>• Extract Content - Get data from DOM</div>
                <div>• Select Item - Choose from lists</div>
                <div>• Switch View - Change UI modes</div>
                <div>• Filter Content - Apply search filters</div>
                <div>• Toast - Show notifications</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User-Configurable Tools - Grouped by Category */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="text-lg font-medium text-gray-900">Skill Tools (User-Configurable)</h2>
          <p className="text-sm text-gray-600 mt-1">
            These skill tools can be added, configured, and removed by users. One tool can be used by multiple agents with different configurations.
          </p>
        </div>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading tools...</p>
          </div>
        ) : tools.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-2">🔧</div>
            <p className="text-gray-500">No tools configured yet</p>
            <p className="text-sm text-gray-400 mt-1">Click "Add Skill Tool" to get started</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Group tools by category */}
            {(() => {
              const groupedTools = tools.reduce((groups: any, tool) => {
                const toolKey = tool.tool_key;
                let subcategory = 'other';
                
                // Extract subcategory from tool key
                if (toolKey.startsWith('skill.')) {
                  const parts = toolKey.split('.');
                  if (parts.length >= 3) {
                    subcategory = parts[1]; // skill.time.now -> time, skill.http.request -> http
                  }
                } else if (toolKey.startsWith('travel.')) {
                  subcategory = 'travel';
                } else if (toolKey.startsWith('core.')) {
                  subcategory = 'core';
                } else if (toolKey.startsWith('ui.')) {
                  subcategory = 'ui';
                }
                
                if (!groups[subcategory]) {
                  groups[subcategory] = [];
                }
                groups[subcategory].push(tool);
                return groups;
              }, {});

              return Object.entries(groupedTools).map(([category, categoryTools]: [string, any]) => (
                <div key={category} className="border rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-gray-100 border-b">
                    <h3 className="text-md font-medium text-gray-900 capitalize">
                      {(() => {
                        switch (category) {
                          case 'time': return 'Time Tools';
                          case 'http': return 'HTTP Tools';
                          case 'geo': return 'Geo Tools';
                          case 'data': return 'Data Tools';
                          case 'rag': return 'RAG Tools';
                          case 'text': return 'Text Tools';
                          case 'fs': return 'File System Tools';
                          case 'web': return 'Web Tools';
                          case 'travel': return 'Travel Tools';
                          case 'core': return 'Core Tools';
                          case 'ui': return 'UI Tools';
                          default: return `${category.charAt(0).toUpperCase() + category.slice(1)} Tools`;
                        }
                      })()}
                    </h3>
                    <p className="text-xs text-gray-600 mt-1">
                      {categoryTools.length} tool{categoryTools.length !== 1 ? 's' : ''} configured
                    </p>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tool</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alias</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Runtime</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {categoryTools.map((tool: any, index: number) => (
                          <tr key={tool.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              <input 
                                type="number" 
                                value={tool.position ?? index} 
                                onChange={(e) => {
                                  const newTools = [...tools];
                                  const toolIndex = tools.findIndex(t => t.id === tool.id);
                                  newTools[toolIndex] = { ...tool, position: Number(e.target.value) };
                                  setTools(newTools);
                                }}
                                className="w-16 border rounded px-2 py-1 text-center"
                                min="0"
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{getToolDisplayName(tool.tool_key)}</div>
                                <div className="text-xs text-gray-500 font-mono">{tool.tool_key}</div>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <input 
                                value={tool.alias || ''} 
                                onChange={(e) => {
                                  const newTools = [...tools];
                                  const toolIndex = tools.findIndex(t => t.id === tool.id);
                                  newTools[toolIndex] = { ...tool, alias: e.target.value };
                                  setTools(newTools);
                                }}
                                className="w-32 border rounded px-2 py-1 text-sm"
                                placeholder="Custom name"
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {getToolRuntime(tool.tool_key)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <label className="flex items-center">
                                <input 
                                  type="checkbox" 
                                  checked={!!tool.enabled} 
                                  onChange={(e) => {
                                    const newTools = [...tools];
                                    const toolIndex = tools.findIndex(t => t.id === tool.id);
                                    newTools[toolIndex] = { ...tool, enabled: e.target.checked };
                                    setTools(newTools);
                                  }}
                                  className="mr-2" 
                                /> 
                                <span className="text-sm text-gray-900">
                                  {tool.enabled ? 'Enabled' : 'Disabled'}
                                </span>
                              </label>
                            </td>
                                                         <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                               <div className="flex items-center space-x-2">
                                 <button 
                                   onClick={() => router.push(`/admin/agents/${encodeURIComponent(agentKey)}/tools/${encodeURIComponent(tool.id)}/edit`)}
                                   className="text-green-600 hover:text-green-900 px-2 py-1 rounded hover:bg-green-50"
                                 >
                                   Edit
                                 </button>
                                 <button 
                                   onClick={() => router.push(`/admin/agents/${encodeURIComponent(agentKey)}/tools/${encodeURIComponent(tool.id)}/test`)}
                                   className="text-purple-600 hover:text-purple-900 px-2 py-1 rounded hover:bg-purple-50"
                                 >
                                   Test
                                 </button>
                                 <button 
                                   onClick={() => saveTool(tool)}
                                   className="text-blue-600 hover:text-blue-900 px-2 py-1 rounded hover:bg-blue-50"
                                 >
                                   Save
                                 </button>
                                 <button 
                                   onClick={() => removeTool(tool.id)}
                                   className="text-red-600 hover:text-red-900 px-2 py-1 rounded hover:bg-red-50"
                                 >
                                   Remove
                                 </button>
                               </div>
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 </div>
               ));
             })()}
           </div>
         )}
       </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">How Tools Work</h3>
        <div className="text-sm text-blue-800 space-y-1">
          <p>• <strong>Core & UI Tools:</strong> Automatically available to all agents (cannot be removed)</p>
          <p>• <strong>Skill Tools:</strong> User-configurable tools that can be added/removed per agent</p>
          <p>• <strong>Reusable:</strong> One skill tool can be used by multiple agents with different configurations</p>
          <p>• <strong>Flexible:</strong> Skill tools can be enabled/disabled, reordered, and customized per agent</p>
          <p>• <strong>Secure:</strong> Sensitive data like API keys are stored per-agent, not globally</p>
        </div>
      </div>
    </div>
  );
}


