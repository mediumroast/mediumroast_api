/**
 * @fileoverview Billing operations for GitHub
 * @license Apache-2.0
 * @version 3.0.0
 */

import ResponseFactory from './response.js';

/**
 * Manages GitHub billing operations
 */
class BillingManager {
  /**
   * @constructor
   * @param {Object} octokit - Octokit instance
   * @param {String} orgName - GitHub organization name
   */
  constructor(octokit, orgName) {
    this.octokit = octokit;
    this.orgName = orgName;
  }

  /**
   * Gets GitHub Actions billing information for the organization
   * @returns {Promise<Array>} ResponseFactory result
   */
  async getActionsBillings() {
    try {
      const response = await this.octokit.rest.billing.getGithubActionsBillingOrg({
        org: this.orgName,
      });
      
      return ResponseFactory.success(
        `Successfully retrieved Actions billing information for organization ${this.orgName}`,
        response.data
      );
    } catch (err) {
      return ResponseFactory.error(
        `Failed to retrieve Actions billing information: ${err.message}`,
        err,
        err.status || 500
      );
    }
  }

  /**
   * Gets GitHub Packages storage billing information for the organization
   * @returns {Promise<Array>} ResponseFactory result
   */
  async getStorageBillings() {
    try {
      const response = await this.octokit.rest.billing.getSharedStorageBillingOrg({
        org: this.orgName,
      });
      
      return ResponseFactory.success(
        `Successfully retrieved storage billing information for organization ${this.orgName}`,
        response.data
      );
    } catch (err) {
      return ResponseFactory.error(
        `Failed to retrieve storage billing information: ${err.message}`,
        err,
        err.status || 500
      );
    }
  }

  /**
   * Gets GitHub Packages billing information for the organization
   * @returns {Promise<Array>} ResponseFactory result
   */
  async getPackagesBillings() {
    try {
      const response = await this.octokit.rest.billing.getGithubPackagesBillingOrg({
        org: this.orgName,
      });
      
      return ResponseFactory.success(
        `Successfully retrieved Packages billing information for organization ${this.orgName}`,
        response.data
      );
    } catch (err) {
      return ResponseFactory.error(
        `Failed to retrieve Packages billing information: ${err.message}`,
        err,
        err.status || 500
      );
    }
  }

  /**
   * Gets all billing information for the organization
   * @returns {Promise<Array>} ResponseFactory result with combined billing data
   */
  async getAllBillings() {
    try {
      const [actionsResult, storageResult, packagesResult] = await Promise.all([
        this.getActionsBillings(),
        this.getStorageBillings(),
        this.getPackagesBillings()
      ]);
      
      if (!actionsResult[0] || !storageResult[0] || !packagesResult[0]) {
        const failedRequests = [];
        if (!actionsResult[0]) failedRequests.push('Actions');
        if (!storageResult[0]) failedRequests.push('Storage');
        if (!packagesResult[0]) failedRequests.push('Packages');
        
        return ResponseFactory.error(
          `Failed to retrieve some billing information: ${failedRequests.join(', ')}`,
          { actionsResult, storageResult, packagesResult },
          500
        );
      }
      
      const combinedData = {
        actions: actionsResult[2],
        storage: storageResult[2],
        packages: packagesResult[2]
      };
      
      return ResponseFactory.success(
        `Successfully retrieved all billing information for organization ${this.orgName}`,
        combinedData
      );
    } catch (err) {
      return ResponseFactory.error(
        `Failed to retrieve billing information: ${err.message}`,
        err
      );
    }
  }
}

export default BillingManager;