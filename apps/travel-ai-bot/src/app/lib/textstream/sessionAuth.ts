export interface TextStreamParams {
  sessionId: string;
  agentSetKey?: string;
  agentName?: string;
  agentKey?: string;
  language?: string;
  text?: string;
  currentPath?: string | null;
}

export function buildTextStreamUrl(params: TextStreamParams): string {
  const query = new URLSearchParams();
  query.set('session_id', params.sessionId);
  if (params.agentSetKey) query.set('agent_set_key', params.agentSetKey);
  if (params.agentName) query.set('agent_name', params.agentName);
  if (params.agentKey) query.set('agent_key', params.agentKey);
  if (params.language) query.set('language', params.language);
  if (params.text) query.set('text', params.text);
  if (params.currentPath) query.set('current_path', params.currentPath);
  const cacheBust = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  query.set('cb', cacheBust);
  return `/api/chat/text-stream?${query.toString()}`;
}
