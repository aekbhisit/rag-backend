"use client";

import React from "react";
import { useParams } from "next/navigation";
import { BACKEND_URL, getTenantId } from "../../../../components/config";
import { formatDateForTable } from "../../../../utils/timezone";
import { useAuth } from "../../../../components/AuthProvider";

export default function SessionDetailPage() {
  const params = useParams();
  const id = (params?.id as string) || '';
  const [base, setBase] = React.useState(BACKEND_URL);
  const [session, setSession] = React.useState<any>(null);
  const [messages, setMessages] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const { userTimezone } = useAuth();
  const [citations, setCitations] = React.useState<Record<string, any[]>>({});
  const [tools, setTools] = React.useState<Record<string, any[]>>({});
  const [promptByMsg, setPromptByMsg] = React.useState<Record<string, any | null>>({});
  const [fetching, setFetching] = React.useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    try {
      const tenantId = getTenantId();
      const [s, m] = await Promise.all([
        fetch(`${base}/api/admin/sessions/${encodeURIComponent(id)}`, { headers: { 'X-Tenant-ID': tenantId } }),
        fetch(`${base}/api/admin/sessions/${encodeURIComponent(id)}/messages?page=1&size=200`, { headers: { 'X-Tenant-ID': tenantId } })
      ]);
      setSession(s.ok ? await s.json() : null);
      const jsonM = m.ok ? await m.json() : { items: [] };
      setMessages(jsonM.items || []);
    } finally { setLoading(false); }
  };

  React.useEffect(() => { if (id) load(); }, [id]);

  // Auto-fetch details for all messages
  React.useEffect(() => {
    (async () => {
      for (const m of messages) {
        const key = m.id as string;
        if (!citations[key] && !tools[key] && !promptByMsg[key] && !fetching[key]) {
          await fetchDetails(key);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const fetchDetails = async (msgId: string) => {
    const key = msgId;
    setFetching(prev => ({ ...prev, [key]: true }));
    try {
      const tenantId = getTenantId();
      const [citesRes, toolsRes, promptRes] = await Promise.all([
        fetch(`${base}/api/admin/messages/${encodeURIComponent(msgId)}/citations`, { headers: { 'X-Tenant-ID': tenantId } }),
        fetch(`${base}/api/admin/messages/${encodeURIComponent(msgId)}/tool-calls`, { headers: { 'X-Tenant-ID': tenantId } }),
        fetch(`${base}/api/admin/messages/${encodeURIComponent(msgId)}/prompt`, { headers: { 'X-Tenant-ID': tenantId } })
      ]);
      const citesJson = citesRes.ok ? await citesRes.json() : { items: [] };
      const toolsJson = toolsRes.ok ? await toolsRes.json() : { items: [] };
      const promptJson = promptRes.ok ? await promptRes.json() : null;
      setCitations(prev => ({ ...prev, [key]: citesJson.items || [] }));
      setTools(prev => ({ ...prev, [key]: toolsJson.items || [] }));
      setPromptByMsg(prev => ({ ...prev, [key]: promptJson }));
    } finally {
      setFetching(prev => ({ ...prev, [key]: false }));
    }
  };

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Session Detail</h1>
        <div className="flex items-center gap-2">
          <input value={base} onChange={e => setBase(e.target.value)} className="border rounded px-2 py-1 text-sm" style={{ width: 360 }} />
          <button onClick={load} className="h-9 px-3 rounded border">Refresh</button>
        </div>
      </div>

      {loading && <div className="text-gray-600">Loading…</div>}
      {!loading && !session && <div className="text-gray-600">Not found</div>}

      {session && (
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="border rounded p-3 text-sm space-y-1">
            <div><span className="text-gray-600">ID:</span> <span className="font-mono">{session.id}</span></div>
            <div><span className="text-gray-600">User:</span> {session.user_id || '—'}</div>
            <div><span className="text-gray-600">Channel:</span> {session.channel}</div>
            <div><span className="text-gray-600">Status:</span> {session.status}</div>
            <div><span className="text-gray-600">Started:</span> {formatDateForTable(session.started_at, userTimezone)}</div>
            <div><span className="text-gray-600">Ended:</span> {session.ended_at ? formatDateForTable(session.ended_at, userTimezone) : '—'}</div>
          </div>
          <div className="border rounded p-3 text-sm">
            <div className="font-medium mb-2">Metadata</div>
            <pre className="text-xs overflow-auto">{JSON.stringify(session.meta || {}, null, 2)}</pre>
          </div>
        </div>
      )}

      <div className="border rounded p-3">
        {messages.length === 0 && (
          <div className="px-3 py-6 text-center text-gray-500">No messages</div>
        )}
        <div className="space-y-5">
          {messages.map(m => {
            const isUser = m.role === 'user';
            const isAssistant = m.role === 'assistant';
            const isInternal = !!(m.meta && m.meta.is_internal);
            const align = isUser ? 'justify-end' : 'justify-start';
            const bubble = isInternal
              ? 'bg-gray-100 text-gray-600 border border-gray-300'
              : isUser
              ? 'bg-gradient-to-br from-blue-600 to-blue-500 text-white border border-blue-700'
              : isAssistant
              ? 'bg-white text-gray-900 border border-gray-200'
              : 'bg-amber-50 text-amber-900 border border-amber-200';
            const key = m.id as string;
            const cites = citations[key] || [];
            const tcs = tools[key] || [];
            const pr = promptByMsg[key];

            return (
              <div key={key} className={`flex ${align}`}>
                <div className={`max-w-[70%] rounded-2xl shadow-sm ${bubble}`}>
                  {/* Header */}
                  <div className={`px-3 pt-2 flex items-center justify-between text-[11px] ${isInternal ? 'text-gray-500' : isUser ? 'text-blue-100/90' : 'text-gray-500'}`}>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] ${isInternal ? 'bg-gray-200 text-gray-700' : isUser ? 'bg-white/20 text-white' : isAssistant ? 'bg-gray-100 text-gray-700' : 'bg-amber-100 text-amber-900'}`}>
                        {isInternal ? 'Internal' : isUser ? 'User' : isAssistant ? 'Assistant' : 'System'}
                      </span>
                      {m.model && !isUser && (
                        <span className="uppercase tracking-wide">{m.model}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="opacity-80">{formatDateForTable(m.created_at, userTimezone)}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="px-3 pb-2 pt-1">
                    <div className="whitespace-pre-wrap break-words leading-relaxed">{m.content || '—'}</div>
                    <div className="mt-2 flex items-center gap-2 text-[11px]">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${isUser ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'}`}>
                        {/* token icon */}
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 4v6c0 4-3 7-7 8-4-1-7-4-7-8V7l7-4z"/></svg>
                        <span>tokens {m.total_tokens ?? 0}</span>
                      </span>
                      {typeof m.latency_ms === 'number' && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${isUser ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'}`}>
                          {/* clock icon */}
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 8v5l3 3M12 22a10 10 0 110-20 10 10 0 010 20z"/></svg>
                          <span>{m.latency_ms} ms</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Details */}
                  {
                    <div className={`px-3 pb-3 text-[12px] ${isUser ? 'text-blue-50' : 'text-gray-700'} space-y-3`}>
                      {!!tcs.length && (
                        <div>
                          <div className="font-medium mb-1">Tool Calls</div>
                          <ul className="list-disc pl-5 space-y-1">
                            {tcs.map((tc: any) => (
                              <li key={tc.id}>
                                <span className="font-mono">{tc.tool_name}</span>
                                {typeof tc.duration_ms === 'number' && <span> · {tc.duration_ms} ms</span>}
                                {tc.status && <span> · {tc.status}</span>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {!!cites.length && (
                        <div>
                          <div className="font-medium mb-1">Citations</div>
                          <ul className="list-disc pl-5 space-y-1">
                            {cites.map((c: any) => (
                              <li key={c.id}>
                                <span className="uppercase text-[10px] mr-1">{c.source_type}</span>
                                {c.source_uri ? <a href={c.source_uri} target="_blank" className="underline">{c.source_uri}</a> : <span className="opacity-80">(no link)</span>}
                                {typeof c.score === 'number' && <span> · score {c.score.toFixed(3)}</span>}
                                {c.highlight && <div className="opacity-80">{c.highlight}</div>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {pr && (
                        <div>
                          <div className="font-medium mb-1">Prompt</div>
                          <div className="grid gap-1">
                            <div className={`font-mono whitespace-pre-wrap break-words rounded p-2 ${isUser ? 'bg-white/10' : 'bg-black/5'}`}>{pr.template}</div>
                            {!!pr.params && <div className="opacity-80">params: <span className="font-mono">{JSON.stringify(pr.params)}</span></div>}
                            {!!pr.tools_declared && <div className="opacity-80">tools: <span className="font-mono">{JSON.stringify(pr.tools_declared)}</span></div>}
                          </div>
                        </div>
                      )}
                      {fetching[key] && <div className="opacity-70">Loading details…</div>}
                    </div>
                  }
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}


