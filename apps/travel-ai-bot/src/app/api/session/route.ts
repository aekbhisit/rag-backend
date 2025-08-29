import { NextResponse } from "next/server";

// Cache for ephemeral keys with expiration
const keyCache = new Map<string, { key: string; expiresAt: number }>();
const MAX_CACHE_SIZE = 100;

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Check cache first
    const cacheKey = 'ephemeral_key';
    const cached = keyCache.get(cacheKey);
    
    if (cached && cached.expiresAt > Date.now()) {
      console.log(`[Session API] Returning cached key (${Date.now() - startTime}ms)`);
      return NextResponse.json({
        client_secret: { value: cached.key },
        cached: true
      });
    }

    // Clean up expired cache entries
    if (keyCache.size > MAX_CACHE_SIZE) {
      const now = Date.now();
      for (const [key, value] of keyCache.entries()) {
        if (value.expiresAt <= now) {
          keyCache.delete(key);
        }
      }
    }

    console.log(`[Session API] Fetching new ephemeral key...`);
    
    const fetchOptions: RequestInit = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "User-Agent": "AI-Voice-App/1.0",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
      }),
    };

    // Note: Connection pooling handled by Next.js fetch implementation

    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      fetchOptions
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Session API] OpenAI API error (${response.status}): ${errorText}`);
      return NextResponse.json(
        { error: `OpenAI API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Cache the key if it has an expiration
    if (data.client_secret?.value && data.client_secret?.expires_at) {
      const expiresAt = new Date(data.client_secret.expires_at).getTime() - 30000; // 30s buffer
      keyCache.set(cacheKey, {
        key: data.client_secret.value,
        expiresAt
      });
      console.log(`[Session API] Cached new key until ${new Date(expiresAt).toISOString()}`);
    }

    const duration = Date.now() - startTime;
    console.log(`[Session API] New key fetched in ${duration}ms`);
    
    return NextResponse.json({
      ...data,
      cached: false,
      fetchTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Session API] Error after ${duration}ms:`, error);
    
    return NextResponse.json(
      { 
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
