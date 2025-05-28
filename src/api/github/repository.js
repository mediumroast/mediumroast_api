/**
 * @fileoverview Repository operations for GitHub
 * @license Apache-2.0
 * @version 3.0.0
 * @author Michael Hay <michael.hay@mediumroast.io>
 * @copyright 2025 Mediumroast, Inc. All rights reserved.
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

  /**
   * Gets repository size information
   * @returns {Promise<Array>} ResponseFactory result with repository size in KB
   */
  async getRepoSize() {
    try {
      const response = await this.octokit.rest.repos.get({
        owner: this.orgName,
        repo: this.repoName
      });

      // The size property is in KB
      const sizeInKB = response.data.size;
      
      return ResponseFactory.success(
        `Repository ${this.repoName} size retrieved successfully`, 
        {
          repository: this.repoName,
          size_kb: sizeInKB,
          size_mb: (sizeInKB / 1024).toFixed(2),
          size_gb: (sizeInKB / 1024 / 1024).toFixed(2)
        }
      );
    } catch (err) {
      return ResponseFactory.error(
        `Failed to get repository size: ${err.message}`, 
        err
      );
    }
  }

  /**
   * Gets the SHA of a file in the repository
   * @param {String} path - Path to the file
   * @param {String} ref - Branch or commit reference
   * @returns {Promise<Array>} ResponseFactory result with SHA
   */
  async getSha(path, ref) {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner: this.orgName,
        repo: this.repoName,
        path,
        ref
      });
      
      // Handle case where response is an array (directory listing)
      if (Array.isArray(response.data)) {
        return ResponseFactory.error(
          `Cannot get SHA for directory: ${path}`, 
          null, 
          400
        );
      }
      
      return ResponseFactory.success(
        `Retrieved SHA for ${path}`, 
        response.data.sha
      );
    } catch (err) {
      if (err.status === 404) {
        return ResponseFactory.error(
          `File not found at ${path}`,
          err,
          404
        );
      }
      return ResponseFactory.error(
        `Failed to get SHA for ${path}: ${err.message}`,
        err,
        err.status || 500
      );
    }
  }

  /**
   * Gets commit history for a repository
   * @param {number} days - Number of days to look back
   * @param {string} [branch=null] - Branch to get history for
   * @returns {Promise<Array>} ResponseFactory result with commit history
   */
  async getCommitHistory(days = 7, branch = null) {
    try {
      // Calculate the date range
      const since = new Date();
      since.setDate(since.getDate() - days);
      since.setHours(0, 0, 0, 0); // Start of day

      // Get commits using the Octokit API
      const response = await this.octokit.rest.repos.listCommits({
        owner: this.orgName,
        repo: this.repoName,
        sha: branch || undefined,
        since: since.toISOString(),
        per_page: 100 // Max results per page
      });

      const commits = response.data.map(commit => ({
        sha: commit.sha,
        date: commit.commit.author.date,
        message: commit.commit.message,
        author: {
          name: commit.commit.author.name,
          email: commit.commit.author.email
        },
        stats: commit.stats || { additions: 0, deletions: 0, total: 0 }
      }));

      return ResponseFactory.success(
        `Retrieved ${commits.length} commits from the last ${days} days`,
        commits
      );
    } catch (err) {
      return ResponseFactory.error(
        `Failed to get commit history: ${err.message}`,
        err,
        err.status || 500
      );
    }
  }

  /**
   * Gets repository size at a specific commit
   * @param {string} commitSha - Commit SHA
   * @returns {Promise<Array>} ResponseFactory result with repository size in KB
   */
  async getRepoSizeAtCommit(commitSha) {
    try {
      // Unfortunately, GitHub API doesn't provide direct size at commit
      // We'll use the repository data at that point in time
      const response = await this.octokit.rest.repos.get({
        owner: this.orgName,
        repo: this.repoName,
        // Note: We can't directly get size at a specific commit through the API
        // The size will be the current size, but we can include commit info
      });

      // The size property is in KB
      const sizeInKB = response.data.size;
      
      return ResponseFactory.success(
        `Repository ${this.repoName} size at commit ${commitSha.substring(0, 7)} retrieved`, 
        {
          repository: this.repoName,
          commit: commitSha,
          size_kb: sizeInKB,
          size_mb: (sizeInKB / 1024).toFixed(2),
          size_gb: (sizeInKB / 1024 / 1024).toFixed(2)
        }
      );
    } catch (err) {
      return ResponseFactory.error(
        `Failed to get repository size at commit ${commitSha}: ${err.message}`, 
        err
      );
    }
  }
}

export default RepositoryManager;