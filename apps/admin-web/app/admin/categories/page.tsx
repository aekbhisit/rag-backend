"use client";

import React from "react";
import { BACKEND_URL, getTenantId } from "../../../components/config";
import { Pagination } from "../../../components/ui/Pagination";
import { Select } from "../../../components/ui/Select";
import { useDialog } from "../../../components/ui/DialogProvider";
import { useTranslation } from "../../../hooks/useTranslation";

type Category = { id: string; name: string; slug: string; parent_id?: string | null };

export default function CategoriesPage() {
  const { t, mounted: translationMounted } = useTranslation();
  const [items, setItems] = React.useState<Category[]>([]);
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState({ id: '', name: '', slug: '', parent_id: '' });
  const [editing, setEditing] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [size, setSize] = React.useState(20);
  const [total, setTotal] = React.useState(0);
  const dialog = useDialog();

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BACKEND_URL}/api/admin/categories?hierarchy=true&page=${page}&size=${size}`,
        { headers: { 'X-Tenant-ID': getTenantId() } });
      const data = await r.json();
      setItems(data.categories || []);
      if (typeof data.total === 'number') setTotal(data.total);
    } finally { setLoading(false); }
  };
  React.useEffect(() => { load(); }, [page, size]);

  const save = async () => {
    const body = { name: form.name, slug: form.slug, parent_id: form.parent_id || null } as any;
    if (editing) {
      await fetch(`${BACKEND_URL}/api/admin/categories/${form.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': getTenantId() }, body: JSON.stringify(body) });
    } else {
      await fetch(`${BACKEND_URL}/api/admin/categories`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': getTenantId() }, body: JSON.stringify(body) });
    }
    setForm({ id: '', name: '', slug: '', parent_id: '' });
    setEditing(false);
    await load();
  };

  const edit = (c: any) => {
    setForm({ id: c.id, name: c.name || '', slug: c.slug || '', parent_id: c.parent_id || '' });
    setEditing(true);
  };

  const remove = async (id: string) => {
    const ok = await dialog.confirm({ 
      title: translationMounted ? t('deleteCategoryTitle') : 'Delete Category', 
      description: translationMounted ? t('deleteCategoryMessage') : 'Are you sure you want to delete this category?', 
      confirmText: translationMounted ? t('delete') : 'Delete', 
      variant: 'danger' 
    });
    if (!ok) return;
    await fetch(`${BACKEND_URL}/api/admin/categories/${id}`, { method: 'DELETE', headers: { 'X-Tenant-ID': getTenantId() } });
    await load();
  };

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {translationMounted ? t('categories') : 'Categories'}
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
              {
                (() => {
                  const term = q.toLowerCase();
                  const filtered = items.filter(i => !q || (i.name?.toLowerCase().includes(term) || i.slug?.toLowerCase().includes(term)));
                  const nameById = Object.fromEntries(items.map(i => [i.id, i.name]));
                  const parents = filtered.filter(i => !i.parent_id);
                  const childrenByParent: Record<string, Category[]> = {};
                  filtered.forEach(i => { if (i.parent_id) { (childrenByParent[i.parent_id] ||= []).push(i); } });
                  // sort children for stable order
                  Object.values(childrenByParent).forEach(arr => arr.sort((a,b) => ((a as any).sort_order ?? 0) - ((b as any).sort_order ?? 0) || a.name.localeCompare(b.name)));
                  const rows: JSX.Element[] = [];
                  parents.sort((a,b) => ((a as any).sort_order ?? 0) - ((b as any).sort_order ?? 0) || a.name.localeCompare(b.name)).forEach(p => {
                    rows.push(
                      <tr key={p.id} className="border-t bg-[color:var(--surface)]">
                        <td className="px-3 py-2 font-medium">{p.name}</td>
                        <td className="px-3 py-2">{p.slug}</td>
                        <td className="px-3 py-2">-</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2">
                            <button onClick={() => edit(p)} className="h-8 px-3 rounded border">{translationMounted ? t('edit') : 'Edit'}</button>
                            <button onClick={() => remove(p.id)} className="h-8 px-3 rounded border text-red-600">{translationMounted ? t('delete') : 'Delete'}</button>
                          </div>
                        </td>
                      </tr>
                    );
                    const kids = childrenByParent[p.id] || [];
                    kids.forEach(c => {
                      rows.push(
                        <tr key={c.id} className="border-t">
                          <td className="px-3 py-2"><span className="inline-block ml-6">{c.name}</span></td>
                          <td className="px-3 py-2">{c.slug}</td>
                          <td className="px-3 py-2">{nameById[c.parent_id || ''] || '-'}</td>
                          <td className="px-3 py-2">
                            <div className="flex gap-2">
                              <button onClick={() => edit(c)} className="h-8 px-3 rounded border">{translationMounted ? t('edit') : 'Edit'}</button>
                              <button onClick={() => remove(c.id)} className="h-8 px-3 rounded border text-red-600">{translationMounted ? t('delete') : 'Delete'}</button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  });
                  return rows;
                })()
              }
            </tbody>
          </table>
          <Pagination
            page={page}
            size={size}
            total={total || items.length}
            onPageChange={(p)=>setPage(p)}
            onSizeChange={(s)=>{setPage(1); setSize(s);}}
            className="p-3"
          />
        </div>

        <div className="border rounded p-4">
          <div className="text-sm font-medium mb-2">{editing ? (translationMounted ? t('editCategory') : 'Edit Category') : (translationMounted ? t('createCategory') : 'Create Category')}</div>
          <div className="grid gap-2">
            <label className="text-sm">{translationMounted ? t('name') : 'Name'}<input className="mt-1 w-full border rounded px-2 py-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></label>
            <label className="text-sm">{translationMounted ? t('slug') : 'Slug'}<input className="mt-1 w-full border rounded px-2 py-1" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} /></label>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[color:var(--text)]">{translationMounted ? t('parentCategory') : 'Parent Category'}</label>
              <Select
                placeholder={translationMounted ? t('noneLevel1') : '— None (Level 1) —'}
                value={form.parent_id}
                onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))}
                options={[
                  { value: "", label: translationMounted ? t('noneLevel1') : '— None (Level 1) —' },
                  ...items.filter(i => !i.parent_id).map(i => ({
                    value: i.id,
                    label: i.name
                  }))
                ]}
              />
              <div className="text-xs text-gray-600 mt-1">{translationMounted ? t('level1Info') : 'Leave empty to create Level 1. Select a Level 1 category to create Level 2 under it.'}</div>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={save} className="h-9 px-4 rounded bg-black text-white">{translationMounted ? t('save') : 'Save'}</button>
            {editing && <button onClick={() => { setEditing(false); setForm({ id: '', name: '', slug: '', parent_id: '' }); }} className="h-9 px-4 rounded border">{translationMounted ? t('cancel') : 'Cancel'}</button>}
          </div>
        </div>
      </div>
    </main>
  );
}


