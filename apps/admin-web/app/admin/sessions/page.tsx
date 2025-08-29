"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { BACKEND_URL, getTenantId } from "../../../components/config";
import { Pagination } from "../../../components/ui/Pagination";
import { formatDateForTable } from "../../../utils/timezone";
import { useAuth } from "../../../components/AuthProvider";
// Using static labels to avoid translation key typing

type SessionItem = {
  id: string;
  user_id: string | null;
  channel: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  message_count: number;
  total_tokens: number;
};

export default function SessionsPage() {
  const router = useRouter();
  const [base, setBase] = React.useState(BACKEND_URL);
  const [items, setItems] = React.useState<SessionItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [size, setSize] = React.useState(20);
  const [total, setTotal] = React.useState(0);
  const [status, setStatus] = React.useState("");
  const [channel, setChannel] = React.useState("");
  const [userId, setUserId] = React.useState("");
  const { userTimezone } = useAuth();

  const search = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), size: String(size) });
      if (status) params.set('status', status);
      if (channel) params.set('channel', channel);
      if (userId) params.set('user_id', userId);
      const url = `${base}/api/admin/sessions?${params.toString()}`;
      const tenantId = getTenantId();
      const r = await fetch(url, { headers: { 'X-Tenant-ID': tenantId } });
      const data = await r.json();
      setItems(r.ok ? (data.items || []) : []);
      setTotal(data.total || (data.items?.length || 0));
    } finally { setLoading(false); }
  };

  React.useEffect(() => { search(); }, [page, size, status, channel]);

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sessions</h1>
        <div className="flex items-center gap-2">
          <input value={base} onChange={e => setBase(e.target.value)} className="border rounded px-2 py-1 text-sm" style={{ width: 360 }} />
          <button onClick={search} className="h-9 px-3 rounded border">Refresh</button>
        </div>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr' }}>
        <div className="border rounded p-3">
          <div className="text-sm font-medium mb-2">Filters</div>
          <div className="flex items-center gap-2 mb-2">
            <input value={userId} onChange={e => setUserId(e.target.value)} placeholder={'User ID'} className="border rounded px-2 py-1 text-sm w-full" />
          </div>
          <div className="flex items-center gap-2">
            <select value={status} onChange={e => { setPage(1); setStatus(e.target.value); }} className="border rounded px-2 py-1 text-sm">
              <option value="">All statuses</option>
              <option value="active">active</option>
              <option value="ended">ended</option>
              <option value="error">error</option>
            </select>
            <select value={channel} onChange={e => { setPage(1); setChannel(e.target.value); }} className="border rounded px-2 py-1 text-sm">
              <option value="">All channels</option>
              <option value="normal">normal</option>
              <option value="realtime">realtime</option>
              <option value="human">human</option>
            </select>
            <button onClick={() => { setStatus(''); setChannel(''); setUserId(''); setPage(1); }} className="h-8 px-3 rounded border">Clear</button>
          </div>
        </div>
      </div>

      <div className="border rounded overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2">Started</th>
              <th className="text-left px-3 py-2">User</th>
              <th className="text-left px-3 py-2">Channel</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-left px-3 py-2">Messages</th>
              <th className="text-left px-3 py-2">Tokens</th>
              <th className="text-left px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-500">Loading…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-500">No data</td></tr>}
            {items.map(i => (
              <tr key={i.id} className="border-t">
                <td className="px-3 py-2">{formatDateForTable(i.started_at, userTimezone)}</td>
                <td className="px-3 py-2">{i.user_id || '—'}</td>
                <td className="px-3 py-2">{i.channel}</td>
                <td className="px-3 py-2">{i.status}</td>
                <td className="px-3 py-2">{i.message_count}</td>
                <td className="px-3 py-2">{i.total_tokens}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => router.push(`/admin/sessions/${encodeURIComponent(i.id)}`)}
                    className="h-8 px-3 rounded border hover:bg-[color:var(--surface-hover)]"
                  >View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} size={size} total={total} onPageChange={(p)=>setPage(p)} onSizeChange={(s)=>{setPage(1); setSize(s);}} />
    </main>
  );
}


