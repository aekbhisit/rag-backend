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
    const body = await req.json();
    const category = String(body?.category || '');
    // Contexts list by category
    const qs = new URLSearchParams();
    qs.set('type', 'place');
    if (category) qs.set('category', category);
    qs.set('page_size', '100');
    const res = await fetch(`${backend}/api/contexts?${qs.toString()}`, {
      headers: { 'X-Tenant-ID': tenantId },
      cache: 'no-store',
    });
    if (!res.ok) return new NextResponse(await res.text(), { status: res.status });
    const payload = await res.json();
    const items: any[] = Array.isArray(payload?.items) ? payload.items : (Array.isArray(payload) ? payload : []);
    const results = items.map((row: any, idx: number) => {
      const a = row?.attributes || {};
      const rating = a.rating_pricing?.rating ?? a.rating;
      const priceLevel = a.rating_pricing?.price_level ?? a.price_level;
      const tags = Array.isArray(a.tags) ? a.tags : (Array.isArray(row.keywords) ? row.keywords : []);
      const photos: string[] = Array.isArray(a.images) ? a.images : [];
      return {
        placeId: row.id,
        name: row.title || 'Place',
        rating: typeof rating === 'number' ? rating : undefined,
        priceLevel: typeof priceLevel === 'number' ? priceLevel : undefined,
        distanceMeters: undefined,
        openNow: undefined,
        tags,
        address: a.address || '',
        phone: a.phone,
        photos,
        description: (row.body || '').slice(0, 160),
        detail: undefined,
        longDescription: row.body || '',
      };
    });
    return NextResponse.json({ results });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}


