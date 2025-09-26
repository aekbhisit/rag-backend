"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

type RegistryTool = {
  tool_key: string;
  name: string;
  category: string; // e.g., core, ui, skill
  runtime: string;
  handler_key: string;
  input_schema?: any;
  default_settings?: any;
  is_enabled?: boolean;
};

export default function AgentCoreToolsPage() {
  const params = useParams();
  const router = useRouter();
  const agentKey = decodeURIComponent(String(params?.agentKey || ""));
  const apiBase = useMemo(() => `${BACKEND_URL}/api/admin`, []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [registry, setRegistry] = useState<RegistryTool[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true); setError("");
    try {
      const [registryRes, currentRes] = await Promise.all([
        fetch(`${apiBase}/tool-registry`, { cache: 'no-store' }),
        fetch(`${apiBase}/agents/${encodeURIComponent(agentKey)}/tools`, { cache: 'no-store' })
      ]);
      const reg = registryRes.ok ? await registryRes.json() : [];
      // Filter only core/ui categories as requested
      const filtered = (Array.isArray(reg) ? reg : []).filter((t: any) => ['core', 'ui'].includes(String(t.category || '').toLowerCase()));
      setRegistry(filtered);

      const cur = currentRes.ok ? await currentRes.json() : [];
      const currentKeys: string[] = (Array.isArray(cur) ? cur : []).map((t: any) => t.tool_key);
      setSelected(new Set(currentKeys.filter(k => filtered.some((f: any) => f.tool_key === k))));
    } catch (e: any) {
      setError(e?.message || 'Load failed');
    } finally { setLoading(false); }
  };

  useEffect(() => { if (agentKey) load(); }, [agentKey]);

  const toggle = (toolKey: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(toolKey)) next.delete(toolKey); else next.add(toolKey);
      return next;
    });
  };

  const save = async () => {
    setLoading(true); setError("");
    try {
      // Load current to compute diff
      const currentRes = await fetch(`${apiBase}/agents/${encodeURIComponent(agentKey)}/tools`, { cache: 'no-store' });
      const cur = currentRes.ok ? await currentRes.json() : [];
      const currentKeys: string[] = (Array.isArray(cur) ? cur : []).map((t: any) => t.tool_key);
      const toAdd = [...selected].filter(k => !currentKeys.includes(k));
      const toRemove = (currentRes.ok ? (cur as any[]) : []).filter(t => !selected.has(t.tool_key));

      // Perform adds first (position after existing)
      let positionBase = Array.isArray(cur) ? cur.length : 0;
      for (const toolKey of toAdd) {
        const reg = registry.find(r => r.tool_key === toolKey);
        const body = {
          tool_key: toolKey,
          enabled: true,
          position: positionBase++,
          function_name: undefined,
          function_description: undefined,
          function_parameters: undefined,
          arg_defaults: {},
          arg_templates: {},
          guardrails: {},
          overrides: {}
        };
        await fetch(`${apiBase}/agents/${encodeURIComponent(agentKey)}/tools`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });
      }

      // Remove deselected
      for (const row of toRemove) {
        await fetch(`${apiBase}/agents/${encodeURIComponent(agentKey)}/tools/${encodeURIComponent(row.id)}`, { method: 'DELETE' });
      }

      await load();
      alert('Saved');
    } catch (e: any) {
      setError(e?.message || 'Save failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <a href="/admin/agents" className="underline">Agents</a>
          <span>/</span>
          <a href={`/admin/agents/${encodeURIComponent(agentKey)}/edit`} className="underline">{agentKey}</a>
          <span>/</span>
          <span className="text-gray-900">Core Tools</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => router.push(`/admin/agents/${encodeURIComponent(agentKey)}/tools`)} className="px-3 py-1 border rounded">Back to Tools</button>
          <button onClick={save} disabled={loading} className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50">{loading ? 'Saving…' : 'Save'}</button>
        </div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="bg-white border rounded">
        <div className="p-3 border-b font-medium">Select core/ui tools to inject into this agent</div>
        {loading && <div className="p-3 text-gray-500">Loading…</div>}
        {!loading && (
          <div className="p-3 grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {registry.map(t => {
              const checked = selected.has(t.tool_key);
              return (
                <label key={t.tool_key} className={`flex items-start gap-3 border rounded p-3 cursor-pointer ${checked ? 'bg-amber-50 border-amber-200' : 'hover:bg-gray-50'}`}>
                  <input type="checkbox" className="mt-1" checked={checked} onChange={() => toggle(t.tool_key)} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{t.name}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${t.category === 'core' ? 'bg-gray-800 text-white' : 'bg-purple-100 text-purple-800'}`}>{t.category}</span>
                    </div>
                    <div className="text-xs text-gray-600 truncate">{t.tool_key}</div>
                    <div className="text-[11px] text-gray-500 truncate">{t.handler_key}</div>
                  </div>
                </label>
              );
            })}
            {registry.length === 0 && <div className="text-gray-500">No core/ui tools found in registry.</div>}
          </div>
        )}
      </div>
    </div>
  );
}


