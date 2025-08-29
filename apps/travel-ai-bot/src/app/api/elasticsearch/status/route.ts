import { NextResponse } from 'next/server';
import { testConnection, ELASTICSEARCH_ENABLED } from '@/app/lib/elasticSearch';

/**
 * API endpoint to check ElasticSearch connection status
 */
export async function GET() {
  try {
    // If Elasticsearch is disabled, return false immediately
    if (!ELASTICSEARCH_ENABLED) {
      return NextResponse.json({ 
        connected: false,
        enabled: false
      });
    }
    
    // Test the connection
    const connected = await testConnection();
    
    return NextResponse.json({
      connected,
      enabled: ELASTICSEARCH_ENABLED
    });
  } catch (error) {
    console.error('Error checking Elasticsearch status:', error);
    return NextResponse.json(
      { 
        connected: false,
        enabled: ELASTICSEARCH_ENABLED,
        error: String(error)
      }, 
      { status: 500 }
    );
  }
} 