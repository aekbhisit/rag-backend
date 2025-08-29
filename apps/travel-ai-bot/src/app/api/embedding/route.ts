import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * API route for generating text embeddings
 * POST /api/embedding
 */
export async function POST(req: Request) {
  try {
    // Extract text from request body
    const body = await req.json();
    const { text } = body;
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required and must be a string' },
        { status: 400 }
      );
    }
    
    // Generate embedding using OpenAI API
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002", // This model is good for embeddings
      input: text.trim(),
    });
    
    const embedding = response.data[0].embedding;
    
    return NextResponse.json({ 
      embedding,
      model: "text-embedding-ada-002",
      usage: response.usage
    });
    
  } catch (error: any) {
    console.error('Embedding generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate embedding' },
      { status: 500 }
    );
  }
} 