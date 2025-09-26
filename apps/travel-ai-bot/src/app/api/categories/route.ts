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
    const client = createRagClient(tenantId);
    const data = await client.getCategories();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Categories error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-ID' }, { status: 400 });
    const body = await req.json();
    const client = createRagClient(tenantId);
    const data = await client.createCategory(body);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Categories error' }, { status: 500 });
  }
}


