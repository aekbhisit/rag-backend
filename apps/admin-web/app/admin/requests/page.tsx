"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { BACKEND_URL, getTenantId } from "../../../components/config";
import { Pagination } from "../../../components/ui/Pagination";

type LogItem = {
  id: string;
  endpoint: string;
  query: string;
  prompt_key?: string;
  prompt_text?: string;
  model?: string;
  answer_status: boolean;
  latency_ms?: number;
  contexts_used?: string[];
  created_at?: string;
};

export default function RequestsPage() {
  const router = useRouter();
  const [base, setBase] = React.useState(BACKEND_URL);
  const [items, setItems] = React.useState<LogItem[]>([]);
  const [summary, setSummary] = React.useState<{ totalCost: number; totalTokens: number } | null>(null);
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [size, setSize] = React.useState(20);
  const [total, setTotal] = React.useState(0);

  const search = async () => {
    setLoading(true);
    try {
      const url = `${base}/api/admin/requests?page=${page}&size=${size}${q ? `&q=${encodeURIComponent(q)}` : ''}`;
      const tenantId = getTenantId();
      const [r, s] = await Promise.all([
        fetch(url, { headers: { 'X-Tenant-ID': tenantId } }),
        fetch(`${base}/api/admin/ai-costs/summary?range=7d`, { headers: { 'X-Tenant-ID': tenantId } }),
      ]);
      const data = await r.json();
      setItems(r.ok ? (data.items || []) : []);
      setTotal(data.total || (data.items?.length || 0));
      const js = await s.json().catch(() => null);
      setSummary(s.ok ? (js?.summary || null) : null);
    } finally { setLoading(false); }
  };

  React.useEffect(() => { search(); }, [page, size, q]);

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">RAG Requests</h1>
        <div className="flex items-center gap-2">
          <input value={base} onChange={e => setBase(e.target.value)} className="border rounded px-2 py-1 text-sm" style={{ width: 360 }} />
          <button onClick={search} className="h-9 px-3 rounded border">Refresh</button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-4">
          <div className="border rounded p-3 text-sm">Total Cost (7d): <span className="font-mono">${(summary.totalCost || 0).toFixed(4)}</span></div>
          <div className="border rounded p-3 text-sm">Total Tokens (7d): <span className="font-mono">{summary.totalTokens || 0}</span></div>
        </div>
      )}

      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="border rounded p-3">
          <div className="text-sm font-medium mb-2">Filters</div>
          <div className="flex items-center gap-2">
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search query/prompt/answer" className="border rounded px-2 py-1 text-sm w-full" />
            <button onClick={search} className="h-8 px-3 rounded border">Search</button>
          </div>
        </div>
        <div className="border rounded p-3">
          <div className="text-sm font-medium mb-2">Legend</div>
          <div className="text-xs text-gray-600">Shows recent RAG requests (from OpenSearch). Click View to inspect full prompt and response.</div>
        </div>
      </div>

      <div className="border rounded overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2">Time</th>
              <th className="text-left px-3 py-2">Endpoint</th>
              <th className="text-left px-3 py-2">Query</th>
              <th className="text-left px-3 py-2">Prompt Key</th>
              <th className="text-left px-3 py-2">Answer</th>
              <th className="text-left px-3 py-2">Latency</th>
              <th className="text-left px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-500">Loading…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-500">No data</td></tr>}
            {items.map(i => (
              <tr key={i.id} className="border-t">
                <td className="px-3 py-2">{i.created_at || ''}</td>
                <td className="px-3 py-2">{i.endpoint}</td>
                <td className="px-3 py-2">{i.query}</td>
                <td className="px-3 py-2 text-xs text-gray-600">{i.prompt_key || '—'}</td>
                <td className="px-3 py-2">{i.answer_status ? 'OK' : 'NO'}</td>
                <td className="px-3 py-2">{i.latency_ms || 0} ms</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => router.push(`/admin/requests/${encodeURIComponent(i.id)}`)}
                    className="h-8 px-3 rounded border hover:bg-[color:var(--surface-hover)]"
                  >View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} size={size} total={total} onPageChange={(p)=>setPage(p)} onSizeChange={(s)=>{setPage(1); setSize(s);}} />
    </main>
  );
}


