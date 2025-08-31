import { NextResponse } from "next/server";
import OpenAI from "openai";
import { rateLimit } from "@/app/lib/rateLimit";
import { NextRequest } from "next/server";

const openai = new OpenAI();

// Rate limit configuration: 5 requests per minute
const RATE_LIMIT_CONFIG = {
  limit: 5,
  windowMs: 60 * 1000, // 1 minute in milliseconds
};

export async function POST(req: NextRequest) {
  try {
    // Get client IP address from request
    const forwardedFor = req.headers.get('x-forwarded-for') || '';
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';
    
    // Apply rate limiting
    const rateLimitResult = rateLimit(clientIp, RATE_LIMIT_CONFIG);

    // If rate limit exceeded, return 429 Too Many Requests
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests, please try again later." },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
          }
        }
      );
    }

    // Retrieve the entire JSON object from the request.
    const body = await req.json();

    // Spread the entire body into the API call.
    const completion = await openai.chat.completions.create({
      ...body,
    });

    // Return response with rate limit headers
    return NextResponse.json(completion, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      }
    });
  } catch (error: any) {
    console.error("Error in /chat/completions:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
