/**
 * @fileoverview Smart cache manager for GitHubServer
 * @file cache.js
 * @license Apache-2.0
 * @version 3.0.0
 * 
 * @author Michael Hay <michael.hay@mediumroast.io>
 * @copyright 2025 Mediumroast, Inc. All rights reserved.
 */
export class CacheManager {
  constructor() {
    this._cache = new Map();
    this._dependencyMap = new Map();
  }
    
  /**
     * Gets a value from cache or fetches it
     * @param {string} key - Cache key
     * @param {Function} fetchFn - Function to fetch data if not cached
     * @param {number} ttl - Time to live in milliseconds
     * @param {Array<string>} dependencies - Keys this cache depends on
     */
  async getOrFetch(key, fetchFn, ttl, dependencies = []) {
    const cached = this._cache.get(key);
    const now = Date.now();
        
    if (cached && (now - cached.timestamp < ttl)) {
      return cached.data;
    }
        
    const data = await fetchFn();
        
    if (data[0]) { // Only cache successful responses
      this._cache.set(key, {
        timestamp: now,
        data
      });
            
      // Register dependencies
      dependencies.forEach(depKey => {
        if (!this._dependencyMap.has(depKey)) {
          this._dependencyMap.set(depKey, new Set());
        }
        this._dependencyMap.get(depKey).add(key);
      });
    }
        
    return data;
  }
    
  /**
     * Invalidate cache entry and its dependents
     * @param {string} key - Cache key to invalidate
     */
  invalidate(key) {
    // Invalidate the key itself
    this._cache.delete(key);
        
    // Invalidate dependents
    const dependents = this._dependencyMap.get(key);
    if (dependents) {
      dependents.forEach(dependentKey => {
        this.invalidate(dependentKey);
      });
    }
  }
    
  /**
     * Clear entire cache
     */
  clear() {
    this._cache.clear();
    this._dependencyMap.clear();
  }
}