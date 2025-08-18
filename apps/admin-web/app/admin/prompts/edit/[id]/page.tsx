"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { BACKEND_URL, DEFAULT_TENANT_ID, getTenantId } from "../../../../../components/config";
import { SimpleHtmlEditor } from "../../../../../components/ui/SimpleHtmlEditor";
import { useDialog } from "../../../../../components/ui/DialogProvider";

export default function EditPromptPage() {
  const params = useParams() as { id?: string };
  const router = useRouter();
  const dialog = useDialog();
  const [form, setForm] = React.useState({ key: '', name: '', description: '', template: '', is_default: false });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const id = params?.id || '';

  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const r = await fetch(`${BACKEND_URL}/api/admin/prompts/${id}`, { headers: { 'X-Tenant-ID': getTenantId() } });
        if (r.ok) {
          const p = await r.json();
          setForm({ key: p.key || '', name: p.name || '', description: p.description || '', template: p.template || '', is_default: !!p.is_default });
        }
      } finally { setLoading(false); }
    };
    if (id) load();
  }, [id]);

  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch(`${BACKEND_URL}/api/admin/prompts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': getTenantId() },
        body: JSON.stringify({ ...form, description: form.description || null }),
      });
      if (!r.ok) throw new Error('Save failed');
      router.push('/admin/prompts');
    } catch {
      await dialog.alert({ title: 'Save Failed', description: 'Failed to save prompt. Please try again.' });
    } finally { setSaving(false); }
  };

  const remove = async () => {
    const ok = await dialog.confirm({ title: 'Delete Prompt', description: 'Are you sure you want to delete this prompt?', confirmText: 'Delete', variant: 'danger' });
    if (!ok) return;
    const r = await fetch(`${BACKEND_URL}/api/admin/prompts/${id}`, { method: 'DELETE', headers: { 'X-Tenant-ID': getTenantId() } });
    if (r.ok) router.push('/admin/prompts');
  };

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit Prompt</h1>
      <div className="grid gap-3 max-w-3xl">
        <label className="text-sm">Key<input className="mt-1 w-full border rounded px-2 py-1" value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value }))} /></label>
        <label className="text-sm">Name<input className="mt-1 w-full border rounded px-2 py-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></label>
        <label className="text-sm">Description<input className="mt-1 w-full border rounded px-2 py-1" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></label>
        <div className="space-y-2">
          <SimpleHtmlEditor
            label="Template"
            value={form.template}
            onChange={(html) => setForm(f => ({ ...f, template: html }))}
            rows={10}
            hint="Use variables: {text_query}, {contexts}, {conversation}. You can also use any key in prompt_params (e.g. {language}, {tone})."
            placeholder="Type your prompt template here..."
          />
          <div className="text-xs text-gray-600">
            Available variables from request body (/rag/summary):
            <ul className="list-disc ml-5">
              <li>{'{text_query}'} — user query text</li>
              <li>{'{simantic_query}'} — optional semantic augmentation text</li>
              <li>{'{contexts}'} — concatenated context snippets</li>
              <li>{'{conversation}'} — flattened conversation history</li>
              <li>{'{intent_scope}'} — intent scope</li>
              <li>{'{intent_action}'} — intent action</li>
              <li>{'{category}'} — category filter</li>
              <li>{'{top_k}'}, {'{min_score}'}, {'{fulltext_weight}'}, {'{semantic_weight}'}</li>
              <li>Any key in <code>prompt_params</code>, e.g. {'{language}'}, {'{tone}'}</li>
            </ul>
          </div>
          <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_default} onChange={e => setForm(f => ({ ...f, is_default: e.target.checked }))} /> Set as default prompt</label>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="h-9 px-4 rounded bg-black text-white">{saving ? 'Saving…' : 'Save'}</button>
        <button onClick={remove} className="h-9 px-4 rounded border">Delete</button>
        <button onClick={() => router.push('/admin/prompts')} className="h-9 px-4 rounded border">Cancel</button>
      </div>
    </main>
  );
}


