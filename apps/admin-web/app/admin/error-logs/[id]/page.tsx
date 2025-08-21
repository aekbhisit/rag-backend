"use client";

import React from "react";
import { useParams } from "next/navigation";
import { BACKEND_URL, getTenantId } from "../../../../components/config";
import { Button } from "../../../../components/Button";

export default function ErrorLogDetailPage() {
  const { id } = useParams() as { id?: string };
  const [item, setItem] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const r = await fetch(`${BACKEND_URL}/api/admin/error-logs/${id}`, { headers: { 'X-Tenant-ID': getTenantId() } });
      const data = await r.json();
      setItem(data);
    } finally { setLoading(false); }
  };
  React.useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); alert('Copied'); } catch {}
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
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="border rounded p-4 space-y-2">
          <div className="font-medium">Overview</div>
          <div className="text-sm">Time: {new Date(item.created_at).toLocaleString()}</div>
          <div className="text-sm">Endpoint: {item.endpoint} ({item.method})</div>
          <div className="text-sm">Status: {item.status}</div>
          <div className="text-sm">Message: {item.message}</div>
          <div className="text-sm">Error Code: {item.error_code}</div>
          <div className="text-sm">Source: {item.file ? `${item.file}:${item.line || ''}:${item.column || ''}` : '-'}</div>
          <div className="text-sm">Request ID: {item.request_id || '-'}</div>
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


