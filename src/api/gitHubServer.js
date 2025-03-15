/**
 * A class for authenticating and talking to the mediumroast.io backend 
 * @author Michael Hay <michael.hay@mediumroast.io>
 * @file gitHubServer.js
 * @copyright 2024 Mediumroast, Inc. All rights reserved.
 * @license Apache-2.0
 * @version 3.0.0
 * 
 * @exports {Studies, Companies, Interactions, Users, Storage, Actions}
 */

// Import required modules
import GitHubFunctions from './github.js';
import { createHash } from 'crypto';
import fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { isEmpty, isArray, deepClone } from '../utils/helpers.js';

class baseObjects {
  constructor(token, org, processName, objType) {
    this.serverCtl = new GitHubFunctions(token, org, processName);
    this.objType = objType;
    this.objectFiles = {
      Studies: 'Studies.json',
      Companies: 'Companies.json',
      Interactions: 'Interactions.json',
      Users: null
    };
        
    // Define cache timeout configurations based on entity type
    this.cacheTimeouts = {
      Studies: 300000,     // 5 minutes for relatively static data
      Companies: 300000,   // 5 minutes
      Interactions: 180000, // 3 minutes as these may change more frequently
      Users: 600000,       // 10 minutes as user data rarely changes
      Actions: 60000,      // 1 minute as actions data changes frequently
      Storage: 180000      // 3 minutes
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
  }
    
  /**
     * Invalidate cache entries when data is modified
     * @private
     */
  _invalidateCache() {
    // Force github.js to invalidate its cache for this object type
    if (this.serverCtl.invalidateCache) {
      this.serverCtl.invalidateCache(`container_${this.objType}`);
    }
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
    }
  }
    
  /**
     * Enhanced search functionality with better filtering options
     * @param {Object} filters - Filter criteria
     * @param {Object} options - Search options (limit, sort, etc)
     * @returns {Promise<Array>} Search results
     */
  async search(filters = {}, options = { limit: 0, sort: null, descending: false }) {
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
  }

  /**
     * @async
     * @function getAll
     * @description Get all objects from the mediumroast.io application
     * @returns {Array} the results from the called function mrRest class
     */
  async getAll() {
    // Use built-in caching in github.js
    const result = await this.serverCtl.readObjects(this.objType);
        
    // Standardize error response if needed
    if (!result[0]) {
      return this._createError(
        `Failed to retrieve ${this.objType}: ${result[1]}`,
        result[2],
        result[3] || 500
      );
    }
        
    return result;
  }

  /**
     * @async
     * @function findByName
     * @description Find all objects by name from the mediumroast.io application
     */
  async findByName(name) {
    return this.findByX('name', name);
  }

  /**
     * @async
     * @function findById
     * @description Find all objects by id from the mediumroast.io application
     * @deprecated 
     */
  // eslint-disable-next-line no-unused-vars
  async findById(_id) {
    return this._createError('Method findById is deprecated', null, 410);
  }

  /**
     * @async
     * @function findByX
     * @description Find all objects by attribute and value pair
     */
  async findByX(attribute, value, allObjects=null) {
    // Validate parameters
    const validationError = this._validateParams(
      { attribute, value },
      { attribute: 'string' }
    );
        
    if (validationError) return validationError;
        
    // Convert name values to lowercase for case-insensitive matching
    if(attribute === 'name') {
      value = typeof value === 'string' ? value.toLowerCase() : value;
    }
        
    let myObjects = [];
        
    // If no objects provided, fetch them
    if(allObjects === null) {
      const allObjectsResp = await this.serverCtl.readObjects(this.objType);
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
  }

  /**
     * @async
     * @function createObj
     * @description Create objects in the mediumroast.io application
     */
  async createObj(objs) {
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
      async (data) => { // Add parameter here to receive data from previous step
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
    return await this.serverCtl.checkForLock(this.objType);
  }
}

class Studies extends baseObjects {
  constructor (token, org, processName) {
    super(token, org, processName, 'Studies');
  }
}

class Users extends baseObjects {
  constructor (token, org, processName) {
    super(token, org, processName, 'Users');
  }

  async getAll() {
    return await this.serverCtl.getAllUsers();
  }

  async getMyself() {
    return await this.serverCtl.getUser();
  }

  async findByName(name) {
    return this.findByX('login', name);
  }

  async findByX(attribute, value) {
    // Validate parameters
    const validationError = this._validateParams(
      { attribute, value },
      { attribute: 'string' }
    );
        
    if (validationError) return validationError;
        
    let myUsers = [];
    const allUsersResp = await this.getAll();
        
    if (!allUsersResp[0]) {
      return allUsersResp;
    }
        
    const allUsers = allUsersResp[2];
        
    if (!allUsers || allUsers.length === 0) {
      return this._createError('No users found', null, 404);
    }
        
    for(const user in allUsers) {
      if(allUsers[user][attribute] === value) {
        myUsers.push(allUsers[user]);
      }
    }
        
    if (myUsers.length === 0) {
      return this._createError(
        `No users found where ${attribute} = ${value}`,
        null,
        404
      );
    } else {
      return this._createSuccess(
        `Found ${myUsers.length} users where ${attribute} = ${value}`,
        myUsers
      );
    }
  }
}

class Storage extends baseObjects {
  constructor (token, org, processName) {
    super(token, org, processName, 'Billings');
  }

  async getAll() {
    return await this.serverCtl.getRepoSize();
  }

  async getStorageBilling() {
    return await this.serverCtl.getStorageBillings();
  }
}

class Companies extends baseObjects {
  constructor (token, org, processName) {
    super(token, org, processName, 'Companies');
  }

  // updateObj now uses centralized whitelists from base class

  async deleteObj(objName, allowOrphans=false) {
    // Validate parameters
    const validationError = this._validateParams(
      { objName },
      { objName: 'string' }
    );
        
    if (validationError) return validationError;
        
    let source = {
      from: 'Companies',
      to: ['Interactions']
    };

    // Simple case - use direct deletion
    if(allowOrphans) {
      const result = await super.deleteObj(objName, source);
            
      // Invalidate cache if successful
      if (result[0]) {
        this._invalidateCache();
      }
            
      return result;
    }

    // Complex case with linked object deletion - use transaction pattern
    return this._executeTransaction([
      // Step 1: Catch containers
      async () => {
        let repoMetadata = {
          containers: {
            Companies: {},
            Interactions: {}
          }, 
          branch: {}
        };
        return await this.serverCtl.catchContainer(repoMetadata);
      },
            
      // Step 2: Get company info to find linked objects
      async (data) => {
        // Find the company object
        const companyObjResp = await this.findByX('name', objName, data.containers.Companies.objects);
        if (!companyObjResp[0]) {
          return companyObjResp; // Will abort transaction
        }
                
        // Store info for next steps
        this._tempData = {
          repoMetadata: data,
          linkedInteractions: companyObjResp[2][0].linked_interactions || {}
        };
                
        return this._createSuccess('Found company and linked interactions');
      },
            
      // Step 3: Delete company
      async () => {
        return await this.serverCtl.deleteObject(
          objName, 
          source, 
          this._tempData.repoMetadata, 
          false
        );
      },
            
      // Step 4: Delete linked interactions
      async () => {
        const interactionSource = {
          from: 'Interactions',
          to: ['Companies']
        };
                
        const linkedInteractions = this._tempData.linkedInteractions;
                
        // Skip if no linked interactions
        if (Object.keys(linkedInteractions).length === 0) {
          return this._createSuccess('No linked interactions to delete');
        }
                
        // Process each linked interaction
        for (const interaction in linkedInteractions) {
          const result = await this.serverCtl.deleteObject(
            interaction,
            interactionSource,
            this._tempData.repoMetadata,
            false
          );
                    
          if (!result[0]) {
            return result; // Will abort transaction
          }
        }
                
        return this._createSuccess('Deleted all linked interactions');
      },
            
      // Step 5: Release containers
      async () => {
        const result = await this.serverCtl.releaseContainer(this._tempData.repoMetadata);
                
        // Invalidate cache if successful
        if (result[0]) {
          this._invalidateCache();
          // Also invalidate Interactions cache since we modified them
          if (this.serverCtl.invalidateCache) {
            this.serverCtl.invalidateCache('container_Interactions');
          }
        }
                
        return this._createSuccess(
          `Deleted company [${objName}] and all linked interactions`, 
          null
        );
      }
    ], `delete-company-${objName}`);
  }
}

class Interactions extends baseObjects {
  constructor (token, org, processName) {
    super(token, org, processName, 'Interactions');
  }

  // updateObj now uses centralized whitelists from base class

  async deleteObj(objName) {
    const source = {
      from: 'Interactions',
      to: ['Companies']
    };
    return await super.deleteObj(objName, source);
  }

  async findByHash(hash) {
    return this.findByX('file_hash', hash);
  }
}

class Actions extends baseObjects {
  constructor (token, org, processName) {
    super(token, org, processName, 'Actions');
  }

  _generateManifest(dir, filelist) {
    // Define which content to skip
    const skipContent = ['.DS_Store', 'node_modules'];
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    // Use regex to prune everything after mediumroast_js/
    const basePath = __dirname.match(/.*mediumroast_js\//)?.[0] || __dirname;
    // Append cli/actions to the base path
    dir = dir || path.resolve(path.join(basePath, 'cli/actions'));
        
    const files = fs.readdirSync(dir);
    filelist = filelist || [];
        
    files.forEach((file) => {
      // Skip unneeded directories
      if (skipContent.includes(file)) {
        return;
      }
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        filelist = this._generateManifest(path.join(dir, file), filelist);
      } else {
        // Substitute .github for the first part of the path
        if (dir.includes('./')) {
          dir = dir.replace('./', '');
        }
        // This will be the repository name
        let dotGitHub = dir.replace(/.*(workflows|actions)/, '.github/$1');
    
        filelist.push({
          fileName: file,
          containerName: dotGitHub,
          srcURL: new URL(`file://${fullPath}`)
        });
      }
    });
        
    return filelist;
  }

  async updateActions() {
    // Use transaction pattern for better error handling and atomicity
    return this._executeTransaction([
      // Step 1: Generate manifest
      async () => {
        try {
          const actionsManifest = this._generateManifest();
          this._tempManifest = actionsManifest;
          return this._createSuccess('Generated actions manifest', { 
            total: actionsManifest.length 
          });
        } catch (err) {
          return this._createError(
            `Failed to generate manifest: ${err.message}`,
            err,
            500
          );
        }
      },
            
      // Step 2: Install all actions
      async () => {
        // Capture detailed install status
        let installStatus = {
          successCount: 0,
          failCount: 0,
          success: [],
          fail: [],
          total: this._tempManifest.length
        };
                
        for (const action of this._tempManifest) {
          // Read blob file
          try {
            const blobData = fs.readFileSync(action.srcURL, 'base64');
                        
            // Get the SHA for the file
            const sha = await this.serverCtl.getSha(
              action.containerName, 
              action.fileName, 
              'main'
            );
                        
            // Install the action
            const installResp = await this.serverCtl.writeBlob(
              action.containerName, 
              action.fileName, 
              blobData, 
              'main',
              sha[2]
            );
                        
            if(installResp[0]){
              installStatus.success.push({fileName: action.fileName, containerName: action.containerName, installMsg: installResp[1].status_msg});
              installStatus.successCount++;
            } else { 
              installStatus.fail.push({fileName: action.fileName, containerName: action.containerName, installMsg: installResp[1].status_msg});
              installStatus.failCount++;
            }
          } catch (err) {
            return this._createError(
              `Failed to read file [${action.fileName}] because: ${err.message}`,
              err,
              500
            );
          }
        }
                
        return this._createSuccess(
          'All actions installed',
          installStatus
        );
      }
    ], 'update-actions');
  }

  // Create a new method of to get the actions billing status only
  async getActionsBilling() {
    return await this.serverCtl.getActionsBillings();
  }

  async getAll() {
    return await this.serverCtl.getWorkflowRuns();
  }
}

// Export classes for consumers
export { Studies, Companies, Interactions, Users, Storage, Actions };