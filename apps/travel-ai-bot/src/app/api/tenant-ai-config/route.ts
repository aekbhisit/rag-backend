import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:3001';

export async function GET(req: NextRequest) {
  try {
    const tenantId = req.headers.get('X-Tenant-ID') || 'acc44cdb-8da5-4226-9569-1233a39f564f';
    
    const response = await fetch(`${BACKEND_URL}/api/admin/agents-master/config`, {
      headers: {
        'X-Tenant-ID': tenantId
      }
    });

    if (!response.ok) {
      // Fallback to default config if tenant config fails
      return NextResponse.json({
        apiKey: '',
        model: 'gpt-4o',
        provider: 'openai',
        maxTokens: 4000,
        temperature: 0.7
      });
    }

    const config = await response.json();
    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching tenant AI config:', error);
    // Fallback to default config
    return NextResponse.json({
      apiKey: '',
      model: 'gpt-4o',
      provider: 'openai',
      maxTokens: 4000,
      temperature: 0.7
    });
  }
}
