import { NextRequest, NextResponse } from 'next/server';
import { ConversationLogEntry } from '@/app/lib/logger';
import { 
  logToElasticSearch, 
  getLogsBySessionId, 
  getLogsByDateRange,
  ELASTICSEARCH_ENABLED
} from '../../lib/elasticSearch';
import {
  isFileLoggingEnabled,
  logEntryToFile,
  readLogsFromFile,
  getAllLogFiles
} from '../../lib/serverLogger';

/**
 * API endpoint to receive and log conversation data
 */
export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const data = await req.json() as ConversationLogEntry;
    
    // Log basic info for monitoring
    console.log(`[LogConversation] ${data.type} - Session: ${data.sessionId}`);
    
    // Ensure audioDuration is set both in tokenUsage and at the top level
    if (data.tokenUsage?.audioDuration !== undefined && data.audioDuration === undefined) {
      data.audioDuration = data.tokenUsage.audioDuration;
    }
    
    if (data.audioDuration !== undefined && data.tokenUsage && data.tokenUsage.audioDuration === undefined) {
      data.tokenUsage.audioDuration = data.audioDuration;
    }
    
    // Log to file if enabled
    let fileLogged = false;
    const fileEnabled = await isFileLoggingEnabled();
    if (fileEnabled) {
      fileLogged = await logEntryToFile(data);
    }
    
    // Log to Elasticsearch if enabled
    let esLogged = false;
    if (ELASTICSEARCH_ENABLED) {
      esLogged = await logToElasticSearch(data);
      
      if (!esLogged) {
        console.error('Failed to log to Elasticsearch');
      }
    }
    
    // Return success if at least one logging method is enabled
    if (!fileEnabled && !ELASTICSEARCH_ENABLED) {
      return NextResponse.json(
        { warning: 'No logging method is enabled. Configure FILE_LOGGING_ENABLED or ELASTICSEARCH_ENABLED.' },
        { status: 200 }
      );
    }
    
    // Return success response with logging status
    return NextResponse.json({
      success: true,
      file: fileLogged,
      elasticsearch: esLogged
    });
  } catch (error) {
    console.error('Error in log-conversation API:', error);
    return NextResponse.json(
      { success: false, error: String(error) }, 
      { status: 500 }
    );
  }
}

/**
 * API endpoint to retrieve logs for a specific date or session
 */
export async function GET(req: NextRequest) {
  try {
    // Get parameters from query
    const url = new URL(req.url);
    const date = url.searchParams.get('date');
    const sessionId = url.searchParams.get('session');
    
    let logs: ConversationLogEntry[] = [];
    let source = 'none';
    
    // Try Elasticsearch first if enabled
    if (ELASTICSEARCH_ENABLED) {
      try {
        if (sessionId) {
          logs = await getLogsBySessionId(sessionId);
        } else if (date) {
          const startDate = `${date}T00:00:00.000Z`;
          const endDate = `${date}T23:59:59.999Z`;
          logs = await getLogsByDateRange(startDate, endDate);
        } else {
          const today = new Date().toISOString().split('T')[0];
          const startDate = `${today}T00:00:00.000Z`;
          const endDate = `${today}T23:59:59.999Z`;
          logs = await getLogsByDateRange(startDate, endDate);
        }
        
        if (logs.length > 0) {
          source = 'elasticsearch';
        }
      } catch (esError) {
        console.error('Failed to fetch logs from Elasticsearch:', esError);
      }
    }
    
    // Fall back to file system if Elasticsearch failed or is disabled and file logging is enabled
    const fileEnabled = await isFileLoggingEnabled();
    if (logs.length === 0 && fileEnabled) {
      if (sessionId) {
        // Get logs from all dates and filter by session ID
        const logDates = await getAllLogFiles();
        
        for (const dateString of logDates) {
          const dateEntries = await readLogsFromFile(dateString);
          const sessionEntries = dateEntries.filter(entry => entry.sessionId === sessionId);
          logs = [...logs, ...sessionEntries];
        }
      } else if (date) {
        // Get logs for the specific date
        logs = await readLogsFromFile(date);
      } else {
        // Default to today's logs
        const todayDate = new Date().toISOString().split('T')[0];
        logs = await readLogsFromFile(todayDate);
      }
      
      if (logs.length > 0) {
        source = 'file';
      }
    }
    
    // Return logs
    return NextResponse.json({ 
      success: true, 
      logs,
      source
    });
  } catch (error) {
    console.error('Error retrieving logs:', error);
    return NextResponse.json(
      { success: false, error: String(error) }, 
      { status: 500 }
    );
  }
} 