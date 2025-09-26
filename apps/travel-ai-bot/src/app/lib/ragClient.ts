// Lightweight RAG API client with retries/backoff
// Uses fetch on the server and always sets X-Tenant-ID (default targets https://rag.haahii.com)

export interface RagClientOptions {
  baseUrl?: string; // default https://rag.haahii.com
  tenantId: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export class RagClient {
  private readonly baseUrl: string;
  private readonly tenantId: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(opts: RagClientOptions) {
    this.baseUrl = (opts.baseUrl || process.env.RAG_BASE_URL || 'https://rag.haahii.com').replace(/\/$/, '');
    this.tenantId = opts.tenantId;
    const parsedTimeout = Number(process.env.RAG_CLIENT_TIMEOUT_MS);
    const parsedRetries = Number(process.env.RAG_CLIENT_MAX_RETRIES);
    this.timeoutMs = opts.timeoutMs ?? (Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : 30000);
    this.maxRetries = opts.maxRetries ?? (Number.isFinite(parsedRetries) && parsedRetries >= 0 ? parsedRetries : 0);
  }

  private async request(path: string, init: RequestInit & { retryCodes?: number[] } = {}) {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'X-Tenant-ID': this.tenantId,
      ...(init.headers as Record<string, string> | undefined),
    };

    const retryCodes = init.retryCodes ?? [429, 500, 502, 503, 504];
    let attempt = 0;
    let lastError: any;

    while (attempt <= this.maxRetries) {
      // New controller per attempt to avoid leaking abort signals across retries
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const res = await fetch(url, { ...init, headers, signal: controller.signal });
        clearTimeout(timer);
        if (!res.ok) {
          if (retryCodes.includes(res.status) && attempt < this.maxRetries) {
            attempt++;
            const backoff = 250 * Math.pow(2, attempt);
            await new Promise(r => setTimeout(r, backoff));
            continue;
          }
          const text = await res.text().catch(() => '');
          throw new Error(`RAG request failed ${res.status}: ${text}`);
        }
        return res;
      } catch (err: any) {
        clearTimeout(timer);
        lastError = err;
        const isAbort = err?.name === 'AbortError' || /aborted/i.test(String(err?.message || ''));
        attempt++;
        if (attempt > this.maxRetries) {
          if (isAbort) {
            throw new Error('RAG upstream timeout');
          }
          throw lastError;
        }
        const backoff = 250 * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, backoff));
      }
    }
    throw lastError || new Error('Unknown RAG error');
  }

  // Endpoints
  public async getContexts(params: Record<string, string | number | undefined> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && `${v}` !== '') query.set(k, `${v}`);
    });
    const res = await this.request(`/api/contexts${query.toString() ? `?${query.toString()}` : ''}`);
    return res.json();
  }

  public async getContextById(id: string) {
    const res = await this.request(`/api/contexts/${encodeURIComponent(id)}`);
    return res.json();
  }

  public async ragSummary(body: any) {
    const res = await this.request('/api/rag/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  public async ragPlace(body: any) {
    const res = await this.request('/api/rag/place', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  public async ragContexts(body: any) {
    const res = await this.request('/api/rag/contexts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  // Categories
  public async getCategories() {
    const res = await this.request('/api/categories');
    return res.json();
  }

  public async createCategory(body: { name: string; slug: string }) {
    const res = await this.request('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  }
}

export function createRagClient(tenantId: string, baseUrl?: string) {
  return new RagClient({ tenantId, baseUrl });
}


