// Example usage of Redis caching in RAG Assistant
// This file demonstrates how to integrate caching into your existing code

import { cacheService } from '../services/cacheService';
import { rateLimiters } from '../middleware/rateLimiter';

// ==================== EMBEDDING CACHE INTEGRATION ====================

/**
 * Example: Integrate embedding cache into your embedding generation
 */
export async function generateEmbeddingWithCache(
  text: string, 
  model: string, 
  provider: string,
  generateEmbeddingFn: () => Promise<number[]>
): Promise<number[]> {
  
  // Use the cache service to get or generate embedding
  return await cacheService.getOrGenerateEmbedding(
    text,
    model,
    provider,
    generateEmbeddingFn
  );
}

// ==================== SEARCH CACHE INTEGRATION ====================

/**
 * Example: Integrate search cache into your retrieval system
 */
export async function searchWithCache(
  query: string,
  filters: any,
  tenantId: string,
  performSearchFn: () => Promise<any>
): Promise<any> {
  
  // Use the cache service to get or perform search
  return await cacheService.getOrPerformSearch(
    query,
    filters,
    tenantId,
    performSearchFn
  );
}

// ==================== USER SESSION CACHE INTEGRATION ====================

/**
 * Example: Integrate user session cache into your authentication
 */
export async function getUserSessionWithCache(
  userId: string,
  tenantId: string,
  fetchUserSessionFn: () => Promise<any>
): Promise<any> {
  
  // Use the cache service to get or fetch user session
  return await cacheService.getOrFetchUserSession(
    userId,
    tenantId,
    fetchUserSessionFn
  );
}

// ==================== CONTEXT CACHE INTEGRATION ====================

/**
 * Example: Integrate context cache into your context retrieval
 */
export async function getContextWithCache(
  contextId: string,
  tenantId: string,
  fetchContextFn: () => Promise<any>
): Promise<any> {
  
  // Use the cache service to get or fetch context
  return await cacheService.getOrFetchContext(
    contextId,
    tenantId,
    fetchContextFn
  );
}

// ==================== RATE LIMITING INTEGRATION ====================

/**
 * Example: Apply rate limiting to your routes
 */
export function applyRateLimiting() {
  return {
    // Apply strict rate limiting to auth routes
    auth: rateLimiters.auth,
    
    // Apply moderate rate limiting to API routes
    api: rateLimiters.api,
    
    // Apply generous rate limiting to search routes
    search: rateLimiters.search,
    
    // Apply strict rate limiting to admin routes
    admin: rateLimiters.admin,
    
    // Apply very strict rate limiting to import/export
    importExport: rateLimiters.importExport
  };
}

// ==================== CACHE MANAGEMENT INTEGRATION ====================

/**
 * Example: Clear cache when data changes
 */
export async function invalidateCacheOnDataChange(
  contextId: string,
  tenantId: string,
  userId?: string
): Promise<void> {
  
  // Invalidate context cache
  await cacheService.invalidateContext(contextId, tenantId);
  
  // Invalidate user cache if user ID provided
  if (userId) {
    await cacheService.clearUserCache(userId, tenantId);
  }
  
  // Clear search cache for this tenant (since context changed)
  await cacheService.clearByPattern(`search:${tenantId}:*`);
}

/**
 * Example: Clear all tenant cache when tenant is deleted
 */
export async function clearTenantCache(tenantId: string): Promise<number> {
  return await cacheService.clearTenantCache(tenantId);
}

// ==================== CACHE STATISTICS INTEGRATION ====================

/**
 * Example: Get cache statistics for monitoring
 */
export async function getCacheStatistics(): Promise<any> {
  const stats = await cacheService.getStats();
  const config = cacheService.getConfig();
  
  return {
    stats,
    config,
    timestamp: new Date().toISOString()
  };
}

// ==================== INTEGRATION WITH EXISTING CODE ====================

/**
 * Example: How to modify your existing retrieve.ts to use caching
 */
export async function exampleRetrieveWithCache(
  query: string,
  filters: any,
  tenantId: string
): Promise<any> {
  
  // Try to get from cache first
  const cachedResults = await cacheService.getSearchResults(query, filters, tenantId);
  if (cachedResults) {
    console.log('[Cache] Hit: returning cached search results');
    return cachedResults;
  }
  
  // If not in cache, perform the actual search
  console.log('[Cache] Miss: performing new search');
  const results = await performActualSearch(query, filters, tenantId);
  
  // Cache the results for future use
  await cacheService.cacheSearchResults(query, filters, tenantId, results);
  
  return results;
}

// Mock function for demonstration
async function performActualSearch(query: string, filters: any, tenantId: string): Promise<any> {
  // Your existing search logic here
  return { results: [], query, filters, tenantId };
}

// ==================== CACHE CONFIGURATION EXAMPLES ====================

/**
 * Example: Configure cache for different environments
 */
export function configureCacheForEnvironment(environment: 'development' | 'staging' | 'production') {
  switch (environment) {
    case 'development':
      cacheService.updateConfig({
        embeddingTTL: 3600,      // 1 hour
        searchTTL: 300,          // 5 minutes
        sessionTTL: 1800,        // 30 minutes
        contextTTL: 600,         // 10 minutes
        rateLimitWindow: 60,     // 1 minute
        rateLimitMax: 1000       // 1000 requests per minute
      });
      break;
      
    case 'staging':
      cacheService.updateConfig({
        embeddingTTL: 86400,     // 24 hours
        searchTTL: 1800,         // 30 minutes
        sessionTTL: 7200,        // 2 hours
        contextTTL: 3600,        // 1 hour
        rateLimitWindow: 60,     // 1 minute
        rateLimitMax: 500        // 500 requests per minute
      });
      break;
      
    case 'production':
      cacheService.updateConfig({
        embeddingTTL: 604800,    // 7 days
        searchTTL: 3600,         // 1 hour
        sessionTTL: 14400,       // 4 hours
        contextTTL: 7200,        // 2 hours
        rateLimitWindow: 60,     // 1 minute
        rateLimitMax: 100        // 100 requests per minute
      });
      break;
  }
}

// ==================== ERROR HANDLING EXAMPLES ====================

/**
 * Example: Handle cache failures gracefully
 */
export async function safeCacheOperation<T>(
  operation: () => Promise<T>,
  fallback: () => Promise<T>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error('Cache operation failed, using fallback:', error);
    return await fallback();
  }
}

/**
 * Example: Use safe cache operation
 */
export async function getEmbeddingSafely(
  text: string,
  model: string,
  provider: string,
  generateFn: () => Promise<number[]>
): Promise<number[]> {
  
  return await safeCacheOperation(
    // Try cache first
    () => cacheService.getOrGenerateEmbedding(text, model, provider, generateFn),
    // Fallback to direct generation
    () => generateFn()
  );
}
