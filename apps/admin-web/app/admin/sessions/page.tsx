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
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const [sortField, setSortField] = React.useState<string>('started_at');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');
  const { userTimezone } = useAuth();

  const search = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), size: String(size) });
      if (status) params.set('status', status);
      if (channel) params.set('channel', channel);
      if (userId) params.set('user_id', userId);
      if (sortField) params.set('sort', sortField);
      if (sortOrder) params.set('order', sortOrder);
      const url = `${base}/api/admin/sessions?${params.toString()}`;
      const tenantId = getTenantId();
      const r = await fetch(url, { headers: { 'X-Tenant-ID': tenantId } });
      const data = await r.json();
      setItems(r.ok ? (data.items || []) : []);
      setTotal(data.total || (data.items?.length || 0));
    } finally { setLoading(false); }
  };

  React.useEffect(() => { search(); }, [page, size, status, channel, sortField, sortOrder]);

  const deleteSession = async (id: string) => {
    if (!confirm('Are you sure you want to delete this session and all its messages? This action cannot be undone.')) {
      return;
    }
    
    setDeleting(id);
    try {
      const tenantId = getTenantId();
      const response = await fetch(`${base}/api/admin/sessions/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'X-Tenant-ID': tenantId }
      });
      
      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to delete session: ${error.error || 'Unknown error'}`);
        return;
      }
      
      // Refresh the list
      await search();
    } catch (error) {
      alert(`Failed to delete session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeleting(null);
    }
  };

  const cleanupOldSessions = async () => {
    if (!confirm('This will mark all active sessions older than 1 hour as "ended". Continue?')) {
      return;
    }
    
    try {
      const tenantId = getTenantId();
      const response = await fetch(`${base}/api/admin/sessions/cleanup`, {
        method: 'POST',
        headers: { 
          'X-Tenant-ID': tenantId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ hoursOld: 1 })
      });
      
      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to cleanup sessions: ${error.error || 'Unknown error'}`);
        return;
      }
      
      const result = await response.json();
      alert(`Cleanup completed! ${result.endedCount} old sessions marked as ended.`);
      
      // Refresh the list
      await search();
    } catch (error) {
      alert(`Failed to cleanup sessions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return '↕';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sessions</h1>
        <div className="flex items-center gap-2">
          <input value={base} onChange={e => setBase(e.target.value)} className="border rounded px-2 py-1 text-sm" style={{ width: 360 }} />
          <button onClick={search} className="h-9 px-3 rounded border">Refresh</button>
          <button 
            onClick={cleanupOldSessions} 
            className="h-9 px-3 rounded border border-orange-300 text-orange-600 hover:bg-orange-50"
          >
            Cleanup Old Sessions
          </button>
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
              <option value="active">Active (Ongoing)</option>
              <option value="ended">Ended (Completed)</option>
            </select>
            <select value={channel} onChange={e => { setPage(1); setChannel(e.target.value); }} className="border rounded px-2 py-1 text-sm">
              <option value="">All channels</option>
              <option value="text">Text Chat</option>
              <option value="realtime">Voice Chat</option>
              <option value="human">Human Agent</option>
            </select>
            <button onClick={() => { setStatus(''); setChannel(''); setUserId(''); setPage(1); }} className="h-8 px-3 rounded border">Clear</button>
          </div>
        </div>
      </div>

      <div className="border rounded overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2">
                <div className="flex items-center gap-1">
                  Started
                  <button 
                    onClick={() => handleSort('started_at')}
                    className="hover:text-blue-600 text-gray-400 text-xs ml-1 px-1 rounded leading-none flex items-center justify-center"
                    style={{ height: '20px', width: '20px' }}
                  >
                    {getSortIcon('started_at')}
                  </button>
                </div>
              </th>
              <th className="text-left px-3 py-2">
                <div className="flex items-center gap-1">
                  User
                  <button 
                    onClick={() => handleSort('user_id')}
                    className="hover:text-blue-600 text-gray-400 text-xs ml-1 px-1 rounded leading-none flex items-center justify-center"
                    style={{ height: '20px', width: '20px' }}
                  >
                    {getSortIcon('user_id')}
                  </button>
                </div>
              </th>
              <th className="text-left px-3 py-2">
                <div className="flex items-center gap-1">
                  Channel
                  <button 
                    onClick={() => handleSort('channel')}
                    className="hover:text-blue-600 text-gray-400 text-xs ml-1 px-1 rounded leading-none flex items-center justify-center"
                    style={{ height: '20px', width: '20px' }}
                  >
                    {getSortIcon('channel')}
                  </button>
                </div>
              </th>
              <th className="text-left px-3 py-2">
                <div className="flex items-center gap-1">
                  Status
                  <button 
                    onClick={() => handleSort('status')}
                    className="hover:text-blue-600 text-gray-400 text-xs ml-1 px-1 rounded leading-none flex items-center justify-center"
                    style={{ height: '20px', width: '20px' }}
                  >
                    {getSortIcon('status')}
                  </button>
                </div>
              </th>
              <th className="text-left px-3 py-2">
                <div className="flex items-center gap-1">
                  Messages
                  <button 
                    onClick={() => handleSort('message_count')}
                    className="hover:text-blue-600 text-gray-400 text-xs ml-1 px-1 rounded leading-none flex items-center justify-center"
                    style={{ height: '20px', width: '20px' }}
                  >
                    {getSortIcon('message_count')}
                  </button>
                </div>
              </th>
              <th className="text-left px-3 py-2">
                <div className="flex items-center gap-1">
                  Tokens
                  <button 
                    onClick={() => handleSort('total_tokens')}
                    className="hover:text-blue-600 text-gray-400 text-xs ml-1 px-1 rounded leading-none flex items-center justify-center"
                    style={{ height: '20px', width: '20px' }}
                  >
                    {getSortIcon('total_tokens')}
                  </button>
                </div>
              </th>
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
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/admin/sessions/${encodeURIComponent(i.id)}`)}
                      className="h-8 px-3 rounded border hover:bg-[color:var(--surface-hover)]"
                    >View</button>
                    <button
                      onClick={() => deleteSession(i.id)}
                      disabled={deleting === i.id}
                      className="h-8 px-3 rounded border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleting === i.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
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


