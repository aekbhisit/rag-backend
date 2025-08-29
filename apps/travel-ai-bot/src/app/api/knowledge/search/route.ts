import { NextResponse } from 'next/server';
import { searchKnowledgeByEmbedding, searchKnowledgeByText } from '@/app/data/knowledge';
import OpenAI from 'openai';

// Initialize OpenAI client for fallback embedding generation
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * API route for searching knowledge base entries
 * POST /api/knowledge/search
 */
export async function POST(req: Request) {
  try {
    // Extract search parameters from request body
    const body = await req.json();
    const { query, embedding, size = 3 } = body;
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }
    
    let results;
    
    // If embedding is provided, use it for semantic search
    if (embedding && Array.isArray(embedding)) {
      results = await searchKnowledgeByEmbedding(embedding, size);
    } 
    // If no embedding provided, generate one
    else {
      try {
        const embeddingResponse = await openai.embeddings.create({
          model: "text-embedding-ada-002",
          input: query.trim(),
        });
        
        const generatedEmbedding = embeddingResponse.data[0].embedding;
        results = await searchKnowledgeByEmbedding(generatedEmbedding, size);
      } catch (embeddingError) {
        console.error('Embedding generation failed, falling back to text search:', embeddingError);
        // Fall back to text search if embedding generation fails
        results = await searchKnowledgeByText(query, size);
      }
    }
    
    return NextResponse.json({ 
      query,
      results,
      count: results.length
    });
    
  } catch (error: any) {
    console.error('Knowledge search error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to search knowledge base' },
      { status: 500 }
    );
  }
} 