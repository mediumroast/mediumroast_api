/* eslint-disable no-console */
/**
 * @fileoverview Storage entity for GitHubServer
 * @license Apache-2.0
 * @version 3.0.0
 * 
 * @author Michael Hay <michael.hay@mediumroast.io>
 * @copyright 2024 Mediumroast, Inc. All rights reserved.
 */

import { BaseObjects } from '../baseObjects.js';

export class Storage extends BaseObjects {
  /**
     * @constructor
     * @param {string} token - GitHub API token
     * @param {string} org - GitHub organization name
     * @param {string} processName - Process name for locking
     */
  constructor(token, org, processName) {
    super(token, org, processName, 'Storage');
  }

  /**
     * Get repository size with caching
     * @returns {Promise<Array>} Repository size information
     */
  async getRepoSize() {
    return this.cache.getOrFetch(
      'repo_size',
      async () => this.serverCtl.getRepoSize(),
      this.cacheTimeouts.Storage
    );
  }
    
  /**
     * Get storage usage by container
     * @returns {Promise<Array>} Storage usage by container
     */
  async getStorageByContainer() {
    try {
      // Get all container names
      const containers = ['Studies', 'Companies', 'Interactions'];
      const stats = {
        totalSize: 0,
        containers: {}
      };
            
      for (const container of containers) {
        // Skip if no object file for this container
        if (!this.objectFiles[container]) continue;
                
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
        if (!objectsResp[0]) continue;
                
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
          const shaResp = await this.serverCtl.getSha(
            container, 
            this.objectFiles[container], 
            'main'
          );
                    
          if (shaResp[0] && shaResp[2]) {
            const contentResp = await this.serverCtl.getContent(
              `${container}/${this.objectFiles[container]}`, 
              'main'
            );
                        
            if (contentResp[0] && contentResp[2] && contentResp[2].size) {
              stats.containers[container].size = contentResp[2].size;
              stats.totalSize += contentResp[2].size;
            }
          }
        } catch (err) {
          console.error(`Error getting size for ${container}:`, err);
        }
      }
            
      // Get overall repository size for comparison
      const repoSizeResp = await this.getRepoSize();
      if (repoSizeResp[0] && repoSizeResp[2]) {
        stats.repoSize = repoSizeResp[2];
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
  }
    
  /**
     * Get storage usage trends over time
     * @param {number} days - Number of days to analyze
     * @returns {Promise<Array>} Storage usage trends
     */
  async getStorageTrends(days = 30) {
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
          console.error(`Error getting size at commit ${commit.sha}:`, err);
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
  }
    
  /**
     * Get storage quota and usage
     * @returns {Promise<Array>} Storage quota and usage information
     */
  async getQuota() {
    try {
      const orgResp = await this.serverCtl.getGitHubOrg();
      if (!orgResp[0]) {
        return orgResp;
      }
            
      const repoSizeResp = await this.getRepoSize();
      if (!repoSizeResp[0]) {
        return repoSizeResp;
      }
            
      // If organization has plan info, include it
      const quota = {
        currentSize: repoSizeResp[2],
        plan: orgResp[2].plan || null
      };
            
      return this._createSuccess(
        'Retrieved storage quota information',
        quota
      );
            
    } catch (err) {
      return this._createError(
        `Failed to retrieve storage quota: ${err.message}`,
        err,
        500
      );
    }
  }
}