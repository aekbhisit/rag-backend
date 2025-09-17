type Ref<T> = { current: T };

export interface TextSessionEventDeps {
  onResponseStart?: () => void;
  onResponseDelta?: (delta: string) => void;
  onResponseDone?: (text: string, agentName?: string) => void;
  onAgentTransfer?: (name: string) => void;
  setActiveAgentNameState?: (name: string) => void;
  errorHandler?: (e: Error) => void;
  allowResponseStartRef: Ref<boolean>;
  aiPlaceholderCreatedRef: Ref<boolean>;
}

export function registerTextSessionEventHandlers(es: EventSource, deps: TextSessionEventDeps) {
  es.addEventListener('response_start', () => {
    if (deps.allowResponseStartRef.current && deps.onResponseStart) {
      try { deps.onResponseStart(); deps.aiPlaceholderCreatedRef.current = true; } catch {}
    }
  });

  es.addEventListener('delta', (e: MessageEvent) => {
    try { deps.onResponseDelta?.(String(e.data || '')); } catch {}
  });

  es.addEventListener('response_done', (e: MessageEvent) => {
    try {
      const data = safeJson(e.data);
      const text = typeof data?.text === 'string' ? data.text : String(data || '');
      const agentName = typeof data?.agentName === 'string' ? data.agentName : undefined;
      deps.onResponseDone?.(text, agentName);
    } catch {}
  });

  es.addEventListener('agent_transfer', (e: MessageEvent) => {
    try {
      const data = safeJson(e.data);
      const agentName = typeof data?.agentName === 'string' ? data.agentName : '';
      if (agentName) {
        try { deps.setActiveAgentNameState?.(agentName); } catch {}
        try { deps.onAgentTransfer?.(agentName); } catch {}
      }
    } catch {}
  });

  es.addEventListener('error', () => {
    try { deps.errorHandler?.(new Error('SSE error')); } catch {}
  });
}

function safeJson(input: any): any {
  try {
    if (typeof input === 'string') return JSON.parse(input);
    return input;
  } catch {
    return {};
  }
}
