/**
 * @fileoverview Repository operations for GitHub
 * @license Apache-2.0
 * @version 3.0.0
 */

import ResponseFactory from './response.js';
import { encodeContent } from './utils.js';

/**
 * Manages low-level GitHub repository operations
 */
class RepositoryManager {
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
   * Gets content from the repository
   * @param {String} path - Path to the content
   * @param {String} ref - Branch or commit reference
   * @returns {Promise<Array>} ResponseFactory result
   */
  async getContent(path, ref) {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner: this.orgName,
        repo: this.repoName,
        path,
        ref
      });
      return ResponseFactory.success(`Retrieved content at ${path}`, response.data);
    } catch (err) {
      return ResponseFactory.error(`Failed to get content at ${path}: ${err.message}`, err);
    }
  }

  /**
   * Creates or updates a file in the repository
   * @param {String} path - Path to the file
   * @param {String|Object} content - Content to write (will be encoded)
   * @param {String} message - Commit message
   * @param {String} branch - Branch name
   * @param {String} sha - SHA of the file (if updating)
   * @returns {Promise<Array>} ResponseFactory result
   */
  async createOrUpdateFile(path, content, message, branch, sha = null) {
    try {
      const params = {
        owner: this.orgName,
        repo: this.repoName,
        path,
        message,
        content: encodeContent(content),
        branch
      };
      
      if (sha) params.sha = sha;
      
      const response = await this.octokit.rest.repos.createOrUpdateFileContents(params);
      return ResponseFactory.success(`Updated ${path}`, response.data);
    } catch (err) {
      return ResponseFactory.error(`Failed to update ${path}: ${err.message}`, err);
    }
  }

  /**
   * Deletes a file from the repository
   * @param {String} path - Path to the file
   * @param {String} message - Commit message
   * @param {String} branch - Branch name
   * @param {String} sha - SHA of the file
   * @returns {Promise<Array>} ResponseFactory result
   */
  async deleteFile(path, message, branch, sha) {
    try {
      const response = await this.octokit.rest.repos.deleteFile({
        owner: this.orgName,
        repo: this.repoName,
        path,
        message,
        branch,
        sha
      });
      return ResponseFactory.success(`Deleted ${path}`, response.data);
    } catch (err) {
      return ResponseFactory.error(`Failed to delete ${path}: ${err.message}`, err);
    }
  }

  /**
   * Gets user information
   * @returns {Promise<Array>} ResponseFactory result
   */
  async getUser() {
    try {
      const response = await this.octokit.rest.users.getAuthenticated();
      return ResponseFactory.success('Successfully retrieved user information', response.data);
    } catch (err) {
      return ResponseFactory.error(`Failed to get user: ${err.message}`, err.message);
    }
  }
  
  /**
   * Gets all users (collaborators) for the repository
   * @returns {Promise<Array>} ResponseFactory result
   */
  async getCollaborators() {
    try {
      const response = await this.octokit.rest.repos.listCollaborators({
        owner: this.orgName,
        repo: this.repoName,
        affiliation: 'all'
      });
      return ResponseFactory.success('Successfully retrieved collaborators', response.data);
    } catch (err) {
      return ResponseFactory.error(`Failed to get collaborators: ${err.message}`, err.message);
    }
  }

  /**
   * Gets billing information for GitHub Actions
   * @returns {Promise<Array>} ResponseFactory result
   */
  async getActionsBilling() {
    try {
      const response = await this.octokit.rest.billing.getGithubActionsBillingOrg({
        org: this.orgName,
      });
      return ResponseFactory.success('Successfully retrieved actions billing', response.data);
    } catch (err) {
      return ResponseFactory.error(`Failed to get actions billing: ${err.message}`, err.message, 404);
    }
  }

  /**
   * Gets billing information for GitHub Storage
   * @returns {Promise<Array>} ResponseFactory result
   */
  async getStorageBilling() {
    try {
      const response = await this.octokit.rest.billing.getSharedStorageBillingOrg({
        org: this.orgName,
      });
      return ResponseFactory.success('Successfully retrieved storage billing', response.data);
    } catch (err) {
      return ResponseFactory.error(`Failed to get storage billing: ${err.message}`, err.message, 404);
    }
  }

  /**
   * Creates a repository in the organization
   * @param {String} description - Repository description
   * @returns {Promise<Array>} ResponseFactory result
   */
  async createRepository(description) {
    try {
      const response = await this.octokit.rest.repos.createInOrg({
        org: this.orgName,
        name: this.repoName,
        description: description,
        private: true
      });
      return ResponseFactory.success(`Created repository ${this.repoName}`, response.data);
    } catch (err) {
      return ResponseFactory.error(`Failed to create repository: ${err.message}`, err.message);
    }
  }

  /**
   * Gets organization information
   * @returns {Promise<Array>} ResponseFactory result
   */
  async getOrganization() {
    try {
      const response = await this.octokit.rest.orgs.get({
        org: this.orgName
      });
      return ResponseFactory.success(`Retrieved organization ${this.orgName}`, response.data);
    } catch (err) {
      return ResponseFactory.error(`Failed to get organization: ${err.message}`, err.message);
    }
  }
}

export default RepositoryManager;