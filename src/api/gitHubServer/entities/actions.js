/**
 * Actions entity class for GitHub workflow operations
 * @file actions.js
 * @license Apache-2.0
 * @version 3.0.0
 * 
 * @author Michael Hay <michael.hay@mediumroast.io>
 * @copyright 2025 Mediumroast, Inc. All rights reserved.
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
    
    // Add actions-specific cache keys
    this._cacheKeys.workflowRuns = 'workflow_runs';
    this._cacheKeys.actionsBilling = 'actions_billing';
    
    // Set specific cache timeouts
    this.cacheTimeouts.workflowRuns = 60000;    // 1 minute for workflow runs (dynamic data)
    this.cacheTimeouts.actionsBilling = 3600000; // 1 hour for billing info
  }

  /**
   * Update GitHub Actions workflow files
   * @returns {Promise<Array>} Operation result
   */
  async updateActions() {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'updateActions') : 
      { end: () => {} };
    
    try {
      return await this._executeTransaction([
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
    } finally {
      tracking.end();
    }
  }

  /**
   * Get actions billing information
   * @returns {Promise<Array>} Billing information
   */
  async getActionsBilling() {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'getActionsBilling') : 
      { end: () => {} };
    
    try {
      // Use the standardized cache key structure
      return await this.cache.getOrFetch(
        this._cacheKeys.actionsBilling,
        async () => this.serverCtl.getActionsBillings(),
        this.cacheTimeouts.actionsBilling || 60000,
        [] // No dependencies
      );
    } catch (error) {
      return this._createError(
        `Failed to retrieve Actions billing: ${error.message}`,
        error,
        500
      );
    } finally {
      tracking.end();
    }
  }

  /**
   * Get all workflow runs
   * @returns {Promise<Array>} List of workflow runs
   */
  async getAll() {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'getAll') : 
      { end: () => {} };
    
    try {
      return await this.cache.getOrFetch(
        this._cacheKeys.workflowRuns,
        async () => {
          try {
            // Try the original implementation first
            return await this.serverCtl.getWorkflowRuns();
          } catch (error) {
            // If the error is specifically about missing the method, use a fallback
            if (error.message && error.message.includes('getWorkflowRuns is not a function')) {
              logger.warn('getWorkflowRuns not implemented in github.js, using fallback implementation');
              
              // Fallback implementation - returns an empty successful response
              return [
                true, 
                'Workflow runs functionality not fully implemented', 
                { 
                  workflow_runs: [],
                  total_count: 0,
                  message: 'This is a placeholder. The getWorkflowRuns method needs to be implemented in the github.js file.'
                }
              ];
            }
            // If it's another error, rethrow it
            throw error;
          }
        },
        this.cacheTimeouts.workflowRuns || 60000,
        [] // No dependencies
      );
    } catch (error) {
      return this._createError(
        `Failed to retrieve workflow runs: ${error.message}`,
        error,
        500
      );
    } finally {
      tracking.end();
    }
  }

  /**
   * Get details for a specific workflow run
   * @param {string} runId - Workflow run ID
   * @returns {Promise<Array>} Workflow run details
   */
  async getWorkflowRun(runId) {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'getWorkflowRun') : 
      { end: () => {} };
    
    try {
      // Use standardized parameter validation
      const validationError = this._validateParams(
        { runId },
        { runId: 'string' }
      );
        
      if (validationError) return validationError;
      
      // Use cache for individual runs with dependency on all runs
      const runCacheKey = `${this._cacheKeys.workflowRuns}_${runId}`;
      
      return await this.cache.getOrFetch(
        runCacheKey,
        async () => this.serverCtl.getWorkflowRun(runId),
        this.cacheTimeouts.workflowRuns || 60000,
        [this._cacheKeys.workflowRuns] // Depends on all workflow runs
      );
    } catch (error) {
      return this._createError(
        `Failed to retrieve workflow run: ${error.message}`,
        error,
        500
      );
    } finally {
      tracking.end();
    }
  }

  /**
   * Cancel a workflow run
   * @param {string} runId - Workflow run ID to cancel
   * @returns {Promise<Array>} Result of operation
   */
  async cancelWorkflowRun(runId) {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'cancelWorkflowRun') : 
      { end: () => {} };
    
    try {
      // Use standardized parameter validation
      const validationError = this._validateParams(
        { runId },
        { runId: 'string' }
      );
        
      if (validationError) return validationError;
      
      const result = await this.serverCtl.cancelWorkflowRun(runId);

      // Invalidate cache on successful cancellation
      if (result[0]) {
        // Invalidate both the specific run and the list of all runs
        this.cache.invalidate(this._cacheKeys.workflowRuns);
        this.cache.invalidate(`${this._cacheKeys.workflowRuns}_${runId}`);
      }

      return result;
    } catch (error) {
      return this._createError(
        `Failed to cancel workflow run: ${error.message}`,
        error,
        500
      );
    } finally {
      tracking.end();
    }
  }

  /**
   * Trigger a specific workflow
   * @param {string} workflowId - Workflow file name (e.g., "main.yml")
   * @param {Object} inputs - Workflow inputs
   * @returns {Promise<Array>} Result of operation
   */
  async triggerWorkflow(workflowId, inputs = {}) {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'triggerWorkflow') : 
      { end: () => {} };
    
    try {
      // Use standardized parameter validation
      const validationError = this._validateParams(
        { workflowId, inputs },
        { workflowId: 'string', inputs: 'object' }
      );
        
      if (validationError) return validationError;
      
      const result = await this.serverCtl.dispatchWorkflow(workflowId, inputs);

      // Invalidate cache on successful trigger
      if (result[0]) {
        this.cache.invalidate(this._cacheKeys.workflowRuns);
      }

      return result;
    } catch (error) {
      return this._createError(
        `Failed to trigger workflow: ${error.message}`,
        error,
        500
      );
    } finally {
      tracking.end();
    }
  }

  /**
   * Get usage metrics for GitHub Actions
   * @returns {Promise<Array>} Actions usage metrics
   */
  async getUsageMetrics() {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'getUsageMetrics') : 
      { end: () => {} };
    
    try {
      // Use the standardized cache key structure for metrics
      return await this.cache.getOrFetch(
        this._cacheKeys.metrics,
        async () => {
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
        },
        this.cacheTimeouts.metrics || 300000,
        [
          this._cacheKeys.actionsBilling,  // Metrics depend on billing data
          this._cacheKeys.workflowRuns      // Metrics depend on workflow runs data
        ]
      );
    } catch (error) {
      return this._createError(
        `Failed to get Actions usage metrics: ${error.message}`,
        error,
        500
      );
    } finally {
      tracking.end();
    }
  }
}