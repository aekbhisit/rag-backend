export interface OpenSearchClient {
  indices: {
    exists(params: { index: string }): Promise<{ body: boolean } | boolean>;
    create(params: { index: string; body: any }): Promise<any>;
    putMapping(params: { index: string; body: any }): Promise<any>;
  };
  index(params: { index: string; id?: string; body: any; refresh?: boolean | 'wait_for' }): Promise<any>;
  search(params: { index: string; body: any }): Promise<any>;
  update(params: { index: string; id: string; body: any }): Promise<any>;
  cluster: { health(): Promise<{ status?: string } | any> };
}

export function getOpenSearchClient(): OpenSearchClient {
  const baseUrl = process.env.OPENSEARCH_URL || 'http://localhost:9200';
  const authHeader = buildAuthHeader();

  async function http(method: string, path: string, body?: any): Promise<Response> {
    const url = `${baseUrl}${path}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authHeader) headers['Authorization'] = authHeader;
    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return res;
  }

  return {
    indices: {
      async exists({ index }) {
        const res = await http('HEAD', `/${encodeURIComponent(index)}`);
        return res.ok;
      },
      async create({ index, body }) {
        const res = await http('PUT', `/${encodeURIComponent(index)}`, body || {});
        if (!res.ok) {
          const text = await safeText(res);
          throw new Error(`OpenSearch create index failed: ${res.status} ${text}`);
        }
        return await safeJson(res);
      },
      async putMapping({ index, body }) {
        const res = await http('PUT', `/${encodeURIComponent(index)}/_mapping`, body || {});
        if (!res.ok) {
          const text = await safeText(res);
          throw new Error(`OpenSearch put mapping failed: ${res.status} ${text}`);
        }
        return await safeJson(res);
      },
    },
    async index({ index, id, body, refresh }) {
      const qs = refresh ? `?refresh=${refresh === true ? 'true' : refresh}` : '';
      const path = id
        ? `/${encodeURIComponent(index)}/_doc/${encodeURIComponent(id)}${qs}`
        : `/${encodeURIComponent(index)}/_doc${qs}`;
      const res = await http('POST', path, body);
      if (!res.ok) {
        const text = await safeText(res);
        throw new Error(`OpenSearch index failed: ${res.status} ${text}`);
      }
      return await safeJson(res);
    },
    async search({ index, body }) {
      const res = await http('POST', `/${encodeURIComponent(index)}/_search`, body || {});
      if (!res.ok) {
        const text = await safeText(res);
        throw new Error(`OpenSearch search failed: ${res.status} ${text}`);
      }
      return await safeJson(res);
    },
    async update({ index, id, body }) {
      const res = await http('POST', `/${encodeURIComponent(index)}/_update/${encodeURIComponent(id)}`, body || {});
      if (!res.ok) {
        const text = await safeText(res);
        throw new Error(`OpenSearch update failed: ${res.status} ${text}`);
      }
      return await safeJson(res);
    },
    cluster: {
      async health() {
        const res = await http('GET', '/_cluster/health');
        return await safeJson(res).catch(() => ({ status: res.ok ? 'green' : 'red' }));
      }
    },
  };
}

function buildAuthHeader(): string | null {
  const user = process.env.OPENSEARCH_USERNAME;
  const pass = process.env.OPENSEARCH_PASSWORD;
  if (user && pass) return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
  return null;
}

async function safeJson(res: Response): Promise<any> {
  try { return await res.json(); } catch { return {}; }
}

async function safeText(res: Response): Promise<string> {
  try { return await res.text(); } catch { return ''; }
}


