import { NextRequest, NextResponse } from 'next/server';

function getBackendUrl(): string {
  const base = process.env.RAG_BASE_URL || 'http://localhost:3100';
  return base.replace(/\/$/, '');
}

function getTenantId(req?: NextRequest): string {
  const fromHeader = req?.headers.get('x-tenant-id') || '';
  const envTenant = process.env.NEXT_PUBLIC_RAG_TENANT_ID || '';
  return (fromHeader || envTenant);
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-ID' }, { status: 400 });
    const backend = getBackendUrl();
    const body = await req.text();
    const res = await fetch(`${backend}/api/admin/contexts/import`, {
      method: 'POST',
      headers: { 'X-Tenant-ID': tenantId, 'Content-Type': 'application/json' },
      body,
    });
    const text = await res.text();
    return new NextResponse(text, { status: res.status, headers: { 'content-type': res.headers.get('content-type') || 'application/json' } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Proxy error' }, { status: 500 });
  }
}


