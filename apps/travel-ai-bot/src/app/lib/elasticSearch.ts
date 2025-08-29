import { Client } from '@elastic/elasticsearch';
import type { estypes } from '@elastic/elasticsearch';
import { ConversationLogEntry } from './logger';
import { createLogger } from './logger';

// Create a logger instance for Elasticsearch operations
const logger = createLogger('ElasticSearch');

// Check if Elasticsearch logging is enabled (default to true if not specified)
export const ELASTICSEARCH_ENABLED = 
  typeof process !== 'undefined' && process.env.ELASTICSEARCH_ENABLED !== 'false';

// ElasticSearch configuration
const ES_CONFIG = typeof process !== 'undefined' ? {
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  auth: {
    username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
    password: process.env.ELASTICSEARCH_PASSWORD || 'changeme'
  }
} : null;

// Index name for conversation logs
const CONVERSATION_INDEX = 'conversation_logs';

// ElasticSearch client instance
let client: Client | null = null;

/**
 * Initialize ElasticSearch client
 * Only runs on server-side
 */
export const initElasticSearch = async (): Promise<Client | null> => {
  // Skip if running on client side
  if (typeof window !== 'undefined') {
    logger.log('ElasticSearch client not initialized in browser environment');
    return null;
  }

  // Skip initialization if Elasticsearch is disabled
  if (!ELASTICSEARCH_ENABLED) {
    logger.log('Elasticsearch logging is disabled by configuration');
    return null;
  }

  if (!client && ES_CONFIG) {
    try {
      client = new Client(ES_CONFIG);
      logger.log(`ElasticSearch client initialized with node: ${ES_CONFIG.node}`);
    } catch (error) {
      logger.error(`Failed to initialize ElasticSearch client: ${error}`);
      throw error;
    }
  }
  return client;
};

/**
 * Test the ElasticSearch connection
 * Only runs on server-side
 */
export const testConnection = async (): Promise<boolean> => {
  // Skip if running on client side
  if (typeof window !== 'undefined') {
    logger.log('Cannot test ElasticSearch connection in browser environment');
    return false;
  }

  // Return false immediately if Elasticsearch is disabled
  if (!ELASTICSEARCH_ENABLED) {
    logger.log('Elasticsearch logging is disabled, skipping connection test');
    return false;
  }

  try {
    const esClient = await initElasticSearch();
    if (!esClient) return false;
    
    const info = await esClient.info();
    logger.log(`Connection successful: cluster name - ${info.cluster_name}`);
    return true;
  } catch (error) {
    logger.error(`Connection test failed: ${error}`);
    return false;
  }
};

/**
 * Create the conversation logs index if it doesn't exist
 * Only runs on server-side
 */
export const createConversationIndex = async (): Promise<boolean> => {
  // Skip if running on client side
  if (typeof window !== 'undefined') {
    return false;
  }

  // Skip if Elasticsearch is disabled
  if (!ELASTICSEARCH_ENABLED) return false;

  try {
    const esClient = await initElasticSearch();
    if (!esClient) return false;
    
    // Check if index exists
    const indexExists = await esClient.indices.exists({
      index: CONVERSATION_INDEX
    });
    
    if (indexExists) {
      logger.log(`Index ${CONVERSATION_INDEX} already exists`);
      return true;
    }
    
    // Define the mapping for our index
    const mappings: estypes.MappingTypeMapping = {
      properties: {
        type: { type: 'keyword' },
        timestamp: { type: 'date' },
        sessionId: { type: 'keyword' },
        message: { type: 'text' },
        tokenUsage: {
          properties: {
            promptTokens: { type: 'integer' },
            completionTokens: { type: 'integer' },
            totalTokens: { type: 'integer' },
            audioDuration: { type: 'float' }
          }
        },
        audioDuration: { type: 'float' },
        rawMetadata: { type: 'object', enabled: false }
      }
    };
    
    // Create index with mapping
    const response = await esClient.indices.create({
      index: CONVERSATION_INDEX,
      mappings
    });
    
    logger.log(`Index created: ${JSON.stringify(response)}`);
    return true;
  } catch (error) {
    logger.error(`Failed to create index: ${error}`);
    return false;
  }
};

/**
 * Log a conversation entry to ElasticSearch
 * Only runs on server-side
 */
export const logToElasticSearch = async (entry: ConversationLogEntry): Promise<boolean> => {
  // Skip if running on client side
  if (typeof window !== 'undefined') {
    return false;
  }

  // Skip if Elasticsearch is disabled
  if (!ELASTICSEARCH_ENABLED) return false;

  try {
    const esClient = await initElasticSearch();
    if (!esClient) return false;
    
    // Make sure the index exists
    await createConversationIndex();
    
    // Index the log entry
    const response = await esClient.index({
      index: CONVERSATION_INDEX,
      document: entry
    });
    
    logger.debug(`Entry logged to ElasticSearch: ${response._id}`);
    return true;
  } catch (error) {
    logger.error(`Failed to log entry to ElasticSearch: ${error}`);
    return false;
  }
};

// Define type for search results to avoid TypeScript errors
interface ConversationSearchResult {
  hits: {
    hits: Array<{
      _source: ConversationLogEntry;
    }>;
  };
}

/**
 * Search for conversation logs in ElasticSearch
 * Only runs on server-side
 */
export const searchConversationLogs = async (
  query: any,
  size: number = 100
): Promise<ConversationLogEntry[]> => {
  // Skip if running on client side
  if (typeof window !== 'undefined') {
    return [];
  }

  // Return empty array if Elasticsearch is disabled
  if (!ELASTICSEARCH_ENABLED) return [];

  try {
    const esClient = await initElasticSearch();
    if (!esClient) return [];
    
    const response = await esClient.search({
      index: CONVERSATION_INDEX,
      size,
      query
    }) as unknown as ConversationSearchResult;
    
    // Extract the sources from the hits
    if (response.hits?.hits && Array.isArray(response.hits.hits)) {
      // Map hits to conversation log entries
      const entries: ConversationLogEntry[] = response.hits.hits
        .filter(hit => hit._source) // Filter out any undefined sources
        .map(hit => hit._source);
        
      return entries;
    }
    
    return [];
  } catch (error) {
    logger.error(`Search failed: ${error}`);
    return [];
  }
};

/**
 * Get logs for a specific session
 * Only runs on server-side
 */
export const getLogsBySessionId = async (
  sessionId: string
): Promise<ConversationLogEntry[]> => {
  // Skip if running on client side
  if (typeof window !== 'undefined') {
    return [];
  }

  // Return empty array if Elasticsearch is disabled
  if (!ELASTICSEARCH_ENABLED) return [];
  
  return searchConversationLogs({
    term: {
      sessionId
    }
  });
};

/**
 * Get logs for a specific date range
 * Only runs on server-side
 */
export const getLogsByDateRange = async (
  startDate: string,
  endDate: string
): Promise<ConversationLogEntry[]> => {
  // Skip if running on client side
  if (typeof window !== 'undefined') {
    return [];
  }

  // Return empty array if Elasticsearch is disabled
  if (!ELASTICSEARCH_ENABLED) return [];
  
  return searchConversationLogs({
    range: {
      timestamp: {
        gte: startDate,
        lte: endDate
      }
    }
  });
}; 