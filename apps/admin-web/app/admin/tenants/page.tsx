"use client";

import React from "react";
import Link from "next/link";
import { BACKEND_URL, getTenantId } from "../../../components/config";
import { Pagination } from "../../../components/ui/Pagination";

type Tenant = { id?: string; name: string; slug?: string; contact_email?: string; is_active?: boolean; settings?: any; created_at?: string };

export default function TenantsPage() {
  const [items, setItems] = React.useState<Tenant[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [size, setSize] = React.useState(20);
  const [total, setTotal] = React.useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BACKEND_URL}/api/admin/tenants?page=${page}&size=${size}`, { headers: { 'X-Tenant-ID': getTenantId() } });
      const data = await r.json();
      setItems(data.items || []);
      if (typeof data.total === 'number') setTotal(data.total);
    } finally { setLoading(false); }
  };

  React.useEffect(() => { load(); }, [page, size]);

  const remove = async (id: string) => {
    if (!confirm('Delete tenant?')) return;
    await fetch(`${BACKEND_URL}/api/admin/tenants/${id}`, { method: 'DELETE', headers: { 'X-Tenant-ID': getTenantId() } });
    await load();
  };

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tenants</h1>
        <div className="flex gap-2">
          <button onClick={load} className="h-9 px-3 rounded border">Refresh</button>
          <Link href="/admin/tenants/create" className="h-9 px-3 rounded bg-black text-white inline-flex items-center">Create Tenant</Link>
        </div>
      </div>

      <div className="border rounded overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">Email</th>
              <th className="text-left px-3 py-2">Active</th>
              <th className="text-left px-3 py-2">Created</th>
              <th className="text-left px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={3} className="px-3 py-6 text-center text-gray-500">Loading…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={3} className="px-3 py-6 text-center text-gray-500">No tenants</td></tr>}
            {items.map(t => (
              <tr key={t.id} className="border-t">
                <td className="px-3 py-2">{t.name}</td>
                <td className="px-3 py-2">{t.contact_email || '—'}</td>
                <td className="px-3 py-2">{t.is_active ? 'Yes' : 'No'}</td>
                <td className="px-3 py-2">{t.created_at ? new Date(t.created_at).toLocaleString() : '—'}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <Link href={`/admin/tenants/edit/${t.id}`} className="h-8 px-3 rounded border inline-flex items-center">Edit</Link>
                    {t.id && <button onClick={() => remove(t.id!)} className="h-8 px-3 rounded border text-red-600">Delete</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} size={size} total={total || items.length} onPageChange={(p)=>setPage(p)} onSizeChange={(s)=>{setPage(1); setSize(s);}} />
    </main>
  );
}


