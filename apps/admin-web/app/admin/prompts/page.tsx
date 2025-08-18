"use client";

import React from "react";
import { BACKEND_URL, getTenantId } from "../../../components/config";
import { Pagination } from "../../../components/ui/Pagination";
import { useDialog } from "../../../components/ui/DialogProvider";
import { useRouter } from "next/navigation";

type Prompt = {
  id: string;
  key: string;
  name: string;
  template: string;
  description?: string | null;
  created_at: string;
  updated_at?: string | null;
};

export default function PromptsPage() {
  const router = useRouter();
  const [items, setItems] = React.useState<Prompt[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [size, setSize] = React.useState(20);
  const [total, setTotal] = React.useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BACKEND_URL}/api/admin/prompts?q=${encodeURIComponent(q)}&page=${page}&size=${size}`, { headers: { 'X-Tenant-ID': getTenantId() } });
      const data = await r.json();
      setItems(data.items || []);
      setTotal(data.total || (data.items?.length || 0));
    } finally { setLoading(false); }
  };

  React.useEffect(() => { load(); }, [page, size]);

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Prompts</h1>
        <button onClick={() => router.push('/admin/prompts/create')} className="h-9 px-4 rounded bg-black text-white">Create</button>
      </div>

      <div className="flex gap-2">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search..." className="border rounded px-2 py-1 w-full max-w-md" />
        <button onClick={load} className="h-9 px-3 rounded border">Search</button>
      </div>

      <div className="border rounded overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2">Key</th>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">Default</th>
              <th className="text-left px-3 py-2">Description</th>
              <th className="text-left px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(p => (
              <tr key={p.id} className="border-t">
                <td className="px-3 py-2 font-mono text-[12px]">{p.key}</td>
                <td className="px-3 py-2">{p.name}</td>
                <td className="px-3 py-2">{(p as any).is_default ? <span className="inline-block px-2 py-0.5 text-xs rounded bg-green-100 text-green-700">Default</span> : ''}</td>
                <td className="px-3 py-2 text-gray-600">{p.description || ''}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <button onClick={() => router.push(`/admin/prompts/edit/${p.id}`)} className="h-8 px-3 rounded border">Edit</button>
                    <DeleteButton id={p.id} onDeleted={load} />
                  </div>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-500">No prompts</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} size={size} total={total} onPageChange={(p)=>setPage(p)} onSizeChange={(s)=>{setPage(1); setSize(s);}} />
    </main>
  );
}

function DeleteButton({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const [loading, setLoading] = React.useState(false);
  const dialog = useDialog();
  const run = async () => {
    const ok = await dialog.confirm({ title: 'Delete Prompt', description: 'Are you sure you want to delete this prompt?', confirmText: 'Delete', variant: 'danger' });
    if (!ok) return;
    setLoading(true);
    try {
      await fetch(`${BACKEND_URL}/api/admin/prompts/${id}`, { method: 'DELETE', headers: { 'X-Tenant-ID': getTenantId() } });
      onDeleted();
    } finally { setLoading(false); }
  };
  return <button onClick={run} disabled={loading} className="h-8 px-3 rounded border text-red-600">{loading ? '...' : 'Delete'}</button>;
}


