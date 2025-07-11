/**
 * Example demonstrating GitHub Actions operations (Create, Read, Update, Delete)
 * @author Michael Hay <michael.hay@mediumroast.io>
 * @file github-actions.js
 * @license Apache-2.0
 * @version 3.0.0
    // CREATE Operations
    if ((runAll || operations.includes('create')) && userDecisions.proceedWithCreate) {
      await demonstrateActionsCreateOperations(actions, installationStatus);
    }
    
    // READ Operations
    if ((runAll || operations.includes('read')) && userDecisions.proceedWithRead) {
      await demonstrateActionsReadOperations(actions);
    }
    
    // UPDATE Operations
    if ((runAll || operations.includes('update')) && userDecisions.proceedWithUpdate) {
      await demonstrateActionsUpdateOperations(actions);
    }
    
    // DELETE Operations
    if ((runAll || operations.includes('delete')) && userDecisions.proceedWithDelete) {
      await demonstrateActionsDeleteOperations(actions);
    }Mediumroast, Inc. All rights reserved.
 * 
 * This example shows how to manage GitHub Actions workflows using the Mediumroast API.
 * 
 * It demonstrates:
 * - CREATE: Install GitHub Actions workflows
 * - READ: View current workflows, versions, and usage statistics
 * - UPDATE: Update workflows to latest versions
 * - DELETE: Remove workflows from repository
 * 
 * To run this example, create a config.ini file with your GitHub token and organization.
 * The file should look like this:
 * 
 * [GitHub]
 * token = YOUR_GITHUB_TOKEN
 * org = YOUR_ORGANIZATION_NAME
 * 
 * You can run the example with:
 * node examples/github-actions.js
 * 
 * Or specify specific operations:
 * node examples/github-actions.js create read update delete
 * 
 * Available operations:
 * - create    - Install GitHub Actions workflows
 * - read      - View current workflows and statistics
 * - update    - Update workflows to latest versions
 * - delete    - Remove workflows from repository
 * 
 * This will run all operations by default.
 * 
 * Prerequisites: The script automatically checks and ensures:
 * 1. GitHub App is properly installed and has permissions
 * 2. Repository exists (created via github-repository.js)
 * 3. Prompts for confirmation before destructive operations
 * 
 * @requires configparser
 * @requires fs
 * @requires path
 * @requires ../src/api/github.js
 * @requires ../src/api/gitHubServer.js
 */

/* eslint-disable no-console */

import GitHubFunctions from '../src/api/github.js';
import { Actions } from '../src/api/gitHubServer.js';
import { formatResult } from '../src/api/gitHubServer/utils/formatting.js';
import fs from 'fs';
import path from 'path';
import ConfigParser from 'configparser';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import readline from 'readline';

// Helper to get current directory with ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// For formatting output
const SUCCESS_PREFIX = '✅ ';
const ERROR_PREFIX = '❌ ';
const WARNING_PREFIX = '⚠️ ';
const SECTION_DIVIDER = '='.repeat(80);

/**
 * Creates a readline interface for user input
 * @returns {readline.Interface} Readline interface
 */
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Prompts the user for confirmation
 * @param {string} message - Confirmation message
 * @returns {Promise<boolean>} User response
 */
async function confirmAction(message) {
  const rl = createReadlineInterface();
  
  return new Promise((resolve) => {
    rl.question(`${WARNING_PREFIX} ${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Demonstrates GitHub Actions operations (Create, Read, Update, Delete)
 * @param {string} token - GitHub token
 * @param {string} org - GitHub organization
 * @param {Array<string>} operations - Specific operations to run
 */
async function demonstrateActionsOperations(token, org, operations) {
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('GITHUB ACTIONS OPERATIONS');
  console.log(SECTION_DIVIDER);
  
  try {
    const github = new GitHubFunctions(token, org, 'actions-operations-example');
    const actions = new Actions(token, org, 'actions-operations-example');
    
    // First, check if the GitHub App is properly installed
    console.log('\n📋 Pre-flight checks...');
    const appCheckResult = await github.checkGitHubAppInstallation();
    
    if (!appCheckResult[0]) {
      const appCheck = appCheckResult[2];
      console.log(`\n${ERROR_PREFIX} GitHub App Installation Issue:`);
      console.log(`Message: ${appCheck.error}`);
      
      if (!appCheck.canAccessOrg) {
        console.log('\n❌ Cannot proceed: Unable to access the organization.');
        console.log('Please ensure:');
        console.log('1. The organization name is correct');
        console.log('2. Your token has access to the organization');
        return;
      }
      
      console.log('\n❌ Cannot proceed: Mediumroast for GitHub app is not properly installed.');
      console.log('\nTo fix this:');
      console.log('1. Go to https://github.com/apps/mediumroast-for-github');
      console.log('2. Click "Install" or "Configure"');
      console.log(`3. Select the "${org}" organization`);
      console.log('4. Grant access to repositories (All repositories or select specific ones)');
      console.log('5. Ensure the app has permissions for:');
      console.log('   - Repository administration');
      console.log('   - Contents (read/write)');
      console.log('   - Actions (read/write)');
      console.log('   - Metadata (read)');
      
      const retry = await confirmAction('Have you installed the GitHub App? Would you like to retry the check?');
      if (retry) {
        // Recursive call to re-check
        return await demonstrateActionsOperations(token, org, operations);
      } else {
        console.log('\nSetup cancelled. Please install the GitHub App and try again.');
        return;
      }
    }
    
    // Display successful app installation info
    const appCheck = appCheckResult[2];
    console.log(`\n${SUCCESS_PREFIX} GitHub App Installation Check:`);
    console.log('✅ Mediumroast for GitHub app is properly installed');
    console.log(`✅ Repository access: ${appCheck.repositorySelection === 'all' ? 'All repositories' : `${appCheck.repositoryAccess} repositories`}`);
    console.log('✅ App has required permissions');
    
    // Check for existing installations
    console.log(`\n${SECTION_DIVIDER}`);
    console.log('CHECKING EXISTING ACTIONS INSTALLATION');
    console.log(SECTION_DIVIDER);
    
    const installationStatus = await actions.getInstallationStatus();
    
    // If anything exists, prompt the user
    let userDecisions = {
      proceedWithCreate: true,
      proceedWithRead: true,
      proceedWithUpdate: true,
      proceedWithDelete: true,
      skipAll: false
    };
    
    if (installationStatus.installed) {
      userDecisions = await promptForExistingInstallations(installationStatus);
      
      if (userDecisions.skipAll) {
        console.log('\n🚫 All operations cancelled by user.');
        return;
      }
    } else {
      console.log('\n✅ No existing Actions installation detected. Ready for fresh setup...');
    }
    
    const runAll = operations.length === 0;
    
    // CREATE Operations
    if ((runAll || operations.includes('create')) && userDecisions.proceedWithCreate) {
      await demonstrateActionsCreateOperations(actions, installationStatus);
    }
    
    // READ Operations
    if ((runAll || operations.includes('read')) && userDecisions.proceedWithRead) {
      await demonstrateActionsReadOperations(actions);
    }
    
    // UPDATE Operations
    if ((runAll || operations.includes('update')) && userDecisions.proceedWithUpdate) {
      await demonstrateActionsUpdateOperations(actions);
    }
    
    // DELETE Operations
    if ((runAll || operations.includes('delete')) && userDecisions.proceedWithDelete) {
      await demonstrateActionsDeleteOperations(actions);
    }
    
  } catch (error) {
    console.error('\n❌ Error in Actions operations:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

/**
 * Demonstrates Actions CREATE operations
 * @param {Actions} actions - Actions instance
 * @param {Object} installationStatus - Current installation status
 */
async function demonstrateActionsCreateOperations(actions, installationStatus) {
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('ACTIONS CREATE OPERATIONS');
  console.log(SECTION_DIVIDER);
  
  try {
    if (installationStatus.installed) {
      console.log('\n📋 Actions are already installed:');
      console.log(`Current version: ${installationStatus.version}`);
      console.log(`Workflows: ${installationStatus.workflows.join(', ')}`);
      
      const reinstall = await confirmAction('Actions are already installed. Do you want to reinstall?');
      if (!reinstall) {
        console.log('\nSkipping Actions installation (already installed).');
        return;
      }
    }
    
    console.log('\n🔧 Installing GitHub Actions workflows...');
    const confirmed = await confirmAction('This will install GitHub Actions workflows. Continue?');
    
    if (!confirmed) {
      console.log('\nActions installation cancelled by user.');
      return;
    }
    
    const installResult = await actions.installActions();
    formatResult('installActions()', installResult);
    
    if (installResult[0]) {
      console.log('\n✅ Actions installation completed successfully!');
      
      // Verify installation
      console.log('\n🔍 Verifying installation...');
      const verifyResult = await actions.getCurrentVersion();
      if (verifyResult[0]) {
        const versionInfo = verifyResult[2];
        console.log(`✅ Verification successful - Version: ${versionInfo.version_file?.content?.version || 'unknown'}`);
        
        // Check for workflows in the correct location
        const installedWorkflows = versionInfo.version_file?.content?.workflows_installed || versionInfo.workflows || [];
        console.log(`✅ Workflows installed: ${installedWorkflows.join(', ') || 'none detected'}`);
      } else {
        console.log('⚠️  Installation verification failed, but installation may have succeeded');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error in Actions CREATE operations:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

/**
 * Demonstrates Actions READ operations
 * @param {Actions} actions - Actions instance
 */
async function demonstrateActionsReadOperations(actions) {
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('ACTIONS READ OPERATIONS');
  console.log(SECTION_DIVIDER);
  
  try {
    // Get current version and installation status
    console.log('\n📋 Getting current installation status...');
    const versionResult = await actions.getCurrentVersion();
    formatResult('getCurrentVersion()', versionResult);
    
    // Get all workflow runs
    console.log('\n📊 Fetching all workflow runs...');
    const allWorkflows = await actions.getAll();
    formatResult('getAll()', allWorkflows, { showData: false }); // Don't show full data for workflow runs
    
    // Display workflow run statistics
    if (allWorkflows[0] && allWorkflows[2]?.workflow_runs?.length > 0) {
      console.log(`\n${SUCCESS_PREFIX} Found ${allWorkflows[2].workflow_runs.length} workflow runs`);
      
      // Group runs by workflow
      const workflowStats = {};
      allWorkflows[2].workflow_runs.forEach(run => {
        const name = run.name || 'Unknown';
        if (!workflowStats[name]) {
          workflowStats[name] = { total: 0, success: 0, failure: 0, other: 0 };
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
      console.log('\n📈 Workflow run statistics:');
      Object.entries(workflowStats).forEach(([name, stats]) => {
        console.log(`  ${name}:`);
        console.log(`    Total runs: ${stats.total}`);
        console.log(`    Success: ${stats.success} (${((stats.success / stats.total) * 100).toFixed(1)}%)`);
        console.log(`    Failure: ${stats.failure} (${((stats.failure / stats.total) * 100).toFixed(1)}%)`);
        console.log(`    Other: ${stats.other} (${((stats.other / stats.total) * 100).toFixed(1)}%)`);
      });
    } else {
      console.log(`\n${WARNING_PREFIX} No workflow runs found.`);
    }
    
    // Get Actions billing information
    console.log('\n💰 Fetching GitHub Actions billing information...');
    const billingInfo = await actions.getActionsBilling();
    formatResult('getActionsBilling()', billingInfo);
    
    // Check for available updates
    console.log('\n🔄 Checking for available updates...');
    const updateCheck = await actions.checkForUpdates();
    formatResult('checkForUpdates()', updateCheck);
    
    if (updateCheck[0]) {
      const updateInfo = updateCheck[2];
      if (updateInfo.update_available) {
        console.log(`\n${WARNING_PREFIX} Update available!`);
        console.log(`Current version: ${updateInfo.current_version}`);
        console.log(`Latest version: ${updateInfo.latest_version}`);
      } else {
        console.log(`\n${SUCCESS_PREFIX} You are running the latest version: ${updateInfo.current_version}`);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error in Actions READ operations:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

/**
 * Demonstrates Actions UPDATE operations
 * @param {Actions} actions - Actions instance
 */
async function demonstrateActionsUpdateOperations(actions) {
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('ACTIONS UPDATE OPERATIONS');
  console.log(SECTION_DIVIDER);
  
  try {
    // First check if updates are available
    console.log('\n🔍 Checking for available updates...');
    const updateCheck = await actions.checkForUpdates();
    
    if (!updateCheck[0]) {
      console.log('\n❌ Unable to check for updates. Cannot proceed with update operation.');
      return;
    }
    
    const updateInfo = updateCheck[2];
    
    if (updateInfo.update_available) {
      console.log(`\n${WARNING_PREFIX} Update available!`);
      console.log(`Current version: ${updateInfo.current_version}`);
      console.log(`Latest version: ${updateInfo.latest_version}`);
      
      const confirmed = await confirmAction('Do you want to update to the latest version?');
      
      if (!confirmed) {
        console.log('\nUpdate cancelled by user.');
        return;
      }
      
      console.log('\n🔄 Updating Actions workflows...');
      const updateResult = await actions.updateActions();
      formatResult('updateActions()', updateResult);
      
      if (updateResult[0]) {
        console.log('\n✅ Update completed successfully!');
        
        // Verify the update
        console.log('\n🔍 Verifying update...');
        const verifyResult = await actions.getCurrentVersion();
        
        if (verifyResult[0]) {
          const newVersion = verifyResult[2].version_file?.content?.version || 'unknown';
          console.log(`\n${SUCCESS_PREFIX} Update verification: now at version ${newVersion}`);
        }
      }
    } else {
      console.log(`\n${SUCCESS_PREFIX} You are already running the latest version: ${updateInfo.current_version}`);
      
      // Ask if user wants to force update anyway
      const forceUpdate = await confirmAction('Would you like to force an update anyway (reinstall current version)?');
      
      if (forceUpdate) {
        console.log('\n🔄 Force updating Actions workflows...');
        const updateResult = await actions.updateActions();
        formatResult('updateActions() [force]', updateResult);
      } else {
        console.log('\nNo update performed.');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error in Actions UPDATE operations:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

/**
 * Demonstrates Actions DELETE operations
 * @param {Actions} actions - Actions instance
 * @param {Object} installationStatus - Current installation status (may be stale)
 */
async function demonstrateActionsDeleteOperations(actions) {
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('ACTIONS DELETE OPERATIONS');
  console.log(SECTION_DIVIDER);
  
  try {
    // Always check current installation status, don't rely on potentially stale data
    console.log('\n🔍 Checking current installation status...');
    const currentStatus = await actions.getInstallationStatus();
    
    if (!currentStatus.installed) {
      console.log('\n📋 No Actions workflows are currently installed.');
      console.log('Nothing to delete.');
      return;
    }
    
    console.log('\n📋 Current Actions installation:');
    console.log(`Version: ${currentStatus.version}`);
    console.log(`Workflows: ${currentStatus.workflows.join(', ')}`);
    
    console.log(`\n${WARNING_PREFIX} WARNING: This will permanently delete all GitHub Actions workflows!`);
    console.log('This action cannot be undone.');
    
    const confirmed = await confirmAction('Are you sure you want to delete all Actions workflows?');
    
    if (!confirmed) {
      console.log('\nDelete operation cancelled by user.');
      return;
    }
    
    // Final confirmation
    const finalConfirmed = await confirmAction('This is your final confirmation. Delete ALL Actions workflows?');
    
    if (!finalConfirmed) {
      console.log('\nDelete operation cancelled by user.');
      return;
    }
    
    console.log('\n🗑️  Deleting Actions workflows...');
    const deleteResult = await actions.deleteActions();
    formatResult('deleteActions()', deleteResult);
    
    if (deleteResult[0]) {
      console.log('\n✅ Actions workflows deleted successfully!');
      
      // Verify deletion
      console.log('\n🔍 Verifying deletion...');
      const verifyResult = await actions.getCurrentVersion();
      
      if (verifyResult[0] && !verifyResult[2].installed) {
        console.log('\n✅ Deletion verified - no Actions workflows found.');
      } else {
        console.log('\n⚠️  Deletion verification inconclusive - some workflows may remain.');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error in Actions DELETE operations:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

/**
 * Prompts user about existing installations and returns what actions to take
 * @param {Object} installationStatus - Status from Actions.getInstallationStatus()
 * @returns {Promise<Object>} User decisions about what to proceed with
 */
async function promptForExistingInstallations(installationStatus) {
  const decisions = {
    proceedWithCreate: true,
    proceedWithRead: true,
    proceedWithUpdate: true,
    proceedWithDelete: true,
    skipAll: false
  };

  if (installationStatus.installed) {
    console.log(`\n${WARNING_PREFIX} EXISTING ACTIONS INSTALLATION DETECTED`);
    console.log('Actions are already installed with the following details:');
    console.log(`  Version: ${installationStatus.version}`);
    console.log(`  Workflows: ${installationStatus.workflows.join(', ')}`);
    
    const proceed = await confirmAction('Actions are already installed. Do you want to continue with the demo?');
    if (!proceed) {
      console.log('\nDemo cancelled by user.');
      decisions.skipAll = true;
      return decisions;
    }
  }

  return decisions;
}

/**
 * Main function to run the Actions example
 */
async function main() {
  console.log(`${SECTION_DIVIDER}`);
  console.log('MEDIUMROAST API - GITHUB ACTIONS EXAMPLE');
  console.log(`${SECTION_DIVIDER}`);
  
  try {
    // Check for help flag
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
      console.log(`
GitHub Actions Operations Example
=====================================

This example demonstrates CRUD operations for GitHub Actions workflows.

Usage:
  node examples/github-actions.js [operations...]

Operations:
  create    - Install GitHub Actions workflows
  read      - View current workflows and statistics
  update    - Update workflows to latest versions
  delete    - Remove workflows from repository

Examples:
  node examples/github-actions.js
  node examples/github-actions.js read
  node examples/github-actions.js create read update delete

Prerequisites:
- GitHub App must be installed on the organization
- Repository must exist (created via github-repository.js)
- config.ini file with GitHub token and organization
`);
      return;
    }
    
    // Load configuration
    const configFile = path.join(__dirname, 'config.ini');
    
    // Check if config exists
    if (!fs.existsSync(configFile)) {
      console.error(`${ERROR_PREFIX} Configuration file not found: ${configFile}`);
      console.error('Please create a config.ini file with your GitHub token and organization.');
      console.error('Example:');
      console.error('[GitHub]');
      console.error('token = YOUR_GITHUB_TOKEN');
      console.error('org = YOUR_ORGANIZATION_NAME');
      process.exit(1);
    }
        
    // Read config
    const config = new ConfigParser();
    config.read(configFile);
        
    // Get GitHub token and org from config
    if (!config.hasSection('GitHub') || !config.hasKey('GitHub', 'token') || !config.hasKey('GitHub', 'org')) {
      console.error(`${ERROR_PREFIX} Configuration file missing required GitHub section or keys.`);
      console.error('Please ensure your config.ini file has:');
      console.error('[GitHub]');
      console.error('token = YOUR_GITHUB_TOKEN');
      console.error('org = YOUR_ORGANIZATION_NAME');
      process.exit(1);
    }
        
    const token = config.get('GitHub', 'token');
    const org = config.get('GitHub', 'org');
        
    console.log(`Using organization: ${org}`);
    
    // Warn about write operations
    console.log(`${WARNING_PREFIX} This example performs operations that may modify your repository.`);
    const globalConfirmation = await confirmAction('Do you want to continue with this example?');
    
    if (!globalConfirmation) {
      console.log('\nExample cancelled by user.');
      process.exit(0);
    }
        
    // Get command-line arguments to determine which operations to run
    const operations = args.length > 0 ? args : []; // Empty array means run all
        
    console.log(`Operations to run: ${operations.length > 0 ? operations.join(', ') : 'all'}`);
    
    // Run the Actions operations
    await demonstrateActionsOperations(token, org, operations);
    
  } catch (error) {
    console.error(`${ERROR_PREFIX} Error in main:`, error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the example
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
