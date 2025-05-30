/**
 * @fileoverview Users entity for GitHubServer
 * @file users.js
 * @license Apache-2.0
 * @version 3.0.0
 * 
 * @author Michael Hay <michael.hay@mediumroast.io>
 * @copyright 2025 Mediumroast, Inc. All rights reserved.
 */

import { BaseObjects } from '../baseObjects.js';
import { logger } from '../logger.js';

export class Users extends BaseObjects {
  /**
   * @constructor
   * @param {string} token - GitHub API token
   * @param {string} org - GitHub organization name
   * @param {string} processName - Process name for locking
   */
  constructor(token, org, processName) {
    super(token, org, processName, 'Users');
    
    // Add users-specific cache keys
    this._cacheKeys.allUsers = 'all_users';
    this._cacheKeys.authUser = 'auth_user';
    this._cacheKeys.byLogin = `${this.objType}_byLogin`;
    this._cacheKeys.byRole = `${this.objType}_byRole`;
    
    // Set specific cache timeouts
    this.cacheTimeouts.userDetails = 600000;   // 10 minutes for user details
    this.cacheTimeouts.authUser = 900000;      // 15 minutes for auth user
  }

  /**
   * Get all users with enhanced caching
   * @returns {Promise<Array>} List of users
   */
  async getAll() {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'getAll') : 
      { end: () => {} };
    
    try {
      return await this.cache.getOrFetch(
        this._cacheKeys.allUsers,
        async () => this.serverCtl.getAllUsers(),
        this.cacheTimeouts.userDetails || 600000,
        [] // No dependencies
      );
    } catch (error) {
      return this._createError(
        `Failed to retrieve users: ${error.message}`,
        error,
        500
      );
    } finally {
      tracking.end();
    }
  }

  /**
   * Get the authenticated user
   * @returns {Promise<Array>} User information
   */
  async getAuthenticatedUser() {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'getAuthenticatedUser') : 
      { end: () => {} };
    
    try {
      return await this.cache.getOrFetch(
        this._cacheKeys.authUser,
        async () => this.serverCtl.getUser(),
        this.cacheTimeouts.authUser || 900000,
        [] // No dependencies
      );
    } catch (error) {
      return this._createError(
        `Failed to retrieve authenticated user: ${error.message}`,
        error,
        500
      );
    } finally {
      tracking.end();
    }
  }
    
  /**
   * Find user by username/login
   * @param {string} login - GitHub username
   * @returns {Promise<Array>} User information
   */
  async findByLogin(login) {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'findByLogin') : 
      { end: () => {} };
    
    try {
      // Validate parameter
      const validationError = this._validateParams(
        { login },
        { login: 'string' }
      );
          
      if (validationError) return validationError;
      
      // Use cache with dependency on all users
      const loginCacheKey = `${this._cacheKeys.byLogin}_${login}`;
      
      return await this.cache.getOrFetch(
        loginCacheKey,
        async () => {
          // Get all users
          const allUsersResp = await this.getAll();
          if (!allUsersResp[0]) {
            return allUsersResp;
          }
              
          // Find user with matching login
          const user = allUsersResp[2].find(u => u.login === login);
          if (!user) {
            return this._createError(
              `User with login [${login}] not found`,
              null,
              404
            );
          }
              
          return this._createSuccess(
            `Found user with login [${login}]`,
            user
          );
        },
        this.cacheTimeouts.userDetails || 600000,
        [this._cacheKeys.allUsers] // Depends on all users
      );
    } catch (error) {
      return this._createError(
        `Error finding user: ${error.message}`,
        error,
        500
      );
    } finally {
      tracking.end();
    }
  }
    
  /**
   * Find user by role
   * @param {string} role - Role to search for
   * @returns {Promise<Array>} User information
   */
  async findByRole(role) {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'findByRole') : 
      { end: () => {} };
    
    try {
      // Validate parameter
      const validationError = this._validateParams(
        { role },
        { role: 'string' }
      );
          
      if (validationError) return validationError;
      
      // Use cache with dependency on all users
      const roleCacheKey = `${this._cacheKeys.byRole}_${role}`;
      
      return await this.cache.getOrFetch(
        roleCacheKey,
        async () => {
          // Get all users
          const allUsersResp = await this.getAll();
          if (!allUsersResp[0]) {
            return allUsersResp;
          }
              
          // Find users with matching role based on GitHub's structure
          const users = allUsersResp[2].filter(user => {
            // Check based on role being requested
            if (role === 'admin') {
              // User is admin if either role_name is admin or permissions.admin is true
              return (user.role_name === 'admin') || 
                     (user.permissions && user.permissions.admin === true);
            } else if (role === 'member') {
              // User is member if role_name is member and not admin
              return (user.role_name === 'member') || 
                     (user.role_name !== 'admin' && user.permissions && !user.permissions.admin);
            } else {
              // For other roles, just check role_name
              return user.role_name === role;
            }
          });
          
          if (users.length === 0) {
            return this._createError(
              `No users found with role [${role}]`,
              null,
              404
            );
          }
              
          return this._createSuccess(
            `Found ${users.length} users with role [${role}]`,
            users
          );
        },
        this.cacheTimeouts.userDetails || 600000,
        [this._cacheKeys.allUsers] // Depends on all users
      );
    } catch (error) {
      return this._createError(
        `Error finding users by role: ${error.message}`,
        error,
        500
      );
    } finally {
      tracking.end();
    }
  }
    
}