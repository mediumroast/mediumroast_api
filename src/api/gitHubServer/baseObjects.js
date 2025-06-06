/**
 * Base class for objects in the mediumroast.io backend 
 * @author Michael Hay <michael.hay@mediumroast.io>
 * @file baseObjects.js
 * @copyright 2025 Mediumroast, Inc. All rights reserved.
 * @license Apache-2.0
 * @version 3.0.0
 * 
 * @exports BaseObjects
 */

// Import required modules
import GitHub from '../github.js';
import { isEmpty, isArray, deepClone } from '../../utils/helpers.js';
import { CacheManager } from './cache.js';
import { logger } from './logger.js';
import { createHash } from 'crypto';
import { Octokit } from '@octokit/core';

// Create a singleton cache instance for shared caching
// const sharedCache = new CacheManager();

export class BaseObjects {
  /**
   * @constructor
   * @param {string} token - GitHub API token
   * @param {string} org - GitHub organization name
   * @param {string} processName - Process name for locking
   * @param {string} objType - Object type
   */
  constructor(token, org, processName, objType) {
    this.token = token;
    this.org = org;
    this.processName = processName;
    this.objType = objType || 'BaseObject';
    
    // Initialize GitHub API client
    this.serverCtl = new GitHub(this.token, this.org);
    
    // Initialize cache manager
    this.cache = new CacheManager();
    
    // Initialize cache keys - must do this before adding specialized keys
    this._cacheKeys = {
      all: `${this.objType}_all`,
      byName: `${this.objType}_by_name`,
      byAttribute: `${this.objType}_by_attribute`,
    };
    
    // Initialize cache timeouts
    this.cacheTimeouts = {
      all: 300000,      // 5 minutes for all objects
      byName: 300000,   // 5 minutes for specific objects
      byAttribute: 300000, // 5 minutes for attribute queries
    };
    
    // Define object file names for containers
    this.objectFiles = {
      Studies: 'studies.json',
      Companies: 'companies.json',
      Interactions: 'interactions.json',
      Users: 'users.json' // Add users even though GitHub API doesn't store it the same way
    };
    
    // Define field whitelists centrally
    this.whitelists = {
      Companies: [
        'description', 'company_type', 'url', 'role', 'wikipedia_url', 'status', 'logo_url',
        'region', 'country', 'city', 'state_province', 'zip_postal', 'street_address', 'latitude', 'longitude', 'phone',
        'google_maps_url', 'google_news_url', 'google_finance_url', 'google_patents_url',
        'cik', 'stock_symbol', 'stock_exchange', 'recent_10k_url', 'recent_10q_url', 'firmographic_url', 'filings_url', 'owner_tranasactions',
        'industry', 'industry_code', 'industry_group_code', 'industry_group_description', 'major_group_code', 'major_group_description'
      ],
      Interactions: [
        'status', 'content_type', 'file_size', 'reading_time', 'word_count', 'page_count', 'description', 'abstract',
        'region', 'country', 'city', 'state_province', 'zip_postal', 'street_address', 'latitude', 'longitude',
        'public', 'groups'
      ],
      Studies: [
        'description', 'status', 'public', 'groups'
      ]
    };
        
    // For transaction tracking
    this._transactionDepth = 0;
    
    // Set up cache key naming
    this._cacheKeys = {
      container: `container_${this.objType}`,
      search: `search_${this.objType}`,
      byName: `${this.objType}_byName`,
      byAttribute: `${this.objType}_byAttribute`
    };
    
    // Log initialization
    logger.debug(`Initialized ${objType} with org: ${org}`);
  }
    
  /**
   * Invalidate cache entries when data is modified
   * @private
   */
  _invalidateCache() {
    // Invalidate the main container cache which will cascade to all dependent caches
    this.cache.invalidate(this._cacheKeys.container);
    
    // Also forward to github.js cache invalidation if it exists
    if (this.serverCtl.invalidateCache) {
      this.serverCtl.invalidateCache(this._cacheKeys.container);
    }
    
    logger.debug(`Cache invalidated for ${this.objType}`);
  }
    
  /**
   * Creates a standardized error response
   * @private
   * @param {String} message - Error message
   * @param {Object} data - Error data
   * @param {Number} statusCode - HTTP status code
   * @returns {Array} Standardized error response
   */
  _createError(message, data = null, statusCode = 400) {
    logger.error(message, { data, statusCode });
    return [false, { status_code: statusCode, status_msg: message }, data];
  }
    
  /**
   * Creates a standardized success response
   * @private
   * @param {String} message - Success message
   * @param {Object} data - Response data
   * @param {Number} statusCode - HTTP status code
   * @returns {Array} Standardized success response
   */
  _createSuccess(message, data = null, statusCode = 200) {
    logger.debug(message);
    return [true, { status_code: statusCode, status_msg: message }, data];
  }
    
  /**
   * Creates a standardized warning response
   * @private
   * @param {String} message - Warning message
   * @param {Object} data - Response data
   * @param {Number} statusCode - HTTP status code
   * @returns {Array} Standardized warning response
   */
  _createWarning(message, data = null, statusCode = 200) {
    logger.warn(message, { data });
    return [true, { status_code: statusCode, status_msg: message }, data];
  }
    
  /**
   * Validates parameters against expected types
   * @private
   * @param {Object} params - Parameters to validate
   * @param {Object} expectedTypes - Expected types for each parameter
   * @returns {Array|null} Error response or null if valid
   */
  _validateParams(params, expectedTypes) {
    for (const [name, value] of Object.entries(params)) {
      const expectedType = expectedTypes[name];
      if (!expectedType) continue;
            
      if (expectedType === 'array') {
        if (!isArray(value)) {
          return this._createError(`Invalid parameter: [${name}] must be an array`, null, 400);
        }
      } else if (expectedType === 'object') {
        if (typeof value !== 'object' || value === null) {
          return this._createError(`Invalid parameter: [${name}] must be an object`, null, 400);
        }
      } else if (expectedType === 'string') {
        if (typeof value !== 'string' || isEmpty(value)) {
          return this._createError(`Invalid parameter: [${name}] must be a non-empty string`, null, 400);
        }
      } else if (expectedType === 'boolean' && typeof value !== 'boolean') {
        return this._createError(`Invalid parameter: [${name}] must be a boolean`, null, 400);
      }
    }
        
    return null; // No validation errors
  }
    
  /**
   * Executes a series of operations as a transaction
   * @private
   * @param {Array<Function>} operations - Array of async functions to execute
   * @param {String} transactionName - Name of the transaction for logging
   * @returns {Promise<Array>} Result of the transaction
   */
  async _executeTransaction(operations, transactionName) {
    this._transactionDepth++;
    const transactionId = `${transactionName}-${Date.now()}-${this._transactionDepth}`;
    let results = [];
    
    // Track the transaction
    const tracking = logger.trackTransaction ? 
      logger.trackTransaction(transactionName) : 
      { end: () => {} };
        
    try {
      for (let i = 0; i < operations.length; i++) {
        const operation = operations[i];
        const operationName = operation.name || `Step${i+1}`;
                
        try {
          // Pass accumulated data to each operation
          const result = await operation(i > 0 ? results[i-1][2] : null);
          results.push(result);
                    
          if (!result[0]) {
            // Operation failed, abort transaction
            return this._createError(
              `Transaction [${transactionName}] failed at step [${operationName}]: ${result[1].status_msg}`,
              { 
                transactionId,
                failedStep: operationName,
                stepResult: result,
                completedSteps: i
              },
              result[1].status_code || 500
            );
          }
        } catch (err) {
          return this._createError(
            `Transaction [${transactionName}] failed at step [${operationName}]: ${err.message}`,
            { 
              transactionId,
              failedStep: operationName,
              error: err,
              completedSteps: i
            },
            500
          );
        }
      }
            
      // All operations succeeded
      return this._createSuccess(
        `Transaction [${transactionName}] completed successfully`,
        results[results.length - 1][2]
      );
    } finally {
      this._transactionDepth--;
      tracking.end();
    }
  }
    
  /**
   * Enhanced search functionality with better filtering options
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Search options (limit, sort, etc)
   * @returns {Promise<Array>} Search results
   */
  async search(filters = {}, options = { limit: 0, sort: null, descending: false }) {
    // Create a cache key based on filters and options
    const filterKey = JSON.stringify(filters);
    const optionsKey = JSON.stringify(options);
    const cacheKey = `${this._cacheKeys.search}_${filterKey}_${optionsKey}`;
    
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'search') : 
      { end: () => {} };
    
    try {
      // Use the cache with dependencies to the container
      return await this.cache.getOrFetch(
        cacheKey,
        async () => {
          // Get all objects
          const allObjectsResp = await this.getAll();
          if (!allObjectsResp[0]) {
            return allObjectsResp;
          }
        
          const allObjects = allObjectsResp[2].mrJson;
          if (allObjects.length === 0) {
            return this._createError(
              `No ${this.objType} found`,
              null,
              404
            );
          }
        
          // Apply filters
          let results = [...allObjects];
          for (const [field, value] of Object.entries(filters)) {
            results = results.filter(obj => {
              if (field === 'name' && typeof value === 'string') {
                return obj.name.toLowerCase().includes(value.toLowerCase());
              }
              return obj[field] === value;
            });
          }
        
          // Apply sorting
          if (options.sort && results.length > 0) {
            const sortField = options.sort;
            results.sort((a, b) => {
              if (!a[sortField]) return 1;
              if (!b[sortField]) return -1;
                
              if (typeof a[sortField] === 'string') {
                return options.descending 
                  ? b[sortField].localeCompare(a[sortField])
                  : a[sortField].localeCompare(b[sortField]);
              }
                
              return options.descending 
                ? b[sortField] - a[sortField]
                : a[sortField] - b[sortField];
            });
          }
        
          // Apply limit
          if (options.limit > 0) {
            results = results.slice(0, options.limit);
          }
        
          return this._createSuccess(
            `Found ${results.length} ${this.objType}`,
            results
          );
        },
        this.cacheTimeouts[this.objType] || 60000,
        [this._cacheKeys.container] // This search depends on the container data
      );
    } finally {
      tracking.end();
    }
  }

  /**
   * @async
   * @function getAll
   * @description Get all objects from the mediumroast.io application
   * @returns {Array} the results from the called function mrRest class
   */
  async getAll() {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'getAll') : 
      { end: () => {} };
    
    try {
      // Use cache with the container key
      return await this.cache.getOrFetch(
        this._cacheKeys.container,
        () => this.serverCtl.readObjects(this.objType),
        this.cacheTimeouts[this.objType] || 60000,
        [] // No dependencies for the main container
      );
    } catch (error) {
      return this._createError(
        `Failed to retrieve ${this.objType}: ${error.message}`,
        error,
        500
      );
    } finally {
      tracking.end();
    }
  }

  /**
   * @async
   * @function findByName
   * @description Find all objects by name from the mediumroast.io application
   */
  async findByName(name) {
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'findByName') : 
      { end: () => {} };
    try {
      return await this.findByX('name', name);
    } finally {
      tracking.end();
    }
  }

  /**
   * @async
   * @function findById
   * @description Find all objects by id from the mediumroast.io application
   * @deprecated 
   */
  // eslint-disable-next-line no-unused-vars
  async findById(_id) {
    logger.warn?.('Method findById is deprecated');
    return this._createError('Method findById is deprecated', null, 410);
  }

  /**
   * @async
   * @function findByX
   * @description Find all objects by attribute and value pair
   */
  async findByX(attribute, value, allObjects=null) {
    // Create a cache key for this operation
    const cacheKey = `${this._cacheKeys.byAttribute}_${attribute}_${value}`;
    
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'findByX') : 
      { end: () => {} };
    
    try {
      // Validate parameters first before using cache
      const validationError = this._validateParams(
        { attribute, value },
        { attribute: 'string' }
      );
          
      if (validationError) return validationError;
      
      // Use cache with dependencies to the container
      return await this.cache.getOrFetch(
        cacheKey,
        async () => {
          // Convert name values to lowercase for case-insensitive matching
          if(attribute === 'name') {
            value = typeof value === 'string' ? value.toLowerCase() : value;
          }
              
          let myObjects = [];
              
          // If no objects provided, fetch them
          if(allObjects === null) {
            const allObjectsResp = await this.getAll();
            if (!allObjectsResp[0]) {
              return allObjectsResp;
            }
            allObjects = allObjectsResp[2].mrJson;
          }
              
          // If the length of allObjects is 0 then return an error
          if(allObjects.length === 0) {
            return this._createError(`No ${this.objType} found`, null, 404);
          }
              
          // Search for matching objects
          for(const obj in allObjects) {
            let currentObject;
            attribute == 'name' ? 
              currentObject = allObjects[obj][attribute]?.toLowerCase() : 
              currentObject = allObjects[obj][attribute];
                      
            if(currentObject === value) {
              myObjects.push(allObjects[obj]);
            }
          }
       
          if (myObjects.length === 0) { 
            return this._createError(
              `No ${this.objType} found where ${attribute} = ${value}`,
              null,
              404
            );
          } else {
            return this._createSuccess(
              `Found ${myObjects.length} objects where ${attribute} = ${value}`,
              myObjects
            );
          }
        },
        this.cacheTimeouts[this.objType] || 60000,
        [this._cacheKeys.container] // This operation depends on the container data
      );
    } finally {
      tracking.end();
    }
  }

  /**
   * @async
   * @function createObj
   * @description Create objects in the mediumroast.io application
   */
  async createObj(objs) {
    // Track this operation 
    logger.trackOperation(this.objType, 'createObj');
    
    // Validate parameters
    const validationError = this._validateParams(
      { objs },
      { objs: 'array' }
    );
        
    if (validationError) return validationError;

    // Use transaction pattern for safer operations
    return this._executeTransaction([
      // Step 1: Catch container
      async () => {
        let repoMetadata = {
          containers: {
            [this.objType]: {}
          },
          branch: {}
        };
        return await this.serverCtl.catchContainer(repoMetadata);
      },
            
      // Step 2: Get SHA
      async (data) => {
        return await this.serverCtl.getSha(
          this.objType, 
          this.objectFiles[this.objType], 
          data.branch.name
        );
      },
            
      // Step 3: Merge and write objects
      async (sha, data) => {
        // Append the new object to the existing objects
        const mergedObjects = [...data.containers[this.objType].objects, ...objs];
                
        // Write the new objects to the container
        return await this.serverCtl.writeObject(
          this.objType, 
          mergedObjects, 
          data.branch.name,
          sha
        );
      },
            
      // Step 4: Release container
      async (data) => {
        // Release the container
        const result = await this.serverCtl.releaseContainer(data);
                
        // Invalidate cache if successful
        if (result[0]) {
          this._invalidateCache();
        }
                
        return this._createSuccess(
          `Created [${objs.length}] ${this.objType}`,
          null
        );
      }
    ], `create-${this.objType}`);
  }
    
  /**
   * @async
   * @function updateObj
   * @description Update an object in the mediumroast.io application
   */
  async updateObj(objToUpdate, dontWrite=false, system=false) {
    // Track this operation 
    logger.trackOperation(this.objType, 'updateObj');
    
    // Extract object data
    const { name, key, value } = objToUpdate;
        
    // Validate parameters
    const validationError = this._validateParams(
      { name, key },
      { name: 'string', key: 'string' }
    );
        
    if (validationError) return validationError;
        
    // Get whitelist for this object type
    const whitelist = this.whitelists[this.objType] || [];
        
    // Use github.js updateObject with proper parameter sequence
    const result = await this.serverCtl.updateObject(
      this.objType, 
      name, 
      key, 
      value, 
      dontWrite, 
      system, 
      whitelist
    );
        
    // Invalidate cache if the update was successful
    if (result[0] && !dontWrite) {
      this._invalidateCache();
    }
        
    return result;
  }

  /**
   * @async
   * @function deleteObj
   * @description Delete an object in the mediumroast.io application
   */
  async deleteObj(objName, source, repoMetadata=null, catchIt=true) {
    // Track this operation 
    logger.trackOperation(this.objType, 'deleteObj');
    
    // Validate parameters
    const validationError = this._validateParams(
      { objName },
      { objName: 'string' }
    );
        
    if (validationError) return validationError;
        
    // Delegate to github.js
    const result = await this.serverCtl.deleteObject(
      objName, 
      source, 
      repoMetadata, 
      catchIt
    );
        
    // Invalidate cache if successful
    if (result[0]) {
      this._invalidateCache();
    }
        
    return result;
  }

  /**
   * Perform batch updates on multiple objects
   * @param {Array} updates - Array of update operations
   * @returns {Promise<Array>} Results of the update operations
   */
  async batchUpdate(updates) {
    // Track this operation 
    logger.trackOperation(this.objType, 'batchUpdate');
    
    // Validate parameters
    const validationError = this._validateParams(
      { updates },
      { updates: 'array' }
    );
        
    if (validationError) return validationError;
        
    // Get whitelist for this object type
    const whitelist = this.whitelists[this.objType] || [];
        
    // Create the repo metadata object for transaction
    let repoMetadata = {
      containers: {
        [this.objType]: {}
      },
      branch: {}
    };
        
    // Execute a transaction for batch updates
    return this._executeTransaction([
      // Step 1: Catch container
      async () => await this.serverCtl.catchContainer(repoMetadata),
            
      // Step 2: Get SHA
      async (data) => await this.serverCtl.getSha(
        this.objType,
        this.objectFiles[this.objType],
        data.branch.name
      ),
            
      // Step 3: Read objects
      async () => {
        return await this.serverCtl.readObjects(this.objType);
      },
            
      // Step 4: Apply all updates
      async (objects) => {
        // Make deep copy to prevent unintended side effects
        const updatedObjects = deepClone(objects.mrJson);
                
        for (const update of updates) {
          const { name, key, value, system = false } = update;
                    
          // Skip if missing required data
          if (isEmpty(name) || isEmpty(key)) continue;
                    
          // Skip unauthorized updates
          if (!system && whitelist.indexOf(key) === -1) continue;
                    
          // Find and update the object
          let found = false;
          for (const i in updatedObjects) {
            if (updatedObjects[i].name === name) {
              found = true;
              updatedObjects[i][key] = value;
              updatedObjects[i].modification_date = new Date().toISOString();
              break;
            }
          }
                    
          if (!found) {
            return this._createError(
              `Object with name [${name}] not found`,
              null,
              404
            );
          }
        }
                
        // Store updated objects for next step
        this._tempObjects = updatedObjects;
        return this._createSuccess('Applied all updates');
      },
            
      // Step 5: Write updated objects
      async (data) => await this.serverCtl.writeObject(
        this.objType,
        this._tempObjects,
        data.branch.name,
        data.containers[this.objType].objectSha
      ),
            
      // Step 6: Release container
      async (data) => {
        const result = await this.serverCtl.releaseContainer(data);
                
        // Invalidate cache if successful
        if (result[0]) {
          this._invalidateCache();
        }
                
        return this._createSuccess(
          `Updated [${updates.length}] objects in [${this.objType}]`
        );
      }
    ], `batch-update-${this.objType}`);
  }

  /**
   * @async
   * @function linkObj
   * @description Link objects in the mediumroast.io application
   */
  linkObj(objs) {
    // Track this operation 
    logger.trackOperation(this.objType, 'linkObj');
    
    // Validate parameters
    const validationError = this._validateParams(
      { objs },
      { objs: 'array' }
    );
        
    if (validationError) return validationError;
        
    let linkedObjs = {};
    for(const obj in objs) {
      const objName = objs[obj].name;
      const sha256Hash = createHash('sha256').update(objName).digest('hex');
      linkedObjs[objName] = sha256Hash;
    }
    return linkedObjs;
  }

  /**
   * Check if a container is locked
   * @returns {Promise<Array>} Lock status
   */
  async checkForLock() {
    // Track this operation 
    logger.trackOperation(this.objType, 'checkForLock');
    return await this.serverCtl.checkForLock(this.objType);
  }

  /**
   * Get the latest commit status for a branch
   * @param {string} branchName - Name of branch to check (default: 'main')
   * @param {string} repo - Name of the repository (default: 'Megaroast_discovery')
   * @returns {Promise<Array>} Latest commit information
   */
  async getBranchStatus(branchName = 'main', repo = 'MegaRoast_discovery') {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'getBranchStatus') : 
      { end: () => {} };
    
    try {
      // Create a cache key based on branch and repo
      const cacheKey = `branch_status_${repo}_${branchName}`;
      
      // Use cache with a short timeout since this is used for freshness checks
      return await this.cache.getOrFetch(
        cacheKey,
        async () => {
          try {
            // Initialize Octokit with the token
            const octokit = new Octokit({ 
              auth: this.token 
            });
            
            // Make GitHub API request using Octokit
            const response = await octokit.request('GET /repos/{owner}/{repo}/commits', {
              owner: this.org,
              repo: repo,
              sha: branchName,
              per_page: 1,
              headers: {
                'X-GitHub-Api-Version': '2022-11-28'
              }
            });
            
            if (response.data.length === 0) {
              return this._createError(
                `No commits found in branch '${branchName}'`,
                { branchName, repo },
                404
              );
            }
            
            // Format the response to include useful information
            const latestCommit = response.data[0];
            const branchStatus = {
              sha: latestCommit.sha,
              commit: {
                message: latestCommit.commit.message,
                author: latestCommit.commit.author,
                committer: latestCommit.commit.committer
              },
              html_url: latestCommit.html_url,
              timestamp: latestCommit.commit.committer.date,
              branch: branchName,
              repository: repo
            };
            
            return this._createSuccess(
              `Retrieved latest commit for branch '${branchName}'`,
              branchStatus
            );
          } catch (error) {
            // Check for specific Octokit error types
            if (error.status === 404) {
              return this._createError(
                `Repository or branch not found: ${this.org}/${repo}/${branchName}`,
                error,
                404
              );
            } else if (error.status === 401 || error.status === 403) {
              return this._createError(
                `Authentication error accessing ${this.org}/${repo}/${branchName}`,
                error,
                error.status
              );
            }
            
            // General error handling
            return this._createError(
              `Failed to get branch status: ${error.message}`,
              error,
              error.status || 500
            );
          }
        },
        60000, // Cache for 1 minute
        [] // No dependencies
      );
    } catch (error) {
      return this._createError(
        `Failed to get branch status: ${error.message}`,
        error,
        500
      );
    } finally {
      tracking.end();
    }
  }

  /**
   * Check if the branch has been updated since a specific commit
   * @param {string} lastKnownCommitSha - The last known commit SHA
   * @param {string} branchName - Name of the branch to check (default: 'main')
   * @param {string} repo - Name of the repository (default: 'MegaRoast_discovery')
   * @returns {Promise<Array>} Status indicating if an update is needed
   */
  async checkForUpdates(lastKnownCommitSha, branchName = 'main', repo = 'MegaRoast_discovery') {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'checkForUpdates') : 
      { end: () => {} };
      
    try {
      // Validate parameters
      if (!lastKnownCommitSha) {
        return this._createError(
          'Missing required parameter: lastKnownCommitSha',
          null,
          400
        );
      }
        
      // Get current branch status
      const statusResult = await this.getBranchStatus(branchName, repo);
      if (!statusResult[0]) {
        return statusResult; // Return error from getBranchStatus
      }
        
      const currentCommitSha = statusResult[2].sha;
      const updateNeeded = currentCommitSha !== lastKnownCommitSha;
        
      // Create response with update status
      return this._createSuccess(
        updateNeeded ? 
          `Repository has been updated since commit ${lastKnownCommitSha.substring(0, 7)}` : 
          'Repository is up to date',
        {
          updateNeeded,
          lastKnownCommitSha,
          currentCommitSha,
          repository: repo,
          branch: branchName,
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      return this._createError(
        `Failed to check for updates: ${error.message}`,
        error,
        500
      );
    } finally {
      tracking.end();
    }
  }
}