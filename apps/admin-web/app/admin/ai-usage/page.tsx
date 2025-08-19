"use client";

import React from "react";
import { BACKEND_URL, getTenantId } from "../../../components/config";
import { Pagination } from "../../../components/ui/Pagination";
import { formatDateForTable } from "../../../utils/timezone";
import { useAuth } from "../../../components/AuthProvider";
import { useTranslation } from "../../../hooks/useTranslation";

export default function AiUsagePage() {
  const { t, mounted: translationMounted } = useTranslation();
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [range, setRange] = React.useState('7d');
  const [model, setModel] = React.useState('');
  const [provider, setProvider] = React.useState('');
  const [operation, setOperation] = React.useState('');
  const [q, setQ] = React.useState('');
  const [summary, setSummary] = React.useState<{ totalCost: number; totalTokens: number; byModel: any[]; byProvider: any[]; byOperation: any[] } | null>(null);
  const [page, setPage] = React.useState(1);
  const [size, setSize] = React.useState(20);
  const [total, setTotal] = React.useState(0);
  const [sortBy, setSortBy] = React.useState<'start_time'|'cost_total_usd'|'usage_total_tokens'|'latency_ms'|'model'|'provider'|'operation'>('start_time');
  const [sortDir, setSortDir] = React.useState<'asc'|'desc'>('desc');
  const { userTimezone } = useAuth();

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('range', range);
      if (model) params.set('model', model);
      if (provider) params.set('provider', provider);
      if (operation) params.set('operation', operation);
      if (q) params.set('q', q);
      params.set('size', String(size));
      params.set('page', String(page));
      params.set('sort_by', sortBy);
      params.set('sort_dir', sortDir);
      const r = await fetch(`${BACKEND_URL}/api/admin/ai-usage?${params.toString()}`, { headers: { 'X-Tenant-ID': getTenantId() } });
      const data = await r.json();
      setItems(data.items || []);
      setSummary(data.summary || null);
      setTotal(data.total || 0);
    } finally { setLoading(false); }
  };



  React.useEffect(() => { load(); }, [range, model, provider, operation, page, size, sortBy, sortDir]);

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {translationMounted ? t('aiUsage') : 'AI Usage Logs'}
        </h1>
        <button onClick={load} className="h-9 px-3 rounded border">
          {translationMounted ? t('refresh') : 'Refresh'}
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-5">
        <select className="border rounded px-2 py-1" value={range} onChange={e => setRange(e.target.value)}>
          <option value="7d">{translationMounted ? t('last7Days') : 'Last 7 days'}</option>
          <option value="30d">{translationMounted ? t('last30Days') : 'Last 30 days'}</option>
          <option value="90d">{translationMounted ? t('last90Days') : 'Last 90 days'}</option>
          <option value="1y">{translationMounted ? t('lastYear') : 'Last year'}</option>
        </select>
        <input className="border rounded px-2 py-1" placeholder={translationMounted ? t('model') : "Model"} value={model} onChange={e => setModel(e.target.value)} />
        <input className="border rounded px-2 py-1" placeholder={translationMounted ? t('provider') : "Provider"} value={provider} onChange={e => setProvider(e.target.value)} />
        <input className="border rounded px-2 py-1" placeholder={translationMounted ? t('operationPlaceholder') : "Operation (generate/embedding)"} value={operation} onChange={e => setOperation(e.target.value)} />
        <div className="flex gap-2">
          <input className="border rounded px-2 py-1 w-full" placeholder={translationMounted ? t('search') : "Search"} value={q} onChange={e => setQ(e.target.value)} />
          <button onClick={load} className="h-9 px-3 rounded border">{translationMounted ? t('go') : 'Go'}</button>
        </div>
      </div>
      {summary && (
        <div className="grid gap-3 md:grid-cols-4">
          <div className="border rounded p-3 text-sm">{translationMounted ? t('totalCost') : 'Total Cost'}: <span className="font-mono">${summary.totalCost.toFixed(4)}</span></div>
          <div className="border rounded p-3 text-sm">{translationMounted ? t('totalTokens') : 'Total Tokens'}: <span className="font-mono">{summary.totalTokens}</span></div>
          <div className="border rounded p-3 text-sm">{translationMounted ? t('topModel') : 'Top Model'}: <span className="font-mono">{summary.byModel?.[0]?.key || '—'}</span></div>
          <div className="border rounded p-3 text-sm">{translationMounted ? t('topProvider') : 'Top Provider'}: <span className="font-mono">{summary.byProvider?.[0]?.key || '—'}</span></div>
        </div>
      )}
      <div className="border rounded overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {[
                { key: 'start_time', label: translationMounted ? t('time') : 'Time' },
                { key: 'operation', label: translationMounted ? t('operation') : 'Operation' },
                { key: 'model', label: translationMounted ? t('model') : 'Model' },
                { key: 'provider', label: translationMounted ? t('provider') : 'Provider' },
                { key: 'usage_input_tokens', label: translationMounted ? t('input') : 'Input' },
                { key: 'usage_cached_input_tokens', label: translationMounted ? t('cached') : 'Cached' },
                { key: 'usage_output_tokens', label: translationMounted ? t('output') : 'Output' },
                { key: 'usage_total_tokens', label: translationMounted ? t('totalTokens') : 'Total Tokens' },
                { key: 'cost_total_usd', label: translationMounted ? t('costUSD') : 'Cost (USD)' },
              ].map(col => (
                <th key={col.key} className="text-left px-3 py-2 cursor-pointer select-none" onClick={() => {
                  if (sortBy === (col.key as any)) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                  setSortBy(col.key as any);
                }}>
                  {col.label}{sortBy === (col.key as any) ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={9} className="px-3 py-6 text-center text-gray-500">{translationMounted ? t('loading') : 'Loading…'}</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={9} className="px-3 py-6 text-center text-gray-500">{translationMounted ? t('noData') : 'No data'}</td></tr>}
            {items.map((i) => (
              <tr key={i.id} className="border-t">
                <td className="px-3 py-2">{formatDateForTable(i.start_time, userTimezone)}</td>
                <td className="px-3 py-2">{i.operation}</td>
                <td className="px-3 py-2">{i.model || ''}</td>
                <td className="px-3 py-2">{i.provider || ''}</td>
                <td className="px-3 py-2">{i.usage?.input_tokens ?? i.usage_input_tokens ?? '—'}</td>
                <td className="px-3 py-2">{i.usage?.cached_input_tokens ?? i.usage_cached_input_tokens ?? '—'}</td>
                <td className="px-3 py-2">{i.usage?.output_tokens ?? i.usage_output_tokens ?? '—'}</td>
                <td className="px-3 py-2">{i.usage?.total_tokens ?? i.usage_total_tokens ?? '—'}</td>
                <td className="px-3 py-2">{(i.cost?.total_usd ?? i.cost_total_usd) != null ? Number(i.cost?.total_usd ?? i.cost_total_usd).toFixed(6) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={page}
        size={size}
        total={total}
        onPageChange={(p)=>setPage(p)}
        onSizeChange={(s)=>{setPage(1); setSize(s);}}
        className="mt-3"
      />
    </main>
  );
}


