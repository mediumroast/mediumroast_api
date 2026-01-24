/**
 * Example demonstrating repository reset operations (delete and verify)
 * @author Michael Hay <michael.hay@mediumroast.io>
 * @file github-reset-repository.js
 * @license Apache-2.0
 * @version 3.0.0
 * @copyright 2025 Mediumroast, Inc. All rights reserved.
 * 
 * This example shows how to reset the GitHub repository infrastructure
 * for mediumroast.io applications by deleting the discovery repository.
 * 
 * It demonstrates:
 * - Repository verification: Check if the discovery repository exists
 * - Repository deletion: Delete the discovery repository with confirmation
 * - Deletion verification: Confirm the repository has been properly deleted
 * 
 * To run this example, create a config.ini file with your GitHub token and organization.
 * The file should look like this:
 * 
 * [GitHub]
 * token = YOUR_GITHUB_TOKEN
 * org = YOUR_ORGANIZATION_NAME
 * 
 * You can run the example with:
 * node examples/github-reset-repository.js
 * 
 * Or specify specific operations:
 * node examples/github-reset-repository.js verify delete verify-deletion
 * 
 * Available operations:
 * - verify           - Check if the discovery repository exists
 * - delete           - Delete the discovery repository
 * - verify-deletion  - Verify the repository has been deleted
 * 
 * This will run all operations by default.
 * 
 * Prerequisites: The script automatically checks and ensures:
 * 1. GitHub App is properly installed and has permissions
 * 2. Prompts for multiple confirmations before deletion
 * 3. Handles non-existent repositories gracefully
 * 
 * ⚠️  WARNING: This script will PERMANENTLY DELETE your repository!
 *    Make sure you have backups of any important data before running.
 * 
 * Note: Make sure you have the necessary permissions for the token to perform delete operations.
 * You must have admin access to the repository to delete it.
 * 
 * @requires configparser
 * @requires fs
 * @requires path
 * @requires ../src/api/github.js
 */

/* eslint-disable no-console */

import GitHubFunctions from '../src/api/github.js';
import { logger } from '../src/api/gitHubServer/logger.js';
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
const WARNING_PREFIX = '⚠️ ';
const ERROR_PREFIX = '❌';
const SUCCESS_PREFIX = '✅';
const INFO_PREFIX = 'ℹ️ ';
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
 * Prompts the user for typed confirmation
 * @param {string} confirmationText - Text that must be typed exactly
 * @returns {Promise<boolean>} Whether the confirmation was typed correctly
 */
async function confirmActionWithTyping(confirmationText) {
  const rl = createReadlineInterface();
  
  return new Promise((resolve) => {
    rl.question(`${WARNING_PREFIX} Type "${confirmationText}" to confirm: `, (answer) => {
      rl.close();
      resolve(answer === confirmationText);
    });
  });
}

/**
 * Formats and logs operation results using structured logging
 * @param {string} operationName - Name of the operation
 * @param {Array} result - Result array [success, message, data]
 * @param {boolean} showData - Whether to include data in debug logs
 */
function logResult(operationName, result, showData = true) {
  const [success, message, data] = result;
  const logData = {
    operation: operationName,
    success,
    message: message?.status_msg || message
  };
  
  if (success) {
    logger.info(`Operation completed: ${operationName}`, logData);
    console.log(`${SUCCESS_PREFIX} ${operationName}: ${message?.status_msg || message}`);
    if (data && showData) {
      logger.debug(`Operation data for ${operationName}:`, data);
    }
  } else {
    logger.error(`Operation failed: ${operationName}`, logData);
    console.log(`${ERROR_PREFIX} ${operationName}: ${message?.status_msg || message}`);
  }
}

/**
 * Demonstrates Repository reset operations
 * @param {string} token - GitHub token
 * @param {string} org - GitHub organization
 * @param {Array<string>} operations - Specific operations to run
 */
async function demonstrateRepositoryReset(token, org, operations) {
  const operationTracker = logger.trackTransaction('repository-reset');
  
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('REPOSITORY RESET OPERATIONS');
  console.log(SECTION_DIVIDER);
  
  try {
    logger.debug('Starting repository reset operations', { organization: org });
    
    const github = new GitHubFunctions(token, org, 'repository-reset-example');
    
    // First, check if the GitHub App is properly installed
    console.log('\n📋 Pre-flight checks...');
    logger.debug('Starting pre-flight checks');
    const appCheckResult = await github.checkGitHubAppInstallation();
    
    if (!appCheckResult[0]) {
      const appCheck = appCheckResult[2];
      logger.error('GitHub App installation check failed', {
        organization: org,
        error: appCheck.error,
        canAccessOrg: appCheck.canAccessOrg
      });
      
      console.log(`\n${ERROR_PREFIX} GitHub App Installation Issue:`);
      console.log(`Message: ${appCheck.error}`);
      
      if (!appCheck.canAccessOrg) {
        logger.error('Cannot access organization', {
          organization: org,
          message: 'Please ensure the organization name is correct and your token has access'
        });
        console.log(`\n${ERROR_PREFIX} Cannot proceed: Unable to access the organization.`);
        console.log('Please ensure:');
        console.log('1. The organization name is correct');
        console.log('2. Your token has access to the organization');
        return;
      }
      
      // Log detailed troubleshooting info
      logger.error('GitHub App not properly installed', {
        organization: org,
        installUrl: 'https://github.com/apps/mediumroast-for-github',
        requiredPermissions: [
          'Repository administration',
          'Contents (read/write)',
          'Actions (read/write)',
          'Metadata (read)'
        ]
      });
      
      console.log(`\n${ERROR_PREFIX} Cannot proceed: Mediumroast for GitHub app is not properly installed.`);
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
        return await demonstrateRepositoryReset(token, org, operations);
      } else {
        logger.info('Reset cancelled - GitHub App installation required');
        console.log('\nReset cancelled. Please install the GitHub App and try again.');
        return;
      }
    }
    
    // Log successful app installation
    const appCheck = appCheckResult[2];
    logger.info('GitHub App installation validated', {
      organization: org,
      repositorySelection: appCheck.repositorySelection,
      repositoryAccess: appCheck.repositoryAccess
    });
    
    // Display successful app installation info
    console.log(`\n${SUCCESS_PREFIX} GitHub App Installation Check:`);
    console.log(`${SUCCESS_PREFIX} Mediumroast for GitHub app is properly installed`);
    console.log(`${SUCCESS_PREFIX} Repository access: ${appCheck.repositorySelection === 'all' ? 'All repositories' : `${appCheck.repositoryAccess} repositories`}`);
    console.log(`${SUCCESS_PREFIX} App has required permissions`);
    
    const runAll = operations.length === 0;
    let repositoryExists = false;
    
    // VERIFY Repository exists
    if (runAll || operations.includes('verify')) {
      const verifyTracker = logger.trackOperation('repository', 'verify');
      
      try {
        console.log(`\n${SECTION_DIVIDER}`);
        console.log('REPOSITORY VERIFICATION');
        console.log(SECTION_DIVIDER);
        
        logger.debug('Checking if repository exists', {
          repository: `${org}_discovery`,
          organization: org
        });
        
        console.log(`\n🔍 Checking if repository ${org}_discovery exists...`);
        
        // Use direct repository manager call to bypass cache
        const repoResult = await github.repositoryManager.getRepoSize();
        
        if (repoResult[0]) {
          repositoryExists = true;
          const repoData = repoResult[2];
          logger.info('Repository exists', {
            organization: org,
            repository: `${org}_discovery`,
            size_kb: repoData.size_kb,
            size_mb: repoData.size_mb
          });
          
          console.log(`\n${SUCCESS_PREFIX} Repository exists!`);
          console.log(`${INFO_PREFIX} Repository: ${org}_discovery`);
          console.log(`${INFO_PREFIX} Size: ${repoData.size_mb} MB (${repoData.size_kb} KB)`);
          console.log(`${INFO_PREFIX} URL: https://github.com/${org}/${org}_discovery`);
        } else {
          repositoryExists = false;
          logger.info('Repository does not exist', {
            organization: org,
            repository: `${org}_discovery`,
            message: repoResult[1]
          });
          
          console.log(`\n${INFO_PREFIX} Repository does not exist.`);
          console.log(`${INFO_PREFIX} Repository ${org}_discovery was not found in organization ${org}`);
        }
      } finally {
        verifyTracker.end();
      }
    }
    
    // DELETE Repository
    if ((runAll || operations.includes('delete')) && repositoryExists !== false) {
      const deleteTracker = logger.trackOperation('repository', 'delete');
      
      try {
        console.log(`\n${SECTION_DIVIDER}`);
        console.log('REPOSITORY DELETION');
        console.log(SECTION_DIVIDER);
        
        // If we haven't verified yet, check if repository exists
        if (!runAll && !operations.includes('verify')) {
          console.log('\n🔍 Checking if repository exists before deletion...');
          const repoResult = await github.repositoryManager.getRepoSize();
          repositoryExists = repoResult[0];
          
          if (!repositoryExists) {
            console.log(`\n${INFO_PREFIX} Repository ${org}_discovery does not exist. Nothing to delete.`);
            logger.info('No repository to delete', {
              organization: org,
              repository: `${org}_discovery`
            });
            return;
          }
        }
        
        if (!repositoryExists) {
          console.log(`\n${INFO_PREFIX} Repository ${org}_discovery does not exist. Nothing to delete.`);
          return;
        }
        
        logger.debug('Starting repository deletion', {
          repository: `${org}_discovery`,
          organization: org
        });
        
        console.log(`\n${WARNING_PREFIX} WARNING: Repository deletion is PERMANENT and IRREVERSIBLE!`);
        console.log(`${WARNING_PREFIX} This will delete the repository ${org}_discovery and ALL its contents:`);
        console.log('   - All files and directories');
        console.log('   - All commit history');
        console.log('   - All issues and pull requests');
        console.log('   - All releases and tags');
        console.log('   - All Actions workflows and runs');
        console.log('   - All wiki pages');
        console.log(`\n${WARNING_PREFIX} Once deleted, this data CANNOT be recovered!`);
        
        // First confirmation
        const firstConfirm = await confirmAction(`Are you absolutely sure you want to delete repository ${org}_discovery?`);
        
        if (!firstConfirm) {
          logger.info('Repository deletion cancelled by user (first confirmation)');
          console.log('\nRepository deletion cancelled by user.');
          return;
        }
        
        // Second confirmation with typing
        console.log(`\n${WARNING_PREFIX} FINAL CONFIRMATION REQUIRED:`);
        const typeConfirm = await confirmActionWithTyping(`DELETE ${org}_discovery`);
        
        if (!typeConfirm) {
          logger.info('Repository deletion cancelled by user (typed confirmation failed)');
          console.log('\nRepository deletion cancelled. Confirmation text did not match.');
          return;
        }
        
        // Third and final confirmation
        const finalConfirm = await confirmAction('This is your final confirmation. Proceed with PERMANENT deletion?');
        
        if (!finalConfirm) {
          logger.info('Repository deletion cancelled by user (final confirmation)');
          console.log('\nRepository deletion cancelled by user.');
          return;
        }
        
        console.log(`\n🗑️  Deleting repository ${org}_discovery...`);
        console.log(`${INFO_PREFIX} This may take a few moments...`);
        
        const deleteResult = await github.repositoryManager.deleteRepository();
        logResult('deleteRepository()', deleteResult, false);
        
        if (deleteResult[0]) {
          logger.info('Repository deleted successfully', {
            organization: org,
            repository: `${org}_discovery`
          });
          
          console.log(`\n${SUCCESS_PREFIX} Repository ${org}_discovery has been permanently deleted!`);
          repositoryExists = false; // Update status for verification step
        } else {
          // Check for specific error types
          const errorStatus = deleteResult[3];
          if (errorStatus === 403) {
            console.log(`\n${ERROR_PREFIX} Insufficient permissions to delete the repository.`);
            console.log(`${INFO_PREFIX} You need admin access to delete repositories.`);
            console.log(`${INFO_PREFIX} Please contact an organization owner or repository administrator.`);
          } else if (errorStatus === 404) {
            console.log(`\n${INFO_PREFIX} Repository was not found (may have been deleted already).`);
            repositoryExists = false;
          } else {
            console.log(`\n${ERROR_PREFIX} Failed to delete repository. See error details above.`);
          }
        }
      } finally {
        deleteTracker.end();
      }
    }
    
    // VERIFY DELETION
    if (runAll || operations.includes('verify-deletion')) {
      const verifyDeleteTracker = logger.trackOperation('repository', 'verifyDeletion');
      
      try {
        console.log(`\n${SECTION_DIVIDER}`);
        console.log('DELETION VERIFICATION');
        console.log(SECTION_DIVIDER);
        
        logger.debug('Verifying repository deletion', {
          repository: `${org}_discovery`,
          organization: org
        });
        
        console.log(`\n🔍 Verifying that repository ${org}_discovery has been deleted...`);
        
        // Small delay to allow GitHub to process the deletion
        console.log(`${INFO_PREFIX} Waiting for GitHub to process deletion...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Use direct repository manager call to bypass cache
        const verifyResult = await github.repositoryManager.getRepoSize();
        
        if (!verifyResult[0]) {
          // Repository should not exist (404 error expected)
          const errorStatus = verifyResult[3];
          // Check if the error message indicates "Not Found" (404)
          const errorMessage = verifyResult[1]?.status_msg || verifyResult[1];
          
          if (errorStatus === 404 || (typeof errorMessage === 'string' && errorMessage.includes('Not Found'))) {
            logger.info('Repository deletion verified', {
              organization: org,
              repository: `${org}_discovery`,
              message: 'Repository not found (expected after deletion)'
            });
            
            console.log(`\n${SUCCESS_PREFIX} Deletion verified!`);
            console.log(`${SUCCESS_PREFIX} Repository ${org}_discovery no longer exists`);
            console.log(`${INFO_PREFIX} The repository has been permanently removed from GitHub`);
          } else {
            logger.warn('Unexpected error during deletion verification', {
              organization: org,
              repository: `${org}_discovery`,
              error: verifyResult[1],
              status: errorStatus
            });
            
            console.log(`\n${WARNING_PREFIX} Deletion verification inconclusive`);
            console.log(`${INFO_PREFIX} Received unexpected error: ${errorMessage}`);
          }
        } else {
          // Repository still exists (unexpected)
          logger.error('Repository still exists after deletion attempt', {
            organization: org,
            repository: `${org}_discovery`
          });
          
          console.log(`\n${ERROR_PREFIX} Repository still exists!`);
          console.log(`${WARNING_PREFIX} The repository ${org}_discovery was not deleted successfully`);
          console.log(`${INFO_PREFIX} This may indicate insufficient permissions or a temporary GitHub issue`);
        }
      } finally {
        verifyDeleteTracker.end();
      }
    }
    
  } catch (error) {
    logger.error('Repository reset operations failed', {
      organization: org,
      error: error.message,
      stack: error.stack
    });
    console.error(`\n${ERROR_PREFIX} Error in repository reset operations:`, error.message);
  } finally {
    operationTracker.end();
  }
}

/**
 * Main function to run the repository reset example
 */
async function main() {
  console.log(`${SECTION_DIVIDER}`);
  console.log('MEDIUMROAST API - REPOSITORY RESET EXAMPLE');
  console.log(SECTION_DIVIDER);
  
  try {
    // Check for help flag
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
      console.log(`
Repository Reset Operations Example
===================================

This example demonstrates repository deletion and verification operations.

⚠️  WARNING: This script will PERMANENTLY DELETE your repository!
   Make sure you have backups of any important data before running.

Usage:
  node examples/github-reset-repository.js [operations...]

Operations:
  verify           - Check if the discovery repository exists
  delete           - Delete the discovery repository (PERMANENT!)
  verify-deletion  - Verify the repository has been deleted

Examples:
  node examples/github-reset-repository.js
  node examples/github-reset-repository.js verify
  node examples/github-reset-repository.js verify delete verify-deletion

Prerequisites:
- GitHub App must be installed on the organization
- Admin permissions required for repository deletion
- config.ini file with GitHub token and organization
`);
      return;
    }
    
    // Load configuration
    const configFile = path.join(__dirname, 'config.ini');
    
    // Check if config exists
    if (!fs.existsSync(configFile)) {
      logger.error('Configuration file not found', {
        configFile,
        message: 'Please create a config.ini file with your GitHub token and organization.'
      });
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
      logger.error('GitHub configuration not found in config.ini', {
        configFile,
        message: 'Please make sure you have [GitHub] section with \'token\' and \'org\' settings.'
      });
      console.error(`${ERROR_PREFIX} GitHub configuration not found in config.ini`);
      console.error('Please make sure you have [GitHub] section with \'token\' and \'org\' settings.');
      console.error('[GitHub]');
      console.error('token = YOUR_GITHUB_TOKEN');
      console.error('org = YOUR_ORGANIZATION_NAME');
      process.exit(1);
    }
        
    const token = config.get('GitHub', 'token');
    const org = config.get('GitHub', 'org');
        
    logger.info('Starting repository reset example', { organization: org });
    console.log(`Using organization: ${org}`);
    console.log(`Target repository: ${org}_discovery`);
    
    // Warn about destructive operations
    console.log(`\n${WARNING_PREFIX} DANGER: This example performs DESTRUCTIVE operations!`);
    console.log(`${WARNING_PREFIX} It will PERMANENTLY DELETE your repository if you confirm.`);
    console.log(`${WARNING_PREFIX} Make sure you have backups of any important data.`);
    const globalConfirmation = await confirmAction('Do you understand the risks and want to continue?');
    
    if (!globalConfirmation) {
      logger.info('Repository reset example cancelled by user');
      console.log('\nRepository reset example cancelled by user.');
      process.exit(0);
    }
        
    // Get command-line arguments to determine which operations to run
    const operations = args.length > 0 ? args : []; // Empty array means run all
        
    logger.info('Repository reset operations selected', {
      operations: operations.length > 0 ? operations : ['all'],
      organization: org
    });
    console.log(`Operations to run: ${operations.length > 0 ? operations.join(', ') : 'all'}`);
    
    // Run repository reset demonstration
    const startTime = Date.now();
    await demonstrateRepositoryReset(token, org, operations);
    
    const duration = Date.now() - startTime;
    logger.info('Repository reset example completed successfully', {
      organization: org,
      operations: operations.length > 0 ? operations : ['all'],
      duration_ms: duration
    });
        
  } catch (error) {
    logger.error('Repository reset example failed', {
      error: error.message,
      stack: error.stack
    });
    console.error(`\n${ERROR_PREFIX} Repository reset example failed:`, error.message);
    process.exit(1);
  }
}

// Run the example
main().catch(error => {
  logger.error('Unhandled error in repository reset example', {
    error: error.message,
    stack: error.stack
  });
  console.error(`\n${ERROR_PREFIX} Unhandled error:`, error.message);
  process.exit(1);
});
