import { createClient, RedisClientType } from 'redis';
import crypto from 'crypto';

let client: RedisClientType | null = null;

export async function init() {
  if (!client) {
    client = createClient({ 
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD
    });
    client.on('error', (err) => console.error('Redis Client Error', err));
    await client.connect();
  }
}

export async function health() {
  try {
    await client?.ping();
    return { status: 'ok' as const };
  } catch (e) {
    return { status: 'error' as const, error: (e as Error).message };
  }
}

// Utility function to create consistent cache keys
function createCacheKey(prefix: string, identifier: string): string {
  return `${prefix}:${identifier}`;
}

// Hash function for text content
function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
}

// ==================== EMBEDDING CACHE ====================

/**
 * Cache embedding results to avoid regenerating expensive AI operations
 */
export async function getCachedEmbedding(text: string, model: string, provider: string): Promise<number[] | null> {
  if (!client) return null;
  
  try {
    const key = createCacheKey('embedding', `${provider}:${model}:${hashContent(text)}`);
    const cached = await client.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Error getting cached embedding:', error);
    return null;
  }
}

/**
 * Store embedding results in cache
 */
export async function setCachedEmbedding(
  text: string, 
  model: string, 
  provider: string, 
  embedding: number[], 
  ttlSeconds: number = 86400 // 24 hours default
): Promise<void> {
  if (!client) return;
  
  try {
    const key = createCacheKey('embedding', `${provider}:${model}:${hashContent(text)}`);
    await client.setEx(key, ttlSeconds, JSON.stringify(embedding));
  } catch (error) {
    console.error('Error setting cached embedding:', error);
  }
}

// ==================== SEARCH RESULT CACHE ====================

/**
 * Cache search results for similar queries
 */
export async function getCachedSearchResults(
  query: string, 
  filters: any, 
  tenantId: string
): Promise<any | null> {
  if (!client) return null;
  
  try {
    const filterHash = hashContent(JSON.stringify(filters));
    const key = createCacheKey('search', `${tenantId}:${hashContent(query)}:${filterHash}`);
    const cached = await client.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Error getting cached search results:', error);
    return null;
  }
}

/**
 * Store search results in cache
 */
export async function setCachedSearchResults(
  query: string, 
  filters: any, 
  tenantId: string, 
  results: any, 
  ttlSeconds: number = 1800 // 30 minutes default
): Promise<void> {
  if (!client) return;
  
  try {
    const filterHash = hashContent(JSON.stringify(filters));
    const key = createCacheKey('search', `${tenantId}:${hashContent(query)}:${filterHash}`);
    await client.setEx(key, ttlSeconds, JSON.stringify(results));
  } catch (error) {
    console.error('Error setting cached search results:', error);
  }
}

// ==================== USER SESSION CACHE ====================

/**
 * Cache user sessions and permissions
 */
export async function getCachedUserSession(userId: string, tenantId: string): Promise<any | null> {
  if (!client) return null;
  
  try {
    const key = createCacheKey('session', `${tenantId}:${userId}`);
    const cached = await client.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Error getting cached user session:', error);
    return null;
  }
}

/**
 * Store user session in cache
 */
export async function setCachedUserSession(
  userId: string, 
  tenantId: string, 
  session: any, 
  ttlSeconds: number = 7200 // 2 hours default
): Promise<void> {
  if (!client) return;
  
  try {
    const key = createCacheKey('session', `${tenantId}:${userId}`);
    await client.setEx(key, ttlSeconds, JSON.stringify(session));
  } catch (error) {
    console.error('Error setting cached user session:', error);
  }
}

/**
 * Invalidate user session cache
 */
export async function invalidateUserSession(userId: string, tenantId: string): Promise<void> {
  if (!client) return;
  
  try {
    const key = createCacheKey('session', `${tenantId}:${userId}`);
    await client.del(key);
  } catch (error) {
    console.error('Error invalidating user session:', error);
  }
}

// ==================== RATE LIMITING ====================

/**
 * Check and enforce rate limiting
 */
export async function checkRateLimit(
  identifier: string, 
  limit: number, 
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  if (!client) return { allowed: true, remaining: limit, resetTime: Date.now() + windowSeconds * 1000 };
  
  try {
    const key = createCacheKey('ratelimit', identifier);
    const current = await client.incr(key);
    
    if (current === 1) {
      await client.expire(key, windowSeconds);
    }
    
    const remaining = Math.max(0, limit - current);
    const ttl = await client.ttl(key);
    const resetTime = Date.now() + (ttl * 1000);
    
    return {
      allowed: current <= limit,
      remaining,
      resetTime
    };
  } catch (error) {
    console.error('Error checking rate limit:', error);
    return { allowed: true, remaining: limit, resetTime: Date.now() + windowSeconds * 1000 };
  }
}

// ==================== CONTEXT CACHE ====================

/**
 * Cache context data for frequently accessed contexts
 */
export async function getCachedContext(contextId: string, tenantId: string): Promise<any | null> {
  if (!client) return null;
  
  try {
    const key = createCacheKey('context', `${tenantId}:${contextId}`);
    const cached = await client.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Error getting cached context:', error);
    return null;
  }
}

/**
 * Store context data in cache
 */
export async function setCachedContext(
  contextId: string, 
  tenantId: string, 
  context: any, 
  ttlSeconds: number = 3600 // 1 hour default
): Promise<void> {
  if (!client) return;
  
  try {
    const key = createCacheKey('context', `${tenantId}:${contextId}`);
    await client.setEx(key, ttlSeconds, JSON.stringify(context));
  } catch (error) {
    console.error('Error setting cached context:', error);
  }
}

/**
 * Invalidate context cache
 */
export async function invalidateContext(contextId: string, tenantId: string): Promise<void> {
  if (!client) return;
  
  try {
    const key = createCacheKey('context', `${tenantId}:${contextId}`);
    await client.del(key);
  } catch (error) {
    console.error('Error invalidating context:', error);
  }
}

// ==================== CACHE MANAGEMENT ====================

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<any> {
  if (!client) return { error: 'Redis not connected' };
  
  try {
    const info = await client.info('memory');
    const keys = await client.dbSize();
    
    return {
      connected: true,
      keys,
      info: info.split('\r\n').reduce((acc: any, line) => {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          acc[key] = value;
        }
        return acc;
      }, {})
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return { error: 'Failed to get cache stats' };
  }
}

/**
 * Clear all cache data (use with caution)
 */
export async function clearAllCache(): Promise<void> {
  if (!client) return;
  
  try {
    await client.flushDb();
    console.log('All cache data cleared');
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * Clear cache by pattern
 */
export async function clearCacheByPattern(pattern: string): Promise<number> {
  if (!client) return 0;
  
  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
    return keys.length;
  } catch (error) {
    console.error('Error clearing cache by pattern:', error);
    return 0;
  }
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Set a key with TTL
 */
export async function set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
  if (!client) return;
  
  try {
    await client.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    console.error('Error setting cache key:', error);
  }
}

/**
 * Get a key
 */
export async function get(key: string): Promise<any | null> {
  if (!client) return null;
  
  try {
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Error getting cache key:', error);
    return null;
  }
}

/**
 * Delete a key
 */
export async function del(key: string): Promise<void> {
  if (!client) return;
  
  try {
    await client.del(key);
  } catch (error) {
    console.error('Error deleting cache key:', error);
  }
}

/**
 * Check if key exists
 */
export async function exists(key: string): Promise<boolean> {
  if (!client) return false;
  
  try {
    const result = await client.exists(key);
    return result === 1;
  } catch (error) {
    console.error('Error checking key existence:', error);
    return false;
  }
}

/**
 * Get TTL for a key
 */
export async function getTTL(key: string): Promise<number> {
  if (!client) return -1;
  
  try {
    return await client.ttl(key);
  } catch (error) {
    console.error('Error getting TTL:', error);
    return -1;
  }
}


