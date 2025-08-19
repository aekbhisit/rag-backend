import * as redis from '../adapters/cache/redisClient';

export interface CacheConfig {
  embeddingTTL: number;      // Embedding cache TTL in seconds
  searchTTL: number;         // Search results cache TTL in seconds
  sessionTTL: number;        // User session cache TTL in seconds
  contextTTL: number;        // Context cache TTL in seconds
  rateLimitWindow: number;   // Rate limiting window in seconds
  rateLimitMax: number;      // Maximum requests per window
}

export class CacheService {
  private config: CacheConfig;

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      embeddingTTL: 86400,      // 24 hours
      searchTTL: 1800,          // 30 minutes
      sessionTTL: 7200,         // 2 hours
      contextTTL: 3600,         // 1 hour
      rateLimitWindow: 60,      // 1 minute
      rateLimitMax: 100,        // 100 requests per minute
      ...config
    };
  }

  // ==================== EMBEDDING CACHE SERVICE ====================

  /**
   * Get cached embedding or return null if not found
   */
  async getEmbedding(text: string, model: string, provider: string): Promise<number[] | null> {
    return redis.getCachedEmbedding(text, model, provider);
  }

  /**
   * Cache embedding result
   */
  async cacheEmbedding(text: string, model: string, provider: string, embedding: number[]): Promise<void> {
    await redis.setCachedEmbedding(text, model, provider, embedding, this.config.embeddingTTL);
  }

  /**
   * Get or generate embedding with caching
   */
  async getOrGenerateEmbedding(
    text: string, 
    model: string, 
    provider: string, 
    generateFn: () => Promise<number[]>
  ): Promise<number[]> {
    // Try to get from cache first
    const cached = await this.getEmbedding(text, model, provider);
    if (cached) {
      console.log(`[Cache] Hit: embedding for text (${text.substring(0, 50)}...)`);
      return cached;
    }

    // Generate new embedding
    console.log(`[Cache] Miss: generating embedding for text (${text.substring(0, 50)}...)`);
    const embedding = await generateFn();
    
    // Cache the result
    await this.cacheEmbedding(text, model, provider, embedding);
    
    return embedding;
  }

  // ==================== SEARCH CACHE SERVICE ====================

  /**
   * Get cached search results
   */
  async getSearchResults(query: string, filters: any, tenantId: string): Promise<any | null> {
    return redis.getCachedSearchResults(query, filters, tenantId);
  }

  /**
   * Cache search results
   */
  async cacheSearchResults(query: string, filters: any, tenantId: string, results: any): Promise<void> {
    await redis.setCachedSearchResults(query, filters, tenantId, results, this.config.searchTTL);
  }

  /**
   * Get or perform search with caching
   */
  async getOrPerformSearch(
    query: string, 
    filters: any, 
    tenantId: string, 
    searchFn: () => Promise<any>
  ): Promise<any> {
    // Try to get from cache first
    const cached = await this.getSearchResults(query, filters, tenantId);
    if (cached) {
      console.log(`[Cache] Hit: search results for query "${query}"`);
      return cached;
    }

    // Perform search
    console.log(`[Cache] Miss: performing search for query "${query}"`);
    const results = await searchFn();
    
    // Cache the results
    await this.cacheSearchResults(query, filters, tenantId, results);
    
    return results;
  }

  // ==================== USER SESSION CACHE SERVICE ====================

  /**
   * Get cached user session
   */
  async getUserSession(userId: string, tenantId: string): Promise<any | null> {
    return redis.getCachedUserSession(userId, tenantId);
  }

  /**
   * Cache user session
   */
  async cacheUserSession(userId: string, tenantId: string, session: any): Promise<void> {
    await redis.setCachedUserSession(userId, tenantId, session, this.config.sessionTTL);
  }

  /**
   * Invalidate user session
   */
  async invalidateUserSession(userId: string, tenantId: string): Promise<void> {
    await redis.invalidateUserSession(userId, tenantId);
  }

  /**
   * Get or fetch user session with caching
   */
  async getOrFetchUserSession(
    userId: string, 
    tenantId: string, 
    fetchFn: () => Promise<any>
  ): Promise<any> {
    // Try to get from cache first
    const cached = await this.getUserSession(userId, tenantId);
    if (cached) {
      console.log(`[Cache] Hit: user session for ${userId}`);
      return cached;
    }

    // Fetch from database
    console.log(`[Cache] Miss: fetching user session for ${userId}`);
    const session = await fetchFn();
    
    // Cache the session
    await this.cacheUserSession(userId, tenantId, session);
    
    return session;
  }

  // ==================== CONTEXT CACHE SERVICE ====================

  /**
   * Get cached context
   */
  async getContext(contextId: string, tenantId: string): Promise<any | null> {
    return redis.getCachedContext(contextId, tenantId);
  }

  /**
   * Cache context
   */
  async cacheContext(contextId: string, tenantId: string, context: any): Promise<void> {
    await redis.setCachedContext(contextId, tenantId, context, this.config.contextTTL);
  }

  /**
   * Invalidate context cache
   */
  async invalidateContext(contextId: string, tenantId: string): Promise<void> {
    await redis.invalidateContext(contextId, tenantId);
  }

  /**
   * Get or fetch context with caching
   */
  async getOrFetchContext(
    contextId: string, 
    tenantId: string, 
    fetchFn: () => Promise<any>
  ): Promise<any> {
    // Try to get from cache first
    const cached = await this.getContext(contextId, tenantId);
    if (cached) {
      console.log(`[Cache] Hit: context ${contextId}`);
      return cached;
    }

    // Fetch from database
    console.log(`[Cache] Miss: fetching context ${contextId}`);
    const context = await fetchFn();
    
    // Cache the context
    await this.cacheContext(contextId, tenantId, context);
    
    return context;
  }

  // ==================== RATE LIMITING SERVICE ====================

  /**
   * Check rate limit for an identifier
   */
  async checkRateLimit(identifier: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    return redis.checkRateLimit(identifier, this.config.rateLimitMax, this.config.rateLimitWindow);
  }

  /**
   * Check rate limit with custom limits
   */
  async checkCustomRateLimit(identifier: string, max: number, window: number): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    return redis.checkRateLimit(identifier, max, window);
  }

  // ==================== CACHE MANAGEMENT SERVICE ====================

  /**
   * Get cache statistics
   */
  async getStats(): Promise<any> {
    return redis.getCacheStats();
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<void> {
    await redis.clearAllCache();
  }

  /**
   * Clear cache by pattern
   */
  async clearByPattern(pattern: string): Promise<number> {
    return redis.clearCacheByPattern(pattern);
  }

  /**
   * Clear tenant-specific cache
   */
  async clearTenantCache(tenantId: string): Promise<number> {
    const patterns = [
      `session:${tenantId}:*`,
      `search:${tenantId}:*`,
      `context:${tenantId}:*`
    ];
    
    let totalCleared = 0;
    for (const pattern of patterns) {
      totalCleared += await redis.clearCacheByPattern(pattern);
    }
    
    return totalCleared;
  }

  /**
   * Clear user-specific cache
   */
  async clearUserCache(userId: string, tenantId: string): Promise<void> {
    await redis.invalidateUserSession(userId, tenantId);
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Set a custom key-value pair
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    await redis.set(key, value, ttl || 3600);
  }

  /**
   * Get a custom key-value pair
   */
  async get(key: string): Promise<any | null> {
    return redis.get(key);
  }

  /**
   * Delete a custom key
   */
  async delete(key: string): Promise<void> {
    await redis.del(key);
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    return redis.exists(key);
  }

  /**
   * Get TTL for a key
   */
  async getTTL(key: string): Promise<number> {
    return redis.getTTL(key);
  }

  // ==================== CONFIGURATION ====================

  /**
   * Update cache configuration
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }
}

// Export a default instance
export const cacheService = new CacheService();

// Export the class for custom instances
export default CacheService;
