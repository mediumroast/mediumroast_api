/**
 * @fileoverview A class that safely wraps RESTful calls to the GitHub API
 * @license Apache-2.0
 * @version 3.0.0
 * 
 * @author Michael Hay <michael.hay@mediumroast.io>
 * @file github.js
 * @copyright 2025 Mediumroast, Inc. All rights reserved.
 * 
 * @class GitHubFunctions
 * @classdesc Core functions needed to interact with the GitHub API for mediumroast.io.
 * 
 * @requires octokit
 * 
 * @exports GitHubFunctions
 * 
 * @example
 * const gitHubCtl = new GitHubFunctions(accessToken, myOrgName, 'mr-cli-setup')
 * const createRepoResp = await gitHubCtl.createRepository()
 */

import { Octokit } from 'octokit';

// Import refactored modules
import ResponseFactory from './github/response.js';
import ContainerOperations from './github/container.js';
import RepositoryManager from './github/repository.js';
import UserManager from './github/user.js';
import BillingManager from './github/billing.js';
import BranchManager from './github/branch.js';
import { encodeContent, decodeJsonContent, customEncodeURIComponent } from './github/utils.js';
import { isEmpty, isArray, deepClone, mergeObjects, formatDate } from '../utils/helpers.js';

class GitHubFunctions {
  /**
     * @constructor
     * @classdesc Core functions needed to interact with the GitHub API for mediumroast.io.
     * @param {String} token - the GitHub token for the mediumroast.io application
     * @param {String} org - the GitHub organization for the mediumroast.io application
     * @param {String} processName - the name of the process that is using the GitHub API
     * @memberof GitHubFunctions
    */
  constructor(token, org, processName) {
    this.token = token;
    this.orgName = org;
    this.repoName = `${org}_discovery`;
    this.repoDesc = 'A repository for all of the mediumroast.io application assets.';
    this.octCtl = new Octokit({auth: token});
    this.lockFileName = `${processName}.lock`;
    this.mainBranchName = 'main';
    this.objectFiles = {
      Studies: 'Studies.json',
      Companies: 'Companies.json',
      Interactions: 'Interactions.json',
      Users: null,
      Billings: null
    };

    // Initialize our specialized managers
    this.repositoryManager = new RepositoryManager(
      this.octCtl, 
      this.orgName, 
      this.repoName, 
      this.repoDesc,
      this.mainBranchName
    );
        
    this.containerOps = new ContainerOperations(
      this.octCtl,
      this.orgName,
      this.repoName,
      this.mainBranchName,
      this.lockFileName
    );
        
    this.userManager = new UserManager(
      this.octCtl,
      this.orgName, 
      this.repoName
    );
        
    this.billingManager = new BillingManager(
      this.octCtl,
      this.orgName
    );
        
    this.branchManager = new BranchManager(
      this.octCtl,
      this.orgName,
      this.repoName,
      this.mainBranchName
    );

    // Add field map for cross-references as a class property 
    this.fieldMap = {
      Interactions: {
        Companies: 'linked_interactions'
      },
      Companies: {
        Interactions: 'linked_companies'
      },
      Studies: {
        Interactions: 'linked_studies',
        Companies: 'linked_studies'
      }
    };

    // Add a cache for frequently used data
    this._cache = new Map();
    this._defaultTtl = 60000; // 1 minute default TTL

    // Add transaction tracking for complex operations
    this._transactionDepth = 0;
  }

  /**
     * Gets or sets a value in the cache
     * @private
     * @param {String} key - Cache key
     * @param {Function} fetchFn - Function to fetch data if not in cache
     * @param {Number} ttlMs - Time to live in milliseconds
     * @returns {Promise<Array>} Cached or freshly fetched data
     */
  async _getCachedOrFetch(key, fetchFn, ttlMs = this._defaultTtl) {
    const now = Date.now();
    const cached = this._cache.get(key);
        
    // Return cached data if valid
    if (cached && (now - cached.timestamp < ttlMs)) {
      return cached.data;
    }
        
    // Otherwise fetch fresh data
    const result = await fetchFn();
        
    // Only cache successful responses
    if (result[0]) {
      this._cache.set(key, {
        timestamp: now,
        data: result
      });
    }
        
    return result;
  }
    
  /**
     * Invalidate a specific cache entry or the entire cache
     * @param {String} [key] - Optional key to invalidate specific entry
     */
  invalidateCache(key = null) {
    if (key === null) {
      this._cache.clear();
    } else {
      this._cache.delete(key);
    }
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
          return ResponseFactory.error(
            `Invalid parameter: [${name}] must be an array`,
            null,
            400
          );
        }
      } else if (expectedType === 'object') {
        if (typeof value !== 'object' || value === null) {
          return ResponseFactory.error(
            `Invalid parameter: [${name}] must be an object`,
            null,
            400
          );
        }
      } else if (expectedType === 'string') {
        if (typeof value !== 'string' || isEmpty(value)) {
          return ResponseFactory.error(
            `Invalid parameter: [${name}] must be a non-empty string`,
            null,
            400
          );
        }
      } else if (expectedType === 'boolean') {
        if (typeof value !== 'boolean') {
          return ResponseFactory.error(
            `Invalid parameter: [${name}] must be a boolean`,
            null,
            400
          );
        }
      } else if (expectedType === 'number') {
        if (typeof value !== 'number') {
          return ResponseFactory.error(
            `Invalid parameter: [${name}] must be a number`,
            null,
            400
          );
        }
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
        
    try {
      const results = [];
      for (let i = 0; i < operations.length; i++) {
        const operation = operations[i];
        const operationName = operation.name || `Step${i+1}`;
                
        try {
          const result = await operation();
          results.push(result);
                    
          if (!result[0]) {
            // Operation failed, abort transaction
            return ResponseFactory.error(
              `Transaction [${transactionName}] failed at step [${operationName}]: ${result[1]}`,
              { 
                transactionId,
                failedStep: operationName,
                stepResult: result,
                completedSteps: i
              },
              result[3] || 500
            );
          }
        } catch (err) {
          return ResponseFactory.error(
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
      return ResponseFactory.success(
        `Transaction [${transactionName}] completed successfully`,
        results[results.length - 1][2],
        200
      );
    } finally {
      this._transactionDepth--;
    }
  }

  /**
     * @async
     * @function getSha
     * @description Gets the SHA of a file in a container on a branch
     * @param {String} containerName - the name of the container to get the SHA from
     * @param {String} fileName - the short name of the file to get the SHA from
     * @param {String} branchName - the name of the branch to get the SHA from
     * @returns {Array} An array with position 0 being boolean to signify success/failure, position 1 being the response or error message, and position 2 being the SHA. 
     * @memberof GitHubFunctions
     */
  async getSha(containerName, fileName, branchName) {
    if (isEmpty(containerName) || isEmpty(fileName) || isEmpty(branchName)) {
      return ResponseFactory.error(
        `Missing required parameters: [containerName=${containerName}], [fileName=${fileName}], [branchName=${branchName}]`, 
        null, 
        400
      );
    }
        
    const safePath = `${containerName}/${customEncodeURIComponent(fileName)}`;
    return this.repositoryManager.getSha(safePath, branchName);
  }

  /**
     * @async 
     * @function getUser
     * @description Gets the authenticated user from the GitHub API
     * @returns {Array} An array with position 0 being boolean to signify success/failure and position 1 being the user info or error message.
     */
  async getUser() {
    // User data typically stable during a session
    return this._getCachedOrFetch(
      'current_user',
      () => this.userManager.getCurrentUser(),
      300000 // 5 minutes
    );
  }

  /**
     * @async
     * @function getAllUsers
     * @description Gets all of the users from the GitHub API
     * @returns {Array} An array with position 0 being boolean to signify success/failure and position 1 being the user info or error message.
     */
  async getAllUsers() {
    // User list changes infrequently - 2 minute cache
    return this._getCachedOrFetch(
      'all_users',
      () => this.userManager.getAllUsers(),
      120000 // 2 minutes
    );
  }

  /**
     * @async
     * @function getActionsBillings
     * @description Gets the complete billing status for actions from the GitHub API
     * @returns {Array} An array with position 0 being boolean to signify success/failure and position 1 being the user info or error message.
     */
  async getActionsBillings() {
    return this.billingManager.getActionsBillings();
  }

  /**
     * @async
     * @function getStorageBillings
     * @description Gets the complete billing status for actions from the GitHub API
     * @returns {Array} An array with position 0 being boolean to signify success/failure and position 1 being the user info or error message.
     */
  async getStorageBillings() {
    return this.billingManager.getStorageBillings();
  }

  /**
     * @function createRepository
     * @description Creates a repository, at the organization level, for keeping track of all mediumroast.io assets
     * @returns {Array} An array with position 0 being boolean to signify success/failure and position 1 being the created repo or error message.
     */
  async createRepository() {
    return this.repositoryManager.createRepository();
  }

  /**
     * @function getGitHubOrg
     * @description If the GitHub organization exists retrieves the detail about it and returns to the caller
     * @returns {Array} An array with position 0 being boolean to signify success/failure and position 1 being the org or error message.
     */
  async getGitHubOrg() {
    // Organization data changes rarely - 5 minute cache
    return this._getCachedOrFetch(
      'org_data',
      () => this.repositoryManager.getOrganization(),
      300000 // 5 minutes
    );
  }

  /**
     * @async
     * @function getWorkflowRuns
     * @description Gets all of the workflow runs for the repository
     * @returns {Array} An array with position 0 being boolean to signify success/failure and position 1 being the response or error message.
     */
  async getWorkflowRuns() {
    // Workflow runs change more frequently - shorter cache
    return this._getCachedOrFetch(
      'workflow_runs',
      () => this.repositoryManager.getWorkflowRuns(),
      30000 // 30 seconds
    );
  }

  /**
     * @async
     * @function getRepoSize
     * @description Gets the size of the repository in MB
     * @returns {Array} An array with position 0 being boolean to signify success/failure and position 1 being the response or error message.
     */
  async getRepoSize() {
    // Repo size changes slowly - 1 minute cache
    return this._getCachedOrFetch(
      'repo_size',
      () => this.repositoryManager.getRepoSize(),
      60000 // 1 minute
    );
  }

  /**
     * @function createContainers
     * @description Creates the top level Study, Company and Interaction containers for all mediumroast.io assets
     * @returns {Array} An array with position 0 being boolean to signify success/failure and position 1 being the responses or error messages.
     */
  async createContainers(containers = ['Studies', 'Companies', 'Interactions']) {
    if (!isArray(containers)) {
      return ResponseFactory.error(
        'Invalid parameter: [containers] must be an array', 
        null, 
        400
      );
    }
        
    return this.repositoryManager.createContainers(containers);
  }

  /**
     * @description Creates a new branch from the main branch.
     * @function createBranchFromMain
     * @async
     * @returns {Promise<Array>} A promise that resolves to an array containing a boolean indicating success, a message, and the response.
     */
  async createBranchFromMain() {
    return this.branchManager.createBranchFromMain();
  }

  /**
     * @description Merges a specified branch into the main branch by creating a pull request.
     * @function mergeBranchToMain
     * @async
     * @param {string} branchName - The name of the branch to merge into main.
     * @param {string} mySha - The SHA of the commit to use as the head of the pull request.
     * @param {string} [commitDescription='Performed CRUD operation on objects.'] - The description of the commit.
     * @returns {Promise<Array>} A promise that resolves to an array containing success status, message, and response.
     */
  async mergeBranchToMain(branchName, mySha, commitDescription='Performed CRUD operation on objects.') {
    if (isEmpty(branchName)) {
      return ResponseFactory.error(
        'Missing required parameter: [branchName]', 
        null, 
        400
      );
    }
        
    return this.branchManager.mergeBranchToMain(branchName, mySha, commitDescription);
  }

  /**
     * @description Checks to see if a container is locked.
     * @function checkForLock
     * @async
     * @param {string} containerName - The name of the container to check for a lock.
     * @returns {Promise<Array>} A promise that resolves to an array containing status and message.
     */
  async checkForLock(containerName) {
    if (isEmpty(containerName)) {
      return ResponseFactory.error(
        'Missing required parameter: [containerName]', 
        null, 
        400
      );
    }
        
    return this.containerOps.checkForLock(containerName);
  }

  /**
     * @description Locks a container by creating a lock file in the container.
     * @function lockContainer
     * @async
     * @param {string} containerName - The name of the container to lock.
     * @returns {Promise<Array>} A promise that resolves to an array containing status and message.
     */
  async lockContainer(containerName) {
    if (isEmpty(containerName)) {
      return ResponseFactory.error(
        'Missing required parameter: [containerName]', 
        null, 
        400
      );
    }
        
    return this.containerOps.lockContainer(containerName);
  }

  /**
     * @description Unlocks a container by deleting the lock file in the container.
     * @function unlockContainer
     * @async
     * @param {string} containerName - The name of the container to unlock.
     * @param {string} commitSha - The SHA of the commit to use as the head of the pull request.
     * @param {string} branchName - The name of the branch to unlock the container on.
     * @returns {Promise<Array>} A promise that resolves to an array containing status and message.
     */
  async unlockContainer(containerName, commitSha, branchName = this.mainBranchName) {
    if (isEmpty(containerName) || isEmpty(commitSha)) {
      return ResponseFactory.error(
        `Missing required parameters: [containerName=${containerName}], [commitSha=${commitSha}]`, 
        null, 
        400
      );
    }
        
    return this.containerOps.unlockContainer(containerName, commitSha, branchName);
  }

  /**
     * Read a blob (file) from a container (directory) in a specific branch.
     * @param {string} fileName - The name of the blob to read with a complete path to the file.
     * @returns {Array} A list containing success status, message, and the blob's raw data.
     */
  async readBlob(fileName) {
    if (isEmpty(fileName)) {
      return ResponseFactory.error(
        'Missing required parameter: [fileName]', 
        null, 
        400
      );
    }
        
    // Create an enhanced repository manager method that handles decoding
    return this.repositoryManager.readBlobWithDecoding(
      customEncodeURIComponent(fileName), 
      this.token
    );
  }

  /**
     * Delete a blob (file) from a container (directory)
     * @param {string} containerName - The container name
     * @param {string} fileName - The file name
     * @param {string} branchName - The branch name
     * @param {string} sha - The SHA of the file
     * @returns {Array} A list containing success status, message, and response
     */
  async deleteBlob(containerName, fileName, branchName, sha) {
    if (isEmpty(containerName) || isEmpty(fileName) || isEmpty(branchName) || isEmpty(sha)) {
      return ResponseFactory.error(
        `Missing required parameters: [containerName=${containerName}], [fileName=${fileName}], [branchName=${branchName}], [sha=${sha}]`, 
        null, 
        400
      );
    }
        
    const safePath = `${containerName}/${customEncodeURIComponent(fileName)}`;
    return this.repositoryManager.deleteBlob(safePath, branchName, sha);
  }

  /**
     * Write a blob (file) to a container (directory)
     * @param {string} containerName - The container name
     * @param {string} fileName - The file name
     * @param {string} blob - The blob to write
     * @param {string} branchName - The branch name
     * @param {string} sha - The SHA of the file if updating
     * @returns {Array} A list containing success status, message, and response
     */
  async writeBlob(containerName, fileName, blob, branchName, sha) {
    if (isEmpty(containerName) || isEmpty(fileName) || isEmpty(branchName)) {
      return ResponseFactory.error(
        `Missing required parameters: [containerName=${containerName}], [fileName=${fileName}], [branchName=${branchName}]`, 
        null, 
        400
      );
    }
        
    const encodedContent = typeof blob === 'string' ? encodeContent(blob) : blob;
        
    return this.repositoryManager.writeBlob(
      containerName, 
      customEncodeURIComponent(fileName), 
      encodedContent, 
      branchName, 
      sha
    );
  }

  /**
     * @function writeObject
     * @description Writes an object to a specified container using the GitHub API.
     * @async
     * @param {string} containerName - The name of the container to write the object to.
     * @param {object} obj - The object to write to the container.
     * @param {string} ref - The reference to use when writing the object.
     * @param {string} mySha - The SHA of the current file if updating.
     * @returns {Promise<Array>} Status, message, and response
     */
  async writeObject(containerName, obj, ref, mySha) {
    // Invalidate relevant caches on write
    this.invalidateCache('repo_size');
    this.invalidateCache(`container_${containerName}`);
        
    if (isEmpty(containerName) || obj === null || isEmpty(ref)) {
      return ResponseFactory.error(
        `Missing required parameters: [containerName=${containerName}], [obj=${obj !== null ? 'present' : 'null'}], [ref=${ref}]`, 
        null, 
        400
      );
    }
        
    const content = encodeContent(obj);
        
    return this.repositoryManager.writeBlob(
      containerName,
      this.objectFiles[containerName],
      content,
      ref,
      mySha
    );
  }

  /**
     * @function readObjects
     * @description Reads objects from a specified container using the GitHub API.
     * @async
     * @param {string} containerName - The name of the container to read objects from.
     * @returns {Promise<Array>} Status, message, and contents
     */
  async readObjects(containerName) {
    if (isEmpty(containerName) || isEmpty(this.objectFiles[containerName])) {
      return ResponseFactory.error(
        `Invalid container name or no object file defined for ${containerName}`, 
        null, 
        400
      );
    }
        
    const path = `${containerName}/${this.objectFiles[containerName]}`;
    const result = await this.repositoryManager.getContent(
      path, 
      this.mainBranchName
    );

    if (!result[0]) {
      return result;
    }

    const jsonContent = decodeJsonContent(result[2].content);
        
    if (jsonContent === null) {
      return ResponseFactory.error(`Unable to parse [${path}] as JSON`, new Error('JSON parse error'));
    }
        
    result[2].mrJson = jsonContent;
    return result;
  }

  /**
     * @function updateObject
     * @description Updates an object in a specified container
     * @async
     * @param {string} containerName - The name of the container containing the object
     * @param {string} objName - The name of the object to update
     * @param {string} key - The key of the object to update
     * @param {string} value - The value to update the key with
     * @param {boolean} [dontWrite=false] - A flag to indicate if the object should be written back
     * @param {boolean} [system=false] - A flag to indicate if the update is a system call
     * @param {Array} [whiteList=[]] - A list of keys that are allowed to be updated
     * @returns {Promise<Array>} Status, message, and response
     */
  async updateObject(containerName, objName, key, value, dontWrite=false, system=false, whiteList=[]) {
    // Validate parameters using the new validation method
    const validationError = this._validateParams(
      { containerName, objName, key, dontWrite, system, whiteList },
      { 
        containerName: 'string', 
        objName: 'string', 
        key: 'string',
        dontWrite: 'boolean',
        system: 'boolean',
        whiteList: 'array'
      }
    );
        
    if (validationError) return validationError;
        
    // Authorization check
    if (!system && !whiteList.includes(key)) {
      return ResponseFactory.error(
        `Unauthorized operation: Updating the key [${key}] is not supported`,
        null,
        403
      );
    }

    // Use transaction pattern for the complex update operation
    return this._executeTransaction([
      // Step 1: Read the objects
      async () => {
        const readResponse = await this.readObjects(containerName);
        if (!readResponse[0]) {
          return ResponseFactory.error(
            `Unable to read source objects from [${containerName}]`,
            readResponse[2],
            500
          );
        }
                
        // Store the read response for next steps
        this._tempReadResponse = readResponse;
        return readResponse;
      },
            
      // Step 2: Catch the container if needed
      async () => {
        if (dontWrite) {
          return ResponseFactory.success(
            'Skipping container locking for read-only update',
            null
          );
        }
                
        const repoMetadata = {containers: {}, branch: {}};
        repoMetadata.containers[containerName] = {};
        const caught = await this.catchContainer(repoMetadata);
                
        // Store the caught data for next steps
        this._tempCaught = caught;
        return caught;
      },
            
      // Step 3: Update the object
      async () => {
        const objectsCopy = deepClone(this._tempReadResponse[2].mrJson);
        let objectFound = false;
                
        for (const obj in objectsCopy) {
          if (objectsCopy[obj].name === objName) {
            objectFound = true;
            const updates = { 
              [key]: value,
              modification_date: formatDate(new Date())
            };
            objectsCopy[obj] = mergeObjects(objectsCopy[obj], updates);
          }
        }
                
        if (!objectFound) {
          return ResponseFactory.error(
            `Object with name [${objName}] not found in [${containerName}]`,
            null,
            404
          );
        }
                
        // Store updated objects for next steps
        this._tempUpdatedObjects = objectsCopy;
                
        if (dontWrite) {
          return ResponseFactory.success(
            `Merged updates object(s) with [${containerName}] objects`,
            objectsCopy
          );
        }
                
        return ResponseFactory.success('Object updated in memory', objectsCopy);
      },
            
      // Step 4: Write the objects (if not dontWrite)
      async () => {
        if (dontWrite) {
          return ResponseFactory.success(
            'Skipping writing for read-only update',
            this._tempUpdatedObjects
          );
        }
                
        const writeResponse = await this.writeObject(
          containerName, 
          this._tempUpdatedObjects, 
          this._tempCaught[2].branch.name,
          this._tempCaught[2].containers[containerName].objectSha
        );
                
        return writeResponse;
      },
            
      // Step 5: Release the container (if not dontWrite)
      async () => {
        if (dontWrite) {
          return ResponseFactory.success(
            'Skipping container release for read-only update',
            this._tempUpdatedObjects
          );
        }
                
        return this.releaseContainer(this._tempCaught[2]);
      }
    ], `update-object-${containerName}-${objName}`);
  }

  /**
     * @function deleteObject
     * @description Deletes an object from a specified container
     * @async
     * @param {string} objName - The name of the object to delete
     * @param {object} source - The source object that contains the from and to containers
     * @param {object} repoMetadata - The repository metadata
     * @param {boolean} catchIt - Whether to catch the container
     * @returns {Promise<Array>} Status, message, and response
     */
  async deleteObject(objName, source, repoMetadata=null, catchIt=true) {
    // Validate parameters
    const validationError = this._validateParams(
      { objName, source, catchIt },
      { 
        objName: 'string',
        source: 'object',
        catchIt: 'boolean'
      }
    );
        
    if (validationError) return validationError;
        
    // Additional validation for source object
    if (isEmpty(source.from) || !isArray(source.to) || source.to.length === 0) {
      return ResponseFactory.error(
        'Invalid source configuration: [from] must be a non-empty string and [to] must be a non-empty array',
        null,
        400
      );
    }
        
    // Define transaction steps
    const deleteSteps = [];
        
    // Step 1: Catch container if needed
    if (catchIt) {
      deleteSteps.push(async () => {
        const metadata = {containers: {}, branch: {}};
        metadata.containers[source.from] = {};
        metadata.containers[source.to[0]] = {};
        const caught = await this.catchContainer(metadata);
                
        // Store for later steps
        this._tempRepoMetadata = deepClone(caught[2]);
        return caught;
      });
    } else {
      deleteSteps.push(async () => {
        this._tempRepoMetadata = repoMetadata;
        return ResponseFactory.success('Using provided repository metadata', repoMetadata);
      });
    }
        
    // Step 2: Find and delete the object
    deleteSteps.push(async () => {
      let objectFound = false;
      for (const obj in this._tempRepoMetadata.containers[source.from].objects) {
        if (this._tempRepoMetadata.containers[source.from].objects[obj].name === objName) {
          objectFound = true;
                    
          // For Interactions, delete the actual file
          if (source.from === 'Interactions') {
            const fileName = this._tempRepoMetadata.containers[source.from].objects[obj].url;
                        
            try {
              const { data } = await this.octCtl.rest.repos.getContent({
                owner: this.orgName,
                repo: this.repoName,
                path: customEncodeURIComponent(fileName)
              });
                            
              const fileBits = fileName.split('/');
              const shortFilename = fileBits[fileBits.length - 1];
                            
              const deleteResponse = await this.deleteBlob(
                source.from, 
                shortFilename, 
                this._tempRepoMetadata.branch.name,
                data.sha
              );
                            
              if (!deleteResponse[0]) {
                return deleteResponse; // Transaction will abort
              }
            } catch (err) {
              return ResponseFactory.error(
                `Failed to get content for [${fileName}]: ${err.message}`,
                err,
                503
              );
            }
          }
                    
          // Remove the object from the array
          this._tempRepoMetadata.containers[source.from].objects.splice(obj, 1);
          break;
        }
      }
            
      if (!objectFound) {
        return ResponseFactory.error(
          `Object with name [${objName}] not found in [${source.from}]`,
          null,
          404
        );
      }
            
      return ResponseFactory.success(`Found and removed object [${objName}]`, null);
    });
        
    // Step 3: Update references in linked objects
    deleteSteps.push(async () => {
      for (const obj in this._tempRepoMetadata.containers[source.to[0]].objects) {
        if (this._tempRepoMetadata.containers[source.to[0]].objects[obj][this.fieldMap[source.from][source.to[0]]] && 
                    objName in this._tempRepoMetadata.containers[source.to[0]].objects[obj][this.fieldMap[source.from][source.to[0]]]) {
                    
          delete this._tempRepoMetadata.containers[source.to[0]].objects[obj][this.fieldMap[source.from][source.to[0]]][objName];
                    
          // Update modification date using the helper function
          this._tempRepoMetadata.containers[source.to[0]].objects[obj].modification_date = formatDate(new Date());
        }
      }
            
      return ResponseFactory.success('Updated cross-references', null);
    });
        
    // Add steps for writing changes
    deleteSteps.push(
      // Step 4: Write source container
      async () => {
        const fromSha = await this.getSha(source.from, this.objectFiles[source.from], this._tempRepoMetadata.branch.name);
        if (!fromSha[0]) {
          return fromSha; // Transaction will abort
        }
                
        return this.writeObject(
          source.from, 
          this._tempRepoMetadata.containers[source.from].objects, 
          this._tempRepoMetadata.branch.name,
          fromSha[2]
        );
      },
            
      // Step 5: Write target container
      async () => {
        const toSha = await this.getSha(source.to[0], this.objectFiles[source.to[0]], this._tempRepoMetadata.branch.name);
        if (!toSha[0]) {
          return toSha; // Transaction will abort
        }
                
        return this.writeObject(
          source.to[0], 
          this._tempRepoMetadata.containers[source.to[0]].objects, 
          this._tempRepoMetadata.branch.name,
          toSha[2]
        );
      }
    );
        
    // Step 6: Release container if needed
    if (catchIt) {
      deleteSteps.push(async () => {
        return this.releaseContainer(this._tempRepoMetadata);
      });
    } else {
      deleteSteps.push(async () => {
        return ResponseFactory.success(
          `Deleted [${source.from}] object of the name [${objName}] without releasing container`,
          null
        );
      });
    }
        
    // Execute the delete transaction
    return this._executeTransaction(deleteSteps, `delete-object-${source.from}-${objName}`);
  }

  /**
     * @function catchContainer
     * @description Catches a container by locking it, creating a new branch, reading the objects
     * @param {Object} repoMetadata - The metadata object
     * @returns {Promise<Array>} Status, message, and metadata
     */
  async catchContainer(repoMetadata) {
    if (!repoMetadata || !repoMetadata.containers || Object.keys(repoMetadata.containers).length === 0) {
      return ResponseFactory.error(
        'Invalid parameter: [repoMetadata] must contain containers property with at least one container', 
        null, 
        400
      );
    }
        
    return this.containerOps.catchContainers(
      repoMetadata,
      this.objectFiles,
      () => this.branchManager.createBranchFromMain(),
      (container) => this.readObjects(container)
    );
  }

  /**
     * @function releaseContainer
     * @description Releases a container by unlocking it and merging the branch
     * @param {Object} repoMetadata - The metadata object
     * @returns {Promise<Array>} Status, message, and response
     */
  async releaseContainer(repoMetadata) {
    if (!repoMetadata || !repoMetadata.containers || !repoMetadata.branch) {
      return ResponseFactory.error(
        'Invalid parameter: [repoMetadata] must contain containers and branch information', 
        null, 
        400
      );
    }
        
    return this.containerOps.releaseContainers(
      repoMetadata,
      (branchName, branchSha) => this.branchManager.mergeBranchToMain(branchName, branchSha)
    );
  }
}

export default GitHubFunctions;