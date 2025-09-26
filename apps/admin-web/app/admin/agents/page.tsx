"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

export default function AgentsAdminPage() {
  const apiBase = useMemo(() => `${BACKEND_URL}/api/admin`, []);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState<Record<string, { tools: number; prompts: number }>>({});

  async function load() {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${apiBase}/agents`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
      // Load counts in background
      const counts: Record<string, { tools: number; prompts: number }> = {};
      await Promise.all((Array.isArray(data) ? data : []).map(async (a: any) => {
        const key = a.agent_key;
        try {
          const [toolsRes, promptsRes] = await Promise.all([
            fetch(`${apiBase}/agents/${encodeURIComponent(key)}/tools`, { cache: 'no-store' }),
            fetch(`${apiBase}/agents/${encodeURIComponent(key)}/prompts?category=initial_system`, { cache: 'no-store' })
          ]);
          const tools = toolsRes.ok ? await toolsRes.json() : [];
          const prompts = promptsRes.ok ? await promptsRes.json() : [];
          counts[key] = { tools: Array.isArray(tools) ? tools.length : 0, prompts: Array.isArray(prompts) ? prompts.length : 0 };
        } catch {
          counts[key] = { tools: 0, prompts: 0 };
        }
      }));
      setMeta(counts);
    } catch (e: any) {
      setError(e?.message || 'Load failed');
    } finally { setLoading(false); }
  }

  async function remove(agentKey: string) {
    if (!confirm(`Delete agent "${agentKey}" and all related data?`)) return;
    try {
      const res = await fetch(`${apiBase}/agents/${encodeURIComponent(agentKey)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      setRows(prev => prev.filter(r => r.agent_key !== agentKey));
    } catch (e: any) {
      alert(e?.message || 'Delete failed');
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Agents</h1>
        <Link href="/admin/agents/new" className="inline-flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Agent
        </Link>
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="bg-white border rounded overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="px-3 py-2 text-left">Key</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-left">Prompts</th>
              <th className="px-3 py-2 text-left">Tools</th>
              <th className="px-3 py-2 text-left">Default</th>
              <th className="px-3 py-2 text-left w-96">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.agent_key} className="border-t">
                <td className="px-3 py-2 whitespace-nowrap">{r.agent_key}</td>
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2 max-w-xl truncate" title={r.public_description}>{r.public_description}</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${((meta[r.agent_key]?.prompts||0)>0)?'bg-green-100 text-green-800':'bg-gray-100 text-gray-700'}`}>
                    {(meta[r.agent_key]?.prompts||0)}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${((meta[r.agent_key]?.tools||0)>0)?'bg-indigo-100 text-indigo-800':'bg-gray-100 text-gray-700'}`}>
                    {(meta[r.agent_key]?.tools||0)}
                  </span>
                </td>
                <td className="px-3 py-2">{r.is_default ? 'Yes' : ''}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <Link href={`/admin/agents/${encodeURIComponent(r.agent_key)}/edit`} className="inline-flex items-center gap-1 px-1.5 py-1 bg-gray-100 text-gray-700 border rounded text-xs whitespace-nowrap min-w-0">
                      <svg className="h-3 w-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M4 20h4l10.5-10.5a2.5 2.5 0 10-3.536-3.536L4 16v4z" /></svg>
                      Edit
                    </Link>
                    <Link href={`/admin/agents/${encodeURIComponent(r.agent_key)}/prompts`} className="inline-flex items-center gap-1 px-1.5 py-1 bg-blue-100 text-blue-800 border rounded text-xs whitespace-nowrap min-w-0">
                      <svg className="h-3 w-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8M8 11h8M8 15h5" /></svg>
                      Prompts
                    </Link>
                    <Link href={`/admin/agents/${encodeURIComponent(r.agent_key)}/tools`} className="inline-flex items-center gap-1 px-1.5 py-1 bg-indigo-100 text-indigo-800 border rounded text-xs whitespace-nowrap min-w-0">
                      <svg className="h-3 w-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h2l1 2h12l1-2h2M6 19h12" /></svg>
                      Tools
                    </Link>
                    <Link href={`/admin/agents/${encodeURIComponent(r.agent_key)}/core-tools`} className="inline-flex items-center gap-1 px-1.5 py-1 bg-amber-100 text-amber-800 border rounded text-xs whitespace-nowrap min-w-0">
                      <svg className="h-3 w-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                      Core Tools
                    </Link>
                    <Link href={`/admin/agents/${encodeURIComponent(r.agent_key)}/navigation-pages`} className="inline-flex items-center gap-1 px-1.5 py-1 bg-purple-100 text-purple-800 border rounded text-xs whitespace-nowrap min-w-0">
                      <svg className="h-3 w-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                      Nav
                    </Link>
                    <button onClick={() => remove(r.agent_key)} className="inline-flex items-center gap-1 px-1.5 py-1 bg-red-100 text-red-700 border rounded text-xs whitespace-nowrap min-w-0">
                      <svg className="h-3 w-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      Del
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={6}>{loading ? 'Loading...' : 'No data'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


