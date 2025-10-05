import { NextRequest, NextResponse } from 'next/server';

/**
 * /services/contexts/[id] - Single Context Proxy Endpoint
 * =====================================================
 * 
 * PURPOSE:
 * - Proxies requests for individual context items by ID
 * - Used by frontend to fetch specific context details
 * - Handles single context retrieval for detailed views
 * 
 * USAGE:
 * - GET: Used to fetch a specific context by its ID
 * - Called by: places/page.tsx (for place details), tours/TourDetail.tsx
 * - Used when user clicks on a specific item to view details
 * 
 * EXAMPLES:
 * - GET /services/contexts/123e4567-e89b-12d3-a456-426614174000
 * - GET /services/contexts/tour-chiang-rai-temple
 * 
 * PROXY TARGET:
 * - GET: /api/contexts/{id}
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:3100';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const tenantId = req.headers.get('x-tenant-id') || '00000000-0000-0000-0000-000000000000';
    
    const response = await fetch(`${BACKEND_URL}/api/contexts/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: {
        'X-Tenant-ID': tenantId,
      },
    });
    
    const data = await response.json();
    
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'X-Backend-Status': response.status.toString(),
      },
    });
  } catch (error) {
    console.error('Proxy error for /services/contexts/[id]:', error);
    return NextResponse.json(
      { error: 'Proxy request failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
