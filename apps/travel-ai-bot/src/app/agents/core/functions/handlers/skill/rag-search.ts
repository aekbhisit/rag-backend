const DEFAULT_TOPK = 5;

export const ragSearchHandler = async (args: any) => {
  const { query, text_query, topK, top_k, category, endpointUrl, headers, tenantId } = args || {};
  const q = (typeof query === 'string' && query) ? query : (typeof text_query === 'string' ? text_query : '');
  if (!q) return { success: false, error: 'query_required' };
  const k = typeof topK === 'number' ? topK : (typeof top_k === 'number' ? top_k : DEFAULT_TOPK);
  try {
    const baseUrl = (typeof process !== 'undefined'
      ? ((process as any)?.env?.NEXT_PUBLIC_BACKEND_URL || (process as any)?.env?.BACKEND_URL)
      : '') || 'http://localhost:3001';
    const defaultUrl = `${baseUrl}`.replace(/\/$/, '') + `/api/rag/summary`;
    const url = (endpointUrl && String(endpointUrl).startsWith('http'))
      ? endpointUrl
      : (endpointUrl ? `${baseUrl}`.replace(/\/$/, '') + `${String(endpointUrl).startsWith('/') ? '' : '/'}${endpointUrl}` : defaultUrl);

    const reqHeaders: Record<string, string> = { 'Content-Type': 'application/json', ...(headers || {}) };
    if (tenantId && !reqHeaders['x-tenant-id']) reqHeaders['x-tenant-id'] = tenantId;

    const payload: Record<string, any> = { text_query: String(q), top_k: k };
    if (typeof category === 'string' && category) payload.category = category;
    const res = await fetch(url, { method: 'POST', headers: reqHeaders, body: JSON.stringify(payload) });
    const data = await res.json().catch(() => ({}));
    return { success: true, query: q, ...data };
  } catch (e: any) {
    return { success: false, error: e?.message || 'rag_error' };
  }
};
