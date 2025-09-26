"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

export type PromptRow = {
  id: string;
  agent_key: string;
  category: string;
  intent: string | null;
  style: string | null;
  locale: string;
  content: string;
  metadata: any;
  version: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export default function AgentPromptsTabPage() {
  const params = useParams();
  const agentKey = decodeURIComponent(String(params?.agentKey || ''));
  const apiBase = useMemo(() => `${BACKEND_URL}/api/admin`, []);

  const [rows, setRows] = useState<PromptRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${apiBase}/agents/${encodeURIComponent(agentKey)}/prompts`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) { setError(e?.message || 'Load failed'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [agentKey]);

  async function togglePublish(row: PromptRow) {
    try {
      const endpoint = row.is_published ? 'unpublish' : 'publish';
      const res = await fetch(`${apiBase}/agents/${encodeURIComponent(agentKey)}/prompts/${encodeURIComponent(row.id)}/${endpoint}`, { method: 'PUT' });
      if (!res.ok) throw new Error(`${endpoint} failed`);
      await load();
    } catch (e: any) { alert(e?.message || 'Update failed'); }
  }

  async function deletePrompt(row: PromptRow) {
    if (!confirm(`Are you sure you want to delete this prompt?\n\nVersion: ${row.version}`)) {
      return;
    }

    try {
      const res = await fetch(`${apiBase}/agents/${encodeURIComponent(agentKey)}/prompts/${encodeURIComponent(row.id)}`, { 
        method: 'DELETE' 
      });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      await load();
    } catch (e: any) { 
      alert(e?.message || 'Delete failed'); 
    }
  }

  return (
    <div className="w-full p-6 space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-600">
        <a href="/admin" className="underline">Admin</a>
        <span className="mx-2">/</span>
        <a href="/admin/agents" className="underline">Agents</a>
        <span className="mx-2">/</span>
        <a href={`/admin/agents/${encodeURIComponent(agentKey)}/edit`} className="underline">{agentKey}</a>
        <span className="mx-2">/</span>
        <span className="text-gray-900">Prompts</span>
      </nav>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Prompts for {agentKey}</h1>
        <a href={`/admin/agents/${encodeURIComponent(agentKey)}/prompts/new`} className="px-3 py-1 bg-green-600 text-white rounded">Add Prompt</a>
      </div>

      {/* Versions table */}
      <div className="bg-white border rounded overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="px-3 py-2 text-left">Published</th>
              <th className="px-3 py-2 text-left">Version</th>
              <th className="px-3 py-2 text-left">Updated</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t align-top">
                <td className="px-3 py-2">{r.is_published ? <span className="text-green-700">Yes</span> : <span className="text-gray-500">No</span>}</td>
                <td className="px-3 py-2">{r.version}</td>
                <td className="px-3 py-2">{new Date(r.updated_at).toLocaleString()}</td>
                <td className="px-3 py-2 space-x-1">
                  <a href={`/admin/agents/${encodeURIComponent(agentKey)}/prompts/${encodeURIComponent(r.id)}/edit`} className="px-2 py-1 bg-gray-100 border rounded text-xs w-20 h-7 text-center inline-block no-underline">Edit</a>
                  <button onClick={() => togglePublish(r)} className="px-2 py-1 bg-blue-600 text-white rounded text-xs w-20 h-7">{r.is_published ? 'Unpublish' : 'Publish'}</button>
                  <button onClick={() => deletePrompt(r)} className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs w-20 h-7">Delete</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={4}>{loading ? 'Loading...' : 'No prompts yet'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


