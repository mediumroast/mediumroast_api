/**
 * @fileoverview Repository operations for GitHub
 * @license Apache-2.0
 * @version 3.0.0
 * @author Michael Hay <michael.hay@mediumroast.io>
 * @copyright 2025 Mediumroast, Inc. All rights reserved.
 */

import ResponseFactory from './response.js';
import { encodeContent } from './utils.js';
import { default as fetch } from 'node-fetch';
import { logger } from '../logger.js';

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
      return ResponseFactory.error(
        `Failed to delete ${path}: ${err.message}`, 
        err,
        err.status || 500
      );
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
      // Ensure size metrics are calculated before returning
      const sizeMetrics = await this.calculateRepoSize(response.data);
      return ResponseFactory.success(`Calculated repository size metrics for ${this.repoName}`, sizeMetrics);
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
   * @returns {Promise<Array} ResponseFactory result with commit history
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

  /**
   * Gets the latest release from a repository
   * @param {String} owner - Repository owner
   * @param {String} repo - Repository name
   * @returns {Promise<Array>} ResponseFactory result with release data
   */
  async getLatestRelease(owner, repo) {
    try {
      const response = await this.octokit.rest.repos.getLatestRelease({
        owner,
        repo
      });
      
      return ResponseFactory.success(
        `Retrieved latest release from ${owner}/${repo}`,
        response.data
      );
    } catch (err) {
      return ResponseFactory.error(
        `Failed to get latest release: ${err.message}`,
        err,
        err.status || 500
      );
    }
  }

  /**
   * Downloads an asset from a GitHub release
   * @param {String} owner - Repository owner
   * @param {String} repo - Repository name
   * @param {Number} assetId - Asset ID
   * @returns {Promise<Array>} ResponseFactory result with asset content
   */
  async downloadReleaseAsset(owner, repo, assetId) {
    try {
      const response = await this.octokit.rest.repos.getReleaseAsset({
        owner,
        repo,
        asset_id: assetId,
        headers: {
          accept: 'application/octet-stream'
        }
      });
      
      return ResponseFactory.success(
        `Downloaded release asset ${assetId}`,
        response.data
      );
    } catch (err) {
      return ResponseFactory.error(
        `Failed to download release asset: ${err.message}`,
        err,
        err.status || 500
      );
    }
  }

  /**
   * Download a release asset directly using its browser_download_url
   * @param {String} assetUrl - Direct download URL for the asset
   * @returns {Promise<Array>} ResponseFactory result
   */
  async downloadAssetDirect(assetUrl) {
    try {
      logger.debug(`Directly downloading asset from: ${assetUrl}`);
      const response = await fetch(assetUrl);
      
      if (!response.ok) {
        return ResponseFactory.error(
          `Failed to download asset: ${response.statusText}`,
          { status: response.status, statusText: response.statusText },
          response.status
        );
      }
      
      const buffer = await response.buffer();
      logger.debug(`Successfully downloaded asset (${buffer.length} bytes)`);
      
      return ResponseFactory.success(
        `Successfully downloaded asset (${buffer.length} bytes)`,
        buffer
      );
    } catch (err) {
      return ResponseFactory.error(
        `Failed to download asset: ${err.message}`,
        err,
        500
      );
    }
  }

  /**
   * Checks if a file exists in the repository
   * @param {String} path - File path
   * @param {String} branch - Branch name
   * @returns {Promise<Array} ResponseFactory result with file information if exists
   */
  async fileExists(path, branch) {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner: this.orgName,
        repo: this.repoName,
        path,
        ref: branch
      });
      
      return ResponseFactory.success(
        `File exists at ${path}`,
        {
          exists: true,
          sha: response.data.sha,
          size: response.data.size
        }
      );
    } catch (err) {
      if (err.status === 404) {
        return ResponseFactory.success(
          `File does not exist at ${path}`,
          { exists: false }
        );
      }
      
      return ResponseFactory.error(
        `Error checking if file exists: ${err.message}`,
        err,
        err.status || 500
      );
    }
  }

  /**
   * Processes directory contents into a standardized format
   * @param {Array|Object} contents - Directory contents from GitHub API
   * @returns {Array} Processed directory listing
   */
  processDirectoryContents(contents) {
    if (!contents) return [];
    
    // Ensure we have an array
    const items = Array.isArray(contents) ? contents : [contents];
    
    return items.map(item => ({
      name: item.name,
      path: item.path,
      type: item.type,
      size: item.size,
      sha: item.sha,
      url: item.html_url || item.url
    }));
  }

  /**
   * Recursively deletes a directory and all its contents
   * @param {String} dirPath - Path to the directory
   * @param {String} commitMessage - Base commit message
   * @param {String} branch - Branch name
   * @returns {Promise<Array>} ResponseFactory result with deletion results
   */
  async deleteDirectoryRecursively(dirPath, commitMessage, branch) {
    const results = [];
    
    try {
      // Get contents of the directory
      const contentsResp = await this.getContent(dirPath, branch);
      
      if (!contentsResp[0]) {
        return ResponseFactory.error(
          `Failed to get contents of directory ${dirPath}: ${contentsResp[1]}`,
          contentsResp[2],
          contentsResp[3] || 500
        );
      }
      
      // Ensure we have an array of contents
      const contents = this.processDirectoryContents(contentsResp[2]);
      
      // Process files first, then directories
      const files = contents.filter(item => item.type === 'file');
      const dirs = contents.filter(item => item.type === 'dir');
      
      // Delete all files in this directory
      for (const file of files) {
        try {
          const deleteResp = await this.deleteFile(
            file.path,
            `${commitMessage} - ${file.name}`,
            branch,
            file.sha
          );
          
          results.push({
            name: file.name,
            path: file.path,
            type: 'file',
            success: deleteResp[0],
            message: deleteResp[1],
            timestamp: new Date().toISOString()
          });
          
          // Add a small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (err) {
          results.push({
            name: file.name,
            path: file.path,
            type: 'file',
            success: false,
            message: err.message,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      // Now process subdirectories
      for (const dir of dirs) {
        const subDirResults = await this.deleteDirectoryRecursively(
          dir.path, 
          commitMessage, 
          branch
        );
        
        if (subDirResults[0]) {
          results.push(...subDirResults[2]);
        } else {
          results.push({
            name: dir.path,
            type: 'directory',
            success: false,
            message: subDirResults[1],
            timestamp: new Date().toISOString()
          });
        }
      }
      
      return ResponseFactory.success(
        `Directory ${dirPath} processed for deletion`,
        results
      );
    } catch (err) {
      return ResponseFactory.error(
        `Error in directory deletion for ${dirPath}: ${err.message}`,
        err,
        err.status || 500
      );
    }
  }

  /**
   * Analyzes repository structure for multiple directories
   * @param {Array<String>} paths - Paths to analyze
   * @param {String} branch - Branch name
   * @returns {Promise<Array>} ResponseFactory result with directory analysis
   */
  async analyzeDirectoryStructure(paths, branch) {
    try {
      const structure = {};
      
      for (const path of paths) {
        const resp = await this.getContent(path, branch);
        
        if (resp[0]) {
          structure[path] = {
            exists: true,
            contents: this.processDirectoryContents(resp[2]),
            is_empty: Array.isArray(resp[2]) ? resp[2].length === 0 : false
          };
        } else {
          structure[path] = {
            exists: resp[3] !== 404,
            error: resp[1],
            contents: []
          };
        }
      }
      
      return ResponseFactory.success(
        'Repository structure analyzed successfully',
        structure
      );
    } catch (err) {
      return ResponseFactory.error(
        `Failed to analyze repository structure: ${err.message}`,
        err,
        err.status || 500
      );
    }
  }

  /**
   * Creates a directory in the repository (by creating a .gitkeep file)
   * @param {String} dirPath - Path to the directory
   * @param {String} branch - Branch name
   * @returns {Promise<Array>} ResponseFactory result
   */
  async createDirectory(dirPath, branch) {
    try {
      // Check if directory already exists
      const dirResp = await this.fileExists(dirPath, branch);
      if (dirResp[0] && dirResp[2] && dirResp[2].exists) {
        return ResponseFactory.success(`Directory ${dirPath} already exists`);
      }
      
      // Create a .gitkeep file to create the directory
      const gitkeepPath = `${dirPath}/.gitkeep`;
      const result = await this.createOrUpdateFile(
        gitkeepPath,
        '',
        `Create directory ${dirPath}`,
        branch
      );
      
      if (!result[0]) {
        return result;
      }
      
      return ResponseFactory.success(`Created directory ${dirPath}`);
    } catch (err) {
      return ResponseFactory.error(
        `Failed to create directory ${dirPath}: ${err.message}`,
        err,
        err.status || 500
      );
    }
  }
}

export default RepositoryManager;