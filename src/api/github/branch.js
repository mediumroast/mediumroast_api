/**
 * @fileoverview Branch management operations for GitHub
 * @license Apache-2.0
 * @version 3.0.0
 * @author Michael Hay <michael.hay@mediumroast.io>
 * @copyright 2025 Mediumroast, Inc. All rights reserved.
 */

import ResponseFactory from './response.js';

/**
 * Manages branch operations in GitHub
 */
class BranchManager {
  /**
   * @constructor
   * @param {Object} octokit - Octokit instance
   * @param {String} orgName - GitHub organization name 
   * @param {String} repoName - GitHub repository name
   * @param {String} mainBranchName - Main branch name
   */
  constructor(octokit, orgName, repoName, mainBranchName = 'main') {
    this.octokit = octokit;
    this.orgName = orgName;
    this.repoName = repoName;
    this.mainBranchName = mainBranchName;
  }

  /**
   * Creates a new branch from the main branch
   * @returns {Promise<Array>} ResponseFactory result
   */
  async createBranchFromMain() {
    const branchName = Date.now().toString();
    
    try {
      // Get the SHA of the latest commit on the main branch
      const mainBranchRef = await this.octokit.rest.git.getRef({
        owner: this.orgName,
        repo: this.repoName,
        ref: `heads/${this.mainBranchName}`,
      });
    
      // Create a new branch
      const newBranchResp = await this.octokit.rest.git.createRef({
        owner: this.orgName,
        repo: this.repoName,
        ref: `refs/heads/${branchName}`,
        sha: mainBranchRef.data.object.sha,
      });
    
      return ResponseFactory.success(
        `Created branch ${branchName}`, 
        newBranchResp.data
      );
    } catch (error) {
      return ResponseFactory.error(
        `Failed to create branch ${branchName}: ${error.message}`, 
        error
      );
    }
  }

  /**
   * Merges a branch into the main branch
   * @param {String} branchName - Branch to merge
   * @param {String} sha - Commit SHA
   * @param {String} commitDescription - Commit description
   * @returns {Promise<Array>} ResponseFactory result
   */
  async mergeBranchToMain(branchName, sha, commitDescription = 'Performed CRUD operation on objects.') {
    try {
      // Create a pull request
      const createPullRequestResponse = await this.octokit.rest.pulls.create({
        owner: this.orgName,
        repo: this.repoName,
        title: commitDescription,
        head: branchName,
        base: this.mainBranchName,
        body: commitDescription,
      });
    
      // Merge the pull request
      const mergeResponse = await this.octokit.rest.pulls.merge({
        owner: this.orgName,
        repo: this.repoName,
        pull_number: createPullRequestResponse.data.number,
        commit_title: commitDescription,
      });
    
      return ResponseFactory.success(
        'Pull request created and merged successfully', 
        mergeResponse.data
      );
    } catch (error) {
      return ResponseFactory.error(
        `Failed to create or merge pull request: ${error.message}`, 
        error
      );
    }
  }
}

export default BranchManager;