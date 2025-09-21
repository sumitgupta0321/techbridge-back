const { client } = require('../config/redis');

// Cache middleware for GET requests
const cacheMiddleware = (ttl = 900) => { // Default 15 minutes
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    try {
      // Check if Redis is connected
      if (!client.isOpen) {
        console.log('Redis not connected - skipping cache');
        return next();
      }

      // Create cache key from route and query parameters
      const cacheKey = `cache:${req.originalUrl}:${req.user?.id || 'anonymous'}`;
      
      // Check if data exists in cache
      const cachedData = await client.get(cacheKey);
      
      if (cachedData) {
        console.log(`Cache hit for key: ${cacheKey}`);
        return res.json(JSON.parse(cachedData));
      }

      // Store original res.json function
      const originalJson = res.json;

      // Override res.json to cache the response
      res.json = function(data) {
        // Cache the response data (only if Redis is connected)
        if (client.isOpen) {
          client.setEx(cacheKey, ttl, JSON.stringify(data))
            .then(() => console.log(`Cached data for key: ${cacheKey}`))
            .catch(err => console.error('Cache set error:', err));
        }
        
        // Call original json function
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      // Continue without caching if Redis is unavailable
      next();
    }
  };
};

// Clear cache by pattern
const clearCache = async (pattern) => {
  try {
    if (!client.isOpen) {
      console.log('Redis not connected - skipping cache clear');
      return;
    }
    
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
      console.log(`Cleared ${keys.length} cache entries matching pattern: ${pattern}`);
    }
  } catch (error) {
    console.error('Cache clear error:', error);
  }
};

// Clear user-specific cache
const clearUserCache = async (userId) => {
  await clearCache(`cache:*:${userId}`);
};

// Clear analytics cache
const clearAnalyticsCache = async (userId = '*') => {
  await clearCache(`cache:*/analytics*:${userId}`);
};

// Clear transaction cache
const clearTransactionCache = async (userId = '*') => {
  await clearCache(`cache:*/transactions*:${userId}`);
};

module.exports = {
  cacheMiddleware,
  clearCache,
  clearUserCache,
  clearAnalyticsCache,
  clearTransactionCache
};
