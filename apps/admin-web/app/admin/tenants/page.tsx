"use client";

import React from "react";
import Link from "next/link";
import { BACKEND_URL, getTenantId } from "../../../components/config";
import { Pagination } from "../../../components/ui/Pagination";
import { useTranslation } from "../../../hooks/useTranslation";

type Tenant = { id?: string; name: string; slug?: string; contact_email?: string; is_active?: boolean; settings?: any; created_at?: string };

export default function TenantsPage() {
  const { t, mounted: translationMounted } = useTranslation();
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
    if (!confirm(translationMounted ? t('deleteTenantConfirm') : 'Delete tenant?')) return;
    await fetch(`${BACKEND_URL}/api/admin/tenants/${id}`, { method: 'DELETE', headers: { 'X-Tenant-ID': getTenantId() } });
    await load();
  };

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {translationMounted ? t('tenants') : 'Tenants'}
        </h1>
        <div className="flex gap-2">
          <button onClick={load} className="h-9 px-3 rounded border">
            {translationMounted ? t('refresh') : 'Refresh'}
          </button>
          <Link href="/admin/tenants/create" className="h-9 px-3 rounded bg-black text-white inline-flex items-center">
            {translationMounted ? t('createTenant') : 'Create Tenant'}
          </Link>
        </div>
      </div>

      <div className="border rounded overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2">{translationMounted ? t('name') : 'Name'}</th>
              <th className="text-left px-3 py-2">{translationMounted ? t('email') : 'Email'}</th>
              <th className="text-left px-3 py-2">{translationMounted ? t('active') : 'Active'}</th>
              <th className="text-left px-3 py-2">{translationMounted ? t('created') : 'Created'}</th>
              <th className="text-left px-3 py-2">{translationMounted ? t('actions') : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-500">{translationMounted ? t('loading') : 'Loading…'}</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-500">{translationMounted ? `ไม่มี${t('tenants')}` : 'No tenants'}</td></tr>}
            {items.map(tenant => (
              <tr key={tenant.id} className="border-t">
                <td className="px-3 py-2">{tenant.name}</td>
                <td className="px-3 py-2">{tenant.contact_email || '—'}</td>
                <td className="px-3 py-2">{tenant.is_active ? (translationMounted ? t('yes') : 'Yes') : (translationMounted ? t('no') : 'No')}</td>
                <td className="px-3 py-2">{tenant.created_at ? new Date(tenant.created_at).toLocaleString() : '—'}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <Link href={`/admin/tenants/edit/${tenant.id}`} className="h-8 px-3 rounded border inline-flex items-center">
                      {translationMounted ? t('edit') : 'Edit'}
                    </Link>
                    {tenant.id && <button onClick={() => remove(tenant.id!)} className="h-8 px-3 rounded border text-red-600">
                      {translationMounted ? t('delete') : 'Delete'}
                    </button>}
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


