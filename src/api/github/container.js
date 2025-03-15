/**
 * @fileoverview Container operations for GitHub
 * @license Apache-2.0
 * @version 3.0.0
 */

import ResponseFactory from './response.js';
import { encodeContent } from './utils.js';

/**
 * Manages container operations (locking, object manipulation)
 */
class ContainerOperations {
  /**
   * @constructor
   * @param {Object} octokit - Octokit instance
   * @param {String} orgName - GitHub organization name
   * @param {String} repoName - GitHub repository name
   * @param {String} mainBranchName - Main branch name
   * @param {String} lockFileName - Lock file name
   */
  constructor(octokit, orgName, repoName, mainBranchName, lockFileName) {
    this.octokit = octokit;
    this.orgName = orgName;
    this.repoName = repoName;
    this.mainBranchName = mainBranchName;
    this.lockFileName = lockFileName;
  }

  /**
   * Checks if a container is locked
   * @param {String} containerName - Container name
   * @returns {Promise<Array>} ResponseFactory result
   */
  async checkForLock(containerName) {
    try {
      // Get the latest commit
      const latestCommit = await this.octokit.rest.repos.getCommit({
        owner: this.orgName,
        repo: this.repoName,
        ref: this.mainBranchName,
      });

      // Check if the lock file exists
      const mainContents = await this.octokit.rest.repos.getContent({
        owner: this.orgName,
        repo: this.repoName,
        ref: latestCommit.data.sha,
        path: containerName
      });

      const lockExists = mainContents.data.some(
        item => item.path === `${containerName}/${this.lockFileName}`
      );

      if (lockExists) {
        return ResponseFactory.success(
          `Container ${containerName} is locked with lock file ${this.lockFileName}`,
          lockExists,
          200
        );
      } else {
        return ResponseFactory.success(
          `Container ${containerName} is not locked with lock file ${this.lockFileName}`,
          lockExists,
          404
        );
      }
    } catch (err) {
      return ResponseFactory.error(
        `Failed to check if container ${containerName} is locked: ${err.message}`,
        err
      );
    }
  }

  /**
   * Locks a container
   * @param {String} containerName - Container name
   * @returns {Promise<Array>} ResponseFactory result
   */
  async lockContainer(containerName) {
    // Define the full path to the lockfile
    const lockFile = `${containerName}/${this.lockFileName}`;

    try {
      // Get the latest commit
      const { data: latestCommit } = await this.octokit.rest.repos.getCommit({
        owner: this.orgName,
        repo: this.repoName,
        ref: this.mainBranchName,
      });

      const lockResponse = await this.octokit.rest.repos.createOrUpdateFileContents({
        owner: this.orgName,
        repo: this.repoName,
        path: lockFile,
        content: encodeContent(''),
        branch: this.mainBranchName,
        message: `Locking container [${containerName}]`,
        sha: latestCommit.sha
      });

      return ResponseFactory.success(
        `Locked the container ${containerName}`, 
        lockResponse.data
      );
    } catch (err) {
      return ResponseFactory.error(
        `Unable to lock the container ${containerName}: ${err.message}`, 
        err
      );
    }
  }

  /**
   * Unlocks a container
   * @param {String} containerName - Container name
   * @param {String} commitSha - SHA of the lock file
   * @param {String} branchName - Branch name
   * @returns {Promise<Array>} ResponseFactory result
   */
  async unlockContainer(containerName, commitSha, branchName) {
    // Define the full path to the lockfile
    const lockFile = `${containerName}/${this.lockFileName}`;
    
    try {
      const lockExists = await this.checkForLock(containerName);

      if (lockExists[0] && lockExists[2]) {
        const unlockResponse = await this.octokit.rest.repos.deleteFile({
          owner: this.orgName,
          repo: this.repoName,
          path: lockFile,
          branch: branchName,
          message: `Unlocking container [${containerName}]`,
          sha: commitSha
        });

        return ResponseFactory.success(
          `Unlocked the container ${containerName}`, 
          unlockResponse.data
        );
      } else {
        return ResponseFactory.error(
          `Unable to unlock the container ${containerName}: Lock file not found`, 
          null
        );
      }
    } catch (err) {
      return ResponseFactory.error(
        `Error unlocking container ${containerName}: ${err.message}`, 
        err
      );
    }
  }

  /**
   * Catches multiple containers (locks them and prepares for operations)
   * @param {Object} repoMetadata - Container metadata object
   * @param {Object} objectFiles - Mapping of container names to their object files
   * @param {Function} createBranchFn - Function to create a branch
   * @param {Function} readObjectsFn - Function to read container objects
   * @returns {Promise<Array>} ResponseFactory result
   */
  async catchContainers(repoMetadata, objectFiles, createBranchFn, readObjectsFn) {
    // Check locks
    for (const container in repoMetadata.containers) {
      const lockExists = await this.checkForLock(container);
      if (lockExists[0] && lockExists[2]) {
        return ResponseFactory.error(
          `The container [${container}] is locked unable and cannot perform creates, updates or deletes on objects.`,
          lockExists,
          503
        );
      }
    }

    // Lock containers
    for (const container in repoMetadata.containers) {
      const locked = await this.lockContainer(container);
      if (!locked[0]) {
        return ResponseFactory.error(
          `Unable to lock [${container}] and cannot perform creates, updates or deletes on objects.`,
          locked,
          503
        );
      }
      repoMetadata.containers[container].lockSha = locked[2].content.sha;
    }

    // Create branch
    const branchCreated = await createBranchFn();
    if (!branchCreated[0]) {
      return ResponseFactory.error(
        'Unable to create new branch',
        branchCreated,
        503
      );
    }
    
    // Extract branch ref (remove 'refs/heads/' prefix)
    const branchRef = branchCreated[2].ref.replace('refs/heads/', '');
    
    repoMetadata.branch = {
      name: branchRef,
      sha: branchCreated[2].object.sha
    };

    // Read objects
    for (const container in repoMetadata.containers) {
      const readResponse = await readObjectsFn(container);
      if (!readResponse[0]) {
        return ResponseFactory.error(
          `Unable to read the source objects [${container}/${objectFiles[container]}].`,
          readResponse,
          503
        );
      }
      
      repoMetadata.containers[container].objectSha = readResponse[2].sha;
      repoMetadata.containers[container].objects = readResponse[2].mrJson;
    }

    return ResponseFactory.success(
      `${Object.keys(repoMetadata.containers).length} containers are ready for use.`,
      repoMetadata,
      200
    );
  }

  /**
   * Releases containers (unlocks them and merges changes)
   * @param {Object} repoMetadata - Container metadata object
   * @param {Function} mergeBranchFn - Function to merge branch to main
   * @returns {Promise<Array>} ResponseFactory result
   */
  async releaseContainers(repoMetadata, mergeBranchFn) {
    // Merge branch to main
    const mergeResponse = await mergeBranchFn(
      repoMetadata.branch.name, 
      repoMetadata.branch.sha
    );
    
    if (!mergeResponse[0]) {
      return ResponseFactory.error(
        'Unable to merge the branch to main.',
        mergeResponse,
        503
      );
    }

    // Unlock containers
    for (const container in repoMetadata.containers) {
      // Unlock branch
      const branchUnlocked = await this.unlockContainer(
        container, 
        repoMetadata.containers[container].lockSha,
        repoMetadata.branch.name
      );
      if (!branchUnlocked[0]) {
        return ResponseFactory.error(
          `Unable to unlock the container, objects may have been written please check [${container}] for objects and the lock file.`,
          branchUnlocked,
          503
        );
      }
      
      // Unlock main
      const mainUnlocked = await this.unlockContainer(
        container, 
        repoMetadata.containers[container].lockSha,
        this.mainBranchName
      );
      if (!mainUnlocked[0]) {
        return ResponseFactory.error(
          `Unable to unlock the container, objects may have been written please check [${container}] for objects and the lock file.`,
          mainUnlocked,
          503
        );
      }
    }

    // Return success
    return ResponseFactory.success(
      `Released [${Object.keys(repoMetadata.containers).length}] containers.`,
      null,
      200
    );
  }
}

export default ContainerOperations;