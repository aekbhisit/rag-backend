export interface LogMessageParams {
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  type: 'text' | 'system';
  content: string;
  channel: 'normal' | 'realtime' | 'human' | 'line';
  meta?: Record<string, any>;
}

export async function logMessage(params: LogMessageParams): Promise<void> {
  try {
    await fetch('/api/log/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: params.sessionId,
        role: params.role,
        type: params.type,
        content: params.content,
        channel: params.channel,
        meta: params.meta ?? { is_internal: false }
      })
    });
  } catch { /* noop */ }
}

export async function pushLine(text: string): Promise<void> {
  try {
    await fetch('/api/line/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
  } catch { /* noop */ }
}


