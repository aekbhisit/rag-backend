"use client";

import React from "react";
import Link from "next/link";
import { BACKEND_URL, getTenantId } from "../../../components/config";
import { Table } from "../../../components/ui/Table";
import { Button } from "../../../components/Button";

export default function ErrorLogsPage() {
  const [items, setItems] = React.useState<any[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [size] = React.useState(20);
  const [loading, setLoading] = React.useState(false);
  const [filters, setFilters] = React.useState({
    status: '',
    errorCode: '',
    dateFrom: '',
    dateTo: ''
  });

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: p.toString(),
        size: size.toString(),
        ...(filters.status && { status: filters.status }),
        ...(filters.errorCode && { errorCode: filters.errorCode }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo })
      });

      const r = await fetch(`${BACKEND_URL}/api/admin/error-logs?${queryParams}`, { 
        headers: { 'X-Tenant-ID': getTenantId() } 
      });
      const data = await r.json();
      setItems(Array.isArray(data?.items) ? data.items : []);
      setTotal(Number(data?.total || 0));
      setPage(Number(data?.page || p));
    } finally { setLoading(false); }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/error-logs/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': getTenantId()
        },
        body: JSON.stringify(filters)
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `error-logs-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const updateStatus = async (id: string, status: 'open' | 'fixed' | 'ignored', notes?: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/error-logs/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': getTenantId()
        },
        body: JSON.stringify({ status, notes })
      });

      if (response.ok) {
        // Refresh the list
        load(page);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const deleteErrorLog = async (id: string) => {
    if (!confirm('Are you sure you want to delete this error log?')) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/error-logs/${id}`, {
        method: 'DELETE',
        headers: { 'X-Tenant-ID': getTenantId() }
      });

      if (response.ok) {
        // Refresh the list
        load(page);
      }
    } catch (error) {
      console.error('Failed to delete error log:', error);
    }
  };

  React.useEffect(() => { load(1); }, [filters]);

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Error Logs</h1>
        <div className="flex items-center gap-2">
          <Button onClick={() => load(1)} disabled={loading}>Reload</Button>
          <Button onClick={handleExport} disabled={loading}>Export Filtered Logs</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="fixed">Fixed</option>
              <option value="ignored">Ignored</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Error Code</label>
            <input
              type="text"
              value={filters.errorCode}
              onChange={(e) => setFilters(prev => ({ ...prev, errorCode: e.target.value }))}
              placeholder="e.g., INTERNAL_ERROR"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button 
            onClick={() => setFilters({ status: '', errorCode: '', dateFrom: '', dateTo: '' })}
            variant="outline"
          >
            Clear Filters
          </Button>
        </div>
      </div>

      <Table
        columns={[
          { key: 'created_at', title: 'Time' },
          { key: 'endpoint', title: 'Endpoint' },
          { key: 'method', title: 'Method' },
          { key: 'http_status', title: 'HTTP Status' },
          { key: 'log_status', title: 'Status' },
          { key: 'message', title: 'Message' },
          { key: 'file', title: 'File:Line' },
          { key: 'actions', title: 'Actions' },
        ]}
        data={items.map((it: any) => ({
          ...it,
          created_at: new Date(it.created_at).toLocaleString(),
          message: (it.message || '').slice(0, 120),
          file: it.file ? `${it.file}:${it.line || ''}` : '-',
          log_status: it.log_status || 'open',
          actions: (
            <div className="flex space-x-2">
              <Link key={it.id} href={`/admin/error-logs/${it.id}`}>View</Link>
              <select
                value={it.log_status || 'open'}
                onChange={(e) => updateStatus(it.id, e.target.value as 'open' | 'fixed' | 'ignored')}
                className="text-xs border rounded px-1 py-0.5"
              >
                <option value="open">Open</option>
                <option value="fixed">Fixed</option>
                <option value="ignored">Ignored</option>
              </select>
              <button
                onClick={() => deleteErrorLog(it.id)}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                Delete
              </button>
            </div>
          )
        }))}
      />

      <div className="flex items-center justify-between">
        <div className="text-sm text-[color:var(--text-muted)]">Total: {total}</div>
        <div className="flex items-center gap-2">
          <Button onClick={() => load(Math.max(1, page - 1))} disabled={page <= 1}>Prev</Button>
          <span className="text-sm">Page {page}</span>
          <Button onClick={() => load(page + 1)} disabled={(page * size) >= total}>Next</Button>
        </div>
      </div>
    </main>
  );
}


