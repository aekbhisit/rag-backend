import { NextRequest, NextResponse } from 'next/server';

/**
 * /services/contexts/nearby - Nearby Places Proxy Endpoint
 * ======================================================
 * 
 * PURPOSE:
 * - Proxies nearby places requests to backend travel API
 * - Used by frontend to find places near a specific location
 * - Handles location-based place discovery
 * 
 * USAGE:
 * - POST: Used to find nearby places by placeId and radius
 * - Called by: places/page.tsx (for nearby places search)
 * - Used when user searches for places near a specific location
 * 
 * EXAMPLES:
 * - POST /services/contexts/nearby (with {placeId: "123", radiusMeters: 2000})
 * - POST /services/contexts/nearby (with {placeId: "chiang-rai-temple", category: "Attraction"})
 * 
 * PROXY TARGET:
 * - POST: /api/travel/nearby
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:3001';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tenantId = req.headers.get('x-tenant-id') || '00000000-0000-0000-0000-000000000000';
    
    const response = await fetch(`${BACKEND_URL}/api/travel/nearby`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId,
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'X-Backend-Status': response.status.toString(),
      },
    });
  } catch (error) {
    console.error('Proxy error for /services/contexts/nearby:', error);
    return NextResponse.json(
      { error: 'Proxy request failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
