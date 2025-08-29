import { NextRequest, NextResponse } from 'next/server';
import { 
  searchConversationLogs,
  ELASTICSEARCH_ENABLED
} from '@/app/lib/elasticSearch';

/**
 * API endpoint to search ElasticSearch for conversation logs
 */
export async function POST(req: NextRequest) {
  try {
    // If Elasticsearch is disabled, return empty results
    if (!ELASTICSEARCH_ENABLED) {
      return NextResponse.json({ 
        logs: [],
        enabled: false
      });
    }
    
    // Parse the request body to get the query
    const body = await req.json();
    const query = body.query;
    
    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Missing query parameter' }, 
        { status: 400 }
      );
    }
    
    // Execute the search
    const logs = await searchConversationLogs(query);
    
    return NextResponse.json({
      success: true,
      logs,
      count: logs.length
    });
  } catch (error) {
    console.error('Error searching Elasticsearch:', error);
    return NextResponse.json(
      { 
        success: false,
        error: String(error),
        logs: []
      }, 
      { status: 500 }
    );
  }
} 