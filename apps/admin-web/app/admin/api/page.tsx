"use client";

import React from "react";
import { BACKEND_URL, DEFAULT_TENANT_ID, getTenantId } from "../../../components/config";
import { useTranslation } from "../../../hooks/useTranslation";

type Method = "GET" | "POST";

type Ep = { key: string; method: Method; path: string; summary?: string; params?: any[]; requestBodySchema?: any };

export default function ApiPage() {
  const { t, mounted: translationMounted } = useTranslation();
  const [tenantId, setTenantId] = React.useState<string>(() => getTenantId());

  React.useEffect(() => {
    if (!tenantId) return;
    if (tenantId === '00000000-0000-0000-0000-000000000000') return;
    try { localStorage.setItem('tenantId', tenantId); } catch {}
  }, [tenantId]);
  const [spec, setSpec] = React.useState<any>(null);
  const [endpoints, setEndpoints] = React.useState<Ep[]>([]);
  const [selected, setSelected] = React.useState<Ep | null>(null);
  const [importType, setImportType] = React.useState<'text'|'document'|'website'|'place'|'ticket'>('text');
  const [serverBase, setServerBase] = React.useState<string>('/api');
  const [pathParams, setPathParams] = React.useState<Record<string, string>>({});
  const [queryParams, setQueryParams] = React.useState<Record<string, string>>({});
  const [body, setBody] = React.useState<any>({});
  const [bodyText, setBodyText] = React.useState<string>("{}");
  const [jsonError, setJsonError] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const [status, setStatus] = React.useState<string>("");
  const [latency, setLatency] = React.useState<number | undefined>(undefined);
  const [result, setResult] = React.useState<any>(undefined);
  const [copied, setCopied] = React.useState<string>("");

  const copyToClipboard = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(""), 1200);
    } catch {}
  };

  React.useEffect(() => {
    fetch(`${BACKEND_URL}/api/docs/openapi.json`)
      .then(r => r.json())
      .then((s) => {
        setSpec(s);
        const base = (s?.servers?.[0]?.url as string) || '/api';
        setServerBase(base.startsWith('/') ? base : `/${base}`);
        const eps: Ep[] = [];
        const paths = s?.paths || {};
        Object.entries(paths).forEach(([path, ops]: any) => {
          ["get", "post"].forEach((m) => {
            if (ops?.[m]) {
              const op = ops[m];
              const key = `${m.toUpperCase()} ${path}`;
              const params = Array.isArray(op.parameters) ? op.parameters : [];
              const requestBodySchema = op?.requestBody?.content?.["application/json"]?.schema;
              eps.push({ key, method: m.toUpperCase() as Method, path, summary: op.summary, params, requestBodySchema });
            }
          });
        });
        setEndpoints(eps);
        setSelected(eps[0] || null);
      })
      .catch(() => setSpec(null));
  }, []);

  React.useEffect(() => {
    if (!selected) return;
    const qp: Record<string, string> = {};
    const pp: Record<string, string> = {};
    (selected.params || []).forEach((p) => {
      if (p.in === 'query') qp[p.name] = p.schema?.default ?? '';
      if (p.in === 'path') pp[p.name] = '';
    });
    setQueryParams(qp);
    setPathParams(pp);
    if (selected.method === 'POST') {
      const initial = buildExampleFromSchema(selected.requestBodySchema);
      setBody((prev: any) => (prev && Object.keys(prev).length > 0 ? prev : initial));
      setBodyText((prev: string) => (prev && prev.trim().length > 2 ? prev : JSON.stringify(initial, null, 2)));
      setJsonError("");
    } else {
      setBody({});
      setBodyText("{}");
      setJsonError("");
    }
    setResult(undefined);
    setStatus('');
    setLatency(undefined);
  }, [selected?.key]);

  // When selecting type for import endpoint, replace body template with that variant's example
  React.useEffect(() => {
    if (!selected || selected.method !== 'POST') return;
    if (!selected.path.endsWith('/admin/contexts/import')) return;
    try {
      // Try to use OpenAPI example for the chosen oneOf variant
      const schema = selected.requestBodySchema;
      const variants = Array.isArray(schema?.oneOf) ? schema.oneOf : [];
      const idx = { text: 0, document: 1, website: 2, place: 3, ticket: 4 }[importType] ?? 0;
      const chosen = variants[idx];
      const ex = (chosen && chosen.example) ? chosen.example : buildExampleFromSchema(chosen || schema);
      setBody(ex);
      setBodyText(JSON.stringify(ex, null, 2));
      setJsonError("");
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importType, selected?.key]);

  function buildExampleFromSchema(schema: any): any {
    if (!schema) return {};
    const t = schema.type;
    if (t === 'object' && schema.properties) {
      const out: any = {};
      for (const [k, v] of Object.entries<any>(schema.properties)) {
        out[k] = buildExampleFromSchema(v);
      }
      return out;
    }
    if (t === 'array') {
      return [buildExampleFromSchema(schema.items || {})];
    }
    if (schema.example !== undefined) return schema.example;
    if (schema.default !== undefined) return schema.default;
    if (t === 'string') return '';
    if (t === 'integer' || t === 'number') return 0;
    if (t === 'boolean') return false;
    return null;
  }

  const resetBodyToSchema = () => {
    if (!selected) return;
    const ex = buildExampleFromSchema(selected.requestBodySchema);
    setBody(ex);
    setBodyText(JSON.stringify(ex, null, 2));
    setJsonError("");
  };

  const makeCurl = (url: string, method: Method, headers: Record<string, string>, body?: any) => {
    const headerFlags = Object.entries(headers).map(([k, v]) => `-H ${JSON.stringify(`${k}: ${v}`)}`).join(' ');
    const dataFlag = method === 'POST' && body ? `-d ${JSON.stringify(JSON.stringify(body))}` : '';
    return `curl -X ${method} ${headerFlags} ${dataFlag} ${JSON.stringify(url)}`.trim();
  };

  const execute = async () => {
    if (!selected) return;
    try {
      setLoading(true);
      setResult(undefined);
      setStatus("");
      setLatency(undefined);
      const headers: any = { "X-Tenant-ID": tenantId };
      let path = joinPaths(serverBase, selected.path);
      Object.entries(pathParams).forEach(([k, v]) => {
        path = path.replace(new RegExp(`{${k}}`, 'g'), encodeURIComponent(v)).replace(new RegExp(`:${k}`, 'g'), encodeURIComponent(v));
      });
      let url = `${BACKEND_URL}${path}`;
      const init: RequestInit = { method: selected.method };
      if (selected.method === 'GET') {
        const params = new URLSearchParams();
        Object.entries(queryParams).forEach(([k, v]) => { if (v !== undefined && v !== '') params.set(k, String(v)); });
        const qs = params.toString();
        if (qs) url += `?${qs}`;
      } else {
        let parsed: any;
        try {
          parsed = JSON.parse(bodyText || '{}');
          setBody(parsed);
          setJsonError("");
        } catch (e: any) {
          setJsonError('Invalid JSON');
          setStatus('error: Invalid JSON body');
          setLoading(false);
          return;
        }
        headers["Content-Type"] = "application/json";
        init.body = JSON.stringify(parsed ?? {});
      }
      init.headers = headers;
      const started = performance.now();
      const res = await fetch(url, init);
      const elapsed = performance.now() - started;
      setLatency(Math.round(elapsed));
      setStatus(`${res.status} ${res.statusText}`);
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) setResult(await res.json());
      else setResult(await res.text());
    } catch (e: any) {
      setStatus(`error: ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  // Precompute response and curl text for copy buttons
  const responseText = result ? JSON.stringify(result, null, 2) : '—';
  const curlText = (() => {
    if (!selected) return '';
    const headers: any = { 'X-Tenant-ID': tenantId, ...(selected.method === 'POST' ? { 'Content-Type': 'application/json' } : {}) };
    const url = buildUrlPreview(BACKEND_URL, serverBase, selected.path, pathParams, queryParams);
    let parsedBody: any = undefined;
    if (selected.method === 'POST') {
      try { parsedBody = JSON.parse(bodyText || '{}'); } catch { parsedBody = body; }
    }
    return makeCurl(url, selected.method, headers, parsedBody);
  })();

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {translationMounted ? t('apiDocs') : 'API Docs & Test'}
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => spec && downloadPostmanCollection(spec)}
            className="h-8 px-3 rounded border text-sm"
            disabled={!spec}
          >Export Postman</button>
          <button
            onClick={() => window.open(`${BACKEND_URL}/api/docs/openapi.json`, '_blank', 'noopener,noreferrer')}
            className="h-8 px-3 rounded border text-sm"
          >OpenAPI JSON</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 space-y-3">
          <div>
            <label className="text-sm font-medium">{translationMounted ? t('tenantId') : 'Tenant ID'}</label>
            <input value={tenantId} onChange={e => setTenantId(e.target.value)} className="w-full mt-1 border rounded px-2 py-1" />
          </div>
          <div>
            <label className="text-sm font-medium">{translationMounted ? t('apiEndpoint') : 'Endpoint'}</label>
            <select value={selected?.key || ''} onChange={(e) => setSelected(endpoints.find(x => x.key === e.target.value) || null)} className="w-full mt-1 border rounded px-2 py-1">
              {endpoints.map(ep => <option key={ep.key} value={ep.key}>{ep.key}</option>)}
            </select>
            {selected?.summary && <p className="text-xs text-gray-600 mt-1">{selected.summary}</p>}
          </div>

          {(selected?.params || []).filter((p: any) => p.in === 'path').map((p: any) => (
            <div key={p.name}>
              <label className="text-sm font-medium">{p.name} (path)</label>
              <input value={pathParams[p.name] || ''} onChange={e => setPathParams(prev => ({ ...prev, [p.name]: e.target.value }))} className="w-full mt-1 border rounded px-2 py-1" placeholder={p.schema?.type || 'string'} />
            </div>
          ))}

          {(selected?.params || []).filter((p: any) => p.in === 'query').length > 0 && (
            <div className="space-y-2">
              {(selected?.params || []).filter((p: any) => p.in === 'query').map((p: any) => (
                <div key={p.name}>
                  <label className="text-xs font-medium">{p.name} (query)</label>
                  <input value={queryParams[p.name] || ''} onChange={e => setQueryParams(prev => ({ ...prev, [p.name]: e.target.value }))} className="w-full mt-1 border rounded px-2 py-1" placeholder={p.schema?.type || 'string'} />
                </div>
              ))}
            </div>
          )}

          {selected && selected.method === 'POST' && (
            <div>
              <label className="text-sm font-medium">{translationMounted ? t('apiBody') : 'Body (JSON)'}</label>
              {selected.path.endsWith('/admin/contexts/import') && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-gray-600">Type</span>
                  <select value={importType} onChange={e => setImportType(e.target.value as any)} className="h-7 px-2 border rounded text-xs">
                    <option value="text">text</option>
                    <option value="document">document</option>
                    <option value="website">website</option>
                    <option value="place">place</option>
                    <option value="ticket">ticket</option>
                  </select>
                </div>
              )}
              <textarea
                rows={selected?.key?.startsWith('POST /api/rag/summary') ? 18 : 12}
                style={{ minHeight: ((selected?.key?.startsWith('POST /api/rag/summary') ? 18 : 12) * 24) + 'px' }}
                value={bodyText}
                onChange={e => {
                  const t = e.target.value;
                  setBodyText(t);
                  try { const parsed = JSON.parse(t); setBody(parsed); setJsonError(""); } catch { setJsonError('Invalid JSON'); }
                }}
                className="w-full mt-1 border rounded px-2 py-1 font-mono text-sm"
              />
              <div className="flex items-center gap-2 mt-1">
                <button onClick={resetBodyToSchema} className="h-7 px-2 rounded border text-xs">Reset to schema</button>
                <button onClick={() => copyToClipboard('body', bodyText)} className="h-7 px-2 rounded border text-xs">{translationMounted ? t('apiCopy') : 'Copy'}</button>
                {jsonError && <span className="text-xs text-red-600">{jsonError}</span>}
                {copied === 'body' && <span className="text-xs text-green-600">Copied</span>}
              </div>
            </div>
          )}

          <button onClick={execute} disabled={loading} className="h-9 px-4 rounded bg-black text-white disabled:opacity-50">
            {loading ? 'Sending…' : (translationMounted ? t('apiSend') : 'Send')}
          </button>
          {status && (
            <div className="text-sm text-gray-600">
              {translationMounted ? t('status') : 'Status'}: {status}{latency !== undefined ? ` • ${latency} ms` : ''}
            </div>
          )}
        </div>
        <div className="md:col-span-2 space-y-3 min-w-0">
          {selected && (
            <div className="border rounded p-3">
              <div className="flex items-center gap-2 text-sm mb-1">
                <span className={`px-2 py-0.5 rounded text-white ${selected.method === 'GET' ? 'bg-green-600' : 'bg-blue-600'}`}>{selected.method}</span>
                <code className="text-[13px]">{selected.path}</code>
              </div>
              {selected.summary && <div className="text-sm text-gray-700 mb-3">{selected.summary}</div>}

              {(selected.params || []).length > 0 && (
                                  <div className="space-y-2">
                    <div className="text-sm font-medium">{translationMounted ? t('apiParams') : 'Parameters'}</div>
                    <div className="overflow-auto border rounded">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-3 py-2">{translationMounted ? t('name') : 'Name'}</th>
                            <th className="text-left px-3 py-2">{translationMounted ? t('apiMethod') : 'In'}</th>
                            <th className="text-left px-3 py-2">{translationMounted ? t('type') : 'Type'}</th>
                            <th className="text-left px-3 py-2">{translationMounted ? t('required') : 'Required'}</th>
                            <th className="text-left px-3 py-2">{translationMounted ? t('default') : 'Default'}</th>
                            <th className="text-left px-3 py-2">Enum</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selected.params || []).map((p: any) => (
                            <tr key={`${p.in}:${p.name}`} className="border-t">
                              <td className="px-3 py-2 font-mono text-[12px]">{p.name}</td>
                              <td className="px-3 py-2">{p.in}</td>
                              <td className="px-3 py-2">{p.schema?.type || ''}</td>
                              <td className="px-3 py-2">{p.required ? (translationMounted ? t('yes') : 'yes') : (translationMounted ? t('no') : 'no')}</td>
                              <td className="px-3 py-2">{p.schema?.default !== undefined ? String(p.schema.default) : ''}</td>
                              <td className="px-3 py-2">{Array.isArray(p.schema?.enum) ? p.schema.enum.join(', ') : ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
              )}

              {selected.method === 'POST' && selected.requestBodySchema && (
                <div className="space-y-2 mt-4">
                  <div className="text-sm font-medium">{translationMounted ? t('apiBody') : 'Request Body'}</div>
                  <div className="text-xs text-gray-600">JSON</div>
                  <div className="overflow-auto border rounded p-3 bg-gray-50 text-xs">
                    {renderSchema(selected.requestBodySchema)}
                  </div>
                </div>
              )}
            </div>
          )}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">{translationMounted ? t('apiResponse') : 'Response'}</label>
              <button onClick={() => copyToClipboard('resp', responseText)} className="h-7 px-2 rounded border text-xs">{translationMounted ? t('apiCopy') : 'Copy'}</button>
              {copied === 'resp' && <span className="text-xs text-green-600">Copied</span>}
            </div>
            <pre className="mt-1 p-3 border rounded bg-gray-50 overflow-auto max-h-[420px] text-sm"><code>{responseText}</code></pre>
          </div>
          {selected && (
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">cURL</label>
                <button onClick={() => copyToClipboard('curl', curlText)} className="h-7 px-2 rounded border text-xs">{translationMounted ? t('apiCopy') : 'Copy'}</button>
                {copied === 'curl' && <span className="text-xs text-green-600">Copied</span>}
              </div>
              <pre className="mt-1 p-3 border rounded bg-gray-50 overflow-auto text-xs"><code>{curlText}</code></pre>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function buildUrlPreview(base: string, serverBase: string, path: string, pathParams: Record<string, string>, queryParams: Record<string, string>): string {
  let p = joinPaths(serverBase, path);
  Object.entries(pathParams).forEach(([k, v]) => {
    p = p.replace(new RegExp(`{${k}}`, 'g'), encodeURIComponent(v || `{${k}}`)).replace(new RegExp(`:${k}`, 'g'), encodeURIComponent(v || `:${k}`));
  });
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(queryParams).filter(([, v]) => v !== undefined && v !== ''))).toString();
  return `${base}${p}${qs ? `?${qs}` : ''}`;
}

function renderSchema(schema: any, name?: string): any {
  if (!schema) return null;
  const t = schema.type || (schema.properties ? 'object' : undefined);
  if (t === 'object' && schema.properties) {
    return (
      <table className="min-w-full">
        <thead>
          <tr className="bg-white">
            <th className="text-left px-2 py-1">Field</th>
            <th className="text-left px-2 py-1">Type</th>
            <th className="text-left px-2 py-1">Details</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries<any>(schema.properties).map(([k, v]) => (
            <tr key={k} className="border-t">
              <td className="px-2 py-1 font-mono text-[12px]">{k}</td>
              <td className="px-2 py-1">{v.type || (v.properties ? 'object' : '')}</td>
              <td className="px-2 py-1">
                {Array.isArray(v.enum) && <span>enum: {v.enum.join(', ')} </span>}
                {v.default !== undefined && <span>default: {String(v.default)} </span>}
                {v.items && <div className="mt-1 ml-2">items: {renderSchema(v.items)}</div>}
                {v.properties && <div className="mt-1 ml-2">{renderSchema(v)}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  if (t === 'array') {
    return <div>array of {renderSchema(schema.items)}</div>;
  }
  return <span>{t || 'any'}</span>;
}

function joinPaths(a: string, b: string): string {
  const left = a.endsWith('/') ? a.slice(0, -1) : a;
  const right = b.startsWith('/') ? b : `/${b}`;
  return `${left}${right}`;
}

function downloadPostmanCollection(openapi: any) {
  const collection = openapiToPostman(openapi);
  const blob = new Blob([JSON.stringify(collection, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'rag-public-api.postman_collection.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function openapiToPostman(openapi: any) {
  const name = openapi?.info?.title || 'API';
  const baseUrl = (openapi?.servers?.[0]?.url || '/api').replace(/\/$/, '');
  const paths = openapi?.paths || {};
  const items: any[] = [];
  Object.entries(paths).forEach(([path, ops]: any) => {
    ["get", "post"].forEach((m) => {
      if (!ops?.[m]) return;
      const op = ops[m];
      const urlPath = path.replace(/\{(.*?)\}/g, ':$1');
      const baseReq = () => ({
        method: m.toUpperCase(),
        header: [
          { key: 'X-Tenant-ID', value: '{{X_TENANT_ID}}' },
          ...(m === 'post' ? [{ key: 'Content-Type', value: 'application/json' }] : [])
        ],
        url: {
          raw: `{{BASE_URL}}${baseUrl}${urlPath}`,
          host: ['{{BASE_URL}}'],
          path: (baseUrl + urlPath).split('/').filter(Boolean)
        }
      });
      // Special handling: expand oneOf variants for import endpoint
      if (m === 'post' && path === '/admin/contexts/import' && Array.isArray(op?.requestBody?.content?.['application/json']?.schema?.oneOf)) {
        const variants: any[] = op.requestBody.content['application/json'].schema.oneOf;
        const typeNames = ['text','document','website','place','ticket'];
        variants.forEach((variant: any, i: number) => {
          items.push({
            name: `${m.toUpperCase()} ${path} (${typeNames[i] || 'variant'})`,
            request: {
              ...baseReq(),
              body: { mode: 'raw', raw: JSON.stringify(variant.example ?? exampleFromSchema(variant), null, 2) }
            }
          });
        });
        return;
      }
      const req: any = {
        name: `${m.toUpperCase()} ${path}`,
        request: {
          ...baseReq(),
          ...(m === 'post' ? { body: { mode: 'raw', raw: JSON.stringify(exampleFromSchema(op?.requestBody?.content?.['application/json']?.schema) ?? {}, null, 2) } } : {})
        }
      };
      const qps = (op.parameters || []).filter((p: any) => p.in === 'query');
      if (qps.length) {
        req.request.url.query = qps.map((p: any) => ({ key: p.name, value: String(p.schema?.default ?? '') }));
      }
      items.push(req);
    });
  });
  return {
    info: {
      name,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      description: openapi?.info?.description || ''
    },
    item: items,
    variable: [
      { key: 'BASE_URL', value: window?.location?.origin || '' },
      { key: 'X_TENANT_ID', value: (typeof window !== 'undefined' ? (localStorage.getItem('tenantId') || DEFAULT_TENANT_ID) : DEFAULT_TENANT_ID) }
    ]
  };
}

function exampleFromSchema(schema: any): any {
  if (!schema) return {};
  const t = schema.type;
  if (t === 'object' && schema.properties) {
    const out: any = {};
    for (const [k, v] of Object.entries<any>(schema.properties)) out[k] = exampleFromSchema(v);
    return out;
  }
  if (t === 'array') return [exampleFromSchema(schema.items || {})];
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (t === 'string') return '';
  if (t === 'number' || t === 'integer') return 0;
  if (t === 'boolean') return false;
  return null;
}