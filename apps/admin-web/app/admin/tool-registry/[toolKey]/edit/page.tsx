"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

export default function EditToolRegistryPage() {
  const params = useParams();
  const router = useRouter();
  const toolKey = decodeURIComponent(String(params?.toolKey || ''));
  const apiBase = useMemo(() => `${BACKEND_URL}/api/admin`, []);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('skill');
  const [runtime, setRuntime] = useState('server');
  const [handler_key, setHandlerKey] = useState('');
  const [input_schema, setInputSchema] = useState('{}');
  const [output_schema, setOutputSchema] = useState('{}');
  const [default_settings, setDefaultSettings] = useState('{}');
  const [permissions, setPermissions] = useState('{}');
  const [is_enabled, setIsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const r = await fetch(`${apiBase}/tool-registry`, { cache: 'no-store' });
        const j = await r.json();
        const row = Array.isArray(j) ? j.find((x: any) => x.tool_key === toolKey) : null;
        if (row) {
          setName(row.name || '');
          setCategory(row.category || 'skill');
          setRuntime(row.runtime || 'server');
          setHandlerKey(row.handler_key || '');
          setInputSchema(JSON.stringify(row.input_schema || {}, null, 2));
          setOutputSchema(JSON.stringify(row.output_schema || {}, null, 2));
          setDefaultSettings(JSON.stringify(row.default_settings || {}, null, 2));
          setPermissions(JSON.stringify(row.permissions || {}, null, 2));
          setIsEnabled(!!row.is_enabled);
        }
      } finally { setLoading(false); }
    }
    load();
  }, [toolKey, apiBase]);

  async function save() {
    try {
      setLoading(true);
      const body: any = {
        name,
        category,
        runtime,
        handler_key,
        input_schema: JSON.parse(input_schema || '{}'),
        output_schema: JSON.parse(output_schema || '{}'),
        default_settings: JSON.parse(default_settings || '{}'),
        permissions: JSON.parse(permissions || '{}'),
        is_enabled
      };
      const res = await fetch(`${apiBase}/tool-registry/${encodeURIComponent(toolKey)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Save failed');
      router.push('/admin/tool-registry');
    } catch (e: any) { alert(e?.message || 'Save failed'); }
    finally { setLoading(false); }
  }

  async function remove() {
    if (!confirm(`Delete ${toolKey}?`)) return;
    const res = await fetch(`${apiBase}/tool-registry/${encodeURIComponent(toolKey)}`, { method: 'DELETE' });
    if (res.ok) router.push('/admin/tool-registry'); else alert('Delete failed');
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-3">
      <nav className="text-sm text-gray-600">
        <a href="/admin" className="underline">Admin</a>
        <span className="mx-2">/</span>
        <a href="/admin/tool-registry" className="underline">Tool Registry</a>
        <span className="mx-2">/</span>
        <span className="text-gray-900">Edit</span>
      </nav>

      <h1 className="text-2xl font-semibold text-gray-900">Edit Tool: {toolKey}</h1>

      <div className="bg-white border rounded p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-700">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full border rounded px-2 py-1 text-gray-900" />
          </div>
          <div>
            <label className="text-sm text-gray-700">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="mt-1 w-full border rounded px-2 py-1 text-gray-900">
              <option value="core">core</option>
              <option value="ui">ui</option>
              <option value="skill">skill</option>
              <option value="domain">domain</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-700">Runtime</label>
            <select value={runtime} onChange={e => setRuntime(e.target.value)} className="mt-1 w-full border rounded px-2 py-1 text-gray-900">
              <option value="client">client</option>
              <option value="server">server</option>
              <option value="worker">worker</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm text-gray-700">Handler Key</label>
            <input value={handler_key} onChange={e => setHandlerKey(e.target.value)} className="mt-1 w-full border rounded px-2 py-1 text-gray-900" />
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-700">Input Schema (JSON)</label>
          <textarea value={input_schema} onChange={e => setInputSchema(e.target.value)} rows={10} className="mt-1 w-full border rounded px-2 py-1 font-mono text-gray-900" />
        </div>
        <div>
          <label className="text-sm text-gray-700">Output Schema (JSON)</label>
          <textarea value={output_schema} onChange={e => setOutputSchema(e.target.value)} rows={10} className="mt-1 w-full border rounded px-2 py-1 font-mono text-gray-900" />
        </div>
        <div>
          <label className="text-sm text-gray-700">Default Settings (JSON)</label>
          <textarea value={default_settings} onChange={e => setDefaultSettings(e.target.value)} rows={8} className="mt-1 w-full border rounded px-2 py-1 font-mono text-gray-900" />
        </div>
        <div>
          <label className="text-sm text-gray-700">Permissions (JSON)</label>
          <textarea value={permissions} onChange={e => setPermissions(e.target.value)} rows={8} className="mt-1 w-full border rounded px-2 py-1 font-mono text-gray-900" />
        </div>
        <label className="flex items-center gap-2"><input type="checkbox" checked={is_enabled} onChange={e => setIsEnabled(e.target.checked)} /> Enabled</label>

        <div className="flex items-center gap-2">
          <button onClick={save} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">{loading ? 'Saving...' : 'Save'}</button>
          <button onClick={remove} className="px-4 py-2 bg-red-600 text-white rounded">Delete</button>
          <a href="/admin/tool-registry" className="px-4 py-2 bg-gray-100 border rounded">Cancel</a>
        </div>
      </div>
    </div>
  );
}
