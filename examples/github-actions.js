#!/usr/bin/env node

/**
 * @fileoverview GitHub Update Operations Example
 * 
 * This example demonstrates update operations for the Mediumroast.io GitHub API.
 * This module specifically handles updating existing GitHub resources such as:
 * - Actions: Update GitHub Actions workflows to latest versions
 * - Future: Update studies, companies, interactions data
 * 
 * Unlike the write-operations example which focuses on creating new resources,
 * this module focuses on updating existing ones with version management,
 * conflict resolution, and rollback capabilities.
 * 
 * Prerequisites:
 * - GitHub App must be installed on the organization
 * - Repository must exist (created via github-write-operations.js)
 * - Actions workflows must be initially installed
 * 
 * Usage:
 * node examples/github-update-operations.js [operations...]
 * 
 * Examples:
 * node examples/github-update-operations.js actions
 * node examples/github-update-operations.js actions:check actions:update
 * 
 * @author Mediumroast, Inc.
 * @version 2.0.0
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { GitHubFunctions } from '../src/api/index.js';
import { Actions } from '../src/api/gitHubServer.js';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants for output formatting
const SECTION_DIVIDER = '='.repeat(80);
const SUCCESS_PREFIX = '✅';
const ERROR_PREFIX = '❌';
const WARNING_PREFIX = '⚠️ ';
const INFO_PREFIX = 'ℹ️ ';

/**
 * Creates a readline interface for user input
 * @returns {Object} Readline interface
 */
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Prompts user for confirmation
 * @param {string} message - The confirmation message
 * @returns {Promise<boolean>} True if user confirms, false otherwise
 */
async function confirmAction(message) {
  const rl = createReadlineInterface();
  return new Promise((resolve) => {
    rl.question(`${WARNING_PREFIX}${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Logs the result of an operation with appropriate formatting
 * @param {string} operation - Name of the operation
 * @param {Array} result - [success, message, data] result from API
 * @param {boolean} showDetails - Whether to show detailed data
 */
function logResult(operation, result, showDetails = true) {
  const [success, message, data] = result;
  
  if (success) {
    console.log(`${SUCCESS_PREFIX} ${operation}: ${message}`);
    if (showDetails && data && typeof data === 'object') {
      console.log(`${INFO_PREFIX} Details:`, JSON.stringify(data, null, 2));
    }
  } else {
    console.log(`${ERROR_PREFIX} ${operation}: ${message}`);
    if (showDetails && data) {
      console.log(`${ERROR_PREFIX} Error details:`, data);
    }
  }
}

/**
 * Demonstrates Actions update operations
 * @param {string} token - GitHub token
 * @param {string} org - GitHub organization
 * @param {Array<string>} operations - Specific operations to run
 */
async function demonstrateActionsUpdateOperations(token, org, operations) {
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('ACTIONS UPDATE OPERATIONS');
  console.log(SECTION_DIVIDER);
  
  // Create visible tmp directory in the project root
  const tmpDir = path.join(__dirname, '../tmp');
  console.log(`Creating visible tmp directory at: ${tmpDir}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  
  try {
    // Set environment variable to direct the Actions class to use our tmp directory
    process.env.MR4GH_TMP_DIR = tmpDir;
    console.log(`Set temporary directory to: ${process.env.MR4GH_TMP_DIR}`);
    
    const actions = new Actions(token, org, 'update-process');
    const runAll = operations.length === 0;
    
    // Check current version
    if (runAll || operations.includes('check')) {
      console.log(`\n${SECTION_DIVIDER}`);
      console.log('CHECK CURRENT VERSION');
      console.log(SECTION_DIVIDER);
      
      console.log('\nChecking current installation status...');
      const versionResult = await actions.getCurrentVersion();
      logResult('getCurrentVersion()', versionResult, false);
      
      if (!versionResult[0] || !versionResult[2].installed) {
        console.log(`\n${WARNING_PREFIX} No actions installation detected.`);
        console.log(`${INFO_PREFIX} Please install actions first using: node examples/github-write-operations.js actions:install`);
        return;
      }
      
      // Get the current version info
      const currentVersion = versionResult[2].version_file?.content?.version || 'unknown';
      console.log(`\n${SUCCESS_PREFIX} Found existing actions installation, version: ${currentVersion}`);
      
      // List currently installed workflows
      console.log('\nCurrently installed workflows:');
      if (versionResult[2].files?.workflows?.length > 0) {
        versionResult[2].files.workflows.forEach(wf => {
          console.log(`  - ${wf.name}`);
        });
      } else {
        console.log('  (No workflows found)');
      }
      
      // Check for updates
      console.log('\nChecking for updates...');
      const updateCheckResult = await actions.checkForUpdates();
      logResult('checkForUpdates()', updateCheckResult, false);
      
      if (updateCheckResult[0]) {
        if (updateCheckResult[2].update_available) {
          console.log(`\n${SUCCESS_PREFIX} Update available!`);
          console.log(`Current version: ${updateCheckResult[2].current_version}`);
          console.log(`Latest version: ${updateCheckResult[2].latest_version}`);
          console.log(`Release published: ${new Date(updateCheckResult[2].latest_release.published_at).toLocaleString()}`);
        } else {
          console.log(`\n${SUCCESS_PREFIX} Your actions are already up to date!`);
          console.log(`Current version: ${updateCheckResult[2].current_version}`);
          console.log(`Latest version: ${updateCheckResult[2].latest_version}`);
        }
      } else {
        console.log(`\n${ERROR_PREFIX} Failed to check for updates.`);
      }
    }
    
    // Update Actions workflows
    if (runAll || operations.includes('update')) {
      console.log(`\n${SECTION_DIVIDER}`);
      console.log('UPDATE ACTIONS WORKFLOWS');
      console.log(SECTION_DIVIDER);
      
      try {
        // First, check if actions are installed and get current version
        console.log('\nChecking current installation status...');
        const versionResult = await actions.getCurrentVersion();
        logResult('getCurrentVersion()', versionResult, false);
        
        if (!versionResult[0] || !versionResult[2].installed) {
          console.log(`\n${WARNING_PREFIX} No actions installation detected.`);
          
          // Ask user if they want to install instead
          const installInstead = await confirmAction('Would you like to install actions instead of updating?');
          
          if (installInstead) {
            console.log('\nSwitching to installation...');
            console.log(`${INFO_PREFIX} Please use: node examples/github-write-operations.js actions:install`);
          } else {
            console.log('\nUpdate canceled. Please install actions first.');
          }
          
          return;
        } 

        // Get the current version info
        const currentVersion = versionResult[2].version_file?.content?.version || 'unknown';
        console.log(`\n${SUCCESS_PREFIX} Found existing actions installation, version: ${currentVersion}`);
        
        // Check for updates
        console.log('\nChecking for updates...');
        const updateCheckResult = await actions.checkForUpdates();
        logResult('checkForUpdates()', updateCheckResult, false);
        
        if (!updateCheckResult[0]) {
          console.log(`\n${ERROR_PREFIX} Failed to check for updates.`);
          return;
        }
        
        // Determine if update is needed
        if (updateCheckResult[2].update_available) {
          console.log(`\n${SUCCESS_PREFIX} Update available!`);
          console.log(`Current version: ${updateCheckResult[2].current_version}`);
          console.log(`Latest version: ${updateCheckResult[2].latest_version}`);
          console.log(`Release published: ${new Date(updateCheckResult[2].latest_release.published_at).toLocaleString()}`);
          
          // Confirm before proceeding
          const confirmed = await confirmAction('Would you like to update GitHub Actions workflows to the latest version?');
          
          if (!confirmed) {
            console.log('\nUpdate cancelled by user.');
          } else {
            // Update workflows
            console.log('\nUpdating GitHub Actions workflows...');
            const updateResult = await actions.updateActions();
            logResult('updateActions()', updateResult);
            
            // Verify the update
            if (updateResult[0]) {
              console.log('\nVerifying update...');
              const verifyResult = await actions.getCurrentVersion();
              
              if (verifyResult[0]) {
                const newVersion = verifyResult[2].version_file?.content?.version || 'unknown';
                console.log(`\n${SUCCESS_PREFIX} Update verification: now at version ${newVersion}`);
                
                // List updated workflows
                console.log('\nUpdated workflows:');
                if (verifyResult[2].files?.workflows?.length > 0) {
                  verifyResult[2].files.workflows.forEach(wf => {
                    console.log(`  - ${wf.name}`);
                  });
                } else {
                  console.log('  (No workflows found)');
                }
              }
            }
          }
        } else {
          console.log(`\n${SUCCESS_PREFIX} Your actions are already up to date!`);
          console.log(`Current version: ${updateCheckResult[2].current_version}`);
          console.log(`Latest version: ${updateCheckResult[2].latest_version}`);
          
          // Ask if user wants to force update anyway
          const forceUpdate = await confirmAction('Would you like to force an update anyway?');
          
          if (forceUpdate) {
            console.log('\nForcing update of GitHub Actions workflows...');
            const updateResult = await actions.updateActions();
            logResult('updateActions()', updateResult);
          } else {
            console.log('\nNo update needed. Skipping.');
          }
        }
        
        // Get workflow run statistics
        console.log('\nFetching workflow run statistics...');
        const runsResult = await actions.getAll();
        
        if (runsResult[0] && runsResult[2]?.workflow_runs?.length > 0) {
          console.log(`\n${SUCCESS_PREFIX} Found ${runsResult[2].workflow_runs.length} workflow runs`);
          
          // Group runs by workflow
          const workflowStats = {};
          runsResult[2].workflow_runs.forEach(run => {
            const name = run.name || run.workflow_id;
            if (!workflowStats[name]) {
              workflowStats[name] = {
                total: 0,
                success: 0,
                failure: 0,
                other: 0
              };
            }
            workflowStats[name].total++;
            if (run.conclusion === 'success') {
              workflowStats[name].success++;
            } else if (run.conclusion === 'failure') {
              workflowStats[name].failure++;
            } else {
              workflowStats[name].other++;
            }
          });
          
          // Display stats
          console.log('\nWorkflow run statistics:');
          Object.entries(workflowStats).forEach(([name, stats]) => {
            console.log(`  ${name}:`);
            console.log(`    Total runs: ${stats.total}`);
            console.log(`    Success: ${stats.success}`);
            console.log(`    Failure: ${stats.failure}`);
            console.log(`    Other: ${stats.other}`);
          });
        } else {
          console.log(`\n${WARNING_PREFIX} No workflow runs found.`);
        }
      } catch (error) {
        console.error(`\n${ERROR_PREFIX} Error during update operations:`, error.message);
      }
    }
    
    // Force update (skip version checking)
    if (operations.includes('force-update')) {
      console.log(`\n${SECTION_DIVIDER}`);
      console.log('FORCE UPDATE ACTIONS WORKFLOWS');
      console.log(SECTION_DIVIDER);
      
      // Final confirmation for force update
      const confirmed = await confirmAction('This will force update GitHub Actions workflows without version checking. Continue?');
      
      if (!confirmed) {
        console.log('\nForce update cancelled by user.');
      } else {
        console.log('\nForcing update of GitHub Actions workflows...');
        const updateResult = await actions.updateActions();
        logResult('updateActions()', updateResult);
        
        // Verify the update
        if (updateResult[0]) {
          console.log('\nVerifying force update...');
          const verifyResult = await actions.getCurrentVersion();
          
          if (verifyResult[0]) {
            const newVersion = verifyResult[2].version_file?.content?.version || 'unknown';
            console.log(`\n${SUCCESS_PREFIX} Force update verification: now at version ${newVersion}`);
          }
        }
      }
    }
    
    // Show files downloaded in tmp directory
    if (operations.includes('show-files') || runAll) {
      console.log(`\n${SECTION_DIVIDER}`);
      console.log('DOWNLOADED FILES');
      console.log(SECTION_DIVIDER);
      
      console.log('\nFiles downloaded to tmp directory:');
      if (fs.existsSync(tmpDir)) {
        const files = fs.readdirSync(tmpDir);
        files.forEach(file => {
          console.log(`- ${file}`);
          
          // If it's a directory, show its contents too
          const filePath = path.join(tmpDir, file);
          if (fs.statSync(filePath).isDirectory()) {
            try {
              const subFiles = fs.readdirSync(filePath);
              subFiles.forEach(subFile => {
                console.log(`  └─ ${subFile}`);
              });
            } catch (err) {
              console.log(`  └─ (Error reading directory: ${err.message})`);
            }
          }
        });
      } else {
        console.log('(No tmp directory found)');
      }
    }
  } catch (error) {
    console.error('\n❌ Error in Actions update operations:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

/**
 * Parses command line arguments and runs specified operations
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Check for help or if no arguments provided
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
GitHub Update Operations Example
======================================

This example demonstrates update operations for the Mediumroast.io GitHub API.
Focus is on updating existing GitHub resources with version management.

Prerequisites:
- GitHub App must be installed on the organization
- Repository must exist (created via github-write-operations.js)
- Actions workflows must be initially installed

Usage:
  node examples/github-update-operations.js [operations...]

Operations:
  actions:check        - Check current Actions version and available updates
  actions:update       - Update Actions workflows to latest version
  actions:force-update - Force update without version checking
  actions:show-files   - Show files in tmp directory
  actions              - Run all Actions update operations

Examples:
  node examples/github-update-operations.js actions
  node examples/github-update-operations.js actions:check actions:update
  node examples/github-update-operations.js actions:force-update

Environment Variables:
  GITHUB_TOKEN     - GitHub token (required)
  GITHUB_ORG       - GitHub organization (required)
`);
    process.exit(0);
  }
  
  // Get environment variables
  const token = process.env.GITHUB_TOKEN;
  const org = process.env.GITHUB_ORG;
  
  if (!token) {
    console.error('❌ Error: GITHUB_TOKEN environment variable is required');
    process.exit(1);
  }
  
  if (!org) {
    console.error('❌ Error: GITHUB_ORG environment variable is required');
    process.exit(1);
  }
  
  console.log('GitHub Update Operations Example');
  console.log(`Organization: ${org}`);
  console.log(`Operations: ${args.join(', ')}`);
  
  // Verify GitHub App installation first
  console.log('\n🔍 Checking GitHub App installation...');
  const github = new GitHubFunctions(token, org, 'update-operations-check');
  const appCheckResult = await github.checkGitHubAppInstallation();
  
  if (!appCheckResult[0]) {
    console.error(`\n❌ GitHub App installation check failed: ${appCheckResult[1]}`);
    console.error('Please ensure the GitHub App is properly installed on the organization.');
    process.exit(1);
  }
  
  console.log(`✅ GitHub App installation verified: ${appCheckResult[1]}`);
  
  try {
    // Parse and group operations by category
    const actionsOps = [];
    
    for (const arg of args) {
      if (arg === 'actions') {
        // Run all actions operations
        actionsOps.push('check', 'update', 'show-files');
      } else if (arg.startsWith('actions:')) {
        const operation = arg.split(':')[1];
        actionsOps.push(operation);
      }
    }
    
    // Run operations
    if (actionsOps.length > 0) {
      await demonstrateActionsUpdateOperations(token, org, actionsOps);
    }
    
    console.log(`\n${SUCCESS_PREFIX} Update operations completed successfully!`);
    
  } catch (error) {
    console.error('\n❌ Error in main execution:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the example
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
