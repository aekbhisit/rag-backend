export type TextStreamEventName = 'open' | 'error' | 'response_start' | 'delta' | 'response_done' | 'agent_transfer' | 'debug';

export interface TextStreamEventHandlers {
  onOpen?: () => void;
  onError?: (error: Error) => void;
  onResponseStart?: () => void;
  onDelta?: (text: string) => void;
  onResponseDone?: (finalText: string, agentName?: string) => void;
  onAgentTransfer?: (agentName: string) => void;
  onDebug?: (info: any) => void;
}

export class TextStreamTransport {
  private source: EventSource | null = null;
  private url: string | null = null;
  private handlers: TextStreamEventHandlers;

  constructor(handlers: TextStreamEventHandlers) {
    this.handlers = handlers;
  }

  open(url: string) {
    this.close();
    this.url = url;
    try {
      const es = new EventSource(url);
      this.source = es;

      es.onopen = () => {
        try { this.handlers.onOpen?.(); } catch {}
      };
      es.onerror = () => {
        try { this.handlers.onError?.(new Error('SSE connection error')); } catch {}
      };

      es.addEventListener('response_start', () => {
        try { this.handlers.onResponseStart?.(); } catch {}
      });

      es.addEventListener('delta', (e: MessageEvent) => {
        try { this.handlers.onDelta?.(String(e.data || '')); } catch {}
      });

      es.addEventListener('response_done', (e: MessageEvent) => {
        try {
          const data = safeJson(e.data);
          const text = typeof data?.text === 'string' ? data.text : String(data || '');
          const agentName = typeof data?.agentName === 'string' ? data.agentName : undefined;
          this.handlers.onResponseDone?.(text, agentName);
        } catch {}
        // Close after done to prevent browser auto-reconnect triggering onerror
        try { this.close(); } catch {}
      });

      es.addEventListener('agent_transfer', (e: MessageEvent) => {
        try {
          const data = safeJson(e.data);
          const agentName = typeof data?.agentName === 'string' ? data.agentName : '';
          if (agentName) this.handlers.onAgentTransfer?.(agentName);
        } catch {}
      });

      es.addEventListener('debug', (e: MessageEvent) => {
        try {
          const data = safeJson(e.data);
          this.handlers.onDebug?.(data);
        } catch {}
      });
    } catch (err) {
      try { this.handlers.onError?.(err as Error); } catch {}
    }
  }

  close() {
    try { this.source?.close(); } catch {}
    this.source = null;
    this.url = null;
  }
}

function safeJson(input: any): any {
  try {
    if (typeof input === 'string') return JSON.parse(input);
    return input;
  } catch {
    return {};
  }
}
