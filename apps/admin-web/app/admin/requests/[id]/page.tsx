"use client";

import React from "react";
import { useParams } from "next/navigation";
import { BACKEND_URL, getTenantId } from "../../../../components/config";
import { formatDateForTable } from "../../../../utils/timezone";
import { useAuth } from "../../../../components/AuthProvider";

export default function RequestDetailPage() {
  const params = useParams() as { id?: string };
  const id = params?.id || '';
  const [item, setItem] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [usage, setUsage] = React.useState<any[]>([]);
  const { userTimezone } = useAuth();



  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const r = await fetch(`${BACKEND_URL}/api/admin/requests/${encodeURIComponent(id)}`, {
          headers: { 'X-Tenant-ID': getTenantId() },
        });
        if (r.ok) {
          const json = await r.json();
          setItem(json);
          // load usage linked to this request
          try {
            const u = await fetch(`${BACKEND_URL}/api/admin/ai-usage?range=7d&request_id=${encodeURIComponent(json.id)}&size=50`, { headers: { 'X-Tenant-ID': getTenantId() } });
            if (u.ok) {
              const uj = await u.json();
              setUsage(uj.items || []);
            }
          } catch {}
        }
      } finally { setLoading(false); }
    };
    if (id) load();
  }, [id]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (!item) return <div className="p-6">Not found</div>;

  // Derive embedding/generating usage from list
  const linked = usage.filter(u => (u.request_id || '') === item.id);
  const findByOp = (op: string) => linked.find(u => (u.operation || '').toLowerCase() === op) || usage.find(u => (u.operation || '').toLowerCase() === op);
  const emb = findByOp('embedding');
  const gen = findByOp('generate');

  const pickNum = (v: any) => (typeof v === 'number' ? v : (v != null ? Number(v) : undefined));

  const buildEmbeddingMeta = () => {
    if (!emb) return undefined as any;
    return {
      provider: emb.provider || undefined,
      model: emb.model || undefined,
      usage: {
        prompt_tokens: emb.usage_input_tokens ?? emb.usage?.input_tokens ?? undefined,
        total_tokens: emb.usage_total_tokens ?? emb.usage?.total_tokens ?? undefined,
      },
      cost: {
        input_usd: emb.cost_input_usd ?? undefined,
        output_usd: emb.cost_output_usd ?? undefined,
        total_usd: emb.cost_total_usd ?? undefined,
        currency: emb.cost_currency || undefined,
        source: emb.cost_source || undefined,
      },
      latency_ms: emb.latency_ms ?? undefined,
      ai_usage_log_id: emb.id || undefined,
    };
  };

  const buildGeneratingMeta = () => {
    if (!gen) return undefined as any;
    return {
      provider: gen.provider || undefined,
      model: gen.model || undefined,
      usage: {
        prompt_tokens: gen.usage_input_tokens ?? gen.usage?.input_tokens ?? undefined,
        cached_input_tokens: gen.usage_cached_input_tokens ?? gen.usage?.cached_input_tokens ?? undefined,
        completion_tokens: gen.usage_output_tokens ?? gen.usage?.output_tokens ?? undefined,
        total_tokens: gen.usage_total_tokens ?? gen.usage?.total_tokens ?? undefined,
      },
      cost: {
        input_usd: gen.cost_input_usd ?? undefined,
        output_usd: gen.cost_output_usd ?? undefined,
        total_usd: gen.cost_total_usd ?? undefined,
        currency: gen.cost_currency || undefined,
        source: gen.cost_source || undefined,
      },
      latency_ms: gen.latency_ms ?? undefined,
      ai_usage_log_id: gen.id || undefined,
    };
  };

  // Build a full response JSON for display
  const responsePreview = {
    answer: item.answer_text ?? '',
    answer_status: !!item.answer_status,
    answer_sources: Array.isArray(item.contexts_used) ? item.contexts_used : [],
    context_sources: Array.isArray(item.contexts_used) ? item.contexts_used : [],
    meta: {
      rag_request_log_id: item.id,
      embedding: buildEmbeddingMeta(),
      generating: buildGeneratingMeta(),
    }
  };

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold">RAG Request</h1>
      {/* Block 1: Overview + Cost (left) | Request Body (right) */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="border rounded p-3">
          <div className="text-sm font-medium mb-2">Overview</div>
          <div className="text-sm"><b>ID:</b> {item.id}</div>
          <div className="text-sm"><b>Endpoint:</b> {item.endpoint}</div>
          <div className="text-sm"><b>Time:</b> {formatDateForTable(item.created_at, userTimezone)}</div>
          <div className="text-sm"><b>Latency:</b> {item.latency_ms} ms</div>
          <div className="text-sm"><b>Model:</b> {item.model}</div>
          <div className="text-sm"><b>Answer status:</b> {item.answer_status ? 'OK' : 'NO'}</div>
          <div className="text-sm"><b>Sources:</b>{' '}
            {(item.contexts_used || []).length === 0 ? (
              <span>—</span>
            ) : (
              <span className="inline-flex flex-wrap gap-2">
                {(item.contexts_used || []).map((cid: string) => (
                  <a key={cid} href={`/admin/contexts/edit/${encodeURIComponent(cid)}`} className="underline text-[color:var(--primary)]" target="_blank" rel="noreferrer">
                    {cid}
                  </a>
                ))}
              </span>
            )}
          </div>
          {usage.length > 0 && (() => {
            const getTokens = (u: any) => (u?.usage_total_tokens ?? u?.usage?.total_tokens ?? '—');
            const getCost = (u: any) => {
              const c = (u?.cost_total_usd ?? u?.cost?.total_usd);
              return c != null ? Number(c).toFixed(6) : '—';
            };
            const embRow = emb; const genRow = gen;
            return (
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div><b>Embedding tokens:</b> <a className="underline" href={`/admin/ai-usage?request_id=${encodeURIComponent(item.id)}`} target="_blank" rel="noreferrer">{embRow ? getTokens(embRow) : '—'}</a></div>
                <div><b>Embedding cost (USD):</b> {embRow ? getCost(embRow) : '—'}</div>
                <div><b>Generation tokens:</b> <a className="underline" href={`/admin/ai-usage?request_id=${encodeURIComponent(item.id)}`} target="_blank" rel="noreferrer">{genRow ? getTokens(genRow) : '—'}</a></div>
                <div><b>Generation cost (USD):</b> {genRow ? getCost(genRow) : '—'}</div>
              </div>
            );
          })()}
        </div>
        <div className="border rounded p-3">
          <div className="text-sm font-medium mb-2">Request Body</div>
          <pre className="text-xs bg-gray-50 rounded p-2 overflow-auto max-h-[360px] whitespace-pre-wrap break-words"><code>{JSON.stringify(item.request_body, null, 2)}</code></pre>
        </div>
      </div>

      {/* Block 2: Prompt (left) | Response (right) */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="border rounded p-3">
          <div className="text-sm font-medium mb-2">Prompt</div>
          <textarea className="w-full text-xs bg-gray-50 rounded p-2 border whitespace-pre-wrap break-words h-[240px]" readOnly rows={15} value={item.prompt_text ?? ''} />
        </div>
        <div className="border rounded p-3">
          <div className="text-sm font-medium mb-2">Response</div>
          <pre className="text-xs bg-gray-50 rounded p-2 overflow-auto h-[240px] whitespace-pre-wrap break-words"><code>{JSON.stringify(responsePreview, null, 2)}</code></pre>
        </div>
      </div>

      {/* Block 3: Other data */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="border rounded p-3">
          <div className="text-sm font-medium mb-2">Attributes</div>
          <div className="text-sm"><b>Prompt Key:</b> {item.prompt_key || '-'}</div>
          <div className="text-sm"><b>Intent Scope:</b> {item.intent_scope || '-'}</div>
          <div className="text-sm"><b>Intent Action:</b> {item.intent_action || '-'}</div>
          <div className="text-sm"><b>Intent Detail:</b> {item.intent_detail || '-'}</div>
        </div>
        <div className="border rounded p-3">
          <div className="text-sm font-medium mb-2">Prompt Params</div>
          <pre className="text-xs bg-gray-50 rounded p-2 overflow-auto max-h-[360px] whitespace-pre-wrap break-words"><code>{JSON.stringify(item.prompt_params || {}, null, 2)}</code></pre>
        </div>
        <div className="border rounded p-3 md:col-span-2">
          <div className="text-sm font-medium mb-2">Raw</div>
          <pre className="text-xs bg-gray-50 rounded p-2 overflow-auto max-h-[360px] whitespace-pre-wrap break-words"><code>{JSON.stringify(item, null, 2)}</code></pre>
        </div>
      </div>
    </main>
  );
}


