import { getApiUrl } from '@/app/lib/apiHelper';

export interface RagContextsArgs {
  query?: string;
  topK?: number;
  // Optional overrides from DB mapping
  endpointUrl?: string; // e.g., "/api/rag/contexts" or full URL
  headers?: Record<string, string>;
  tenantId?: string;
}

export const ragContextsHandler = async (args: RagContextsArgs) => {
  const k = typeof args?.topK === 'number' ? args.topK : 5;
  try {
    // Use direct backend URL for chat handlers
    const baseUrl = (typeof process !== 'undefined'
      ? ((process as any)?.env?.NEXT_PUBLIC_BACKEND_URL || (process as any)?.env?.BACKEND_URL)
      : '') || 'http://localhost:3100';
    const defaultUrl = `${baseUrl}`.replace(/\/$/, '') + `/api/rag/contexts`;
    const url = (args?.endpointUrl && args.endpointUrl.startsWith('http'))
      ? args.endpointUrl
      : (args?.endpointUrl ? `${baseUrl}`.replace(/\/$/, '') + `${String(args.endpointUrl).startsWith('/') ? '' : '/'}${args.endpointUrl}` : defaultUrl);

    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(args?.headers || {}) };
    if (args?.tenantId && !headers['x-tenant-id']) headers['x-tenant-id'] = args.tenantId;

    const payload = { query: String(args?.query || ''), top_k: k } as any;
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
    const data = await res.json().catch(() => ({}));
    const contexts = Array.isArray(data?.contexts) ? data.contexts : [];
    return { success: true, contexts, total: contexts.length, topK: k };
  } catch (e: any) {
    return { success: false, error: e?.message || 'rag_contexts_failed', contexts: [], total: 0, topK: k };
  }
};


