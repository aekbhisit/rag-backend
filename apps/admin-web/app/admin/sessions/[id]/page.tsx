"use client";

import React from "react";
import { useParams } from "next/navigation";
import { BACKEND_URL, getTenantId } from "../../../../components/config";
import { formatDateForTable } from "../../../../utils/timezone";
import { useAuth } from "../../../../components/AuthProvider";

export default function SessionDetailPage() {
  const params = useParams();
  const id = (params?.id as string) || '';
  // Prefer runtime origin to avoid stale env pointing to wrong port
  const [base, setBase] = React.useState(
    typeof window !== 'undefined' ? window.location.origin : (BACKEND_URL || '')
  );
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setBase(window.location.origin);
    }
  }, []);
  const [session, setSession] = React.useState<any>(null);
  const [messages, setMessages] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const { userTimezone } = useAuth();
  const [citations, setCitations] = React.useState<Record<string, any[]>>({});
  const [tools, setTools] = React.useState<Record<string, any[]>>({});
  const [promptByMsg, setPromptByMsg] = React.useState<Record<string, any | null>>({});
  const [fetching, setFetching] = React.useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});

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

  // Removed auto-fetching of per-message details to avoid unnecessary requests.

  const fetchDetails = async (msgId: string) => {
    const key = msgId;
    setFetching(prev => ({ ...prev, [key]: true }));
    try {
      const tenantId = getTenantId();
      const [citesRes, toolsRes] = await Promise.all([
        fetch(`${base}/api/admin/messages/${encodeURIComponent(msgId)}/citations`, { headers: { 'X-Tenant-ID': tenantId } }),
        fetch(`${base}/api/admin/messages/${encodeURIComponent(msgId)}/tool-calls`, { headers: { 'X-Tenant-ID': tenantId } })
      ]);
      const citesJson = citesRes.ok ? await citesRes.json() : { items: [] };
      const toolsJson = toolsRes.ok ? await toolsRes.json() : { items: [] };
      setCitations(prev => ({ ...prev, [key]: citesJson.items || [] }));
      setTools(prev => ({ ...prev, [key]: toolsJson.items || [] }));
      // Do not fetch prompt by default; fetch on demand via fetchPrompt
    } finally {
      setFetching(prev => ({ ...prev, [key]: false }));
    }
  };

  const fetchPrompt = async (msgId: string) => {
    const tenantId = getTenantId();
    try {
      const res = await fetch(`${base}/api/admin/messages/${encodeURIComponent(msgId)}/prompt`, { headers: { 'X-Tenant-ID': tenantId } });
      if (!res.ok) {
        setPromptByMsg(prev => ({ ...prev, [msgId]: null }));
        return;
      }
      const json = await res.json();
      setPromptByMsg(prev => ({ ...prev, [msgId]: json }));
    } catch {
      setPromptByMsg(prev => ({ ...prev, [msgId]: null }));
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
            const channel = (m.meta && m.meta.channel) || session?.channel || 'normal';
            const chipCls = isUser ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700';

            const hasDetails = (citations[key]?.length || 0) > 0 || (tools[key]?.length || 0) > 0 || !!promptByMsg[key];
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
                      {/* Channel badge */}
                      <span className={`inline-flex items-center justify-center h-5 w-5 rounded-full ${chipCls} align-middle leading-none shrink-0`} title={channel}>
                        {channel === 'realtime' ? (
                          // Microphone icon (stroke currentColor) - smaller to match visual weight
                          <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3 block pointer-events-none" style={{ transform: 'translateY(0px)' }}><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"/></svg>
                        ) : channel === 'human' ? (
                          // User group icon
                          <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4 block pointer-events-none" style={{ transform: 'translateY(0px)' }}><path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9 9 0 1 0-6 0M15 11.25a3 3 0 1 0-6 0"/></svg>
                        ) : (
                          // Chat bubble icon - properly centered path
                          <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3 block pointer-events-none" style={{ transform: 'translateY(0px)' }}><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"/></svg>
                        )}
                      </span>
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
                      <span
                        role="button"
                        tabIndex={0}
                        className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] leading-none cursor-pointer select-none ${isUser ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'}`}
                        onClick={() => {
                          const next = !expanded[key];
                          setExpanded(prev => ({ ...prev, [key]: next }));
                          if (next && !fetching[key] && !hasDetails) {
                            fetchDetails(key);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            const next = !expanded[key];
                            setExpanded(prev => ({ ...prev, [key]: next }));
                            if (next && !fetching[key] && !hasDetails) {
                              fetchDetails(key);
                            }
                          }
                        }}
                        aria-label={expanded[key] ? 'Hide details' : 'Show details'}
                        title={expanded[key] ? 'Hide details' : 'Show details'}
                      >
                        {expanded[key] ? (
                          // Eye with slash (hide)
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c1.62 0 3.157.37 4.528 1.03M21.542 12c-.445 1.418-1.19 2.69-2.16 3.746M4 4l16 16" />
                          </svg>
                        ) : (
                          // Eye (show)
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </span>
                      {fetching[key] && <span className="opacity-70">Loading…</span>}
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
                      {!expanded[key] ? null : (
                        <div className="space-y-3">
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
                          <div className="flex items-center gap-2">
                            <button
                              className={`h-6 px-2 rounded border ${isUser ? 'border-white/30 hover:bg-white/10' : 'hover:bg-[color:var(--surface-hover)]'}`}
                              onClick={() => fetchPrompt(key)}
                              title="Load prompt"
                            >
                              Load prompt
                            </button>
                          </div>
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
                        </div>
                      )}
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


