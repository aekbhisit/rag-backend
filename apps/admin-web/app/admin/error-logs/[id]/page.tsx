"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { BACKEND_URL, getTenantId } from "../../../../components/config";
import { Button } from "../../../../components/Button";

export default function ErrorLogDetailPage() {
  const { id } = useParams() as { id?: string };
  const router = useRouter();
  const [item, setItem] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [editForm, setEditForm] = React.useState({
    log_status: 'open',
    notes: '',
    fixed_by: ''
  });

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const r = await fetch(`${BACKEND_URL}/api/admin/error-logs/${id}`, { headers: { 'X-Tenant-ID': getTenantId() } });
      const data = await r.json();
      setItem(data);
      setEditForm({
        log_status: data.log_status || 'open',
        notes: data.notes || '',
        fixed_by: data.fixed_by || ''
      });
    } finally { setLoading(false); }
  };
  React.useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); alert('Copied'); } catch {}
  };

  const handleSave = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/error-logs/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': getTenantId()
        },
        body: JSON.stringify(editForm)
      });

      if (response.ok) {
        await load(); // Reload the data
        setEditing(false);
      }
    } catch (error) {
      console.error('Failed to update:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm('Are you sure you want to delete this error log?')) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/error-logs/${id}`, {
        method: 'DELETE',
        headers: { 'X-Tenant-ID': getTenantId() }
      });

      if (response.ok) {
        router.push('/admin/error-logs');
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!item) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Error Log Detail</h1>
        <div className="flex items-center gap-2">
          <Button onClick={() => copy(JSON.stringify(item, null, 2))} disabled={loading}>Copy JSON</Button>
          <Button onClick={() => setEditing(!editing)} disabled={loading}>
            {editing ? 'Cancel Edit' : 'Edit'}
          </Button>
          <Button onClick={handleDelete} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white">Delete</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="border rounded p-4 space-y-2">
          <div className="font-medium">Overview</div>
          <div className="text-sm">Time: {new Date(item.created_at).toLocaleString()}</div>
          <div className="text-sm">Endpoint: {item.endpoint} ({item.method})</div>
          <div className="text-sm">HTTP Status: {item.http_status}</div>
          <div className="text-sm">Message: {item.message}</div>
          <div className="text-sm">Error Code: {item.error_code}</div>
          <div className="text-sm">Source: {item.file ? `${item.file}:${item.line || ''}:${item.column_no || ''}` : '-'}</div>
          <div className="text-sm">Request ID: {item.request_id || '-'}</div>
          
          {/* Status Information */}
          <div className="text-sm">Log Status: 
            <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
              item.log_status === 'open' ? 'bg-yellow-100 text-yellow-800' :
              item.log_status === 'fixed' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {item.log_status || 'open'}
            </span>
          </div>
          {item.notes && <div className="text-sm">Notes: {item.notes}</div>}
          {item.fixed_by && <div className="text-sm">Fixed By: {item.fixed_by}</div>}
          {item.fixed_at && <div className="text-sm">Fixed At: {new Date(item.fixed_at).toLocaleString()}</div>}
        </section>

        <section className="border rounded p-4 space-y-2">
          <div className="font-medium">Request</div>
          <div className="text-sm">Headers</div>
          <pre className="bg-[color:var(--surface)] p-2 rounded text-xs overflow-auto">{JSON.stringify(item.headers, null, 2)}</pre>
          <div className="text-sm">Query</div>
          <pre className="bg-[color:var(--surface)] p-2 rounded text-xs overflow-auto">{JSON.stringify(item.query, null, 2)}</pre>
          <div className="text-sm">Body</div>
          <pre className="bg-[color:var(--surface)] p-2 rounded text-xs overflow-auto">{JSON.stringify(item.body, null, 2)}</pre>
        </section>
      </div>

      {/* Edit Form */}
      {editing && (
        <section className="border rounded p-4 space-y-4">
          <div className="font-medium">Edit Error Log</div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={editForm.log_status}
                onChange={(e) => setEditForm(prev => ({ ...prev, log_status: e.target.value as 'open' | 'fixed' | 'ignored' }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="open">Open</option>
                <option value="fixed">Fixed</option>
                <option value="ignored">Ignored</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <input
                type="text"
                value={editForm.notes}
                onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add notes about this error..."
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fixed By</label>
              <input
                type="text"
                value={editForm.fixed_by}
                onChange={(e) => setEditForm(prev => ({ ...prev, fixed_by: e.target.value }))}
                placeholder="Who fixed this issue?"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button onClick={() => setEditing(false)} variant="outline">Cancel</Button>
            <Button onClick={handleSave} disabled={loading}>Save Changes</Button>
          </div>
        </section>
      )}

      <section className="border rounded p-4 space-y-2">
        <div className="font-medium">Stack</div>
        <pre className="bg-[color:var(--surface)] p-2 rounded text-xs overflow-auto">{item.stack || '-'}</pre>
        <div>
          <Button onClick={() => copy(item.stack || '')} disabled={!item.stack}>Copy Stack</Button>
        </div>
      </section>
    </main>
  );
}


