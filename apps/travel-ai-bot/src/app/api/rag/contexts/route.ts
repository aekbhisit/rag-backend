import { NextRequest, NextResponse } from 'next/server';
import { createRagClient } from '@/app/lib/ragClient';

export async function POST(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || process.env.RAG_TENANT_ID || '';
    if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-ID' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const client = createRagClient(tenantId);
    const data = await client.ragContexts(body);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'RAG error' }, { status: 500 });
  }
}


