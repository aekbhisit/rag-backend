"use client";

import React from "react";
import { BACKEND_URL, DEFAULT_TENANT_ID } from "../../../../components/config";
import { SimpleHtmlEditor } from "../../../../components/ui/SimpleHtmlEditor";
import { useDialog } from "../../../../components/ui/DialogProvider";
import { useRouter } from "next/navigation";

export default function CreatePromptPage() {
  const router = useRouter();
  const dialog = useDialog();
  const [form, setForm] = React.useState({ key: '', name: '', description: '', template: '', is_default: false });
  const [saving, setSaving] = React.useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': DEFAULT_TENANT_ID },
        body: JSON.stringify({ ...form, description: form.description || null }),
      });
      if (!res.ok) throw new Error('Create failed');
      router.push('/admin/prompts');
    } catch (e) {
      await dialog.alert({ title: 'Create Failed', description: 'Failed to create prompt. Please try again.' });
    } finally { setSaving(false); }
  };

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold">Create Prompt</h1>
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
            hint="Use variables: {query}, {contexts}, {conversation} and values from prompt_params (e.g. {language}, {tone})"
            placeholder="Type your prompt template here..."
          />
          <div className="text-xs text-gray-600">
            Available variables from request body:
            <ul className="list-disc ml-5">
              <li>{'{query}'} — user query</li>
              <li>{'{contexts}'} — concatenated context snippets</li>
              <li>{'{conversation}'} — flattened conversation history</li>
              <li>Any key in <code>prompt_params</code>, e.g. {'{language}'}, {'{tone}'}</li>
              <li>Also basic fields like {'{intent_scope}'}, {'{intent_action}'}, {'{intent_detail}'}</li>
            </ul>
          </div>
          <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_default} onChange={e => setForm(f => ({ ...f, is_default: e.target.checked }))} /> Set as default prompt</label>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={submit} disabled={saving} className="h-9 px-4 rounded bg-black text-white">{saving ? 'Saving…' : 'Save'}</button>
        <button onClick={() => router.push('/admin/prompts')} className="h-9 px-4 rounded border">Cancel</button>
      </div>
    </main>
  );
}


