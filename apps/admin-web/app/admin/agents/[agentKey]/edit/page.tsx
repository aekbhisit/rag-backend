"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

export default function EditAgentPage() {
  const params = useParams();
  const router = useRouter();
  const agentKey = decodeURIComponent(String(params?.agentKey || 'new'));
  const isNew = agentKey === 'new';
  const apiBase = useMemo(() => `${BACKEND_URL}/api/admin`, []);

  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [desc, setDesc] = useState('');
  // Align with actual agentConfig.ts: name, publicDescription, instructions managed via prompts
  const [isDefault, setIsDefault] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      if (isNew) return;
      setLoading(true);
      try {
        const res = await fetch(`${apiBase}/agents/${encodeURIComponent(agentKey)}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        setName(data.name || '');
        setKey(data.agent_key || '');
        setDesc(data.public_description || '');
        // locale fields are not required by UI; ignore
        setIsDefault(!!data.is_default);
        setEnabled(!!data.is_enabled);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isNew, agentKey, apiBase]);

  async function save() {
    try {
      setLoading(true);
      const payload: any = {
        name,
        public_description: desc,
        // locales omitted to match current agentConfig usage
        is_default: isDefault,
        is_enabled: enabled,
      };
      if (isNew) {
        payload.agent_key = key || name.replace(/\s+/g, '');
        const res = await fetch(`${apiBase}/agents`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error(`Create failed: ${res.status}`);
      } else {
        const res = await fetch(`${apiBase}/agents/${encodeURIComponent(agentKey)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      }
      router.push('/admin/agents');
    } catch (e: any) {
      alert(e?.message || 'Save failed');
    } finally { setLoading(false); }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-gray-900">{isNew ? 'New Agent' : `Edit Agent: ${agentKey}`}</h1>

      <div className="bg-white border rounded p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-700">Agent Key</label>
            <input value={isNew ? key : agentKey} onChange={(e) => setKey(e.target.value)} disabled={!isNew} className="mt-1 w-full border rounded px-2 py-1 text-gray-900" />
          </div>
          <div>
            <label className="text-sm text-gray-700">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full border rounded px-2 py-1 text-gray-900" />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm text-gray-700">Public Description</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} className="mt-1 w-full border rounded px-2 py-1 text-gray-900" />
          </div>
          {/* Locales omitted to reflect actual agentConfig.ts */}
          <div className="flex items-center gap-2">
            <input id="isDefault" type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
            <label htmlFor="isDefault" className="text-sm text-gray-700">Default Agent</label>
          </div>
          <div className="flex items-center gap-2">
            <input id="enabled" type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            <label htmlFor="enabled" className="text-sm text-gray-700">Enabled</label>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={save} disabled={loading} className="px-3 py-1 bg-blue-600 text-white rounded">{loading ? 'Saving...' : 'Save'}</button>
          <button onClick={() => history.back()} className="px-3 py-1 bg-gray-100 border rounded">Back</button>
        </div>
      </div>
    </div>
  );
}


