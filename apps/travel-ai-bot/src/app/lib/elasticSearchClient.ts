import { ConversationLogEntry } from './logger';
import { createLogger } from './logger';

// Create a logger instance for Elasticsearch operations
const logger = createLogger('ElasticSearchClient');

// Check if Elasticsearch logging is enabled (default to true if not specified)
export const ELASTICSEARCH_ENABLED = 
  typeof process !== 'undefined' && process.env.ELASTICSEARCH_ENABLED !== 'false';

/**
 * This is a browser-safe version of the elasticSearch module.
 * It provides the same interface but proxies all actual Elasticsearch
 * operations through API calls to avoid Node.js dependencies.
 */

/**
 * Check connection status via API
 */
export async function testConnection(): Promise<boolean> {
  try {
    const response = await fetch('/api/elasticsearch/status');
    const data = await response.json();
    return data.connected || false;
  } catch (error) {
    logger.error(`Failed to check Elasticsearch status: ${error}`);
    return false;
  }
}

/**
 * Log a conversation entry to ElasticSearch via API
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function logToElasticSearch(entry: ConversationLogEntry): Promise<boolean> {
  try {
    // This will be handled by the API route that receives the entry
    return false;
  } catch (error) {
    logger.error(`Failed to log to ElasticSearch: ${error}`);
    return false;
  }
}

/**
 * Search for conversation logs in ElasticSearch via API
 */
export async function searchConversationLogs(query: any): Promise<ConversationLogEntry[]> {
  try {
    // Use API endpoint to search logs
    const response = await fetch('/api/elasticsearch/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    
    if (!response.ok) {
      throw new Error(`Search request failed: ${response.status}`);
    }
    
    const data = await response.json();
    return data.logs || [];
  } catch (error) {
    logger.error(`Failed to search logs: ${error}`);
    return [];
  }
}

/**
 * Get logs for a specific session via API
 */
export async function getLogsBySessionId(sessionId: string): Promise<ConversationLogEntry[]> {
  try {
    // Use the existing API endpoint
    const response = await fetch(`/api/log-conversation?session=${sessionId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch logs: ${response.status}`);
    }
    const data = await response.json();
    return data.logs || [];
  } catch (error) {
    logger.error(`Failed to get logs by session: ${error}`);
    return [];
  }
}

/**
 * Get logs for a specific date range via API
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getLogsByDateRange(startDate: string, endDate: string): Promise<ConversationLogEntry[]> {
  try {
    // Use the existing API endpoint but we need to modify it to accept date range
    // Currently only using startDate since the API doesn't support date ranges yet
    const response = await fetch(`/api/log-conversation?date=${startDate.split('T')[0]}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch logs: ${response.status}`);
    }
    const data = await response.json();
    return data.logs || [];
  } catch (error) {
    logger.error(`Failed to get logs by date range: ${error}`);
    return [];
  }
} 