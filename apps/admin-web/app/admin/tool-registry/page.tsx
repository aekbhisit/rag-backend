"use client";

import React, { useEffect, useMemo, useState } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

export default function ToolRegistryPage() {
  const apiBase = useMemo(() => `${BACKEND_URL}/api/admin`, []);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const r = await fetch(`${apiBase}/tool-registry`, { cache: 'no-store' });
      const j = await r.json();
      setRows(Array.isArray(j) ? j : []);
    } catch (e: any) { setError(e?.message || 'Load failed'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function remove(tool_key: string) {
    if (!confirm(`Delete ${tool_key}?`)) return;
    const res = await fetch(`${apiBase}/tool-registry/${encodeURIComponent(tool_key)}`, { method: 'DELETE' });
    if (res.ok) load(); else alert('Delete failed');
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4">
      <nav className="text-sm text-gray-600">
        <a href="/admin" className="underline">Admin</a>
        <span className="mx-2">/</span>
        <span className="text-gray-900">Tool Registry</span>
      </nav>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Tool Registry</h1>
        <a href="/admin/tool-registry/new" className="px-3 py-1 bg-green-600 text-white rounded">Add Tool</a>
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="bg-white border rounded overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="px-3 py-2 text-left">Key</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-left">Runtime</th>
              <th className="px-3 py-2 text-left">Enabled</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.tool_key} className="border-t">
                <td className="px-3 py-2 font-mono text-xs">{r.tool_key}</td>
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2">{r.category}</td>
                <td className="px-3 py-2">{r.runtime}</td>
                <td className="px-3 py-2">{r.is_enabled ? 'Yes' : 'No'}</td>
                <td className="px-3 py-2 space-x-2">
                  <a href={`/admin/tool-registry/${encodeURIComponent(r.tool_key)}/edit`} className="px-2 py-1 bg-gray-100 border rounded inline-block">Edit</a>
                  <button onClick={() => remove(r.tool_key)} className="px-2 py-1 bg-red-600 text-white rounded">Delete</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={6}>{loading ? 'Loading...' : 'No tools'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
