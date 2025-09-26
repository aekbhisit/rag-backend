import { NextResponse } from "next/server";

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
    
    if (!response.ok) {
      console.error('[API-Session] OpenAI API error:', data);
      return NextResponse.json(
        { error: `OpenAI API error: ${data.error?.message || 'Unknown error'}` },
        { status: response.status }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in /session:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}