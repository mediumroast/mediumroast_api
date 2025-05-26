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
    this._cacheKeys.userActivity = `${this.objType}_activity`;
    this._cacheKeys.orgActivity = 'org_activity';
    
    // Set specific cache timeouts
    this.cacheTimeouts.userDetails = 600000;   // 10 minutes for user details
    this.cacheTimeouts.authUser = 900000;      // 15 minutes for auth user
    this.cacheTimeouts.activity = 300000;      // 5 minutes for activity data
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
              
          // Find users with matching role
          const users = allUsersResp[2].filter(u => u.role === role);
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
    
  /**
   * Update user role
   * @param {string} login - GitHub username
   * @param {string} newRole - New role to assign
   * @returns {Promise<Array>} Operation result
   */
  async updateUserRole(login, newRole) {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'updateUserRole') : 
      { end: () => {} };
    
    try {
      // Validate parameters
      const validationError = this._validateParams(
        { login, newRole },
        { login: 'string', newRole: 'string' }
      );
          
      if (validationError) return validationError;
      
      // Additional validation for role values
      const validRoles = ['admin', 'member', 'billing_manager'];
      if (!validRoles.includes(newRole)) {
        return this._createError(
          `Invalid role: [${newRole}]. Must be one of: ${validRoles.join(', ')}`,
          null,
          400
        );
      }
      
      // Update the user's role
      const result = await this.serverCtl.updateOrgMembership(login, newRole);
          
      if (result[0]) {
        // Invalidate user caches
        this.cache.invalidate(this._cacheKeys.allUsers);
        this.cache.invalidate(`${this._cacheKeys.byLogin}_${login}`);
        
        // Invalidate all role caches as they may have changed
        validRoles.forEach(role => {
          this.cache.invalidate(`${this._cacheKeys.byRole}_${role}`);
        });
      }
          
      return result;
    } catch (error) {
      return this._createError(
        `Failed to update user role: ${error.message}`,
        error,
        500
      );
    } finally {
      tracking.end();
    }
  }
    
  /**
   * Get user activity metrics
   * @param {string} login - GitHub username (optional)
   * @returns {Promise<Array>} User activity metrics
   */
  async getUserActivity(login = null) {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'getUserActivity') : 
      { end: () => {} };
    
    try {
      // If login provided, get metrics for specific user
      if (login) {
        // Validate parameter
        const validationError = this._validateParams(
          { login },
          { login: 'string' }
        );
            
        if (validationError) return validationError;
        
        // Use cache with specific user activity key
        const userActivityKey = `${this._cacheKeys.userActivity}_${login}`;
        
        return await this.cache.getOrFetch(
          userActivityKey,
          async () => {
            // Find the user first
            const userResp = await this.findByLogin(login);
            if (!userResp[0]) {
              return userResp;
            }
                  
            const activityResp = await this.serverCtl.getUserActivity(login);
            if (!activityResp[0]) {
              return activityResp;
            }
                    
            return this._createSuccess(
              `Retrieved activity for user [${login}]`,
              activityResp[2]
            );
          },
          this.cacheTimeouts.activity || 300000,
          [`${this._cacheKeys.byLogin}_${login}`] // Depends on user data
        );
      } else {
        // Get metrics for all users
        return await this.cache.getOrFetch(
          this._cacheKeys.orgActivity,
          async () => {
            const allUsersResp = await this.getAll();
            if (!allUsersResp[0]) {
              return allUsersResp;
            }
                  
            const orgActivityResp = await this.serverCtl.getOrgActivity();
            if (!orgActivityResp[0]) {
              return orgActivityResp;
            }
                  
            return this._createSuccess(
              'Retrieved organization activity metrics',
              orgActivityResp[2]
            );
          },
          this.cacheTimeouts.activity || 300000,
          [this._cacheKeys.allUsers] // Depends on all users
        );
      }
    } catch (error) {
      return this._createError(
        `Error retrieving activity metrics: ${error.message}`,
        error,
        500
      );
    } finally {
      tracking.end();
    }
  }
  
  /**
   * Invite a new user to the organization
   * @param {string} email - User email
   * @param {string} role - Role to assign (admin, member, billing_manager)
   * @returns {Promise<Array>} Operation result
   */
  async inviteUser(email, role = 'member') {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'inviteUser') : 
      { end: () => {} };
    
    try {
      // Validate parameters
      const validationError = this._validateParams(
        { email, role },
        { email: 'string', role: 'string' }
      );
          
      if (validationError) return validationError;
      
      // Additional validation
      if (!email.includes('@')) {
        return this._createError('Invalid email format', null, 400);
      }
      
      // Check role validity
      const validRoles = ['admin', 'member', 'billing_manager'];
      if (!validRoles.includes(role)) {
        return this._createError(
          `Invalid role: [${role}]. Must be one of: ${validRoles.join(', ')}`,
          null,
          400
        );
      }
      
      const result = await this.serverCtl.inviteOrgMember(email, role);
          
      if (result[0]) {
        // Invalidate user caches on success
        this.cache.invalidate(this._cacheKeys.allUsers);
        this.cache.invalidate(`${this._cacheKeys.byRole}_${role}`);
      }
          
      return result;
    } catch (error) {
      return this._createError(
        `Failed to invite user: ${error.message}`,
        error,
        500
      );
    } finally {
      tracking.end();
    }
  }
  
  /**
   * Remove a user from the organization
   * @param {string} login - GitHub username
   * @returns {Promise<Array>} Operation result
   */
  async removeUser(login) {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'removeUser') : 
      { end: () => {} };
    
    try {
      // Validate parameter
      const validationError = this._validateParams(
        { login },
        { login: 'string' }
      );
          
      if (validationError) return validationError;
      
      // Find user to get their current role before removal
      const userResp = await this.findByLogin(login);
      let userRole = null;
      
      if (userResp[0] && userResp[2] && userResp[2].role) {
        userRole = userResp[2].role;
      }
      
      const result = await this.serverCtl.removeOrgMember(login);
          
      if (result[0]) {
        // Invalidate user caches on success
        this.cache.invalidate(this._cacheKeys.allUsers);
        this.cache.invalidate(`${this._cacheKeys.byLogin}_${login}`);
        
        // Also invalidate role cache if we knew the user's role
        if (userRole) {
          this.cache.invalidate(`${this._cacheKeys.byRole}_${userRole}`);
        } else {
          // If we don't know the role, invalidate all role caches
          this.cache.invalidate(`${this._cacheKeys.byRole}_admin`);
          this.cache.invalidate(`${this._cacheKeys.byRole}_member`);
          this.cache.invalidate(`${this._cacheKeys.byRole}_billing_manager`);
        }
      }
          
      return result;
    } catch (error) {
      return this._createError(
        `Failed to remove user: ${error.message}`,
        error,
        500
      );
    } finally {
      tracking.end();
    }
  }
}