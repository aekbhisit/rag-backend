"use client";

import React, { useMemo, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

export default function NewAgentPromptPage() {
  const params = useParams();
  const router = useRouter();
  const agentKey = decodeURIComponent(String(params?.agentKey || ''));
  const apiBase = useMemo(() => `${BACKEND_URL}/api/admin`, []);
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  function insert(before: string, after: string = "") {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const selected = content.slice(start, end);
    const next = content.slice(0, start) + before + selected + after + content.slice(end);
    setContent(next);
    setTimeout(() => {
      el.focus();
      el.selectionStart = start + before.length;
      el.selectionEnd = end + before.length;
    }, 0);
  }

  async function save() {
    try {
      setLoading(true);
      const body: any = {
        category: 'base',
        intent: null,
        style: null,
        locale: 'en',
        content,
        metadata: {}
      };
      const res = await fetch(`${apiBase}/agents/${encodeURIComponent(agentKey)}/prompts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(`Create failed: ${res.status}`);
      const j = await res.json();
      if (j?.id) await fetch(`${apiBase}/agents/${encodeURIComponent(agentKey)}/prompts/${encodeURIComponent(j.id)}/publish`, { method: 'PUT' });
      router.push(`/admin/agents/${encodeURIComponent(agentKey)}/prompts`);
    } catch (e: any) {
      alert(e?.message || 'Save failed');
    } finally { setLoading(false); }
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-3">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-600">
        <a href="/admin" className="underline">Admin</a>
        <span className="mx-2">/</span>
        <a href="/admin/agents" className="underline">Agents</a>
        <span className="mx-2">/</span>
        <a href={`/admin/agents/${encodeURIComponent(agentKey)}/prompts`} className="underline">{agentKey} / Prompts</a>
        <span className="mx-2">/</span>
        <span className="text-gray-900">New</span>
      </nav>

      <h1 className="text-2xl font-semibold text-gray-900">New Prompt for {agentKey}</h1>

      <div className="bg-white border rounded p-4 space-y-3">
        {/* simple toolbar */}
        <div className="flex items-center gap-2 text-sm">
          <button className="px-2 py-1 border rounded" onClick={() => insert("# ")}>H1</button>
          <button className="px-2 py-1 border rounded" onClick={() => insert("## ")}>H2</button>
          <button className="px-2 py-1 border rounded" onClick={() => insert("**", "**")}>Bold</button>
          <button className="px-2 py-1 border rounded" onClick={() => insert("*", "*")}>Italic</button>
          <button className="px-2 py-1 border rounded" onClick={() => insert("`", "`")}>Code</button>
          <button className="px-2 py-1 border rounded" onClick={() => insert("- ")}>List</button>
        </div>
        <textarea ref={textareaRef} value={content} onChange={(e) => setContent(e.target.value)} rows={28} className="mt-1 w-full border rounded px-3 py-2 font-mono text-gray-900 min-h-[60vh]" />
        <div className="flex items-center gap-2">
          <button onClick={save} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">{loading ? 'Saving...' : 'Save'}</button>
          <a href={`/admin/agents/${encodeURIComponent(agentKey)}/prompts`} className="px-4 py-2 bg-gray-100 border rounded">Cancel</a>
        </div>
      </div>
    </div>
  );
}
