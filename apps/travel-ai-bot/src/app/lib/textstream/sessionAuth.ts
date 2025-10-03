export interface TextStreamParams {
  sessionId: string;
  agentSetKey?: string;
  agentName?: string;
  agentKey?: string;
  language?: string;
  text?: string;
  lat?: number;
  long?: number;
  currentPage?: string;
}

export function buildTextStreamUrl(params: TextStreamParams): string {
  const query = new URLSearchParams();
  query.set('session_id', params.sessionId);
  if (params.agentSetKey) query.set('agent_set_key', params.agentSetKey);
  if (params.agentName) query.set('agent_name', params.agentName);
  if (params.agentKey) query.set('agent_key', params.agentKey);
  if (params.language) query.set('language', params.language);
  if (params.text) query.set('text', params.text);
  if (params.lat !== undefined) query.set('lat', params.lat.toString());
  if (params.long !== undefined) query.set('long', params.long.toString());
  if (params.currentPage) query.set('currentPage', params.currentPage);
  const cacheBust = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  query.set('cb', cacheBust);
  return `/services/chat/text-stream?${query.toString()}`;
}
