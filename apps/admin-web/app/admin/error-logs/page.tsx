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

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const r = await fetch(`${BACKEND_URL}/api/admin/error-logs?page=${p}&size=${size}`, { headers: { 'X-Tenant-ID': getTenantId() } });
      const data = await r.json();
      setItems(Array.isArray(data?.items) ? data.items : []);
      setTotal(Number(data?.total || 0));
      setPage(Number(data?.page || p));
    } finally { setLoading(false); }
  };

  React.useEffect(() => { load(1); }, []);

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Error Logs</h1>
        <div className="flex items-center gap-2">
          <Button onClick={() => load(1)} disabled={loading}>Reload</Button>
        </div>
      </div>

      <Table
        columns={[
          { key: 'created_at', title: 'Time' },
          { key: 'endpoint', title: 'Endpoint' },
          { key: 'method', title: 'Method' },
          { key: 'status', title: 'Status' },
          { key: 'message', title: 'Message' },
          { key: 'file', title: 'File:Line' },
          { key: 'actions', title: 'Actions' },
        ]}
        data={items.map((it: any) => ({
          ...it,
          created_at: new Date(it.created_at).toLocaleString(),
          message: (it.message || '').slice(0, 120),
          file: it.file ? `${it.file}:${it.line || ''}` : '-',
          actions: <Link key={it.id} href={`/admin/error-logs/${it.id}`}>View</Link>
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


