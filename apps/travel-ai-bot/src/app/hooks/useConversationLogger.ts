import { useCallback, useState, useRef } from 'react';
import { ConversationLogEntry } from '../lib/logger';
import { getApiUrl } from '@/app/lib/apiHelper';

// Get file logging setting from environment variable
export const FILE_LOGGING_ENABLED = 
  typeof process !== 'undefined' && process.env.FILE_LOGGING_ENABLED !== 'false';

// Elasticsearch is disabled - always return false
export const ELASTICSEARCH_ENABLED = false;

// Elasticsearch is disabled, so no connection state needed

/**
 * Simple function to estimate token count from text
 * Note: This is an approximation - actual tokens depend on the tokenizer used by the model
 */
function estimateTokenCount(text: string): number {
  // OpenAI's tokenizer gives roughly 4 chars per token on average for English
  return Math.ceil(text.length / 4);
}

/**
 * Debounce function to prevent rapid-fire calls
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Hook for logging conversation data to file (Elasticsearch disabled)
 */
export function useConversationLogger() {
  const [isLogging, setIsLogging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);

  // Refs to track recent logs and prevent duplicates
  const recentLogsRef = useRef<Set<string>>(new Set());
  const lastLogTimeRef = useRef<Record<string, number>>({});
  const pendingLogsRef = useRef<Set<string>>(new Set());

  // Rate limiting constants
  const MIN_LOG_INTERVAL = 100; // Minimum 100ms between similar logs
  const DUPLICATE_WINDOW = 5000; // 5 seconds to consider logs as duplicates
  const MAX_CONCURRENT_LOGS = 3; // Maximum concurrent log requests

  // Cleanup function to remove old entries from tracking
  const cleanupOldEntries = useCallback(() => {
    const now = Date.now();
    const cutoff = now - DUPLICATE_WINDOW;
    
    // Clean up recent logs
    const newRecentLogs = new Set<string>();
    recentLogsRef.current.forEach(logKey => {
      const timestamp = lastLogTimeRef.current[logKey];
      if (timestamp && timestamp > cutoff) {
        newRecentLogs.add(logKey);
      } else {
        delete lastLogTimeRef.current[logKey];
      }
    });
    recentLogsRef.current = newRecentLogs;
    
    // Also clear pending logs that are too old
    const stalePendingLogs = new Set<string>();
    pendingLogsRef.current.forEach(logKey => {
      const timestamp = lastLogTimeRef.current[logKey];
      if (!timestamp || (now - timestamp) > 30000) { // 30 seconds timeout
        stalePendingLogs.add(logKey);
      }
    });
    stalePendingLogs.forEach(logKey => {
      pendingLogsRef.current.delete(logKey);

    });
  }, []);

  // Generate unique key for log entry
  const generateLogKey = useCallback((
    type: string, 
    sessionId: string, 
    message: string
  ): string => {
    // Create a hash-like key based on type, session, and message content
    const contentHash = message.substring(0, 50); // First 50 chars
    return `${type}_${sessionId}_${contentHash}`;
  }, []);

  // Check if log should be skipped due to rate limiting or duplicates
  const shouldSkipLog = useCallback((
    logKey: string,
    type: 'user_message' | 'assistant_response' | 'session_start' | 'session_end'
  ): boolean => {
    const now = Date.now();
    
    // Check if too many concurrent logs
    if (pendingLogsRef.current.size >= MAX_CONCURRENT_LOGS) {

      return true;
    }
    
    // Check for recent duplicate
    if (recentLogsRef.current.has(logKey)) {
      const lastTime = lastLogTimeRef.current[logKey];
      if (lastTime && (now - lastTime) < MIN_LOG_INTERVAL) {

        return true;
      }
    }

    // For session events, allow only one per session per type
    if (type === 'session_start' || type === 'session_end') {
      const sessionKey = logKey.split('_')[1]; // Extract session ID
      const sessionTypeKey = `${type}_${sessionKey}`;
      if (recentLogsRef.current.has(sessionTypeKey)) {

        return true;
      }
    }

    return false;
  }, []);

  // Mark log as processed
  const markLogProcessed = useCallback((logKey: string) => {
    const now = Date.now();
    recentLogsRef.current.add(logKey);
    lastLogTimeRef.current[logKey] = now;
    pendingLogsRef.current.delete(logKey);
    
    // Cleanup old entries periodically
    if (Math.random() < 0.1) { // 10% chance to cleanup
      cleanupOldEntries();
    }
  }, [cleanupOldEntries]);

  // Core logging function with rate limiting and duplicate prevention
  const performLog = useCallback(async (
    entry: ConversationLogEntry,
    logKey: string
  ) => {
    // Skip if no logging is enabled
    if (!ELASTICSEARCH_ENABLED && !FILE_LOGGING_ENABLED) {
      return;
    }

    // Check if we should skip this log
    if (shouldSkipLog(logKey, entry.type)) {
      return;
    }

    // Skip if message content is empty
    if (!entry.message || entry.message.trim() === '') {
      return;
    }

    // Mark as pending
    pendingLogsRef.current.add(logKey);

    setIsLogging(true);
    setError(null);
    

    
    try {
      // Use the same logging endpoint as ChatInterface.tsx
      await fetch(getApiUrl('/api/messages'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: entry.sessionId,
          role: entry.type === 'user_message' ? 'user' : 
                entry.type === 'assistant_response' ? 'assistant' : 'system',
          type: 'text',
          content: entry.message || '',
          content_tokens: entry.tokenUsage?.promptTokens || null,
          response_tokens: entry.tokenUsage?.completionTokens || null,
          total_tokens: entry.tokenUsage?.totalTokens || null,
          channel: 'normal', // Default channel for conversation logs
          meta: {
            conversation_type: entry.type,
            audio_duration: entry.audioDuration || entry.tokenUsage?.audioDuration || null,
            raw_metadata: entry.rawMetadata || null,
            timestamp: entry.timestamp
          }
        })
      });
      
      // Mark as successfully processed
      markLogProcessed(logKey);
    } catch (err) {
      console.error(`Failed to log ${entry.type}:`, err);
      setError(String(err));
      // Remove from pending on error
      pendingLogsRef.current.delete(logKey);
    } finally {
      setIsLogging(false);
    }
  }, [shouldSkipLog, markLogProcessed]);
  
  /**
   * Log a user message
   */
  const logUserMessage = useCallback(async (
    sessionId: string, 
    message: string,
    providedTokenUsage?: {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
      audioDuration?: number;
    }
  ) => {
    // Skip if no logging is enabled
    if (!ELASTICSEARCH_ENABLED && !FILE_LOGGING_ENABLED) {
      return;
    }
    
    // DEBUG: Enhanced logging with timestamp and call stack
    const timestamp = new Date().toISOString();
    const caller = new Error().stack?.split('\n')[2]?.trim();

    
    setIsLogging(true);
    setError(null);
    
    try {
      // Generate unique key for this log
      const logKey = generateLogKey('user_message', sessionId, message);
      
      // Use provided token usage or estimate if not available
      let tokenUsage = providedTokenUsage || {};
      
      // Extract audio duration if present
      const audioDuration = tokenUsage?.audioDuration;
      
      // For text messages, estimate tokens if not provided
      if (!tokenUsage.promptTokens && !tokenUsage.completionTokens && !tokenUsage.totalTokens && !tokenUsage.audioDuration) {
        // Estimate token count for the user message
        const estimatedTokens = estimateTokenCount(message);
        tokenUsage = {
          promptTokens: estimatedTokens,
          completionTokens: 0,
          totalTokens: estimatedTokens,
          ...tokenUsage // Keep any other fields like audioDuration if present
        };
      }
      
      // Create entry with audio duration both in tokenUsage and at top level
      const entry: ConversationLogEntry = {
        type: 'user_message',
        timestamp: new Date().toISOString(),
        sessionId,
        message,
        tokenUsage,
        audioDuration // Make sure it's explicitly included at top level
      };
      
      // Double check that audioDuration is set on the entry if available
      if (audioDuration !== undefined) {
        entry.audioDuration = audioDuration;
      }
      
      await performLog(entry, logKey);
    } catch (err) {
      console.error('Failed to log user message:', err);
      setError(String(err));
    }
  }, [generateLogKey, performLog]);
  
  /**
   * Log an assistant response with token usage
   */
  const logAssistantResponse = useCallback(async (
    sessionId: string,
    message: string,
    tokenUsage: {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
      audioDuration?: number;
    },
    rawMetadata?: any
  ) => {
    // Skip if no logging is enabled
    if (!ELASTICSEARCH_ENABLED && !FILE_LOGGING_ENABLED) {
      return;
    }
    
    // DEBUG: Enhanced logging with timestamp and call stack
    const timestamp = new Date().toISOString();
    const caller = new Error().stack?.split('\n')[2]?.trim();

    
    setIsLogging(true);
    setError(null);
    
    try {
      // Generate unique key for this log
      const logKey = generateLogKey('assistant_response', sessionId, message);
      
      // Extract audio duration if present
      const audioDuration = tokenUsage?.audioDuration;
      
      // Create entry with audio duration both in tokenUsage and at top level
      const entry: ConversationLogEntry = {
        type: 'assistant_response',
        timestamp: new Date().toISOString(),
        sessionId,
        message,
        tokenUsage,
        audioDuration, // Make sure it's explicitly included at top level
        rawMetadata
      };
      
      // Double check that audioDuration is set on the entry if available
      if (audioDuration !== undefined) {
        entry.audioDuration = audioDuration;
      }
      
      await performLog(entry, logKey);
    } catch (err) {
      console.error('Failed to log assistant response:', err);
      setError(String(err));
    }
  }, [generateLogKey, performLog]);
  
  /**
   * Log a session start event
   */
  const logSessionStart = useCallback(async (sessionId: string) => {
    const logKey = `session_start_${sessionId}`;
    
    try {
      const entry: ConversationLogEntry = {
        type: 'session_start',
        timestamp: new Date().toISOString(),
        sessionId
      };
      
      await performLog(entry, logKey);
    } catch (err) {
      console.error('Failed to log session start:', err);
      setError(String(err));
    }
  }, [performLog]);
  
  /**
   * Log a session end event
   */
  const logSessionEnd = useCallback(async (sessionId: string) => {
    const logKey = `session_end_${sessionId}`;
    
    try {
      const entry: ConversationLogEntry = {
        type: 'session_end',
        timestamp: new Date().toISOString(),
        sessionId
      };
      
      await performLog(entry, logKey);
    } catch (err) {
      console.error('Failed to log session end:', err);
      setError(String(err));
    }
  }, [performLog]);
  
  return {
    logUserMessage,
    logAssistantResponse,
    logSessionStart,
    logSessionEnd,
    isLogging,
    isConnected,
    isInitializing,
    esEnabled: ELASTICSEARCH_ENABLED,
    fileEnabled: FILE_LOGGING_ENABLED,
    error
  };
} 