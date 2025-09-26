import { NextRequest, NextResponse } from 'next/server';
import { createRagClient } from '@/app/lib/ragClient';

function getTenantId(req?: NextRequest): string {
  const fromHeader = req?.headers.get('x-tenant-id') || '';
  const envTenant = process.env.RAG_TENANT_ID || '';
  return (fromHeader || envTenant);
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tenantId = getTenantId(_req);
    if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-ID' }, { status: 400 });

    const client = createRagClient(tenantId);
    const data = await client.getContextById(params.id);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'RAG error' }, { status: 500 });
  }
}


