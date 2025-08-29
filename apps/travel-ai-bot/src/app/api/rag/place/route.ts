import { NextRequest, NextResponse } from 'next/server';
import { createRagClient } from '@/app/lib/ragClient';

function getTenantId(req?: NextRequest): string {
  const fromHeader = req?.headers.get('x-tenant-id') || '';
  const envTenant = process.env.RAG_TENANT_ID || '';
  return (fromHeader || envTenant);
}

function getBaseUrl(): string | undefined {
  const envBase = process.env.RAG_BASE_URL;
  if (envBase && envBase.trim() !== '') return envBase;
  if (process.env.NODE_ENV !== 'production') return 'http://localhost:3001';
  return undefined;
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-ID' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const client = createRagClient(tenantId, getBaseUrl());
    const data = await client.ragPlace(body);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'RAG error' }, { status: 500 });
  }
}


