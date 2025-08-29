/**
 * Simple logger utility with different log levels
 * and the ability to enable/disable debug logging
 */

// Set to true to enable debug logs in console
const DEBUG_ENABLED = true;

// Use environment variable to control file logging (exposed for client-side checking)
export const FILE_LOGGING_ENABLED = 
  typeof process !== 'undefined' && process.env.FILE_LOGGING_ENABLED !== 'false';

// Log levels
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Logs a message with a specific prefix and log level
 */
export function logMessage(prefix: string, message: string, level: LogLevel = 'info', ...args: any[]) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] [${prefix}] ${message}`;
  
  switch (level) {
    case 'debug':
      if (DEBUG_ENABLED) {
        console.debug(formattedMessage, ...args);
      }
      break;
    case 'info':
      console.log(formattedMessage, ...args);
      break;
    case 'warn':
      console.warn(formattedMessage, ...args);
      break;
    case 'error':
      console.error(formattedMessage, ...args);
      break;
  }
}

/**
 * Logger factory that creates scoped logger functions
 */
export function createLogger(prefix: string) {
  return {
    debug: (message: string, ...args: any[]) => logMessage(prefix, message, 'debug', ...args),
    log: (message: string, ...args: any[]) => logMessage(prefix, message, 'info', ...args),
    warn: (message: string, ...args: any[]) => logMessage(prefix, message, 'warn', ...args),
    error: (message: string, ...args: any[]) => logMessage(prefix, message, 'error', ...args),
  };
}

// Default loggers for common components
export const webRTCLogger = createLogger('WebRTC');
export const connectionLogger = createLogger('Connection');
export const sessionLogger = createLogger('Session');
export const appLogger = createLogger('App');

// Conversation logging types
export type ConversationLogEntryType = 
  | 'user_message' 
  | 'assistant_response' 
  | 'session_start' 
  | 'session_end';

export interface ConversationLogEntry {
  type: ConversationLogEntryType;
  timestamp: string;
  sessionId: string;
  message?: string;
  tokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    audioDuration?: number;
  };
  audioDuration?: number; // Duration of audio in seconds for Whisper transcriptions
  rawMetadata?: any;
}

/**
 * Conversation logger for tracking user-assistant interactions
 * Client-safe version that uses API endpoints for file operations
 */
export class ConversationLogger {
  private logs: Record<string, ConversationLogEntry[]> = {};
  
  /**
   * Log a new conversation entry
   */
  logEntry(entry: ConversationLogEntry): void {
    // Make sure audioDuration is explicitly included in the log entry if available
    if (entry.tokenUsage?.audioDuration !== undefined && entry.audioDuration === undefined) {
      entry.audioDuration = entry.tokenUsage.audioDuration;
    }
    
    // Create ISO date string YYYY-MM-DD for grouping logs by date
    const dateKey = entry.timestamp.split('T')[0];
    
    // Initialize array for this date if it doesn't exist
    if (!this.logs[dateKey]) {
      this.logs[dateKey] = [];
    }
    
    // Add entry to the appropriate date's log array
    this.logs[dateKey].push(entry);
    
    // Also log to console for debugging
    const logger = createLogger('Conversation');
    
    // Include audio duration in the log message if available
    let logMessage = `[${entry.type}] Session: ${entry.sessionId}`;
    if (entry.audioDuration) {
      logMessage += ` - Audio Duration: ${entry.audioDuration}s`;
    }
    if (entry.message) {
      logMessage += ` - Message: ${entry.message.substring(0, 50)}...`;
    }
    logger.log(logMessage);
  }
  
  /**
   * Get all logs for a specific date
   */
  getLogsByDate(dateString: string): ConversationLogEntry[] {
    return this.logs[dateString] || [];
  }
  
  /**
   * Get all logs for a specific session
   */
  getLogsBySessionId(sessionId: string): ConversationLogEntry[] {
    // Flatten all logs and filter by sessionId
    return Object.values(this.logs)
      .flat()
      .filter(entry => entry.sessionId === sessionId);
  }
  
  /**
   * Read logs from API for a specific date
   */
  async readLogsFromAPI(dateString: string): Promise<ConversationLogEntry[]> {
    try {
      const response = await fetch(`/api/log-conversation?date=${dateString}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch logs: ${response.status}`);
      }
      const data = await response.json();
      return data.logs || [];
    } catch (error) {
      console.error(`Failed to read logs from API: ${error}`);
      return [];
    }
  }
} 