/**
 * @fileoverview Actions entity for GitHubServer
 * @license Apache-2.0
 * @version 3.0.0
 * 
 * @author Michael Hay <michael.hay@mediumroast.io>
 * @copyright 2024 Mediumroast, Inc. All rights reserved.
 */

import { BaseObjects } from '../baseObjects.js';
import { logger } from '../logger.js';

export class Actions extends BaseObjects {
  /**
       * @constructor
       * @param {string} token - GitHub API token
       * @param {string} org - GitHub organization name
       * @param {string} processName - Process name for locking
       */
  constructor(token, org, processName) {
    super(token, org, processName, 'Actions');
  }

  /**
     * Update GitHub Actions workflow files
     * @returns {Promise<Array>} Operation result
     */
  async updateActions() {
    logger.trackOperation(this.objType, 'updateActions');

    return this._executeTransaction([
      // Step 1: Get action manifest
      async () => {
        try {
          const manifestResp = await this.serverCtl.getActionsManifest();
          if (!manifestResp[0]) {
            return manifestResp;
          }

          // Store for next step
          this._tempManifest = manifestResp[2];
          return this._createSuccess('Retrieved actions manifest');
        } catch (err) {
          logger.error('Failed to retrieve actions manifest', err);
          return this._createError(
            `Failed to retrieve actions manifest: ${err.message}`,
            err,
            500
          );
        }
      },

      // Step 2: Install or update each action
      async () => {
        const installStatus = [];

        for (const action of this._tempManifest) {
          try {
            // Check if action exists
            const actionExists = await this.serverCtl.actionExists(action.name);

            let result;
            if (actionExists[0] && actionExists[2]) {
              // Update existing action
              result = await this.serverCtl.updateAction(
                action.name,
                action.content,
                actionExists[2] // SHA
              );
            } else {
              // Create new action
              result = await this.serverCtl.createAction(
                action.name,
                action.content
              );
            }

            // Add to status with operation type
            installStatus.push({
              name: action.name,
              operation: actionExists[0] && actionExists[2] ? 'updated' : 'created',
              success: result[0],
              message: result[1],
              timestamp: new Date().toISOString()
            });

          } catch (err) {
            logger.error(`Failed to install action [${action.name}]`, err);
            installStatus.push({
              name: action.name,
              operation: 'failed',
              success: false,
              message: err.message,
              timestamp: new Date().toISOString()
            });
          }
        }

        // If all installations failed, return error
        if (installStatus.every(status => !status.success)) {
          return this._createError(
            'All action installations failed',
            installStatus,
            500
          );
        }

        return this._createSuccess(
          `Actions installation completed: ${installStatus.filter(s => s.success).length} succeeded, ${installStatus.filter(s => !s.success).length} failed`,
          installStatus
        );
      }
    ], 'update-actions');
  }

  /**
     * Get GitHub Actions billing information
     * @returns {Promise<Array>} Billing information
     */
  async getActionsBilling() {
    logger.trackOperation(this.objType, 'getActionsBilling');
    return this.cache.getOrFetch(
      'actions_billing',
      async () => this.serverCtl.getActionsBillings(),
      this.cacheTimeouts.Actions || 60000
    );
  }

  /**
     * Get all workflow runs
     * @returns {Promise<Array>} List of workflow runs
     */
  async getAll() {
    logger.trackOperation(this.objType, 'getAll');
    return this.cache.getOrFetch(
      'workflow_runs',
      async () => this.serverCtl.getWorkflowRuns(),
      this.cacheTimeouts.Actions || 60000
    );
  }

  /**
     * Get details for a specific workflow run
     * @param {string} runId - Workflow run ID
     * @returns {Promise<Array>} Workflow run details
     */
  async getWorkflowRun(runId) {
    if (!runId) {
      return this._createError(
        'Missing required parameter: [runId]',
        null,
        400
      );
    }

    logger.trackOperation(this.objType, 'getWorkflowRun');
    return this.serverCtl.getWorkflowRun(runId);
  }

  /**
     * Cancel a workflow run
     * @param {string} runId - Workflow run ID to cancel
     * @returns {Promise<Array>} Result of operation
     */
  async cancelWorkflowRun(runId) {
    if (!runId) {
      return this._createError(
        'Missing required parameter: [runId]',
        null,
        400
      );
    }

    logger.trackOperation(this.objType, 'cancelWorkflowRun');
    const result = await this.serverCtl.cancelWorkflowRun(runId);

    // Invalidate cache on successful cancellation
    if (result[0]) {
      this._invalidateCache();
    }

    return result;
  }

  /**
     * Trigger a specific workflow
     * @param {string} workflowId - Workflow file name (e.g., "main.yml")
     * @param {Object} inputs - Workflow inputs
     * @returns {Promise<Array>} Result of operation
     */
  async triggerWorkflow(workflowId, inputs = {}) {
    if (!workflowId) {
      return this._createError(
        'Missing required parameter: [workflowId]',
        null,
        400
      );
    }

    logger.trackOperation(this.objType, 'triggerWorkflow');
    const result = await this.serverCtl.dispatchWorkflow(workflowId, inputs);

    // Invalidate cache on successful trigger
    if (result[0]) {
      this._invalidateCache();
    }

    return result;
  }

  /**
     * Get usage metrics for GitHub Actions
     * @returns {Promise<Array>} Actions usage metrics
     */
  async getUsageMetrics() {
    logger.trackOperation(this.objType, 'getUsageMetrics');

    try {
      // Get billing information
      const billingResp = await this.getActionsBilling();
      if (!billingResp[0]) {
        return billingResp;
      }

      // Get recent workflow runs
      const runsResp = await this.getAll();
      if (!runsResp[0]) {
        return runsResp;
      }

      // Calculate metrics from the data
      const billing = billingResp[2];
      const runs = runsResp[2];

      // Count runs by status
      const statusCounts = {};
      const workflowCounts = {};

      runs.forEach(run => {
        // Count by status
        statusCounts[run.status] = (statusCounts[run.status] || 0) + 1;

        // Count by workflow
        const workflowName = run.workflow_id || 'unknown';
        workflowCounts[workflowName] = (workflowCounts[workflowName] || 0) + 1;
      });

      // Build usage metrics
      const metrics = {
        billing: {
          included_minutes: billing.included_minutes,
          total_minutes_used: billing.total_minutes_used,
          minutes_used_breakdown: billing.minutes_used_breakdown,
          remaining_minutes: Math.max(0, billing.included_minutes - billing.total_minutes_used)
        },
        runs: {
          total: runs.length,
          by_status: statusCounts,
          by_workflow: workflowCounts
        },
        period: {
          start: billing.billing_period?.start_date,
          end: billing.billing_period?.end_date
        }
      };

      return this._createSuccess(
        'Actions usage metrics compiled successfully',
        metrics
      );

    } catch (err) {
      logger.error('Failed to get Actions usage metrics', err);
      return this._createError(
        `Failed to get Actions usage metrics: ${err.message}`,
        err,
        500
      );
    }
  }
}