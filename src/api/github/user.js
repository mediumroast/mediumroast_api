/**
 * @fileoverview User management operations for GitHub
 * @license Apache-2.0
 * @version 3.0.0
 */

import ResponseFactory from './response.js';

/**
 * Manages GitHub user operations
 */
class UserManager {
  /**
   * @constructor
   * @param {Object} octokit - Octokit instance
   * @param {String} orgName - GitHub organization name
   * @param {String} repoName - GitHub repository name
   */
  constructor(octokit, orgName, repoName) {
    this.octokit = octokit;
    this.orgName = orgName;
    this.repoName = repoName;
  }

  /**
   * Gets the authenticated user from the GitHub API
   * @returns {Promise<Array>} ResponseFactory result
   */
  async getCurrentUser() {
    try {
      const response = await this.octokit.rest.users.getAuthenticated();
      return ResponseFactory.success(
        `Successfully retrieved authenticated user information`,
        response.data
      );
    } catch (err) {
      return ResponseFactory.error(
        `Failed to retrieve authenticated user: ${err.message}`,
        err
      );
    }
  }

  /**
   * Gets all users (collaborators) from the repository
   * @returns {Promise<Array>} ResponseFactory result
   */
  async getAllUsers() {
    try {
      const response = await this.octokit.rest.repos.listCollaborators({
        owner: this.orgName,
        repo: this.repoName,
        affiliation: 'all'
      });
      return ResponseFactory.success(
        `Successfully retrieved all repository collaborators`,
        response.data
      );
    } catch (err) {
      return ResponseFactory.error(
        `Failed to retrieve repository collaborators: ${err.message}`,
        err
      );
    }
  }

  /**
   * Adds a user to the repository with specified permissions
   * @param {String} username - GitHub username to add
   * @param {String} permission - Permission level ('pull', 'push', 'admin', 'maintain', 'triage')
   * @returns {Promise<Array>} ResponseFactory result
   */
  async addUserToRepository(username, permission = 'pull') {
    try {
      const response = await this.octokit.rest.repos.addCollaborator({
        owner: this.orgName,
        repo: this.repoName,
        username: username,
        permission: permission
      });
      return ResponseFactory.success(
        `Successfully added user ${username} to repository with ${permission} permissions`,
        response.data
      );
    } catch (err) {
      return ResponseFactory.error(
        `Failed to add user ${username} to repository: ${err.message}`,
        err
      );
    }
  }

  /**
   * Removes a user from the repository
   * @param {String} username - GitHub username to remove
   * @returns {Promise<Array>} ResponseFactory result
   */
  async removeUserFromRepository(username) {
    try {
      const response = await this.octokit.rest.repos.removeCollaborator({
        owner: this.orgName,
        repo: this.repoName,
        username: username
      });
      return ResponseFactory.success(
        `Successfully removed user ${username} from repository`,
        response.data
      );
    } catch (err) {
      return ResponseFactory.error(
        `Failed to remove user ${username} from repository: ${err.message}`,
        err
      );
    }
  }
}

export default UserManager;