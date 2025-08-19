import { Router } from 'express';
import { cacheService } from '../../services/cacheService';

export function buildCacheRouter() {
  const router = Router();

  // ==================== CACHE STATISTICS ====================

  /**
   * GET /api/admin/cache/stats
   * Get cache statistics and information
   */
  router.get('/stats', async (req, res, next) => {
    try {
      const stats = await cacheService.getStats();
      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/admin/cache/config
   * Get current cache configuration
   */
  router.get('/config', async (req, res, next) => {
    try {
      const config = cacheService.getConfig();
      res.json({
        success: true,
        data: config,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  });

  // ==================== CACHE OPERATIONS ====================

  /**
   * POST /api/admin/cache/clear
   * Clear all cache data
   */
  router.post('/clear', async (req, res, next) => {
    try {
      await cacheService.clearAll();
      res.json({
        success: true,
        message: 'All cache data cleared successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/admin/cache/clear-pattern
   * Clear cache by pattern
   */
  router.post('/clear-pattern', async (req, res, next) => {
    try {
      const { pattern } = req.body;
      
      if (!pattern) {
        return res.status(400).json({
          success: false,
          error: 'PATTERN_REQUIRED',
          message: 'Pattern is required'
        });
      }

      const clearedCount = await cacheService.clearByPattern(pattern);
      
      res.json({
        success: true,
        message: `Cleared ${clearedCount} cache entries matching pattern: ${pattern}`,
        data: { clearedCount, pattern },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/admin/cache/clear-tenant
   * Clear cache for specific tenant
   */
  router.post('/clear-tenant', async (req, res, next) => {
    try {
      const { tenantId } = req.body;
      
      if (!tenantId) {
        return res.status(400).json({
          success: false,
          error: 'TENANT_ID_REQUIRED',
          message: 'Tenant ID is required'
        });
      }

      const clearedCount = await cacheService.clearTenantCache(tenantId);
      
      res.json({
        success: true,
        message: `Cleared ${clearedCount} cache entries for tenant: ${tenantId}`,
        data: { clearedCount, tenantId },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/admin/cache/clear-user
   * Clear cache for specific user
   */
  router.post('/clear-user', async (req, res, next) => {
    try {
      const { userId, tenantId } = req.body;
      
      if (!userId || !tenantId) {
        return res.status(400).json({
          success: false,
          error: 'USER_ID_AND_TENANT_ID_REQUIRED',
          message: 'User ID and Tenant ID are required'
        });
      }

      await cacheService.clearUserCache(userId, tenantId);
      
      res.json({
        success: true,
        message: `Cleared cache for user: ${userId} in tenant: ${tenantId}`,
        data: { userId, tenantId },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  });

  // ==================== CACHE INSPECTION ====================

  /**
   * GET /api/admin/cache/key/:key
   * Get value for specific cache key
   */
  router.get('/key/:key', async (req, res, next) => {
    try {
      const { key } = req.params;
      const value = await cacheService.get(key);
      const exists = await cacheService.exists(key);
      const ttl = await cacheService.getTTL(key);
      
      res.json({
        success: true,
        data: {
          key,
          value,
          exists,
          ttl,
          hasValue: value !== null
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * DELETE /api/admin/cache/key/:key
   * Delete specific cache key
   */
  router.delete('/key/:key', async (req, res, next) => {
    try {
      const { key } = req.params;
      await cacheService.delete(key);
      
      res.json({
        success: true,
        message: `Cache key deleted: ${key}`,
        data: { key },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/admin/cache/set
   * Set a cache key-value pair
   */
  router.post('/set', async (req, res, next) => {
    try {
      const { key, value, ttl } = req.body;
      
      if (!key || value === undefined) {
        return res.status(400).json({
          success: false,
          error: 'KEY_AND_VALUE_REQUIRED',
          message: 'Key and value are required'
        });
      }

      await cacheService.set(key, value, ttl);
      
      res.json({
        success: true,
        message: `Cache key set: ${key}`,
        data: { key, ttl: ttl || 3600 },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  });

  // ==================== CACHE CONFIGURATION ====================

  /**
   * PUT /api/admin/cache/config
   * Update cache configuration
   */
  router.put('/config', async (req, res, next) => {
    try {
      const configUpdate = req.body;
      
      // Validate configuration
      const validKeys = [
        'embeddingTTL', 'searchTTL', 'sessionTTL', 'contextTTL',
        'rateLimitWindow', 'rateLimitMax'
      ];
      
      const invalidKeys = Object.keys(configUpdate).filter(key => !validKeys.includes(key));
      if (invalidKeys.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_CONFIG_KEYS',
          message: `Invalid configuration keys: ${invalidKeys.join(', ')}`,
          validKeys
        });
      }

      cacheService.updateConfig(configUpdate);
      const newConfig = cacheService.getConfig();
      
      res.json({
        success: true,
        message: 'Cache configuration updated successfully',
        data: newConfig,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  });

  // ==================== CACHE HEALTH ====================

  /**
   * GET /api/admin/cache/health
   * Check cache health and connectivity
   */
  router.get('/health', async (req, res, next) => {
    try {
      const stats = await cacheService.getStats();
      const config = cacheService.getConfig();
      
      const health = {
        status: stats.error ? 'error' : 'ok',
        connected: !stats.error,
        keys: stats.keys || 0,
        config,
        timestamp: new Date().toISOString()
      };
      
      res.json({
        success: true,
        data: health
      });
    } catch (error) {
      next(error);
    }
  });

  // ==================== CACHE PATTERNS ====================

  /**
   * GET /api/admin/cache/patterns
   * Get common cache key patterns
   */
  router.get('/patterns', async (req, res, next) => {
    try {
      const patterns = {
        embedding: 'embedding:{provider}:{model}:{hash}',
        search: 'search:{tenantId}:{queryHash}:{filterHash}',
        session: 'session:{tenantId}:{userId}',
        context: 'context:{tenantId}:{contextId}',
        rateLimit: 'ratelimit:{tenantId}:{ip}:{userId}',
        custom: 'custom:{key}'
      };
      
      res.json({
        success: true,
        data: patterns,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
