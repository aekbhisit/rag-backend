"use client";

import React from "react";
import { BACKEND_URL, DEFAULT_TENANT_ID } from "../../../components/config";
import { Pagination } from "../../../components/ui/Pagination";
import { useTranslation } from "../../../hooks/useTranslation";

type Pricing = {
  id?: string;
  provider: string;
  model: string;
  input_per_1k?: number | null;
  cached_input_per_1k?: number | null;
  output_per_1k?: number | null;
  embedding_per_1k?: number | null;
  currency?: string | null;
  version?: string | null;
  is_active?: boolean | null;
};

export default function AiPricingPage() {
  const { t, mounted: translationMounted } = useTranslation();
  const [items, setItems] = React.useState<Pricing[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState<Pricing>({ provider: '', model: '', currency: 'USD', is_active: true });
  const [editing, setEditing] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [size, setSize] = React.useState(20);
  const [total, setTotal] = React.useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BACKEND_URL}/api/admin/ai-pricing?page=${page}&size=${size}`, { headers: { 'X-Tenant-ID': DEFAULT_TENANT_ID } });
      const data = await r.json();
      setItems(data.items || []);
      if (typeof data.total === 'number') setTotal(data.total);
    } finally { setLoading(false); }
  };

  React.useEffect(() => { load(); }, [page, size]);

  const save = async () => {
    const payload = { ...form, id: editing || undefined };
    await fetch(`${BACKEND_URL}/api/admin/ai-pricing${editing ? `/${editing}` : ''}`, {
      method: editing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': DEFAULT_TENANT_ID },
      body: JSON.stringify(payload)
    });
    setForm({ provider: '', model: '', currency: 'USD', is_active: true });
    setEditing(null);
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm(translationMounted ? t('deletePricingConfirm') : 'Delete pricing row?')) return;
    await fetch(`${BACKEND_URL}/api/admin/ai-pricing/${id}`, { method: 'DELETE', headers: { 'X-Tenant-ID': DEFAULT_TENANT_ID } });
    await load();
  };

  const startEdit = (row: any) => {
    setEditing(row.id);
    setForm({
      id: row.id,
      provider: row.provider,
      model: row.model,
      input_per_1k: row.input_per_1k,
      cached_input_per_1k: row.cached_input_per_1k,
      output_per_1k: row.output_per_1k,
      embedding_per_1k: row.embedding_per_1k,
      currency: row.currency || 'USD',
      version: row.version || '',
      is_active: row.is_active ?? true,
    });
  };

  return (
    <main className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">
          {translationMounted ? t('aiPricing') : 'AI Model Pricing'}
        </h1>
        <button onClick={load} className="h-9 px-3 rounded border">
          {translationMounted ? t('refresh') : 'Refresh'}
        </button>
      </div>

      <div className="border rounded p-4">
        <div className="text-sm font-medium mb-2">
          {editing ? (translationMounted ? t('editPricing') : 'Edit Pricing') : (translationMounted ? t('createPricing') : 'Create Pricing')}
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          <label className="text-sm">{translationMounted ? t('provider') : 'Provider'}
            <input className="mt-1 w-full border rounded px-2 py-1" value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))} placeholder="openai" />
          </label>
          <label className="text-sm">{translationMounted ? t('model') : 'Model'}
            <input className="mt-1 w-full border rounded px-2 py-1" value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="gpt-4o" />
          </label>
          <label className="text-sm">{translationMounted ? t('currency') : 'Currency'}
            <input className="mt-1 w-full border rounded px-2 py-1" value={form.currency || ''} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} />
          </label>
          <label className="text-sm">{translationMounted ? t('inputPricingPer1M') : 'Input $ / 1M tokens'}
            <input type="number" step="0.000001" className="mt-1 w-full border rounded px-2 py-1" value={form.input_per_1k == null ? '' : (Number(form.input_per_1k) * 1000)} onChange={e => setForm(f => ({ ...f, input_per_1k: e.target.value === '' ? null : (Number(e.target.value) / 1000) }))} />
          </label>
          <label className="text-sm">{translationMounted ? t('cachedInputPricingPer1M') : 'Cached Input $ / 1M tokens'}
            <input type="number" step="0.000001" className="mt-1 w-full border rounded px-2 py-1" value={form.cached_input_per_1k == null ? '' : (Number(form.cached_input_per_1k) * 1000)} onChange={e => setForm(f => ({ ...f, cached_input_per_1k: e.target.value === '' ? null : (Number(e.target.value) / 1000) }))} />
          </label>
          <label className="text-sm">{translationMounted ? t('outputPricingPer1M') : 'Output $ / 1M tokens'}
            <input type="number" step="0.000001" className="mt-1 w-full border rounded px-2 py-1" value={form.output_per_1k == null ? '' : (Number(form.output_per_1k) * 1000)} onChange={e => setForm(f => ({ ...f, output_per_1k: e.target.value === '' ? null : (Number(e.target.value) / 1000) }))} />
          </label>
          <label className="text-sm">{translationMounted ? t('embeddingPricingPer1M') : 'Embedding $ / 1M tokens'}
            <input type="number" step="0.000001" className="mt-1 w-full border rounded px-2 py-1" value={form.embedding_per_1k == null ? '' : (Number(form.embedding_per_1k) * 1000)} onChange={e => setForm(f => ({ ...f, embedding_per_1k: e.target.value === '' ? null : (Number(e.target.value) / 1000) }))} />
          </label>
          <label className="text-sm">{translationMounted ? t('version') : 'Version'}
            <input className="mt-1 w-full border rounded px-2 py-1" value={form.version || ''} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} placeholder="2025-08-16" />
          </label>
          <label className="text-sm flex items-center gap-2">{translationMounted ? t('active') : 'Active'}
            <input type="checkbox" checked={!!form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
          </label>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={save} className="h-9 px-4 rounded bg-black text-white">{translationMounted ? t('save') : 'Save'}</button>
          {editing && <button onClick={() => { setEditing(null); setForm({ provider: '', model: '', currency: 'USD', is_active: true }); }} className="h-9 px-4 rounded border">{translationMounted ? t('cancel') : 'Cancel'}</button>}
        </div>
      </div>

      <div className="border rounded overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2">{translationMounted ? t('provider') : 'Provider'}</th>
              <th className="text-left px-3 py-2">{translationMounted ? t('model') : 'Model'}</th>
              <th className="text-left px-3 py-2">{translationMounted ? t('inputPer1M') : 'Input $/1M'}</th>
              <th className="text-left px-3 py-2">{translationMounted ? t('cachedPer1M') : 'Cached $/1M'}</th>
              <th className="text-left px-3 py-2">{translationMounted ? t('outputPer1M') : 'Output $/1M'}</th>
              <th className="text-left px-3 py-2">{translationMounted ? t('embeddingPer1M') : 'Embedding $/1M'}</th>
              <th className="text-left px-3 py-2">{translationMounted ? t('currency') : 'Currency'}</th>
              <th className="text-left px-3 py-2">{translationMounted ? t('version') : 'Version'}</th>
              <th className="text-left px-3 py-2">{translationMounted ? t('active') : 'Active'}</th>
              <th className="text-left px-3 py-2">{translationMounted ? t('actions') : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t">
                <td className="px-3 py-2">{it.provider}</td>
                <td className="px-3 py-2">{it.model}</td>
                <td className="px-3 py-2">{it.input_per_1k == null ? '—' : (Number(it.input_per_1k) * 1000).toFixed(6)}</td>
                <td className="px-3 py-2">{(it as any).cached_input_per_1k == null ? '—' : (Number((it as any).cached_input_per_1k) * 1000).toFixed(6)}</td>
                <td className="px-3 py-2">{it.output_per_1k == null ? '—' : (Number(it.output_per_1k) * 1000).toFixed(6)}</td>
                <td className="px-3 py-2">{it.embedding_per_1k == null ? '—' : (Number(it.embedding_per_1k) * 1000).toFixed(6)}</td>
                <td className="px-3 py-2">{it.currency || 'USD'}</td>
                <td className="px-3 py-2">{it.version || '—'}</td>
                <td className="px-3 py-2">{it.is_active ? (translationMounted ? t('yes') : 'Yes') : (translationMounted ? t('no') : 'No')}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(it)} className="h-8 px-3 rounded border">{translationMounted ? t('edit') : 'Edit'}</button>
                    {it.id && <button onClick={() => remove(it.id!)} className="h-8 px-3 rounded border text-red-600">{translationMounted ? t('delete') : 'Delete'}</button>}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr><td colSpan={10} className="px-3 py-6 text-center text-gray-500">
                {translationMounted ? t('noPricingConfigured') : 'No pricing configured'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} size={size} total={total || items.length} onPageChange={(p)=>setPage(p)} onSizeChange={(s)=>{setPage(1); setSize(s);}} />
    </main>
  );
}


