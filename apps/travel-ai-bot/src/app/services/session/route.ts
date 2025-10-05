import { NextResponse } from "next/server";

/**
 * /services/session - OpenAI Realtime API Session Endpoint
 * =====================================================
 * 
 * PURPOSE:
 * - Fetches ephemeral API keys for OpenAI's realtime API sessions
 * - Used by voice chat functionality (VoiceChatInterface component)
 * - Required for realtime voice conversations with AI agents
 * 
 * USAGE:
 * - Called by fetchEphemeralKey() in sessionAuth.ts
 * - Used by useSDKRealtimeSession hook for voice connections
 * - Triggered when user switches to 'realtime' channel mode
 * - Also used for API connectivity testing in BottomToolbar
 * 
 * FLOW:
 * 1. Frontend requests ephemeral key for voice session
 * 2. This endpoint calls OpenAI's /v1/realtime/sessions API
 * 3. Returns client_secret.value for frontend to use
 * 4. Frontend uses key to establish WebRTC connection with OpenAI
 * 
 * FALLBACK:
 * - If no OPENAI_API_KEY, returns mock key for testing
 * - Allows development without real OpenAI API credentials
 */

export async function GET(request: Request) {
  try {
    // For testing without a real API key, return a mock ephemeral key
    // In production, this would make a real API call to OpenAI
    if (!process.env.OPENAI_API_KEY) {
      console.log("No OPENAI_API_KEY found, returning mock ephemeral key for testing");
      return NextResponse.json({
        client_secret: {
          value: `mock-ephemeral-key-for-testing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }
      });
    }

    // Call OpenAI's realtime sessions API to get ephemeral key
    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2025-06-03"
        }),
      }
    );
    const data = await response.json();
    console.log('[API-Session] OpenAI API response:', data);
    
    // Handle OpenAI API errors
    if (!response.ok) {
      console.error('[API-Session] OpenAI API error:', data);
      return NextResponse.json(
        { error: `OpenAI API error: ${data.error?.message || 'Unknown error'}` },
        { status: response.status }
      );
    }
    
    // Return the ephemeral key for frontend to use
    return NextResponse.json(data);
  } catch (error) {
    // Handle any unexpected errors
    console.error("Error in /session:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}