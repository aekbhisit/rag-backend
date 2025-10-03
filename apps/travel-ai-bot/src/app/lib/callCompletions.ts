import { getApiUrl } from './apiHelper';

export interface CompletionParams {
  model: string;
  agentName: string;
  agentKey?: string;
  agentSetKey: string;
  sessionId: string;
  messages: any[];
  tools?: any[];
  temperature?: number;
  max_tokens?: number;
}

export async function callAgentCompletions(params: CompletionParams): Promise<any> {
  const body: any = {
    model: params.model,
    agentName: params.agentName,
    agentKey: params.agentKey || params.agentName,
    agentSetKey: params.agentSetKey,
    sessionId: params.sessionId,
    messages: params.messages,
    ...(Array.isArray(params.tools) && params.tools.length > 0 ? { tools: params.tools } : {}),
    temperature: params.temperature ?? 0.7,
    max_tokens: params.max_tokens ?? 4000,
  };
  const res = await fetch(getApiUrl('/api/chat/completions'), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`/services/chat/agent-completions failed: ${res.status}`);
  return await res.json();
}


