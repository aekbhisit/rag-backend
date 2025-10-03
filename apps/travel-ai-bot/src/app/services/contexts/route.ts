import { NextRequest, NextResponse } from 'next/server';

/**
 * /services/contexts - Context Data Proxy Endpoint
 * ===============================================
 * 
 * PURPOSE:
 * - Proxies context data requests to backend API
 * - Used by frontend pages for content display and management
 * - Handles both listing contexts and creating new ones
 * 
 * USAGE:
 * - GET: Used by frontend pages to fetch context lists (places, help, taxi, etc.)
 * - POST: Used for creating new context entries
 * - Called by: places/page.tsx, help/page.tsx, taxi/page.tsx, rent/page.tsx, tours/page.tsx
 * 
 * EXAMPLES:
 * - GET /services/contexts?type=place&category=Attraction&page_size=50
 * - GET /services/contexts?type=text&category=help&page_size=100
 * - POST /services/contexts (with context data in body)
 * 
 * PROXY TARGET:
 * - GET: /api/contexts (with query parameters)
 * - POST: /api/contexts (with context data)
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:3100';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = req.headers.get('x-tenant-id') || '00000000-0000-0000-0000-000000000000';
    
    const response = await fetch(`${BACKEND_URL}/api/contexts?${searchParams.toString()}`, {
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
    console.error('Proxy error for /services/contexts:', error);
    return NextResponse.json(
      { error: 'Proxy request failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tenantId = req.headers.get('x-tenant-id') || '00000000-0000-0000-0000-000000000000';
    
    // Proxy POST request to backend for creating new contexts
    const response = await fetch(`${BACKEND_URL}/api/contexts`, {
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
    console.error('Proxy error for /services/contexts:', error);
    return NextResponse.json(
      { error: 'Proxy request failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
