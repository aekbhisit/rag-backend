const DEFAULT_TIMEOUT = 8000;
const DEFAULT_ALLOWED_DOMAINS = [
  'example.com',
  'api.example.com'
];

function isAllowedUrl(urlStr: string, allowedDomains: string[]): boolean {
  try {
    const u = new URL(urlStr);
    return allowedDomains.includes(u.hostname);
  } catch { return false; }
}

export const httpRequestHandler = async (args: any) => {
  const { method, url, headers, body, timeoutMs, allowedDomains } = args || {};
  const domainWhitelist: string[] = Array.isArray(allowedDomains) && allowedDomains.length > 0
    ? allowedDomains
    : DEFAULT_ALLOWED_DOMAINS;
  if (!isAllowedUrl(url, domainWhitelist)) {
    return { success: false, error: 'URL not allowed' };
  }
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), Math.min(timeoutMs || DEFAULT_TIMEOUT, 15000));
  try {
    const init: RequestInit = { method, headers, signal: controller.signal } as any;
    if (typeof body === 'string' || body == null) init.body = body as any;
    else init.body = JSON.stringify(body);
    const res = await fetch(url, init);
    const text = await res.text();
    return { success: true, status: res.status, headers: Object.fromEntries(res.headers.entries()), body: text };
  } catch (e: any) {
    return { success: false, error: e?.message || 'request_failed' };
  } finally { clearTimeout(id); }
};
