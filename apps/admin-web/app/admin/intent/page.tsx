"use client";

import React from "react";
import { BACKEND_URL, getTenantId } from "../../../components/config";
import { Pagination } from "../../../components/ui/Pagination";
import { useDialog } from "../../../components/ui/DialogProvider";
import { useTranslation } from "../../../hooks/useTranslation";

type Scope = { id: string; name: string; slug?: string; description?: string; actions?: Action[] };
type Action = { id: string; scope_id: string; name: string; slug?: string; description?: string };

export default function IntentPage() {
  const { t, mounted: translationMounted } = useTranslation();
  const [scopes, setScopes] = React.useState<Scope[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [q, setQ] = React.useState("");

  const [form, setForm] = React.useState({ id: '', name: '', slug: '', description: '', parent_scope_id: '' });
  const [editing, setEditing] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [size, setSize] = React.useState(20);
  const [total, setTotal] = React.useState(0);
  const dialog = useDialog();

  const load = async () => {
    setLoading(true);
    try {
      const rh = await fetch(`${BACKEND_URL}/api/admin/intent-system/scopes-with-actions?page=${page}&size=${size}`, { headers: { 'X-Tenant-ID': getTenantId() } });
      const dh = await rh.json();
      setScopes(dh.scopes || []);
      if (typeof dh.total === 'number') setTotal(dh.total);
    } finally { setLoading(false); }
  };

  React.useEffect(() => { load(); }, [page, size]);

  const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

  const save = async () => {
    const isAction = !!form.parent_scope_id;
    const payload: any = { name: form.name, description: form.description };
    if (form.slug) payload.slug = form.slug; else payload.slug = slugify(form.name || '');
    if (isAction) payload.scope_id = form.parent_scope_id;

    if (editing) {
      // Determine if editing scope or action by whether parent selected when entering edit
      if (isAction) {
        await fetch(`${BACKEND_URL}/api/admin/intent-system/actions/${form.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': getTenantId() }, body: JSON.stringify(payload) });
      } else {
        await fetch(`${BACKEND_URL}/api/admin/intent-system/scopes/${form.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': getTenantId() }, body: JSON.stringify(payload) });
      }
    } else {
      if (isAction) {
        await fetch(`${BACKEND_URL}/api/admin/intent-system/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': getTenantId() }, body: JSON.stringify(payload) });
      } else {
        await fetch(`${BACKEND_URL}/api/admin/intent-system/scopes`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': getTenantId() }, body: JSON.stringify(payload) });
      }
    }
    setForm({ id: '', name: '', slug: '', description: '', parent_scope_id: '' });
    setEditing(false);
    await load();
  };

  const editScope = (s: Scope) => {
    setForm({ id: s.id, name: s.name || '', slug: s.slug || '', description: s.description || '', parent_scope_id: '' });
    setEditing(true);
  };
  const editAction = (a: Action) => {
    setForm({ id: a.id, name: a.name || '', slug: a.slug || '', description: a.description || '', parent_scope_id: a.scope_id || '' });
    setEditing(true);
  };

  const removeScope = async (id: string) => {
    const ok = await dialog.confirm({ title: 'Delete Scope', description: 'This will delete the scope and its actions. Continue?', confirmText: 'Delete', variant: 'danger' });
    if (!ok) return;
    await fetch(`${BACKEND_URL}/api/admin/intent-system/scopes/${id}`, { method: 'DELETE', headers: { 'X-Tenant-ID': getTenantId() } });
    await load();
  };
  const removeAction = async (id: string) => {
    const ok = await dialog.confirm({ title: 'Delete Action', description: 'Are you sure you want to delete this action?', confirmText: 'Delete', variant: 'danger' });
    if (!ok) return;
    await fetch(`${BACKEND_URL}/api/admin/intent-system/actions/${id}`, { method: 'DELETE', headers: { 'X-Tenant-ID': getTenantId() } });
    await load();
  };

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {translationMounted ? t('intentSystem') : 'Intent System'}
        </h1>
        <div className="flex gap-2">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={translationMounted ? t('search') : "Search"} className="border rounded px-2 py-1 text-sm" />
          <button onClick={load} className="h-9 px-3 rounded border">{translationMounted ? t('refresh') : 'Refresh'}</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2">{translationMounted ? t('name') : 'Name'}</th>
                <th className="text-left px-3 py-2">{translationMounted ? t('slug') : 'Slug'}</th>
                <th className="text-left px-3 py-2">{translationMounted ? t('parent') : 'Parent'}</th>
                <th className="text-left px-3 py-2">{translationMounted ? t('actions') : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const term = q.toLowerCase();
                const filteredScopes = scopes.filter(s => !q || (s.name?.toLowerCase().includes(term) || (s.slug || '').toLowerCase().includes(term)));
                const nameById = Object.fromEntries(scopes.map(s => [s.id, s.name]));
                const rows: JSX.Element[] = [];
                filteredScopes.forEach(s => {
                  rows.push(
                    <tr key={s.id} className="border-t bg-[color:var(--surface)]">
                      <td className="px-3 py-2 font-medium">{s.name}<div className="text-xs text-gray-600">{s.description}</div></td>
                      <td className="px-3 py-2">{s.slug || '-'}</td>
                      <td className="px-3 py-2">-</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <button onClick={() => editScope(s)} className="h-8 px-3 rounded border">{translationMounted ? t('edit') : 'Edit'}</button>
                          <button onClick={() => removeScope(s.id)} className="h-8 px-3 rounded border text-red-600">{translationMounted ? t('delete') : 'Delete'}</button>
                        </div>
                      </td>
                    </tr>
                  );
                  const actions = (s.actions || []).filter(a => !q || (a.name?.toLowerCase().includes(term) || (a.slug || '').toLowerCase().includes(term)));
                  actions.forEach(a => {
                    rows.push(
                      <tr key={a.id} className="border-t">
                        <td className="px-3 py-2"><span className="inline-block ml-6">{a.name}</span><div className="text-xs text-gray-600 ml-6">{a.description}</div></td>
                        <td className="px-3 py-2">{a.slug || '-'}</td>
                        <td className="px-3 py-2">{nameById[a.scope_id] || '-'}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2">
                            <button onClick={() => editAction(a)} className="h-8 px-3 rounded border">{translationMounted ? t('edit') : 'Edit'}</button>
                            <button onClick={() => removeAction(a.id)} className="h-8 px-3 rounded border text-red-600">{translationMounted ? t('delete') : 'Delete'}</button>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                });
                return rows;
              })()}
            </tbody>
          </table>
          <Pagination
            page={page}
            size={size}
            total={total || scopes.length}
            onPageChange={(p)=>setPage(p)}
            onSizeChange={(s)=>{setPage(1); setSize(s);}}
            className="p-3"
          />
        </div>

        <div className="border rounded p-4">
          <div className="text-sm font-medium mb-2">{editing ? (translationMounted ? t('editIntent') : 'Edit Intent') : (translationMounted ? t('createIntent') : 'Create Intent')}</div>
          <div className="grid gap-2">
            <label className="text-sm">{translationMounted ? t('name') : 'Name'}<input className="mt-1 w-full border rounded px-2 py-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></label>
            <label className="text-sm">{translationMounted ? t('slug') : 'Slug'}<input className="mt-1 w-full border rounded px-2 py-1" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder={translationMounted ? t('autoFromName') : "auto from name if empty"} /></label>
            <label className="text-sm">{translationMounted ? t('description') : 'Description'}<input className="mt-1 w-full border rounded px-2 py-1" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></label>
            <label className="text-sm">{translationMounted ? t('parentScope') : 'Parent Scope'}
              <select className="mt-1 w-full border rounded px-2 py-1" value={form.parent_scope_id} onChange={e => setForm(f => ({ ...f, parent_scope_id: e.target.value }))}>
                <option value="">{translationMounted ? t('noneScopeLevel1') : '— None (Scope / Level 1) —'}</option>
                {scopes.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <div className="text-xs text-gray-600 mt-1">{translationMounted ? t('scopeInfo') : 'Leave empty to create a Scope (level 1). Select a Scope to create an Action (level 2) under it.'}</div>
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={save} className="h-9 px-4 rounded bg-black text-white">Save</button>
            {editing && <button onClick={() => { setEditing(false); setForm({ id: '', name: '', slug: '', description: '', parent_scope_id: '' }); }} className="h-9 px-4 rounded border">Cancel</button>}
          </div>
        </div>
      </div>
    </main>
  );
}


