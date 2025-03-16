/* eslint-disable no-console */
/**
 * Storage entity class for GitHub repository storage operations
 * @file storage.js
 * @license Apache-2.0
 * @version 3.0.0
 * 
 * @author Michael Hay <michael.hay@mediumroast.io>
 * @copyright 2024 Mediumroast, Inc. All rights reserved.
 */

import { BaseObjects } from '../baseObjects.js';
import { logger } from '../logger.js';

export class Storage extends BaseObjects {
  /**
   * @constructor
   * @param {string} token - GitHub API token
   * @param {string} org - GitHub organization name
   * @param {string} processName - Process name for locking
   */
  constructor(token, org, processName) {
    super(token, org, processName, 'Storage');
    
    // Add storage-specific cache keys
    this._cacheKeys.storageBilling = 'storage_billing';
    this._cacheKeys.byContainer = 'storage_by_container';
    this._cacheKeys.quota = 'storage_quota';
    this._cacheKeys.trends = 'storage_trends';
    
    // Set specific cache timeouts
    this.cacheTimeouts.storageBilling = 3600000; // 1 hour for billing info
    this.cacheTimeouts.byContainer = 3600000;    // 1 hour for container info
    this.cacheTimeouts.quota = 86400000;         // 24 hours for quota info
    this.cacheTimeouts.trends = 86400000;        // 24 hours for trends
    
    // Define object file names for containers
    this.objectFiles = {
      Studies: 'studies.json',
      Companies: 'companies.json',
      Interactions: 'interactions.json'
    };
  }

  /**
   * Get repository size information
   * @returns {Promise<Array>} Size information
   */
  async getRepoSize() {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'getRepoSize') : 
      { end: () => {} };
    
    try {
      return await this.cache.getOrFetch(
        this._cacheKeys.repoSize,
        async () => {
          try {
            // Try to use getRepository method first
            if (typeof this.serverCtl.getRepository === 'function') {
              const repoResponse = await this.serverCtl.getRepository();
              
              if (!repoResponse[0]) {
                return repoResponse;
              }
              
              // Extract just the size from the response
              return this._createSuccess(
                'Retrieved repository size successfully',
                repoResponse[2].size || 0
              );
            } 
            // Try to use getRepoSize (older method name) as fallback
            else if (typeof this.serverCtl.getRepoSize === 'function') {
              logger.info('Using legacy getRepoSize method');
              return await this.serverCtl.getRepoSize();
            }
            // If neither method exists, provide a fallback response
            else {
              logger.warn('Repository size methods not implemented in github.js, using fallback');
              
              return this._createSuccess(
                'Repository size functionality not fully implemented',
                {
                  size: 0,
                  message: 'This is a placeholder. The getRepository method needs to be implemented in the github.js file.'
                }
              );
            }
          } catch (error) {
            // Handle any unexpected errors
            logger.error('Failed to retrieve repository size', error);
            throw error; // Re-throw to be caught by outer try-catch
          }
        },
        this.cacheTimeouts.repoSize || 3600000,
        [] // No dependencies
      );
    } catch (error) {
      return this._createError(
        `Failed to retrieve repository size: ${error.message}`,
        error,
        500
      );
    } finally {
      tracking.end();
    }
  }

  /**
   * Get storage billing information
   * @returns {Promise<Array>} Storage billing info
   */
  async getStorageBilling() {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'getStorageBilling') : 
      { end: () => {} };
    
    try {
      return await this.cache.getOrFetch(
        this._cacheKeys.storageBilling,
        async () => {
          try {
            // Check if the method exists first
            if (typeof this.serverCtl.getStorageBillings === 'function') {
              return await this.serverCtl.getStorageBillings();
            } else {
              // Provide fallback mock data
              logger.warn('getStorageBillings not implemented in github.js, using fallback');
              return this._createSuccess(
                'Storage billing functionality not fully implemented',
                {
                  days_left_in_billing_cycle: 15,
                  estimated_paid_storage_for_month: 0,
                  estimated_storage_for_month: 5,
                  message: 'This is a placeholder. The getStorageBillings method needs to be implemented.'
                }
              );
            }
          } catch (error) {
            logger.error('Failed to retrieve storage billing', error);
            throw error;
          }
        },
        this.cacheTimeouts.storageBilling,
        []
      );
    } catch (error) {
      return this._createError(
        `Failed to retrieve storage billing: ${error.message}`,
        error,
        500
      );
    } finally {
      tracking.end();
    }
  }
    
  /**
   * Get storage usage by container
   * @returns {Promise<Array>} Storage usage by container
   */
  async getStorageByContainer() {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'getStorageByContainer') : 
      { end: () => {} };
    
    try {
      return await this.cache.getOrFetch(
        this._cacheKeys.byContainer,
        async () => {
          try {
            // Get all container names
            const containers = ['Studies', 'Companies', 'Interactions'];
            const stats = {
              totalSize: 0,
              containers: {}
            };
            
            for (const container of containers) {
              // Skip if no object file for this container
              if (!this.objectFiles[container]) {
                logger.debug(`Skipping container ${container} - no object file defined`);
                continue;
              }
                
              // Initialize container statistics
              stats.containers[container] = {
                size: 0,
                objectCount: 0,
                lastUpdated: null
              };
                
              // Get container objects
              const containerClass = new BaseObjects(
                this.serverCtl.token,
                this.serverCtl.orgName,
                'storage-analyzer',
                container
              );
                
              const objectsResp = await containerClass.getAll();
              if (!objectsResp[0]) {
                logger.warn(`Failed to get objects for ${container}: ${objectsResp[1]?.status_msg}`);
                continue;
              }
                
              const objects = objectsResp[2].mrJson;
              stats.containers[container].objectCount = objects.length;
                
              // Get latest modification date
              for (const obj of objects) {
                if (obj.modification_date && 
                      (!stats.containers[container].lastUpdated || 
                       new Date(obj.modification_date) > new Date(stats.containers[container].lastUpdated))) {
                  stats.containers[container].lastUpdated = obj.modification_date;
                }
              }
                
              // For Interactions, also calculate total file size
              if (container === 'Interactions') {
                let totalInteractionSize = 0;
                for (const obj of objects) {
                  if (obj.file_size) {
                    totalInteractionSize += obj.file_size;
                  }
                }
                stats.containers[container].fileSize = totalInteractionSize;
              }
                
              // Get container file size from SHA
              try {
                if (typeof this.serverCtl.getSha === 'function') {
                  const shaResp = await this.serverCtl.getSha(
                    container, 
                    this.objectFiles[container], 
                    'main'
                  );
                      
                  if (shaResp[0] && shaResp[2] && typeof this.serverCtl.getContent === 'function') {
                    const contentResp = await this.serverCtl.getContent(
                      `${container}/${this.objectFiles[container]}`, 
                      'main'
                    );
                          
                    if (contentResp[0] && contentResp[2] && contentResp[2].size) {
                      stats.containers[container].size = contentResp[2].size;
                      stats.totalSize += contentResp[2].size;
                    }
                  }
                }
              } catch (err) {
                logger.error(`Error getting size for ${container}:`, err);
              }
            }
            
            return this._createSuccess(
              'Retrieved storage usage by container',
              stats
            );
          } catch (err) {
            return this._createError(
              `Failed to retrieve storage usage: ${err.message}`,
              err,
              500
            );
          }
        },
        this.cacheTimeouts.byContainer,
        []
      );
    } finally {
      tracking.end();
    }
  }
    
  /**
   * Get storage usage trends over time
   * @param {number} days - Number of days to analyze
   * @returns {Promise<Array>} Storage usage trends
   */
  async getStorageTrends(days = 30) {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'getStorageTrends') : 
      { end: () => {} };
    
    // Validate parameters
    const validationError = this._validateParams(
      { days },
      { days: 'number' }
    );
        
    if (validationError) return validationError;
    
    try {
      // Use cache with key that includes days parameter
      const trendsCacheKey = `${this._cacheKeys.trends}_${days}`;
      
      return await this.cache.getOrFetch(
        trendsCacheKey,
        async () => {
          try {
            const commitHistory = await this.serverCtl.getCommitHistory(days);
            if (!commitHistory[0]) {
              return commitHistory;
            }
            
            // Extract size information from commits
            const sizeByDate = {};
            const commits = commitHistory[2];
            
            for (const commit of commits) {
              const date = commit.commit.author.date.substring(0, 10); // YYYY-MM-DD
                
              // Get the repo size at this commit
              try {
                const sizeResp = await this.serverCtl.getRepoSizeAtCommit(commit.sha);
                if (sizeResp[0] && sizeResp[2]) {
                  sizeByDate[date] = sizeResp[2];
                }
              } catch (err) {
                logger.error(`Error getting size at commit ${commit.sha}:`, err);
              }
            }
            
            // Convert to array and sort by date
            const trends = Object.entries(sizeByDate).map(([date, size]) => ({
              date,
              size
            })).sort((a, b) => new Date(a.date) - new Date(b.date));
            
            return this._createSuccess(
              `Retrieved storage trends for the past ${days} days`,
              trends
            );
          } catch (err) {
            return this._createError(
              `Failed to retrieve storage trends: ${err.message}`,
              err,
              500
            );
          }
        },
        this.cacheTimeouts.trends
      );
    } finally {
      tracking.end();
    }
  }
    
  /**
   * Get storage quota and usage
   * @returns {Promise<Array>} Storage quota and usage information
   */
  async getQuota() {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'getQuota') : 
      { end: () => {} };
    
    try {
      return await this.cache.getOrFetch(
        this._cacheKeys.quota,
        async () => {
          try {
            if (typeof this.serverCtl.getGitHubOrg === 'function') {
              const orgResp = await this.serverCtl.getGitHubOrg();
              if (!orgResp[0]) {
                return orgResp;
              }
              
              // Provide basic quota information
              const quota = {
                organization: this.org,
                plan: orgResp[2]?.plan || {
                  name: 'unknown',
                  space: 'unknown'
                }
              };
              
              return this._createSuccess(
                'Retrieved storage quota information',
                quota
              );
            } else {
              // Provide fallback mock data
              return this._createSuccess(
                'Storage quota functionality not fully implemented',
                {
                  organization: this.org,
                  plan: {
                    name: 'team',
                    space: 'unlimited',
                    message: 'This is a placeholder. The getGitHubOrg method needs to be implemented.'
                  }
                }
              );
            }
          } catch (err) {
            return this._createError(
              `Failed to retrieve storage quota: ${err.message}`,
              err,
              500
            );
          }
        },
        this.cacheTimeouts.quota,
        []
      );
    } finally {
      tracking.end();
    }
  }
  
  /**
   * Get disk usage analytics
   * @returns {Promise<Array>} Disk usage analytics
   */
  async getDiskUsageAnalytics() {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'getDiskUsageAnalytics') : 
      { end: () => {} };
    
    try {
      // Use cache with dependencies on container and repo size
      const analyticsCacheKey = 'storage_analytics';
      
      return await this.cache.getOrFetch(
        analyticsCacheKey,
        async () => {
          try {
            // Get storage by container
            const containerResp = await this.getStorageByContainer();
            if (!containerResp[0]) {
              return containerResp;
            }
            
            const storage = containerResp[2];
            
            // Calculate analytics
            const analytics = {
              totalSize: storage.totalSize,
              repoSize: storage.repoSize || 0,
              containers: {},
              percentages: {},
              largestContainer: {
                name: '',
                size: 0
              },
              mostObjects: {
                name: '',
                count: 0
              },
              mostRecentActivity: {
                name: '',
                date: null
              }
            };
            
            // Calculate container analytics
            for (const [name, container] of Object.entries(storage.containers)) {
              // Copy container data
              analytics.containers[name] = container;
              
              // Calculate percentage of total
              analytics.percentages[name] = storage.totalSize > 0 ? 
                (container.size / storage.totalSize) * 100 : 0;
              
              // Track largest container
              if (container.size > analytics.largestContainer.size) {
                analytics.largestContainer = {
                  name,
                  size: container.size
                };
              }
              
              // Track container with most objects
              if (container.objectCount > analytics.mostObjects.count) {
                analytics.mostObjects = {
                  name,
                  count: container.objectCount
                };
              }
              
              // Track most recent activity
              if (container.lastUpdated && 
                 (!analytics.mostRecentActivity.date || 
                   new Date(container.lastUpdated) > new Date(analytics.mostRecentActivity.date))) {
                analytics.mostRecentActivity = {
                  name,
                  date: container.lastUpdated
                };
              }
            }
            
            // Add projected growth based on trends
            try {
              const trendsResp = await this.getStorageTrends(30);
              if (trendsResp[0] && trendsResp[2] && trendsResp[2].length > 1) {
                const trends = trendsResp[2];
                const firstSize = trends[0].size;
                const lastSize = trends[trends.length - 1].size;
                const growthRate = (lastSize - firstSize) / firstSize;
                
                analytics.growth = {
                  rate: growthRate,
                  period: '30 days',
                  projectedSize: {
                    '30days': Math.round(lastSize * (1 + growthRate)),
                    '90days': Math.round(lastSize * Math.pow(1 + growthRate, 3)) 
                  }
                };
              }
            } catch (err) {
              logger.warn('Failed to calculate growth projections', err);
            }
            
            return this._createSuccess(
              'Generated storage analytics',
              analytics
            );
          } catch (err) {
            return this._createError(
              `Failed to generate disk usage analytics: ${err.message}`,
              err,
              500
            );
          }
        },
        300000, // 5 minutes cache
        [
          this._cacheKeys.byContainer,   // Depends on container data
          this._cacheKeys.trends,        // Depends on trends data
          this._cacheKeys.repoSize       // Depends on repo size
        ]
      );
    } finally {
      tracking.end();
    }
  }
}