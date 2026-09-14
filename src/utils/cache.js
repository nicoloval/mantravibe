// Cache utility for performance optimization
// Provides versioned caching with automatic invalidation

// Bumped when formation-scoring logic changes, to invalidate any previously cached rankings
// computed with the old formula.
const CACHE_VERSION = '1.1.0';
const CACHE_PREFIX = 'mantravibe_cache_';

// Cache configuration
const CACHE_CONFIG = {
  // Formation rankings cache (expensive calculation)
  FORMATION_RANKINGS: {
    key: 'formation_rankings',
    ttl: 5 * 60 * 1000, // 5 minutes
    version: CACHE_VERSION
  },
  
  // Player processing cache (expensive role mapping)
  PLAYER_PROCESSING: {
    key: 'player_processing',
    ttl: 10 * 60 * 1000, // 10 minutes
    version: CACHE_VERSION
  },
  
  // Role mapping cache (static data)
  ROLE_MAPPING: {
    key: 'role_mapping',
    ttl: 60 * 60 * 1000, // 1 hour
    version: CACHE_VERSION
  },
  
  // Formation stats cache (expensive calculation)
  FORMATION_STATS: {
    key: 'formation_stats',
    ttl: 2 * 60 * 1000, // 2 minutes
    version: CACHE_VERSION
  }
};

/**
 * Generate cache key with version
 */
function getCacheKey(config, ...params) {
  const paramString = params.length > 0 ? `_${params.join('_')}` : '';
  return `${CACHE_PREFIX}${config.key}${paramString}`;
}

/**
 * Check if cache entry is valid
 */
function isCacheValid(entry, config) {
  if (!entry) return false;
  
  // Check version
  if (entry.version !== config.version) return false;
  
  // Check TTL
  const now = Date.now();
  if (now - entry.timestamp > config.ttl) return false;
  
  return true;
}

/**
 * Get cached data
 */
export function getCachedData(config, ...params) {
  try {
    const key = getCacheKey(config, ...params);
    const cached = localStorage.getItem(key);
    
    if (!cached) return null;
    
    const entry = JSON.parse(cached);
    
    if (!isCacheValid(entry, config)) {
      // Remove invalid cache
      localStorage.removeItem(key);
      return null;
    }
    
    return entry.data;
  } catch (error) {
    console.error('Error reading from cache:', error);
    return null;
  }
}

/**
 * Set cached data
 */
export function setCachedData(config, data, ...params) {
  try {
    const key = getCacheKey(config, ...params);
    const entry = {
      data,
      timestamp: Date.now(),
      version: config.version
    };
    
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    console.error('Error writing to cache:', error);
  }
}

/**
 * Clear specific cache
 */
export function clearCache(config, ...params) {
  try {
    const key = getCacheKey(config, ...params);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * Clear all caches
 */
export function clearAllCaches() {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Error clearing all caches:', error);
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  try {
    const keys = Object.keys(localStorage);
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
    
    let totalSize = 0;
    let validEntries = 0;
    let expiredEntries = 0;
    
    cacheKeys.forEach(key => {
      const cached = localStorage.getItem(key);
      if (cached) {
        totalSize += cached.length;
        
        try {
          const entry = JSON.parse(cached);
          const config = Object.values(CACHE_CONFIG).find(c => key.includes(c.key));
          
          if (config && isCacheValid(entry, config)) {
            validEntries++;
          } else {
            expiredEntries++;
          }
        } catch {
          expiredEntries++;
        }
      }
    });
    
    return {
      totalEntries: cacheKeys.length,
      validEntries,
      expiredEntries,
      totalSize: `${(totalSize / 1024).toFixed(2)} KB`
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return null;
  }
}

// Export cache configurations
export { CACHE_CONFIG };
