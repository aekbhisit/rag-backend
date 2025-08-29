import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

/**
 * API endpoint to list all available session IDs
 */
export async function GET(req: NextRequest) {
  try {
    // Get date filter from query parameter if provided
    const url = new URL(req.url);
    const dateFilter = url.searchParams.get('date');
    
    // Get logs directory path
    const logsDir = path.join(process.cwd(), 'logs');
    
    // Check if logs directory exists
    if (!fs.existsSync(logsDir)) {
      return NextResponse.json({
        success: true,
        sessions: []
      });
    }
    
    // Get all log files, filtered by date if provided
    let logFiles = fs.readdirSync(logsDir)
      .filter(file => file.endsWith('.jsonl'));
    
    if (dateFilter) {
      logFiles = logFiles.filter(file => file.startsWith(dateFilter));
    }
    
    // Read each log file to collect session IDs
    const sessionIds = new Set<string>();
    
    for (const logFile of logFiles) {
      const filePath = path.join(logsDir, logFile);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Parse each line and extract session IDs
      content.split('\n')
        .filter(line => line.trim() !== '')
        .forEach(line => {
          try {
            const entry = JSON.parse(line);
            if (entry.sessionId) {
              sessionIds.add(entry.sessionId);
            }
          } catch (e) {
            console.error(`Error parsing line in ${logFile}:`, e);
          }
        });
    }
    
    // Convert set to array of session IDs
    const sessionsArray = Array.from(sessionIds);
    
    // Return session IDs
    return NextResponse.json({
      success: true,
      sessions: sessionsArray
    });
  } catch (error) {
    console.error('Error retrieving sessions:', error);
    return NextResponse.json(
      { success: false, error: String(error) }, 
      { status: 500 }
    );
  }
} 