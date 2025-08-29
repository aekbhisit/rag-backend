import { NextRequest, NextResponse } from 'next/server';
import { createRagClient } from '@/app/lib/ragClient';

function getTenantId(req?: NextRequest): string {
  const fromHeader = req?.headers.get('x-tenant-id') || '';
  const envTenant = process.env.RAG_TENANT_ID || '';
  return (fromHeader || envTenant);
}

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-ID' }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const params: Record<string, string> = {};
    searchParams.forEach((v, k) => { params[k] = v; });
    const client = createRagClient(tenantId);
    const data = await client.getContexts(params);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'RAG error' }, { status: 500 });
  }
}


