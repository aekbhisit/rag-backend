import { NextRequest, NextResponse } from 'next/server';

/**
 * /services/contexts/place - Place Details Proxy Endpoint
 * =====================================================
 * 
 * PURPOSE:
 * - Proxies place detail requests to backend travel API
 * - Used by frontend to fetch specific place information
 * - Handles place context retrieval for detailed views
 * 
 * USAGE:
 * - POST: Used to fetch place details by placeId
 * - Called by: places/page.tsx (for place detail modals)
 * - Used when user clicks on a specific place to view details
 * 
 * EXAMPLES:
 * - POST /services/contexts/place (with {placeId: "123e4567-e89b-12d3-a456-426614174000"})
 * - POST /services/contexts/place (with {placeId: "chiang-rai-temple"})
 * 
 * PROXY TARGET:
 * - POST: /api/travel/place
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:3100';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tenantId = req.headers.get('x-tenant-id') || '00000000-0000-0000-0000-000000000000';
    
    const response = await fetch(`${BACKEND_URL}/api/travel/place`, {
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
    console.error('Proxy error for /services/contexts/place:', error);
    return NextResponse.json(
      { error: 'Proxy request failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
