"use client";

import React from "react";
import { BACKEND_URL, DEFAULT_TENANT_ID } from "../../../../components/config";
import { SimpleHtmlEditor } from "../../../../components/ui/SimpleHtmlEditor";
import { useDialog } from "../../../../components/ui/DialogProvider";
import { useRouter } from "next/navigation";
import { useTranslation } from "../../../../hooks/useTranslation";

export default function CreatePromptPage() {
  const router = useRouter();
  const dialog = useDialog();
  const { t, mounted: translationMounted } = useTranslation();
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
      await dialog.alert({ 
        title: translationMounted ? t('createFailed') : 'Create Failed', 
        description: translationMounted ? t('createFailedMessage') : 'Failed to create prompt. Please try again.' 
      });
    } finally { setSaving(false); }
  };

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold">
        {translationMounted ? t('createNewPrompt') : 'Create Prompt'}
      </h1>
      <div className="grid gap-3 max-w-3xl">
        <label className="text-sm">
          {translationMounted ? t('key') : 'Key'}
          <input className="mt-1 w-full border rounded px-2 py-1" value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value }))} />
        </label>
        <label className="text-sm">
          {translationMounted ? t('name') : 'Name'}
          <input className="mt-1 w-full border rounded px-2 py-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </label>
        <label className="text-sm">
          {translationMounted ? t('description') : 'Description'}
          <input className="mt-1 w-full border rounded px-2 py-1" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </label>
        <div className="space-y-2">
          <SimpleHtmlEditor
            label={translationMounted ? t('template') : 'Template'}
            value={form.template}
            onChange={(html) => setForm(f => ({ ...f, template: html }))}
            rows={10}
            hint="Use variables: {text_query}, {contexts}, {conversation}. You can also use any key in prompt_params (e.g. {language}, {tone})."
            placeholder="Type your prompt template here..."
          />
          <div className="text-xs text-gray-600">
            {translationMounted ? t('availableVariablesFromRagSummary') : 'Available variables from request body (/rag/summary):'}
            <ul className="list-disc ml-5">
              <li>{'{text_query}'} — {translationMounted ? t('userQueryText') : 'user query text'}</li>
              <li>{'{simantic_query}'} — {translationMounted ? t('semanticQuery') : 'optional semantic augmentation text'}</li>
              <li>{'{contexts}'} — {translationMounted ? t('contextSnippets') : 'concatenated context snippets'}</li>
              <li>{'{conversation}'} — {translationMounted ? t('conversationHistory') : 'flattened conversation history'}</li>
              <li>{'{intent_scope}'} — {translationMounted ? t('intentScope') : 'intent scope'}</li>
              <li>{'{intent_action}'} — {translationMounted ? t('intentAction') : 'intent action'}</li>
              <li>{'{category}'} — {translationMounted ? t('categoryFilter') : 'category filter'}</li>
              <li>{'{top_k}'}, {'{min_score}'}, {'{fulltext_weight}'}, {'{semantic_weight}'}</li>
              <li>{translationMounted ? t('anyKeyInPromptParams') : 'Any key in prompt_params, e.g. language, tone'}</li>
            </ul>
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_default} onChange={e => setForm(f => ({ ...f, is_default: e.target.checked }))} /> 
            {translationMounted ? t('setAsDefault') : 'Set as default prompt'}
          </label>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={submit} disabled={saving} className="h-9 px-4 rounded bg-black text-white">
          {saving ? (translationMounted ? t('saving') : 'Saving…') : (translationMounted ? t('save') : 'Save')}
        </button>
        <button onClick={() => router.push('/admin/prompts')} className="h-9 px-4 rounded border">
          {translationMounted ? t('cancel') : 'Cancel'}
        </button>
      </div>
    </main>
  );
}


