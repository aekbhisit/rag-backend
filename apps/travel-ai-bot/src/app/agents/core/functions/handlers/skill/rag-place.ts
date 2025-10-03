import { getApiUrl } from '@/app/lib/apiHelper';

export interface RagPlaceArgs {
  searchQuery?: string;
  category?: string;
  lat?: number;
  long?: number;
  maxDistanceKm?: number;
  maxResults?: number;
  // Optional overrides injected via DB mapping/overrides
  endpointUrl?: string; // e.g., "/services/rag/place" or full URL
  tenantId?: string;
  headers?: Record<string, string>;
  distance_weight?: number;
  fulltext_weight?: number;
  semantic_weight?: number;
}

export const ragPlaceSearchHandler = async (args: RagPlaceArgs) => {
  try {
    const payload: any = {
      conversation_history: "",
      text_query: String(args?.searchQuery || ''),
      simantic_query: "",
      intent_scope: "",
      intent_action: "",
      category: args?.category || "",
      lat: typeof args?.lat === 'number' ? args.lat : undefined,
      long: typeof args?.long === 'number' ? args.long : undefined,
      max_distance_km: typeof args?.maxDistanceKm === 'number' ? args.maxDistanceKm : 5,
      distance_weight: typeof args?.distance_weight === 'number' ? args.distance_weight : 1,
      top_k: typeof args?.maxResults === 'number' ? args.maxResults : 3,
      min_score: 0.5,
      fulltext_weight: typeof args?.fulltext_weight === 'number' ? args.fulltext_weight : 0.5,
      semantic_weight: typeof args?.semantic_weight === 'number' ? args.semantic_weight : 0.5,
      prompt_key: "",
      prompt_params: null as any,
    };
    // Compute target endpoint
    // Use direct backend URL for chat handlers
    const baseUrl = (typeof process !== 'undefined'
      ? ((process as any)?.env?.NEXT_PUBLIC_BACKEND_URL || (process as any)?.env?.BACKEND_URL)
      : '') || 'http://localhost:3100';
    const defaultUrl = `${baseUrl}`.replace(/\/$/, '') + `/api/rag/place`;
    const url = (args?.endpointUrl && args.endpointUrl.startsWith('http'))
      ? args.endpointUrl
      : (args?.endpointUrl ? `${baseUrl}`.replace(/\/$/, '') + `${String(args.endpointUrl).startsWith('/') ? '' : '/'}${args.endpointUrl}` : defaultUrl);

    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(args?.headers || {}) };
    if (args?.tenantId && !headers['x-tenant-id']) headers['x-tenant-id'] = args.tenantId;

    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
    const data = await res.json().catch(() => ({}));
    const results = data?.results || data?.places || data?.data || [];
    return { success: true, results, totalResults: Array.isArray(results) ? results.length : 0 };
  } catch (e: any) {
    return { success: false, error: e?.message || 'rag place search failed' };
  }
};


