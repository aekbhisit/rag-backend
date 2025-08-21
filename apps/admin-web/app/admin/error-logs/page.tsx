"use client";

import React from "react";
import Link from "next/link";
import { BACKEND_URL, getTenantId } from "../../../components/config";
import { Table } from "../../../components/ui/Table";
import { Button } from "../../../components/Button";
import { Pagination } from "../../../components/ui/Pagination";
import { Select } from "../../../components/ui/Select";

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

      const tenantId = getTenantId();
      const url = `${BACKEND_URL}/api/admin/error-logs?${queryParams}`;
      
      console.log('🔍 Debug: Making API call to:', url);
      console.log('🔍 Debug: Tenant ID:', tenantId);
      console.log('🔍 Debug: BACKEND_URL:', BACKEND_URL);

      const r = await fetch(url, { 
        headers: { 'X-Tenant-ID': tenantId } 
      });
      
      console.log('🔍 Debug: Response status:', r.status);
      console.log('🔍 Debug: Response headers:', Object.fromEntries(r.headers.entries()));
      
      const data = await r.json();
      console.log('🔍 Debug: Response data:', data);
      
      setItems(Array.isArray(data?.items) ? data.items : []);
      setTotal(Number(data?.total || 0));
      setPage(Number(data?.page || p));
    } catch (error) {
      console.error('🔍 Debug: Error in load function:', error);
    } finally { 
      setLoading(false); 
    }
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Select
          label="Status"
          placeholder="All Statuses"
          value={filters.status}
          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          options={[
            { value: "", label: "All Statuses" },
            { value: "open", label: "Open" },
            { value: "fixed", label: "Fixed" },
            { value: "ignored", label: "Ignored" }
          ]}
        />
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-[color:var(--text)]">Error Code</label>
          <input
            type="text"
            value={filters.errorCode}
            onChange={(e) => setFilters(prev => ({ ...prev, errorCode: e.target.value }))}
            placeholder="e.g., INTERNAL_ERROR"
            className="w-full px-3 py-2 border border-[color:var(--border)] rounded-lg bg-[color:var(--surface)] text-[color:var(--text)] shadow-sm transition-all duration-200 hover:border-[color:var(--border-hover)] focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)] focus:ring-opacity-20 focus:border-[color:var(--primary)] focus:shadow-md"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-[color:var(--text)]">From Date</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
            className="w-full px-3 py-2 border border-[color:var(--border)] rounded-lg bg-[color:var(--surface)] text-[color:var(--text)] shadow-sm transition-all duration-200 hover:border-[color:var(--border-hover)] focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)] focus:ring-opacity-20 focus:border-[color:var(--primary)] focus:shadow-md"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-[color:var(--text)]">To Date</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
            className="w-full px-3 py-2 border border-[color:var(--border)] rounded-lg bg-[color:var(--surface)] text-[color:var(--text)] shadow-sm transition-all duration-200 hover:border-[color:var(--border-hover)] focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)] focus:ring-opacity-20 focus:border-[color:var(--primary)] focus:shadow-md"
          />
        </div>
      </div>
      
      <div className="flex justify-end">
        <Button 
          onClick={() => setFilters({ status: '', errorCode: '', dateFrom: '', dateTo: '' })}
          variant="outline"
        >
          Clear Filters
        </Button>
      </div>

      <Table
        columns={[
          { key: 'created_at', title: 'Time' },
          { 
            key: 'endpoint', 
            title: 'Endpoint',
            render: (_, row: any) => (
              <span className="font-mono text-sm max-w-xs truncate block" title={row.endpoint || 'N/A'}>
                {row.endpoint || 'N/A'}
              </span>
            )
          },
          { 
            key: 'method', 
            title: 'Method',
            render: (_, row: any) => (
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                row.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                row.method === 'POST' ? 'bg-green-100 text-green-800' :
                row.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                row.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {row.method || 'N/A'}
              </span>
            )
          },
          { 
            key: 'http_status', 
            title: 'HTTP Status',
            render: (_, row: any) => (
              <span className={`font-semibold ${
                row.http_status >= 500 ? 'text-red-600' :
                row.http_status >= 400 ? 'text-orange-600' :
                'text-gray-600'
              }`}>
                {row.http_status || 'N/A'}
              </span>
            )
          },
          { 
            key: 'log_status', 
            title: 'Status',
            render: (_, row: any) => (
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                row.log_status === 'open' ? 'bg-yellow-100 text-yellow-800' :
                row.log_status === 'fixed' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {row.log_status || 'open'}
              </span>
            )
          },
          { key: 'message', title: 'Message' },
          { key: 'file', title: 'File:Line' },
          { 
            key: 'actions', 
            title: 'Actions',
            render: (_, row: any) => (
              <div className="flex space-x-2">
                <Link 
                  href={`/admin/error-logs/${row.id}`}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View
                </Link>
                <Select
                  size="sm"
                  placeholder="Status"
                  value={row.log_status || 'open'}
                  onChange={(e) => updateStatus(row.id, e.target.value as 'open' | 'fixed' | 'ignored')}
                  options={[
                    { value: 'open', label: 'Open' },
                    { value: 'fixed', label: 'Fixed' },
                    { value: 'ignored', label: 'Ignored' }
                  ]}
                />
                <button
                  onClick={() => deleteErrorLog(row.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Delete
                </button>
              </div>
            )
          },
        ]}
        data={items.map((it: any) => ({
          ...it,
          created_at: new Date(it.created_at).toLocaleString(),
          message: (it.message || '').slice(0, 120),
          file: it.file ? `${it.file}:${it.line || ''}` : '-',
          log_status: it.log_status || 'open',
        }))}
      />

      <Pagination
        page={page}
        size={size}
        total={total}
        onPageChange={(p) => load(p)}
        onSizeChange={(s) => {
          // Note: size is currently fixed at 20, but we could make it configurable
          console.log('Size changed to:', s);
        }}
      />
    </main>
  );
}


