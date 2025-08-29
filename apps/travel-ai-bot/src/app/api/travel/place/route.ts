import { NextRequest, NextResponse } from 'next/server';

function getBackendUrl(): string {
  const base = process.env.RAG_BASE_URL || 'http://localhost:3001';
  return base.replace(/\/$/, '');
}

function getTenantId(req?: NextRequest): string {
  const fromHeader = req?.headers.get('x-tenant-id') || '';
  const envTenant = process.env.NEXT_PUBLIC_RAG_TENANT_ID || process.env.RAG_TENANT_ID || '';
  return (fromHeader || envTenant);
}

function isUuidLike(id: string): boolean {
  return /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.test(id);
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-ID' }, { status: 400 });
    const backend = getBackendUrl();
    const { placeId } = await req.json();
    if (!placeId || typeof placeId !== 'string') {
      return NextResponse.json({ error: 'placeId is required' }, { status: 400 });
    }

    if (!isUuidLike(placeId)) {
      // Only support contexts-backed IDs for now (no dummy)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const res = await fetch(`${backend}/api/contexts/${encodeURIComponent(placeId)}`, {
      headers: { 'X-Tenant-ID': tenantId },
      cache: 'no-store',
    });
    if (!res.ok) {
      const text = await res.text();
      return new NextResponse(text || JSON.stringify({ error: 'Not found' }), { status: res.status });
    }
    const row = await res.json();
    const a = row?.attributes || {};
    const rating = a.rating_pricing?.rating ?? a.rating;
    const priceLevel = a.rating_pricing?.price_level ?? a.price_level;
    const reviewCount = a.rating_pricing?.review_count ?? a.review_count;
    const photos: string[] = Array.isArray(a.images) ? a.images : [];
    const coords = (typeof a.lat === 'number' && typeof a.lon === 'number') ? { lat: a.lat, lng: a.lon } : undefined;
    const place = {
      id: row.id,
      name: row.title || 'Place',
      categories: Array.isArray(a.tags) ? a.tags : (Array.isArray(row.keywords) ? row.keywords : []),
      rating: typeof rating === 'number' ? rating : undefined,
      reviewCount: typeof reviewCount === 'number' ? reviewCount : undefined,
      priceLevel: typeof priceLevel === 'number' ? priceLevel : undefined,
      address: a.address,
      phone: a.phone,
      website: a.website,
      photos,
      openingHours: undefined,
      coordinates: coords,
      attributes: {
        acceptsReservations: a.amenities?.accepts_reservations,
        hasDelivery: a.amenities?.has_delivery,
        hasTakeout: a.amenities?.has_takeout,
        wheelchairAccessible: a.amenities?.wheelchair_accessible,
      },
      longDescription: row.body || '',
      distanceMeters: undefined,
    };
    return NextResponse.json({ place });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}


