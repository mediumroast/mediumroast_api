/**
 * @fileoverview Users entity for GitHubServer
 * @license Apache-2.0
 * @version 3.0.0
 * 
 * @author Michael Hay <michael.hay@mediumroast.io>
 * @copyright 2024 Mediumroast, Inc. All rights reserved.
 */

import { BaseObjects } from '../baseObjects.js';

export class Users extends BaseObjects {
  /**
     * @constructor
     * @param {string} token - GitHub API token
     * @param {string} org - GitHub organization name
     * @param {string} processName - Process name for locking
     */
  constructor(token, org, processName) {
    super(token, org, processName, 'Users');
  }

  /**
     * Get all users with enhanced caching
     * @returns {Promise<Array>} List of users
     */
  async getAll() {
    return this.cache.getOrFetch(
      'all_users',
      async () => this.serverCtl.getAllUsers(),
      this.cacheTimeouts.Users
    );
  }

  /**
     * Get the authenticated user
     * @returns {Promise<Array>} User information
     */
  async getAuthenticatedUser() {
    return this.cache.getOrFetch(
      'auth_user',
      async () => this.serverCtl.getUser(),
      this.cacheTimeouts.Users
    );
  }
    
  /**
     * Find user by username/login
     * @param {string} login - GitHub username
     * @returns {Promise<Array>} User information
     */
  async findByLogin(login) {
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
  }
    
  /**
     * Find user by role
     * @param {string} role - Role to search for
     * @returns {Promise<Array>} User information
     */
  async findByRole(role) {
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
  }
    
  /**
     * Update user role
     * @param {string} login - GitHub username
     * @param {string} newRole - New role to assign
     * @returns {Promise<Array>} Operation result
     */
  async updateUserRole(login, newRole) {
    // Validate parameters
    if (!login || !newRole) {
      return this._createError(
        `Missing required parameters: [login=${login}], [newRole=${newRole}]`,
        null,
        400
      );
    }
        
    // Valid roles
    const validRoles = ['admin', 'member', 'billing_manager'];
    if (!validRoles.includes(newRole)) {
      return this._createError(
        `Invalid role: [${newRole}]. Must be one of: ${validRoles.join(', ')}`,
        null,
        400
      );
    }
        
    // Update the user's role
    try {
      const result = await this.serverCtl.updateOrgMembership(login, newRole);
            
      if (result[0]) {
        // Invalidate user caches
        this._invalidateCache();
        this.cache.invalidate('all_users');
      }
            
      return result;
    } catch (err) {
      return this._createError(
        `Failed to update user role: ${err.message}`,
        err,
        500
      );
    }
  }
    
  /**
     * Get user activity metrics
     * @param {string} login - GitHub username (optional)
     * @returns {Promise<Array>} User activity metrics
     */
  async getUserActivity(login = null) {
    // If login provided, get metrics for specific user
    if (login) {
      // Find the user first
      const userResp = await this.findByLogin(login);
      if (!userResp[0]) {
        return userResp;
      }
            
      try {
        const activityResp = await this.serverCtl.getUserActivity(login);
        if (!activityResp[0]) {
          return activityResp;
        }
                
        return this._createSuccess(
          `Retrieved activity for user [${login}]`,
          activityResp[2]
        );
      } catch (err) {
        return this._createError(
          `Failed to retrieve user activity: ${err.message}`,
          err,
          500
        );
      }
    } else {
      // Get metrics for all users
      try {
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
      } catch (err) {
        return this._createError(
          `Failed to retrieve organization activity: ${err.message}`,
          err,
          500
        );
      }
    }
  }
}