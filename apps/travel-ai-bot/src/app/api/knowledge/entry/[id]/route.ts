import { NextResponse } from 'next/server';
import { initElasticSearch, ELASTICSEARCH_ENABLED } from '@/app/lib/elasticSearch';
import { KnowledgeEntry } from '@/app/data/knowledge';

// Knowledge base index name
const KNOWLEDGE_INDEX = 'knowledge_base';

/**
 * API route for retrieving a single knowledge entry by ID
 * GET /api/knowledge/entry/[id]
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Entry ID is required' },
        { status: 400 }
      );
    }
    
    // Skip if Elasticsearch is disabled
    if (!ELASTICSEARCH_ENABLED) {
      return NextResponse.json(
        { error: 'Elasticsearch is disabled' },
        { status: 503 }
      );
    }
    
    // Initialize Elasticsearch client
    const esClient = await initElasticSearch();
    if (!esClient) {
      return NextResponse.json(
        { error: 'Failed to connect to Elasticsearch' },
        { status: 503 }
      );
    }
    
    // Get the entry by ID
    const response = await esClient.get({
      index: KNOWLEDGE_INDEX,
      id
    });
    
    if (!response.found) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      );
    }
    
    const entry = response._source as KnowledgeEntry;
    
    return NextResponse.json({ entry });
    
  } catch (error: any) {
    console.error('Knowledge entry retrieval error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve knowledge entry' },
      { status: 500 }
    );
  }
} 