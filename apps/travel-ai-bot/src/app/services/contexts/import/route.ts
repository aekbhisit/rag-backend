import { NextRequest, NextResponse } from 'next/server';

/**
 * /services/contexts/import - Context Import Proxy Endpoint
 * =======================================================
 * 
 * PURPOSE:
 * - Proxies context import requests to backend API
 * - Used by frontend pages to seed/import context data
 * - Handles bulk context creation for initial data setup
 * 
 * USAGE:
 * - POST: Used to import/seed context data for different categories
 * - Called by: help/page.tsx, taxi/page.tsx, rent/page.tsx, tours/page.tsx
 * - Used during page initialization to create default content if none exists
 * 
 * EXAMPLES:
 * - POST /services/contexts/import (with help articles data)
 * - POST /services/contexts/import (with taxi service data)
 * - POST /services/contexts/import (with tour packages data)
 * 
 * PROXY TARGET:
 * - POST: /api/contexts/import
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:3100';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tenantId = req.headers.get('x-tenant-id') || '00000000-0000-0000-0000-000000000000';
    
    const response = await fetch(`${BACKEND_URL}/api/contexts/import`, {
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
    console.error('Proxy error for /services/contexts/import:', error);
    return NextResponse.json(
      { error: 'Proxy request failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
