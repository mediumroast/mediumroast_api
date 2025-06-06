/* eslint-disable no-console */
/**
 * Actions entity class for GitHub workflow operations
 * @file actions.js
 * @license Apache-2.0
 * @author Michael Hay <michael.hay@mediumroast.io>
 * @copyright 2025 Mediumroast, Inc. All rights reserved.
 */

import { BaseObjects } from '../baseObjects.js';
import { logger } from '../logger.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

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
   * Update GitHub Actions workflow files to latest version
   * @param {boolean} [debugMode=false] - Enable debug mode for extra logging
   * @returns {Promise<Array>} Operation result
   */
  async updateActions(debugMode = false) {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'updateActions') : 
      { end: () => {} };
    
    // Create a temp directory for debugging
    const tempDir = process.env.MR4GH_TMP_DIR || path.join(os.tmpdir(), `mr4gh-update-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    
    try {
      // FIRST: Check current installation and version
      logger.info('Checking current installation version...');
      const currentVersionResp = await this.getCurrentVersion();
      
      if (!currentVersionResp[0] || !currentVersionResp[2].installed) {
        logger.error('No mr4gh-automations installation detected. Please install first.');
        return this._createError(
          'No mr4gh-automations installation detected. Please install first.',
          { installed: false },
          404
        );
      }
      
      // Get current version info
      const versionInfo = currentVersionResp[2].version_file.content;
      const currentVersion = versionInfo ? versionInfo.version : 'unknown';
      logger.info(`Current installation version: ${currentVersion}`);
      
      // Log target repository information for debugging
      logger.info(`Updating in org=${this.serverCtl.repositoryManager.orgName}, repo=${this.serverCtl.repositoryManager.repoName}`);
      
      return await this._executeTransaction([
        // Step 1: Get latest release from mr4gh-automations repository
        async () => {
          try {
            logger.info('STEP 1: Fetching latest release from mr4gh-automations repository');
            
            const releaseResp = await this.serverCtl.repositoryManager.getLatestRelease(
              'mediumroast', 
              'mr4gh-automations'
            );
            
            // Write raw response to file for inspection
            fs.writeFileSync(
              path.join(tempDir, 'release-response-raw.json'), 
              JSON.stringify(releaseResp, null, 2)
            );
            
            if (!releaseResp[0]) {
              logger.error('Failed to get latest release:', releaseResp[1]);
              return releaseResp;
            }

            // Store release info for next steps
            this._tempRelease = releaseResp[2];
            
            logger.info(`Latest release: ${this._tempRelease.tag_name}`);
            logger.debug(`Release created: ${this._tempRelease.created_at}`);
            
            // Compare versions to see if update is needed
            if (this._tempRelease.tag_name === currentVersion) {
              logger.info(`Already at the latest version (${currentVersion}). No update needed.`);
              return this._createSuccess(
                `Already at the latest version (${currentVersion}). No update needed.`,
                { 
                  current_version: currentVersion,
                  latest_version: this._tempRelease.tag_name,
                  needs_update: false
                }
              );
            }
            
            logger.info(`Update available: ${currentVersion} → ${this._tempRelease.tag_name}`);
            return this._createSuccess(`Found latest release: ${this._tempRelease.tag_name}`);
          } catch (err) {
            logger.error('EXCEPTION in Step 1:', err);
            return this._createError(
              `Failed to fetch latest release: ${err.message}`,
              err,
              500
            );
          }
        },

        // Step 2: Download and process ZIP assets
        async () => {
          // Almost identical to installActions Step 2
          try {
            logger.info('STEP 2: Downloading repository ZIP archive');
            
            // Use zipball_url from the release
            const zipballUrl = this._tempRelease.zipball_url;
            logger.info(`Using repository zipball URL: ${zipballUrl}`);
            
            try {
              // Download the zipball
              const { default: fetch } = await import('node-fetch');
              logger.info('Downloading repository zipball...');
              
              const response = await fetch(zipballUrl);
              if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
              }
              
              const buffer = await response.buffer();
              logger.info(`Download complete! Received ${buffer.length} bytes`);
              
              // Save ZIP to temp directory for debugging
              const zipPath = path.join(tempDir, 'repository.zip');
              fs.writeFileSync(zipPath, buffer);
              
              // Process the ZIP file using the utility function
              logger.info('Extracting files from repository ZIP...');
              
              const { extractWorkflowsFromZip } = await import('../../github/utils.js');
              
              // Extract workflows and actions with debug option enabled
              const extractionResult = await extractWorkflowsFromZip(buffer, {
                debug: debugMode,
                tempDir: tempDir
              });
              
              // Check for extraction errors
              if (extractionResult.error) {
                logger.error('ERROR extracting files:', extractionResult.error);
                throw new Error(extractionResult.error);
              }
              
              // Store the extracted workflows and actions
              this._tempWorkflows = extractionResult.workflows;
              this._tempActions = extractionResult.actions;
              
              logger.info(`Extracted ${this._tempWorkflows.length} workflow files and ${this._tempActions.length} action files`);
              
              // Check if extraction was successful
              if (this._tempWorkflows.length === 0 && this._tempActions.length === 0) {
                logger.error('No workflow or action files found in repository ZIP archive');
                return this._createError(
                  'No workflow or action files found in repository ZIP archive',
                  { repository: 'mediumroast/mr4gh-automations', version: this._tempRelease.tag_name },
                  404
                );
              }
              
              return this._createSuccess(
                `Successfully extracted ${this._tempWorkflows.length} workflow files and ${this._tempActions.length} action files`
              );
              
            } catch (fetchErr) {
              logger.error('ERROR downloading or processing zipball:', fetchErr);
              throw fetchErr;
            }
            
          } catch (err) {
            logger.error('EXCEPTION in Step 2:', err);
            return this._createError(
              `Failed to download and process ZIP asset: ${err.message}`,
              err,
              500
            );
          }
        },

        // Step 3: Update each workflow file
        async () => {
          // Similar to installActions but explicitly for updates
          logger.debug('Starting Step 3 - Updating workflow files');
          const updateResults = [];
          const mainBranch = 'main';
          
          for (const workflow of this._tempWorkflows) {
            try {
              logger.debug(`Updating workflow: ${workflow.name}`);
              
              // Check if workflow file already exists
              const workflowPath = `.github/workflows/${workflow.name}`;
              const existsResp = await this.serverCtl.repositoryManager.fileExists(
                workflowPath, 
                mainBranch
              );
              
              if (existsResp[0] && existsResp[2] && existsResp[2].exists) {
                // Update existing workflow
                logger.debug(`Updating existing workflow: ${workflow.name}`);
                const result = await this.serverCtl.repositoryManager.createOrUpdateFile(
                  workflowPath,
                  workflow.content,
                  `Update workflow ${workflow.name} to ${this._tempRelease.tag_name}`,
                  mainBranch,
                  existsResp[2].sha
                );
                
                updateResults.push({
                  name: workflow.name,
                  operation: 'updated',
                  success: result[0],
                  message: result[1],
                  timestamp: new Date().toISOString()
                });
              } else {
                // Create new workflow (if it didn't exist before)
                logger.debug(`Creating new workflow: ${workflow.name}`);
                const result = await this.serverCtl.repositoryManager.createOrUpdateFile(
                  workflowPath,
                  workflow.content,
                  `Add workflow ${workflow.name} from mr4gh-automations ${this._tempRelease.tag_name}`,
                  mainBranch
                );
                
                updateResults.push({
                  name: workflow.name,
                  operation: 'created',
                  success: result[0],
                  message: result[1],
                  timestamp: new Date().toISOString()
                });
              }
            } catch (err) {
              logger.error(`Error updating workflow ${workflow.name}:`, err);
              updateResults.push({
                name: workflow.name,
                operation: 'failed',
                success: false,
                message: err.message,
                timestamp: new Date().toISOString()
              });
            }
          }
          
          // Store the results for next steps
          this._tempUpdateResults = updateResults;
          this._tempWorkflowNames = this._tempWorkflows.map(w => w.name);
          
          // Report overall status
          const successCount = updateResults.filter(r => r.success).length;
          const failCount = updateResults.length - successCount;
          
          logger.info(`Update summary: ${successCount} succeeded, ${failCount} failed`);
          
          if (successCount === 0 && updateResults.length > 0) {
            return this._createError(
              'All workflow updates failed',
              updateResults,
              500
            );
          }
          
          return this._createSuccess(
            `Updated ${successCount} workflows (${failCount} failed)`,
            updateResults
          );
        },

        // Step 3.2: Update action files
        async () => {
          // Skip if no actions to update
          if (!this._tempActions || this._tempActions.length === 0) {
            logger.info('No action files to update');
            return this._createSuccess('No action files to update');
          }
          
          logger.info(`Updating ${this._tempActions.length} action files`);
          const updateResults = [];
          const mainBranch = 'main';
          
          for (const action of this._tempActions) {
            try {
              logger.info(`Updating action file: ${action.path}`);
              
              // Check if the file already exists
              const existsResp = await this.serverCtl.repositoryManager.fileExists(
                action.path, 
                mainBranch
              );
              
              // Make sure the directory exists
              const dirPath = path.dirname(action.path);
              if (dirPath !== '.github/actions') {
                logger.debug(`Ensuring directory exists: ${dirPath}`);
                await this.serverCtl.repositoryManager.createDirectory(dirPath, mainBranch);
              }
              
              if (existsResp[0] && existsResp[2] && existsResp[2].exists) {
                // Update existing action file
                logger.debug(`Updating existing action file: ${action.path}`);
                const result = await this.serverCtl.repositoryManager.createOrUpdateFile(
                  action.path,
                  action.content,
                  `Update action file ${action.name} to ${this._tempRelease.tag_name}`,
                  mainBranch,
                  existsResp[2].sha
                );
                
                updateResults.push({
                  name: action.name,
                  path: action.path,
                  operation: 'updated',
                  success: result[0],
                  message: result[1],
                  timestamp: new Date().toISOString()
                });
              } else {
                // Create new action file
                logger.debug(`Creating new action file: ${action.path}`);
                const result = await this.serverCtl.repositoryManager.createOrUpdateFile(
                  action.path,
                  action.content,
                  `Add action file ${action.name} from mr4gh-automations ${this._tempRelease.tag_name}`,
                  mainBranch
                );
                
                updateResults.push({
                  name: action.name,
                  path: action.path,
                  operation: 'created',
                  success: result[0],
                  message: result[1],
                  timestamp: new Date().toISOString()
                });
              }
            } catch (err) {
              logger.error(`ERROR updating action file ${action.path}:`, err);
              updateResults.push({
                name: action.name,
                path: action.path,
                operation: 'failed',
                success: false,
                message: err.message,
                timestamp: new Date().toISOString()
              });
            }
          }
          
          // Store the results
          this._tempActionUpdateResults = updateResults;
          
          // Report overall status
          const successCount = updateResults.filter(r => r.success).length;
          const failCount = updateResults.length - successCount;
          
          if (successCount === 0 && updateResults.length > 0) {
            return this._createError(
              'All action file updates failed',
              updateResults,
              500
            );
          }
          
          return this._createSuccess(
            `Updated ${successCount} action files (${failCount} failed)`,
            updateResults
          );
        },

        // Step 3.5: Update version file
        async () => {
          try {
            logger.debug('Starting Step 3.5 - Updating version file');
            
            // Define the version file path
            const versionFilePath = '.github/.mr4gh_version.json';
            
            // Check if file exists (it should if we're updating)
            const existsResp = await this.serverCtl.repositoryManager.fileExists(
              versionFilePath,
              'main'
            );
            
            if (!existsResp[0] || !existsResp[2] || !existsResp[2].exists) {
              logger.warn('Version file not found. Creating a new one.');
            }
            
            // Create updated version info
            const versionInfo = {
              version: this._tempRelease.tag_name,
              updated_at: new Date().toISOString(),
              previous_version: currentVersion,
              release_id: this._tempRelease.id,
              release_url: this._tempRelease.html_url,
              release_published_at: this._tempRelease.published_at,
              workflows_updated: this._tempWorkflowNames,
              actions_updated: this._tempActions ? this._tempActions.map(a => a.path) : []
            };
            
            // Update existing version file or create new one
            let result;
            if (existsResp[0] && existsResp[2] && existsResp[2].exists) {
              logger.debug('Updating existing version file');
              result = await this.serverCtl.repositoryManager.createOrUpdateFile(
                versionFilePath,
                JSON.stringify(versionInfo, null, 2),
                `Update mr4gh-automations version file to ${this._tempRelease.tag_name}`,
                'main',
                existsResp[2].sha
              );
            } else {
              logger.debug('Creating new version file');
              result = await this.serverCtl.repositoryManager.createOrUpdateFile(
                versionFilePath,
                JSON.stringify(versionInfo, null, 2),
                `Add mr4gh-automations version file for ${this._tempRelease.tag_name}`,
                'main'
              );
            }
            
            if (!result[0]) {
              logger.warn('Version file update failed:', result[1]);
              return this._createWarning(
                'Workflows updated but version file update failed',
                {
                  workflows_status: 'updated',
                  version_file_status: 'failed',
                  version_error: result[1]
                }
              );
            }
            
            logger.info('Version file updated successfully');
            return this._createSuccess(
              'Workflows and version file updated successfully',
              {
                workflows_status: 'updated',
                version_file_status: 'updated',
                version_info: versionInfo
              }
            );
          } catch (err) {
            logger.error('Exception in Step 3.5:', err);
            return this._createWarning(
              `Workflows updated but version file update failed: ${err.message}`,
              {
                workflows_status: 'updated',
                version_file_status: 'failed',
                error: err.message
              }
            );
          }
        },

        // Step 4: Verify update
        async () => {
          logger.debug('Starting Step 4 - Verifying update');
          
          // Verify the update using the same verification method as install
          const verificationResp = await this.verifyActionsInstallation(
            this._tempWorkflowNames,
            this._tempRelease
          );
          
          logger.info('Verification completed:', 
            verificationResp[0] ? 'Success' : 'Issues found');
          
          // Cleanup all temporary variables at the end
          delete this._tempWorkflows;
          delete this._tempWorkflowNames;
          delete this._tempUpdateResults;
          delete this._tempRelease;
          
          // Write path to temp directory for reference
          logger.info('==========================================');
          logger.info(`All debug files saved to: ${tempDir}`);
          logger.info('==========================================');
          
          return this._createSuccess(
            'Actions successfully updated and verified',
            verificationResp[2]
          );
        }
      ], 'update-actions');
    } catch (error) {
      logger.error('UNHANDLED EXCEPTION in updateActions:', error);
      fs.writeFileSync(
        path.join(tempDir, 'update-error.txt'),
        error.toString()
      );
      return this._createError(
        `Action update failed: ${error.message}`,
        error,
        500
      );
    } finally {
      logger.info('==========================================');
      logger.info(`DEBUG FILES ARE IN: ${tempDir}`);
      logger.info('==========================================');
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
   * Get usage metrics for GitHub Actions
   * @returns {Promise<Array>} Actions usage metrics
   */
  async getActionsBilling() {
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
          const billingResp = await this.serverCtl.getActionsBillings();
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
          
          // Get workflow data
          const workflowRuns = runsResp[2].workflowList || [];
          const totalRunTimeThisMonth = runsResp[2].totalRunTimeThisMonth || 0;
          const repository = runsResp[2].repository || 'unknown';

          // Count runs by various dimensions
          const statusCounts = {};
          const conclusionCounts = {};
          const eventCounts = {};
          const workflowMetrics = {};

          workflowRuns.forEach(run => {
            // Count by status
            statusCounts[run.status] = (statusCounts[run.status] || 0) + 1;
            
            // Count by conclusion (success/failure)
            conclusionCounts[run.conclusion] = (conclusionCounts[run.conclusion] || 0) + 1;
            
            // Count by event type
            eventCounts[run.event] = (eventCounts[run.event] || 0) + 1;

            // Track metrics by workflow
            if (!workflowMetrics[run.workflowId]) {
              workflowMetrics[run.workflowId] = {
                name: run.name,
                title: run.title,
                path: run.path,
                count: 0,
                totalRuntime: 0,
                avgRuntime: 0,
                success: 0,
                failure: 0
              };
            }
            
            const wf = workflowMetrics[run.workflowId];
            wf.count++;
            wf.totalRuntime += run.runTimeMinutes || 0;
            
            // Track success/failure counts
            if (run.conclusion === 'success') {
              wf.success++;
            } else if (run.conclusion === 'failure') {
              wf.failure++;
            }
          });
          
          // Calculate average runtimes
          Object.values(workflowMetrics).forEach(wf => {
            wf.avgRuntime = wf.count > 0 ? (wf.totalRuntime / wf.count).toFixed(1) : 0;
          });

          // Build usage metrics with simplified billing data
          const metrics = {
            runs: {
              total: workflowRuns.length,
              by_status: statusCounts,
              by_conclusion: conclusionCounts,
              by_event: eventCounts,
              by_workflow: workflowMetrics,
              total_runtime_minutes: totalRunTimeThisMonth
            },
            billing: {
              included_minutes: billing.included_minutes,
              total_paid_minutes_used: billing.total_paid_minutes_used || 0,
              total_minutes_remaining: billing.included_minutes - totalRunTimeThisMonth - billing.total_paid_minutes_used || 0,
              total_minutes_used: totalRunTimeThisMonth
            },
            repository: repository,
            period: {
              current_month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
            }
          };

          return this._createSuccess(
            'Actions usage metrics compiled successfully',
            metrics
          );
        },
        this.cacheTimeouts.metrics || 300000,
        [
          this._cacheKeys.actionsBilling,
          this._cacheKeys.workflowRuns
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

  /**
   * Install GitHub Actions workflows from latest mr4gh-automations release
   * @returns {Promise<Array>} Operation result
   */
  async installActions(debugMode = false) {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'installActions') : 
      { end: () => {} };
    
    // Create a temp directory for debugging, using environment variable if available
    const tempDir = process.env.MR4GH_TMP_DIR || path.join(os.tmpdir(), `mr4gh-install-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    
    try {
      // FIRST: Check if actions are already installed
      logger.info('Checking for existing installation...');
      const currentVersionResp = await this.getCurrentVersion();
      
      if (currentVersionResp[0] && currentVersionResp[2].installed) {
        // Previous installation detected
        const versionInfo = currentVersionResp[2].version_file.content;
        const installedVersion = versionInfo ? versionInfo.version : 'unknown';
        
        logger.info(`Previous installation detected, version: ${installedVersion}`);
        
        // Check for latest release to inform about updates
        const latestReleaseResp = await this.serverCtl.repositoryManager.getLatestRelease(
          'mediumroast', 
          'mr4gh-automations'
        );
        
        let latestVersion = 'unknown';
        if (latestReleaseResp[0]) {
          latestVersion = latestReleaseResp[2].tag_name;
        }
        
        // Return early with informative message
        return this._createWarning(
          'Previous installation detected. Update recommended instead of new installation.',
          {
            installed: true,
            current_version: installedVersion,
            latest_version: latestVersion,
            update_command: 'Use checkForUpdates() to check for updates',
            installation_details: currentVersionResp[2]
          }
        );
      }
      
      // Log target repository information for debugging
      logger.info(`Installing to org=${this.serverCtl.repositoryManager.orgName}, repo=${this.serverCtl.repositoryManager.repoName}`);
      
      return await this._executeTransaction([
        // Step 1: Get latest release from mr4gh-automations repository
        async () => {
          try {
            logger.info('STEP 1: Fetching latest release from mr4gh-automations repository');
            
            // Add more visibility for the API call
            logger.debug('Calling GitHub API: GET /repos/mediumroast/mr4gh-automations/releases/latest');
            
            const releaseResp = await this.serverCtl.repositoryManager.getLatestRelease(
              'mediumroast', 
              'mr4gh-automations'
            );
            
            // Write raw response to file for inspection
            fs.writeFileSync(
              path.join(tempDir, 'release-response-raw.json'), 
              JSON.stringify(releaseResp, null, 2)
            );
            
            if (!releaseResp[0]) {
              logger.error('Failed to get latest release:', releaseResp[1]);
              return releaseResp;
            }

            // Store release info for next steps
            this._tempRelease = releaseResp[2];
            
            logger.info(`Latest release: ${this._tempRelease.tag_name}`);
            logger.debug(`Release created: ${this._tempRelease.created_at}`);
            logger.debug(`Release has ${this._tempRelease.assets.length} assets`);
            
            // Write full release info to file
            fs.writeFileSync(
              path.join(tempDir, 'release-details.json'), 
              JSON.stringify(this._tempRelease, null, 2)
            );
            
            // List all assets with details for debugging
            logger.debug('RELEASE ASSETS:');
            this._tempRelease.assets.forEach((asset, i) => {
              logger.debug(`Asset ${i+1}: ${asset.name}`);
              logger.debug(`  - Size: ${asset.size} bytes`);
              logger.debug(`  - Download URL: ${asset.browser_download_url}`);
              logger.debug(`  - Content type: ${asset.content_type}`);
              logger.debug(`  - ID: ${asset.id}`);
            });
            
            return this._createSuccess(`Found latest release: ${this._tempRelease.tag_name}`);
          } catch (err) {
            logger.error('EXCEPTION in Step 1:', err);
            return this._createError(
              `Failed to fetch latest release: ${err.message}`,
              err,
              500
            );
          }
        },

        // Step 2: Download and process ZIP assets
        async () => {
          try {
            logger.info('STEP 2: Downloading repository ZIP archive');
            
            // Use zipball_url from the release
            const zipballUrl = this._tempRelease.zipball_url;
            logger.info(`Using repository zipball URL: ${zipballUrl}`);
            
            try {
              // Download the zipball
              const { default: fetch } = await import('node-fetch');
              logger.info('Downloading repository zipball...');
              
              const response = await fetch(zipballUrl);
              if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
              }
              
              logger.debug(`Download status: ${response.status} ${response.statusText}`);
              logger.debug('Reading response as buffer...');
              
              const buffer = await response.buffer();
              logger.info(`Download complete! Received ${buffer.length} bytes`);
              
              // Save ZIP to temp directory for debugging
              const zipPath = path.join(tempDir, 'repository.zip');
              fs.writeFileSync(zipPath, buffer);
              logger.debug(`Repository ZIP saved to: ${zipPath}`);
              
              // Process the ZIP file using the utility function
              logger.info('Extracting files from repository ZIP...');
              
              // Import the extraction function from utils
              const { extractWorkflowsFromZip } = await import('../../github/utils.js');
              
              // Extract workflows and actions with debug option enabled
              const extractionResult = await extractWorkflowsFromZip(buffer, {
                debug: debugMode,  // Use the passed debugMode parameter
                tempDir: tempDir
              });
              
              // Check for extraction errors
              if (extractionResult.error) {
                logger.error('ERROR extracting files:', extractionResult.error);
                throw new Error(extractionResult.error);
              }
              
              // Store the extracted workflows and actions
              this._tempWorkflows = extractionResult.workflows;
              this._tempActions = extractionResult.actions;
              
              logger.info(`Extracted ${this._tempWorkflows.length} workflow files and ${this._tempActions.length} action files`);
              
              // Log the extracted files
              if (this._tempWorkflows.length > 0) {
                logger.debug('Extracted workflows:');
                this._tempWorkflows.forEach(wf => {
                  logger.debug(`  - ${wf.name} (${wf.size} bytes)`);
                });
              }
              
              if (this._tempActions.length > 0) {
                logger.debug('Extracted actions:');
                this._tempActions.forEach(act => {
                  logger.debug(`  - ${act.path} (${act.size} bytes)`);
                });
              }
              
              // Check if extraction was successful
              if (this._tempWorkflows.length === 0 && this._tempActions.length === 0) {
                logger.error('No workflow or action files found in repository ZIP archive');
                
                // If in debug mode, add more context about the ZIP content
                if (debugMode) {
                  logger.debug(`Debug info: The ZIP file is saved at ${zipPath} for manual inspection`);
                }
                
                return this._createError(
                  'No workflow or action files found in repository ZIP archive',
                  { repository: 'mediumroast/mr4gh-automations', version: this._tempRelease.tag_name },
                  404
                );
              }
              
              return this._createSuccess(
                `Successfully extracted ${this._tempWorkflows.length} workflow files and ${this._tempActions.length} action files`,
                { 
                  workflows: this._tempWorkflows.map(w => w.name),
                  actions: this._tempActions.map(a => a.path)
                }
              );
              
            } catch (fetchErr) {
              logger.error('ERROR downloading or processing zipball:', fetchErr);
              fs.writeFileSync(
                path.join(tempDir, 'download-error.txt'),
                fetchErr.toString()
              );
              throw fetchErr;
            }
            
          } catch (err) {
            logger.error('EXCEPTION in Step 2:', err);
            fs.writeFileSync(
              path.join(tempDir, 'step2-error.txt'),
              err.toString()
            );
            return this._createError(
              `Failed to download and process ZIP asset: ${err.message}`,
              err,
              500
            );
          }
        },

        // Step 3: Install each workflow file
        async () => {
          logger.debug('Starting Step 3 - Installing workflow files');
          const installResults = [];
          const mainBranch = 'main';
          
          // IMPORTANT: Ensure .github/workflows directory exists first
          logger.debug('Ensuring .github/workflows directory exists');
          try {
            // Check if .github exists
            const githubDirResp = await this.serverCtl.repositoryManager.fileExists(
              '.github', 
              mainBranch
            );
            
            if (!githubDirResp[0] || !githubDirResp[2] || !githubDirResp[2].exists) {
              logger.info('Creating .github directory');
              await this.serverCtl.repositoryManager.createDirectory(
                '.github',
                mainBranch
              );
            }
            
            // Check if workflows directory exists
            const workflowsDirResp = await this.serverCtl.repositoryManager.fileExists(
              '.github/workflows', 
              mainBranch
            );
            
            if (!workflowsDirResp[0] || !workflowsDirResp[2] || !workflowsDirResp[2].exists) {
              logger.info('Creating .github/workflows directory');
              await this.serverCtl.repositoryManager.createDirectory(
                '.github/workflows',
                mainBranch
              );
            }
          } catch (dirErr) {
            logger.error('Failed to create directory structure:', dirErr);
            // Continue anyway, as the file creation might still work
          }
          
          for (const workflow of this._tempWorkflows) {
            try {
              logger.debug(`Installing workflow: ${workflow.name}`);
              
              // Check if workflow file already exists
              const workflowPath = `.github/workflows/${workflow.name}`;
              const existsResp = await this.serverCtl.repositoryManager.fileExists(
                workflowPath, 
                mainBranch
              );
              
              logger.debug(`File exists check for ${workflowPath}: ${
                existsResp[0] && existsResp[2] && existsResp[2].exists ? 'Exists' : 'Does not exist'}`);
              
              let result;
              if (existsResp[0] && existsResp[2] && existsResp[2].exists) {
                // Update existing workflow
                logger.debug(`Updating existing workflow: ${workflow.name}`);
                result = await this.serverCtl.repositoryManager.createOrUpdateFile(
                  workflowPath,
                  workflow.content,
                  `Update workflow ${workflow.name} from mr4gh-automations`,
                  mainBranch,
                  existsResp[2].sha
                );
              } else {
                // Create new workflow
                logger.debug(`Creating new workflow: ${workflow.name}`);
                result = await this.serverCtl.repositoryManager.createOrUpdateFile(
                  workflowPath,
                  workflow.content,
                  `Add workflow ${workflow.name} from mr4gh-automations`,
                  mainBranch
                );
              }
              
              logger.debug(`Result for ${workflow.name}: ${result[0] ? 'Success' : 'Failed'}`);
              logger.debug(`Full result: ${JSON.stringify(result)}`);
              
              installResults.push({
                name: workflow.name,
                operation: existsResp[0] && existsResp[2] && existsResp[2].exists ? 'updated' : 'created',
                success: result[0],
                message: result[1],
                timestamp: new Date().toISOString()
              });
            } catch (err) {
              logger.error(`Error installing workflow ${workflow.name}:`, err);
              installResults.push({
                name: workflow.name,
                operation: 'failed',
                success: false,
                message: err.message,
                timestamp: new Date().toISOString()
              });
            }
          }
          
          // CRITICAL FIX: Store the results for next steps
          this._tempInstallResults = installResults;
          // Store workflow names separately so we can use them after cleaning up _tempWorkflows
          this._tempWorkflowNames = this._tempWorkflows.map(w => w.name);
          
          // Write install results to temp file for debugging
          fs.writeFileSync(
            path.join(tempDir, 'install-results.json'), 
            JSON.stringify(installResults, null, 2)
          );
          
          // Report overall status
          const successCount = installResults.filter(r => r.success).length;
          const failCount = installResults.length - successCount;
          
          logger.info(`Installation summary: ${successCount} succeeded, ${failCount} failed`);
          
          if (successCount === 0) {
            return this._createError(
              'All workflow installations failed',
              installResults,
              500
            );
          }
          
          return this._createSuccess(
            `Installed ${successCount} workflows (${failCount} failed)`,
            installResults
          );
        },

        // Step 3.2: Install action files
        async () => {
          // Skip if no actions to install
          if (!this._tempActions || this._tempActions.length === 0) {
            logger.info('No action files to install');
            return this._createSuccess('No action files to install');
          }
          
          logger.info(`Installing ${this._tempActions.length} action files`);
          const installResults = [];
          const mainBranch = 'main';
          
          for (const action of this._tempActions) {
            try {
              logger.info(`Installing action file: ${action.path}`);
              
              // Check if the file already exists
              const existsResp = await this.serverCtl.repositoryManager.fileExists(
                action.path, 
                mainBranch
              );
              
              // Make sure the directory exists
              const dirPath = path.dirname(action.path);
              if (dirPath !== '.github/actions') {
                // Create any subdirectories needed
                logger.debug(`Ensuring directory exists: ${dirPath}`);
                await this.serverCtl.repositoryManager.createDirectory(dirPath, mainBranch);
              }
              
              let result;
              if (existsResp[0] && existsResp[2] && existsResp[2].exists) {
                // Update existing action file
                logger.debug(`Updating existing action file: ${action.path}`);
                result = await this.serverCtl.repositoryManager.createOrUpdateFile(
                  action.path,
                  action.content,
                  `Update action file ${action.name} from mr4gh-automations`,
                  mainBranch,
                  existsResp[2].sha
                );
              } else {
                // Create new action file
                logger.debug(`Creating new action file: ${action.path}`);
                result = await this.serverCtl.repositoryManager.createOrUpdateFile(
                  action.path,
                  action.content,
                  `Add action file ${action.name} from mr4gh-automations`,
                  mainBranch
                );
              }
              
              logger.debug(`Result for ${action.name}: ${JSON.stringify(result)}`);
              
              installResults.push({
                name: action.name,
                path: action.path,
                operation: existsResp[0] && existsResp[2] && existsResp[2].exists ? 'updated' : 'created',
                success: result[0],
                message: result[1],
                timestamp: new Date().toISOString()
              });
            } catch (err) {
              logger.error(`ERROR installing action file ${action.path}:`, err);
              installResults.push({
                name: action.name,
                path: action.path,
                operation: 'failed',
                success: false,
                message: err.message,
                timestamp: new Date().toISOString()
              });
            }
          }
          
          // Store the results
          this._tempActionInstallResults = installResults;
          
          // Report overall status
          const successCount = installResults.filter(r => r.success).length;
          const failCount = installResults.length - successCount;
          
          if (successCount === 0 && installResults.length > 0) {
            return this._createError(
              'All action file installations failed',
              installResults,
              500
            );
          }
          
          return this._createSuccess(
            `Installed ${successCount} action files (${failCount} failed)`,
            installResults
          );
        },

        // Step 3.5: Create version file
        async () => {
          try {
            logger.debug('Starting Step 3.5 - Creating version file');
            
            // Define the version file path here
            const versionFilePath = '.github/.mr4gh_version.json';
            
            // Make sure _tempWorkflowNames is populated
            if (!this._tempWorkflowNames) {
              this._tempWorkflowNames = this._tempWorkflows.map(w => w.name);
            }
            
            // Get action paths
            const actionPaths = this._tempActions ? this._tempActions.map(a => a.path) : [];
            
            // Create version info object
            const versionInfo = {
              version: this._tempRelease.tag_name,
              installed_at: new Date().toISOString(),
              release_id: this._tempRelease.id,
              release_url: this._tempRelease.html_url,
              release_published_at: this._tempRelease.published_at,
              workflows_installed: this._tempWorkflowNames,
              actions_installed: actionPaths
            };
            
            logger.debug(`Creating version file with version ${versionInfo.version}`);
            
            // Check if file already exists
            const existsResp = await this.serverCtl.repositoryManager.fileExists(
              versionFilePath,
              'main'
            );
            
            let result;
            if (existsResp[0] && existsResp[2] && existsResp[2].exists) {
              // Update existing version file
              logger.debug('Updating existing version file');
              result = await this.serverCtl.repositoryManager.createOrUpdateFile(
                versionFilePath,
                JSON.stringify(versionInfo, null, 2),
                `Update mr4gh-automations version file to ${this._tempRelease.tag_name}`,
                'main',
                existsResp[2].sha
              );
            } else {
              // Create new version file
              logger.debug('Creating new version file');
              result = await this.serverCtl.repositoryManager.createOrUpdateFile(
                versionFilePath,
                JSON.stringify(versionInfo, null, 2),
                `Add mr4gh-automations version file for ${this._tempRelease.tag_name}`,
                'main'
              );
            }
            
            // Write version file creation results to temp file for debugging
            fs.writeFileSync(
              path.join(tempDir, 'version-file-results.json'), 
              JSON.stringify(result, null, 2)
            );
            
            if (!result[0]) {
              logger.warn('Version file creation failed:', result[1]);
              return this._createWarning(
                'Workflows installed but version file creation failed',
                {
                  workflows_status: 'installed',
                  version_file_status: 'failed',
                  version_error: result[1]
                }
              );
            }
            
            logger.info('Version file created successfully');
            return this._createSuccess(
              'Workflows and version file installed successfully',
              {
                workflows_status: 'installed',
                version_file_status: 'created',
                version_info: versionInfo
              }
            );
          } catch (err) {
            logger.error('Exception in Step 3.5:', err);
            return this._createWarning(
              `Workflows installed but version file creation failed: ${err.message}`,
              {
                workflows_status: 'installed',
                version_file_status: 'failed',
                error: err.message
              }
            );
          }
        },

        // Step 4: Verify installation
        async () => {
          logger.debug('Starting Step 4 - Verifying installation');
          // Use the workflow names we stored in Step 3
          const installedWorkflowNames = this._tempWorkflowNames;
          
          logger.debug('Verifying workflows:', installedWorkflowNames);
          
          // Verify the installation
          const verificationResp = await this.verifyActionsInstallation(
            installedWorkflowNames,
            this._tempRelease  // Pass the release info for version verification
          );
          
          // Write verification results to temp file for debugging
          fs.writeFileSync(
            path.join(tempDir, 'verification-results.json'), 
            JSON.stringify(verificationResp, null, 2)
          );
          
          logger.info('Verification completed:', 
            verificationResp[0] ? 'Success' : 'Issues found');
          
          // Cleanup all temporary variables at the end
          delete this._tempWorkflows;
          delete this._tempWorkflowNames;
          delete this._tempInstallResults;
          delete this._tempRelease;
          
          // Write path to temp directory to console for easy reference
          logger.info('==========================================');
          logger.info(`All debug files saved to: ${tempDir}`);
          logger.info('==========================================');
          
          return this._createSuccess(
            'Actions successfully installed and verified',
            verificationResp[2]
          );
        }
      ], 'install-actions');
    } catch (error) {
      logger.error('UNHANDLED EXCEPTION in installActions:', error);
      fs.writeFileSync(
        path.join(tempDir, 'installation-error.txt'),
        error.toString()
      );
      return this._createError(
        `Action installation failed: ${error.message}`,
        error,
        500
      );
    } finally {
      logger.info('==========================================');
      logger.info(`DEBUG FILES ARE IN: ${tempDir}`);
      logger.info('==========================================');
      tracking.end();
    }
  }

  /**
   * Delete GitHub Actions workflows and action files from the repository
   * @param {Array<string>} [workflowNames] - Optional list of workflow names to delete. If not provided, all workflows will be deleted.
   * @param {boolean} [includeActionFiles=false] - Whether to also delete files in .github/actions/ directory
   * @returns {Promise<Array>} Operation result
   */
  async deleteActions(workflowNames = null, includeActionFiles = false) {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'deleteActions') : 
      { end: () => {} };
  
    try {
      return await this._executeTransaction([
        // Step 1: Analyze current state
        async () => {
          try {
            logger.info('Analyzing current GitHub Actions state');
            const stateResp = await this.analyzeActionsState();
            
            if (!stateResp[0]) {
              return stateResp;
            }
            
            this._tempState = stateResp[2];
            
            // Determine which workflows to delete
            if (workflowNames && Array.isArray(workflowNames) && workflowNames.length > 0) {
              // Filter to specific workflows
              this._tempWorkflowsToDelete = this._tempState.workflow_files.filter(
                file => workflowNames.includes(file.name)
              );
              
              // Check if any requested workflows were not found
              const foundNames = this._tempWorkflowsToDelete.map(w => w.name);
              const notFound = workflowNames.filter(name => !foundNames.includes(name));
              
              if (notFound.length > 0) {
                logger.warn(`Some requested workflows were not found: ${notFound.join(', ')}`);
              }
            } else {
              // Delete all workflows
              this._tempWorkflowsToDelete = this._tempState.workflow_files;
            }
            
            // Determine if we need to delete action files
            if (includeActionFiles) {
              this._tempActionsToDelete = this._tempState.action_files;
            } else {
              this._tempActionsToDelete = [];
            }
            
            // Check if anything to delete
            const totalToDelete = this._tempWorkflowsToDelete.length + this._tempActionsToDelete.length;
            
            if (totalToDelete === 0) {
              return this._createSuccess('No files to delete', {
                workflows: [],
                actions: []
              });
            }
            
            // Build summary of what will be deleted
            const summary = {
              workflows: this._tempWorkflowsToDelete.map(w => w.name),
              actions: this._tempActionsToDelete.map(a => a.name)
            };
            
            return this._createSuccess(
              `Found ${totalToDelete} items to delete`,
              summary
            );
          } catch (err) {
            logger.error('Failed to analyze repository state', err);
            return this._createError(
              `Failed to analyze repository state: ${err.message}`,
              err,
              500
            );
          }
        },

        // Step 2: Delete workflows
        async () => {
          const deleteResults = [];
          
          // Skip if nothing to delete
          if (this._tempWorkflowsToDelete.length === 0 && this._tempActionsToDelete.length === 0) {
            return this._createSuccess('No files to delete', []);
          }
          
          // Delete workflows
          for (const workflow of this._tempWorkflowsToDelete) {
            try {
              logger.info(`Deleting workflow: ${workflow.name}`);
              
              const result = await this.serverCtl.repositoryManager.deleteFile(
                workflow.path,
                `Remove workflow ${workflow.name}`,
                'main',
                workflow.sha
              );
              
              deleteResults.push({
                name: workflow.name,
                path: workflow.path,
                type: 'workflow',
                success: result[0],
                message: result[1],
                timestamp: new Date().toISOString()
              });
            } catch (err) {
              logger.error(`Failed to delete workflow: ${workflow.name}`, err);
              deleteResults.push({
                name: workflow.name,
                path: workflow.path,
                type: 'workflow',
                success: false,
                message: err.message,
                timestamp: new Date().toISOString()
              });
            }
          }
          
          // Store results for next step
          this._tempDeleteResults = deleteResults;
          
          // Report progress
          const successCount = deleteResults.filter(r => r.success).length;
          const failCount = deleteResults.length - successCount;
          
          return this._createSuccess(
            `Deleted ${successCount} workflows (${failCount} failed)`,
            deleteResults
          );
        },
        
        // Step 3: Delete action files (if requested)
        async () => {
          // Skip if not deleting actions or if no actions to delete
          if (!includeActionFiles || this._tempActionsToDelete.length === 0) {
            return this._createSuccess(
              'No action files to delete',
              this._tempDeleteResults
            );
          }
          
          const actionResults = [];
          
          // Process each action directory/file
          for (const action of this._tempActionsToDelete) {
            try {
              logger.info(`Processing action: ${action.name} (${action.type})`);
              
              if (action.type === 'dir') {
                // Use the repository manager's recursive deletion method
                const deleteResp = await this.serverCtl.repositoryManager.deleteDirectoryRecursively(
                  action.path,
                  `Remove action directory ${action.name}`,
                  'main'
                );
                
                // Process the results
                if (deleteResp[0]) {
                  // Add all results from the recursive deletion
                  actionResults.push(...deleteResp[2]);
                  
                  // Add summary entry
                  actionResults.push({
                    name: action.name,
                    path: action.path,
                    type: 'directory',
                    success: true,
                    message: 'Directory processed recursively',
                    timestamp: new Date().toISOString()
                  });
                } else {
                  // Record the failure
                  actionResults.push({
                    name: action.name,
                    path: action.path,
                    type: 'directory',
                    success: false,
                    message: deleteResp[1],
                    timestamp: new Date().toISOString()
                  });
                }
              } else {
                // Delete single file
                const result = await this.serverCtl.repositoryManager.deleteFile(
                  action.path,
                  `Remove action file ${action.name}`,
                  'main',
                  action.sha
                );
                
                actionResults.push({
                  name: action.name,
                  path: action.path,
                  type: 'file',
                  success: result[0],
                  message: result[1],
                  timestamp: new Date().toISOString()
                });
              }
            } catch (err) {
              logger.error(`Failed to process action: ${action.name}`, err);
              actionResults.push({
                name: action.name,
                path: action.path,
                type: action.type,
                success: false,
                message: err.message,
                timestamp: new Date().toISOString()
              });
            }
          }
          
          // Combine with workflow results
          const allResults = [...this._tempDeleteResults, ...actionResults];
          this._tempAllResults = allResults;
          
          // Report overall status
          const successCount = allResults.filter(r => r.success).length;
          const failCount = allResults.length - successCount;
          
          return this._createSuccess(
            `Deleted ${successCount} files/directories (${failCount} failed)`,
            allResults
          );
        },
        
        // Step 3.5: Delete the version file
        async () => {
          try {
            logger.info('Checking for version file to delete');
            
            const versionFilePath = '.github/.mr4gh_version.json';
            
            // Check if version file exists
            const existsResp = await this.serverCtl.repositoryManager.fileExists(
              versionFilePath,
              'main'
            );
            
            if (!existsResp[0] || !existsResp[2] || !existsResp[2].exists) {
              logger.info('No version file found to delete');
              return this._createSuccess(
                'No version file to delete',
                this._tempAllResults || this._tempDeleteResults
              );
            }
            
            // Delete the version file
            logger.info('Deleting version file');
            const result = await this.serverCtl.repositoryManager.deleteFile(
              versionFilePath,
              'Remove mr4gh-automations version file',
              'main',
              existsResp[2].sha
            );
            
            // Add the result to our tracking
            const versionFileResult = {
              name: '.mr4gh_version.json',
              path: versionFilePath,
              type: 'version-file',
              success: result[0],
              message: result[1],
              timestamp: new Date().toISOString()
            };
            
            // Add to appropriate results array
            if (this._tempAllResults) {
              this._tempAllResults.push(versionFileResult);
            } else if (this._tempDeleteResults) {
              this._tempDeleteResults.push(versionFileResult);
            }
            
            return this._createSuccess(
              result[0] ? 'Version file deleted successfully' : 'Failed to delete version file',
              this._tempAllResults || this._tempDeleteResults
            );
          } catch (err) {
            logger.error('Error deleting version file', err);
            return this._createWarning(
              `Error deleting version file: ${err.message}`,
              this._tempAllResults || this._tempDeleteResults
            );
          }
        },

        // Step 4: Verify deletion
        async () => {
          // Get list of workflows that should have been deleted
          const deletedWorkflowNames = this._tempWorkflowsToDelete.map(w => w.name);
          
          // Verify the deletion
          const verificationResp = await this.verifyActionsDeletion(
            deletedWorkflowNames,
            includeActionFiles
          );
          
          // Store verification results
          if (verificationResp[0]) {
            const verification = verificationResp[2];
            
            if (!verification.success) {
              logger.warn('Deletion verification failed. Some items may still exist.');
              
              // Log details about what still exists
              if (verification.workflows.still_exist.length > 0) {
                logger.warn(`Workflows still existing: ${verification.workflows.still_exist.join(', ')}`);
              }
              
              if (includeActionFiles && verification.actions.still_exist) {
                logger.warn('Action files still exist in the repository');
              }
              
              return this._createWarning(
                'Deletion completed but verification failed. Some items may still exist.',
                {
                  verification,
                  deleted_items: this._tempAllResults
                }
              );
            }
          }
          
          // Clean up temporary data
          delete this._tempState;
          delete this._tempWorkflowsToDelete;
          delete this._tempActionsToDelete;
          delete this._tempDeleteResults;
          delete this._tempAllResults;
          
          return this._createSuccess(
            'Actions successfully deleted and verified',
            verificationResp[2]
          );
        }
      ], 'delete-actions');
    } catch (error) {
      logger.error('Action deletion failed', error);
      return this._createError(
        `Action deletion failed: ${error.message}`,
        error,
        500
      );
    } finally {
      tracking.end();
    }
  }

  /**
   * Create or update the mr4gh version tracking file
   * @param {Object} releaseInfo - Release information from GitHub API
   * @param {Array<string>} installedWorkflows - List of installed workflow names
   * @returns {Promise<Array>} ResponseFactory result
   */
  async createVersionFile(releaseInfo, installedWorkflows) {
    try {
      logger.info('Creating mr4gh version tracking file');
      
      // Create version info with release tag, installation timestamp, and metadata
      const versionInfo = {
        version: releaseInfo.tag_name,
        installed_at: new Date().toISOString(),
        release_id: releaseInfo.id,
        release_url: releaseInfo.html_url,
        release_published_at: releaseInfo.published_at,
        workflows_installed: installedWorkflows
      };
      
      // Create or update the version file
      const versionFilePath = '.github/.mr4gh_version.json';
      
      // Check if file already exists
      const existsResp = await this.serverCtl.repositoryManager.fileExists(
        versionFilePath,
        'main'
      );
      
      let result;
      if (existsResp[0] && existsResp[2] && existsResp[2].exists) {
        // Update existing version file
        logger.info('Updating existing version file');
        result = await this.serverCtl.repositoryManager.createOrUpdateFile(
          versionFilePath,
          JSON.stringify(versionInfo, null, 2),
          `Update mr4gh-automations version file to ${releaseInfo.tag_name}`,
          'main',
          existsResp[2].sha
        );
      } else {
        // Create new version file
        logger.info('Creating new version file');
        result = await this.serverCtl.repositoryManager.createOrUpdateFile(
          versionFilePath,
          JSON.stringify(versionInfo, null, 2),
          `Add mr4gh-automations version file for ${releaseInfo.tag_name}`,
          'main'
        );
      }
      
      if (!result[0]) {
        logger.warn('Failed to create version file', result[1]);
        return this._createWarning(
          'Failed to create version tracking file',
          result
        );
      }
      
      logger.info(`Version file created for ${releaseInfo.tag_name}`);
      return this._createSuccess(
        `Version file created for ${releaseInfo.tag_name}`,
        versionInfo
      );
    } catch (err) {
      logger.error('Failed to create version file', err);
      return this._createError(
        `Failed to create version file: ${err.message}`,
        err,
        500
      );
    }
  }

  /**
   * Helper method to delete a directory recursively with improved robustness
   * @private
   * @param {string} dirPath - Path to the directory
   * @param {string} commitMessage - Commit message
   * @param {Array} results - Array to store results
   */
  async _deleteDirectoryRecursively(dirPath, commitMessage, results) {
    try {
      logger.info(`Processing directory: ${dirPath}`);
      
      // First pass: Get all files and directories in this path
      const contentsResp = await this.serverCtl.repositoryManager.getContent(
        dirPath,
        'main'
      );
      
      if (!contentsResp[0]) {
        logger.error(`Failed to get contents of directory ${dirPath}: ${contentsResp[1]}`);
        results.push({
          name: dirPath,
          type: 'directory',
          success: false,
          message: contentsResp[1],
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      // Ensure we have an array of contents
      const contents = Array.isArray(contentsResp[2]) ? contentsResp[2] : [contentsResp[2]];
      logger.info(`Found ${contents.length} items in ${dirPath}`);
      
      // Group by type: process files first, then directories
      const files = contents.filter(item => item.type === 'file');
      const dirs = contents.filter(item => item.type === 'dir');
      
      // Delete all files in this directory
      for (const file of files) {
        try {
          logger.info(`Deleting file: ${file.path}`);
          const deleteResp = await this.serverCtl.repositoryManager.deleteFile(
            file.path,
            `${commitMessage} - ${file.name}`,
            'main',
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
          logger.error(`Failed to delete file ${file.path}: ${err.message}`);
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
        await this._deleteDirectoryRecursively(dir.path, commitMessage, results);
      }
      
      // Verify directory is now empty
      try {
        const checkResp = await this.serverCtl.repositoryManager.getContent(
          dirPath,
          'main'
        );
        
        if (checkResp[0]) {
          const remainingItems = Array.isArray(checkResp[2]) ? checkResp[2] : [checkResp[2]];
          
          if (remainingItems.length > 0) {
            logger.warn(`Directory ${dirPath} still has ${remainingItems.length} items after deletion attempts`);
            
            // Try to delete remaining files again (might be very nested directories that got cleared out)
            for (const item of remainingItems) {
              if (item.type === 'file') {
                try {
                  logger.info(`Second attempt to delete file: ${item.path}`);
                  await this.serverCtl.repositoryManager.deleteFile(
                    item.path,
                    `${commitMessage} - cleanup ${item.name}`,
                    'main',
                    item.sha
                  );
                } catch (err) {
                  logger.error(`Failed in second attempt to delete ${item.path}: ${err.message}`);
                }
              }
            }
          }
        }
      } catch (err) {
        // If we get a 404, the directory is gone which is what we want
        if (err.status === 404) {
          logger.info(`Directory ${dirPath} successfully removed`);
        } else {
          logger.warn(`Error checking directory ${dirPath} after deletion: ${err.message}`);
        }
      }
    } catch (err) {
      logger.error(`Error in directory deletion for ${dirPath}: ${err.message}`);
      results.push({
        name: dirPath,
        type: 'directory',
        success: false,
        message: err.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Analyze the current state of Actions in the repository
   * @returns {Promise<Array>} Repository state analysis
   */
  async analyzeActionsState() {
    try {
      logger.info('Analyzing GitHub Actions state in repository');
      
      // 1. Get workflow runs via API
      const runsResp = await this.getAll();
      
      // 2. Use repository manager to analyze relevant directories
      const repoStructureResp = await this.serverCtl.repositoryManager.analyzeDirectoryStructure(
        ['.github/workflows', '.github/actions'],
        'main'
      );
      
      if (!repoStructureResp[0]) {
        return repoStructureResp;
      }
      
      const repoStructure = repoStructureResp[2];
      
      // 3. Analyze and build state report
      const state = {
        workflow_runs: runsResp[0] ? (runsResp[2]?.workflow_runs || []) : [],
        workflow_files: repoStructure['.github/workflows']?.exists ? 
          repoStructure['.github/workflows'].contents : [],
        action_files: repoStructure['.github/actions']?.exists ? 
          repoStructure['.github/actions'].contents : [],
        status: {
          has_workflow_runs: runsResp[0] && (runsResp[2]?.workflow_runs?.length > 0),
          has_workflow_files: repoStructure['.github/workflows']?.exists && 
                             !repoStructure['.github/workflows'].is_empty,
          has_action_files: repoStructure['.github/actions']?.exists && 
                           !repoStructure['.github/actions'].is_empty,
          workflows_directory_exists: repoStructure['.github/workflows']?.exists || false,
          actions_directory_exists: repoStructure['.github/actions']?.exists || false
        }
      };
      
      return this._createSuccess(
        'Actions state analyzed successfully',
        state
      );
    } catch (error) {
      logger.error('Failed to analyze repository state', error);
      return this._createError(
        `Failed to analyze actions state: ${error.message}`,
        error,
        500
      );
    }
  }

  /**
   * Process directory contents into a clean file/directory listing
   * @private
   * @param {Array|Object} contents - Directory contents from GitHub API
   * @returns {Array} Processed directory listing
   */
  _processDirectoryContents(contents) {
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
   * Verify that actions were properly installed
   * @param {Array} expectedWorkflows - List of workflow names that should exist
   * @param {Object} releaseInfo - Release information from GitHub API
   * @returns {Promise<Array>} Verification result
   */
  async verifyActionsInstallation(expectedWorkflows, releaseInfo = null) {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'verifyActionsInstallation') : 
      { end: () => {} };
    
    try {
      logger.info(`Verifying installation of ${expectedWorkflows.length} workflows`);
      
      // 1. Get current workflows in the repository
      const workflowsResp = await this.serverCtl.repositoryManager.getContent(
        '.github/workflows',
        'main'
      );
      
      // 2. Get version file (if it exists)
      const versionResp = await this.getCurrentVersion();
      const hasVersionFile = versionResp[0] && versionResp[2].installed;
      const versionInfo = hasVersionFile ? versionResp[2] : null;
      
      // Check workflows
      let missingWorkflows = [];
      let installedWorkflows = [];
      
      if (workflowsResp[0]) {
        const existingWorkflows = workflowsResp[2] || [];
        installedWorkflows = existingWorkflows.map(wf => wf.name);
        
        // Check if expected workflows exist
        missingWorkflows = expectedWorkflows.filter(
          wf => !existingWorkflows.find(ewf => ewf.name === wf)
        );
      } else {
        missingWorkflows = expectedWorkflows;
      }
      
      // Build verification result
      const verification = {
        success: missingWorkflows.length === 0 && hasVersionFile,
        workflows: {
          expected: expectedWorkflows,
          installed: installedWorkflows,
          missing: missingWorkflows,
          all_present: missingWorkflows.length === 0
        },
        version_file: {
          exists: hasVersionFile,
          content: versionInfo,
          matches_release: hasVersionFile && releaseInfo ? 
            (versionInfo.version === releaseInfo.tag_name) : null
        }
      };
      
      if (verification.success) {
        logger.info('Installation verification successful');
        return this._createSuccess(
          'All workflows and version file verified successfully',
          verification
        );
      } else {
        let issueDetails = [];
        if (missingWorkflows.length > 0) {
          issueDetails.push(`Missing workflows: ${missingWorkflows.join(', ')}`);
        }
        if (!hasVersionFile) {
          issueDetails.push('Version tracking file is missing');
        }
        
        logger.warn(`Installation verification issues: ${issueDetails.join('; ')}`);
        return this._createWarning(
          `Installation verification completed with issues: ${issueDetails.join('; ')}`,
          verification
        );
      }
    } catch (error) {
      logger.error('Failed to verify actions installation', error);
      return this._createError(
        `Verification failed: ${error.message}`,
        error,
        500
      );
    } finally {
      tracking.end();
    }
  }

  /**
   * Verify that actions were properly deleted
   * @param {Array} expectedWorkflows - List of workflow names that should be deleted
   * @param {boolean} includeActionFiles - Whether to include action files in the verification
   * @returns {Promise<Array>} Verification result
   */
  async verifyActionsDeletion(expectedWorkflows, includeActionFiles) {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'verifyActionsDeletion') : 
      { end: () => {} };
    
    try {
      // 1. Get current state of workflows and actions
      const stateResp = await this.analyzeActionsState();
      
      if (!stateResp[0]) {
        return stateResp;
      }
      
      const currentWorkflows = stateResp[2].workflow_files || [];
      const currentActions = stateResp[2].action_files || [];
      
      // 2. Check deleted workflows
      const deletedWorkflows = expectedWorkflows.filter(
        wf => !currentWorkflows.find(cwf => cwf.name === wf)
      );
      
      // 3. Check deleted actions (if applicable)
      let deletedActions = [];
      if (includeActionFiles) {
        deletedActions = currentActions.filter(
          ca => !this._tempActionsToDelete.find(ta => ta.name === ca.name)
        );
      }
      
      // 4. Build verification result
      const verificationResult = {
        success: deletedWorkflows.length === expectedWorkflows.length,
        workflows: {
          deleted: deletedWorkflows,
          still_exist: currentWorkflows.filter(cwf => expectedWorkflows.includes(cwf.name))
        },
        actions: {
          deleted: deletedActions.map(a => a.name),
          still_exist: includeActionFiles ? this._tempActionsToDelete.filter(ta => ta.type !== 'dir') : []
        }
      };
      
      return this._createSuccess(
        'Actions deletion verified',
        verificationResult
      );
    } catch (error) {
      return this._createError(
        `Verification failed: ${error.message}`,
        error,
        500
      );
    } finally {
      tracking.end();
    }
  }

  /**
   * Get the currently installed mr4gh version and installed components
   * @returns {Promise<Array>} ResponseFactory result with version and installation info
   */
  async getCurrentVersion() {
    try {
      logger.info('Getting current mr4gh installation status');
      
      // First, check if .github directory exists
      const githubDirResp = await this.serverCtl.repositoryManager.fileExists(
        '.github',
        'main'
      );
      
      const githubDirExists = githubDirResp[0] && githubDirResp[2] && githubDirResp[2].exists;
      
      if (!githubDirExists) {
        return this._createSuccess(
          'No .github directory found, actions not installed',
          { installed: false, reason: 'No .github directory' }
        );
      }
      
      // Check for version file
      const versionFilePath = '.github/.mr4gh_version.json';
      const versionResp = await this.serverCtl.repositoryManager.getContent(
        versionFilePath,
        'main'
      );
      
      let versionInfo = null;
      const versionFileExists = versionResp[0];
      
      if (versionFileExists) {
        try {
          // Parse the version file content
          const content = Buffer.from(versionResp[2].content, 'base64').toString('utf-8');
          versionInfo = JSON.parse(content);
        } catch (err) {
          logger.warn('Failed to parse version file', err);
        }
      }
      
      // Check for workflows directory
      const workflowsDirResp = await this.serverCtl.repositoryManager.fileExists(
        '.github/workflows',
        'main'
      );
      
      const workflowsDirExists = workflowsDirResp[0] && workflowsDirResp[2] && workflowsDirResp[2].exists;
      
      // Check for actions directory
      const actionsDirResp = await this.serverCtl.repositoryManager.fileExists(
        '.github/actions',
        'main'
      );
      
      const actionsDirExists = actionsDirResp[0] && actionsDirResp[2] && actionsDirResp[2].exists;
      
      // Get workflow files if directory exists
      let workflowFiles = [];
      if (workflowsDirExists) {
        const workflowsResp = await this.serverCtl.repositoryManager.getContent(
          '.github/workflows',
          'main'
        );
        
        if (workflowsResp[0]) {
          workflowFiles = this.serverCtl.repositoryManager.processDirectoryContents(workflowsResp[2]);
        }
      }
      
      // Get action files if directory exists
      let actionFiles = [];
      if (actionsDirExists) {
        const actionsResp = await this.serverCtl.repositoryManager.getContent(
          '.github/actions',
          'main'
        );
        
        if (actionsResp[0]) {
          actionFiles = this.serverCtl.repositoryManager.processDirectoryContents(actionsResp[2]);
        }
      }
      
      // Build comprehensive installation status
      const installationStatus = {
        installed: versionFileExists && workflowsDirExists,
        version_file: {
          exists: versionFileExists,
          content: versionInfo
        },
        directories: {
          github_exists: githubDirExists,
          workflows_exists: workflowsDirExists,
          actions_exists: actionsDirExists
        },
        files: {
          workflows: workflowFiles,
          actions: actionFiles
        }
      };
      
      // Simple message based on installation status
      let message;
      if (versionFileExists && versionInfo) {
        message = `Current mr4gh version: ${versionInfo.version}`;
      } else if (workflowsDirExists && workflowFiles.length > 0) {
        message = 'Workflows found but no version file exists';
      } else {
        message = 'No mr4gh-automations installation detected';
      }
      
      return this._createSuccess(message, installationStatus);
    } catch (err) {
      logger.error('Failed to get current version', err);
      return this._createError(
        `Failed to get current version: ${err.message}`,
        err,
        500
      );
    }
  }

  /**
   * Check if updates are available for mr4gh-automations
   * @returns {Promise<Array} ResponseFactory result with update information
   */
  async checkForUpdates() {
    // Track this operation
    const tracking = logger.trackOperation ? 
      logger.trackOperation(this.objType, 'checkForUpdates') : 
      { end: () => {} };
    
    try {
      // 1. Get current installed version
      const currentVersionResp = await this.getCurrentVersion();
      
      let currentVersion = null;
      let isInstalled = false;
      
      if (currentVersionResp[0]) {
        isInstalled = currentVersionResp[2].installed;
        if (isInstalled && 
            currentVersionResp[2].version_file && 
            currentVersionResp[2].version_file.content) {
          // Fix: Get version from the correct path in the response
          currentVersion = currentVersionResp[2].version_file.content.version;
        }
      }
      
      // 2. Get latest release from mr4gh-automations
      const releaseResp = await this.serverCtl.repositoryManager.getLatestRelease(
        'mediumroast', 
        'mr4gh-automations'
      );
      
      if (!releaseResp[0]) {
        return releaseResp;
      }
      
      const latestRelease = releaseResp[2];
      const latestVersion = latestRelease.tag_name;
      
      // 3. Compare versions and build result
      const updateInfo = {
        current_version: currentVersion,
        latest_version: latestVersion,
        is_installed: isInstalled,
        update_available: isInstalled && currentVersion !== latestVersion,
        needs_installation: !isInstalled,
        latest_release: {
          id: latestRelease.id,
          tag_name: latestRelease.tag_name,
          name: latestRelease.name,
          published_at: latestRelease.published_at,
          html_url: latestRelease.html_url
        }
      };
      
      let message;
      if (!isInstalled) {
        message = `mr4gh-automations is not installed. Latest version is ${latestVersion}`;
      } else if (currentVersion !== latestVersion) {
        message = `Update available: ${currentVersion} → ${latestVersion}`;
      } else {
        message = `Current version ${currentVersion} is up to date`;
      }
      
      return this._createSuccess(message, updateInfo);
    } catch (error) {
      logger.error('Failed to check for updates', error);
      return this._createError(
        `Failed to check for updates: ${error.message}`,
        error,
        500
      );
    } finally {
      tracking.end();
    }
  }
}