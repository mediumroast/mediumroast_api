/**
 * Example demonstrating write operations in gitHubServer.js
 * @author Michael Hay <michael.hay@mediumroast.io>
 * @file github-write-operations.js
 * @license Apache-2.0
 * @version 3.0.0
 * @copyright 2025 Mediumroast, Inc. All rights reserved.
 * 
 * This example shows how to use various entity classes to perform write operations
 * against a GitHub organization.
 * 
 * It currently demonstrates:
 * - Actions: Install, update, and delete GitHub Actions workflows
 * 
 * To run this example, create a config.ini file with your GitHub token and organization.
 * The file should look like this:
 * 
 * [GitHub]
 * token = YOUR_GITHUB_TOKEN
 * org = YOUR_ORGANIZATION_NAME
 * 
 * You can run the example with:
 * node examples/github-write-operations.js
 * 
 * You can also specify which categories to run:
 * node examples/github-write-operations.js actions
 * 
 * Or specify specific operations within a category:
 * node examples/github-write-operations.js actions:install actions:delete
 * 
 * This will run all operations by default, or you can specify individual ones.
 * 
 * Note: Make sure you have the necessary permissions for the token to perform write operations.
 * 
 * @requires configparser
 * @requires fs
 * @requires path
 * @requires url
 * @requires ../src/api/gitHubServer.js
 */

/* eslint-disable no-console */

import { Studies, Companies, Interactions, Actions } from '../src/api/gitHubServer.js';
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
 * Formats and logs operation results
 * @param {string} operationName - Name of the operation
 * @param {Array} result - Result array [success, message, data]
 * @param {boolean} showData - Whether to display full data object
 */
function logResult(operationName, result, showData = true) {
  const [success, message, data] = result;
  const prefix = success ? SUCCESS_PREFIX : ERROR_PREFIX;
    
  console.log(`\n${prefix} ${operationName}:`);
  console.log(`Status: ${success ? 'Success' : 'Failed'}`);
  console.log(`Message: ${message?.status_msg || message}`);
    
  if (data && showData) {
    console.log('Data:', JSON.stringify(data, null, 2));
  }
}

/**
 * Demonstrates Actions write operations
 * @param {string} token - GitHub token
 * @param {string} org - GitHub organization
 * @param {Array<string>} operations - Specific operations to run
 */
async function demonstrateActionsOperations(token, org, operations) {
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('ACTIONS WRITE OPERATIONS');
  console.log(SECTION_DIVIDER);
  
  // Create visible tmp directory in the project root
  const tmpDir = path.join(__dirname, '../tmp');
  console.log(`Creating visible tmp directory at: ${tmpDir}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  
  try {
    // Set environment variable to direct the Actions class to use our tmp directory
    process.env.MR4GH_TMP_DIR = tmpDir;
    console.log(`Set temporary directory to: ${process.env.MR4GH_TMP_DIR}`);
    
    const actions = new Actions(token, org, 'example-process');
    const runAll = operations.length === 0;
    
    // Install Actions workflows
    if (runAll || operations.includes('install')) {
      console.log(`\n${SECTION_DIVIDER}`);
      console.log('INSTALL ACTIONS WORKFLOWS');
      console.log(SECTION_DIVIDER);
      
      // Confirm before proceeding
      const confirmed = await confirmAction('This will install GitHub Actions workflows from mr4gh-automations. Continue?');
      
      if (!confirmed) {
        console.log('\nInstallation cancelled by user.');
      } else {
        // Install workflows from mr4gh-automations
        console.log('\nInstalling GitHub Actions workflows...');
        console.log('This operation will download assets from mr4gh-automations repository');
        console.log(`All files will be visible in: ${tmpDir}`);
        
        // Call the installActions method with extra debug mode
        const installResult = await actions.installActions(true); // true = debug mode
        logResult('installActions()', installResult);
        
        // Show files downloaded in tmp directory
        console.log('\nFiles downloaded to tmp directory:');
        if (fs.existsSync(tmpDir)) {
          const files = fs.readdirSync(tmpDir);
          files.forEach(file => {
            console.log(`- ${file}`);
            
            // If it's a directory, show its contents too
            const filePath = path.join(tmpDir, file);
            if (fs.statSync(filePath).isDirectory()) {
              const subFiles = fs.readdirSync(filePath);
              subFiles.forEach(subFile => {
                console.log(`  └─ ${subFile}`);
              });
            }
          });
        }
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
            
            // This uses the same code as the installation section
            console.log('\nInstalling GitHub Actions workflows...');
            console.log('This operation will download assets from mr4gh-automations repository');
            console.log(`All files will be visible in: ${tmpDir}`);
            
            // Call the installActions method with extra debug mode
            const installResult = await actions.installActions(true); // true = debug mode
            logResult('installActions()', installResult);
          } else {
            console.log('\nUpdate canceled. Please install actions first.');
          }
          
          // Use return to exit early instead of continue
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
    
    // Delete Actions workflows
    if (runAll || operations.includes('delete')) {
      console.log(`\n${SECTION_DIVIDER}`);
      console.log('DELETE ACTIONS WORKFLOWS');
      console.log(SECTION_DIVIDER);
      
      // Show current workflows first
      console.log('\nFetching current workflow runs...');
      const currentWorkflows = await actions.getAll();
      logResult('Current workflows (getAll)', currentWorkflows);
      
      // Ask if specific workflows should be deleted
      const rl = createReadlineInterface();
      const specificWorkflows = await new Promise((resolve) => {
        rl.question(`${WARNING_PREFIX} Delete specific workflows? Enter comma-separated names or leave blank for all: `, (answer) => {
          rl.close();
          if (answer.trim() === '') {
            resolve(null);
          } else {
            resolve(answer.split(',').map(name => name.trim()));
          }
        });
      });
      
      // Ask if action files should also be deleted
      const includeActions = await confirmAction('Would you like to delete action files in .github/actions/ directory as well?');
      
      // Final confirmation based on what will be deleted
      const message = specificWorkflows 
        ? `This will delete these workflows: ${specificWorkflows.join(', ')}${includeActions ? ' AND ALL ACTION FILES in .github/actions/' : ''}. Continue?`
        : `This will delete ALL GitHub Actions workflows${includeActions ? ' AND ALL ACTION FILES in .github/actions/' : ''}. Continue?`;
        
      const confirmed = await confirmAction(message);
      
      if (!confirmed) {
        console.log('\nDeletion cancelled by user.');
      } else {
        // Delete workflows and possibly actions
        console.log('\nDeleting GitHub Actions files...');
        const deleteResult = await actions.deleteActions(specificWorkflows, includeActions);
        logResult('deleteActions()', deleteResult);
        
        // Get updated workflow runs to show changes
        console.log('\nFetching remaining workflow runs...');
        const remainingWorkflows = await actions.getAll();
        logResult('Remaining workflows (getAll)', remainingWorkflows);
      }
    }
  } catch (error) {
    console.error('\n❌ Error in Actions operations:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

/**
 * Demonstrates Studies write operations
 * @param {string} token - GitHub token
 * @param {string} org - GitHub organization
 * @param {Array<string>} operations - Specific operations to run
 */
async function demonstrateStudiesOperations(token, org, operations) {
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('STUDIES WRITE OPERATIONS');
  console.log(SECTION_DIVIDER);
  
  console.log('\nStudies write operations will be implemented in a future version.');
  
  // Reserved for future implementation
}

/**
 * Demonstrates Companies write operations
 * @param {string} token - GitHub token
 * @param {string} org - GitHub organization
 * @param {Array<string>} operations - Specific operations to run
 */
async function demonstrateCompaniesOperations(token, org, operations) {
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('COMPANIES WRITE OPERATIONS');
  console.log(SECTION_DIVIDER);
  
  console.log('\nCompanies write operations will be implemented in a future version.');
  
  // Reserved for future implementation
}

/**
 * Demonstrates Interactions write operations
 * @param {string} token - GitHub token
 * @param {string} org - GitHub organization
 * @param {Array<string>} operations - Specific operations to run
 */
async function demonstrateInteractionsOperations(token, org, operations) {
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('INTERACTIONS WRITE OPERATIONS');
  console.log(SECTION_DIVIDER);
  
  console.log('\nInteractions write operations will be implemented in a future version.');
  
  // Reserved for future implementation
}

/**
 * Main function to run the example
 */
async function main() {
  try {
    console.log('GitHub Server Write Operations Example');
    console.log('======================================');
        
    // Get config file path
    const configFile = path.join(__dirname, 'config.ini');
        
    // Check if config exists
    if (!fs.existsSync(configFile)) {
      console.error(`Error: Config file not found at ${configFile}`);
      console.error('Please create a config.ini file in the examples directory with your GitHub token and org.');
      return;
    }
        
    // Read config
    const config = new ConfigParser();
    config.read(configFile);
        
    // Get GitHub token and org from config
    if (!config.hasSection('GitHub') || !config.hasKey('GitHub', 'token') || !config.hasKey('GitHub', 'org')) {
      console.error('Error: GitHub configuration not found in config.ini.');
      console.error('Please make sure you have [GitHub] section with \'token\' and \'org\' settings.');
      return;
    }
        
    const token = config.get('GitHub', 'token');
    const org = config.get('GitHub', 'org');
        
    console.log(`Using organization: ${org}`);
    
    // Warn about write operations
    console.log(`${WARNING_PREFIX} This example performs WRITE operations that will modify your repository.`);
    const globalConfirmation = await confirmAction('Do you want to continue with these examples?');
    
    if (!globalConfirmation) {
      console.log('\nExamples cancelled by user.');
      return;
    }
        
    // Get command-line arguments to determine which demos to run
    const args = process.argv.slice(2);
    
    // Parse arguments to determine which entity types and operations to run
    const entityOperations = {
      actions: [],
      studies: [],
      companies: [],
      interactions: [],
      storage: []
    };
    
    // If no args, run all entity types with all operations
    const runAllEntities = args.length === 0;
    
    // Parse arguments in format "entity:operation"
    for (const arg of args) {
      if (arg.includes(':')) {
        const [entity, operation] = arg.split(':');
        if (entityOperations[entity]) {
          entityOperations[entity].push(operation);
        }
      } else if (entityOperations[arg]) {
        // If just entity name is provided, run all operations for that entity
        entityOperations[arg] = [];
      }
    }
    
    // Run selected demonstrations
    if (runAllEntities || args.includes('actions') || entityOperations.actions.length > 0) {
      await demonstrateActionsOperations(token, org, entityOperations.actions);
    }
    
    if (runAllEntities || args.includes('studies') || entityOperations.studies.length > 0) {
      await demonstrateStudiesOperations(token, org, entityOperations.studies);
    }
    
    if (runAllEntities || args.includes('companies') || entityOperations.companies.length > 0) {
      await demonstrateCompaniesOperations(token, org, entityOperations.companies);
    }
    
    if (runAllEntities || args.includes('interactions') || entityOperations.interactions.length > 0) {
      await demonstrateInteractionsOperations(token, org, entityOperations.interactions);
    }
    
    console.log(`\n${SECTION_DIVIDER}`);
    console.log('Example completed successfully!');
        
  } catch (error) {
    console.error('\nAn error occurred while running the example:');
    console.error(error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
  }
}

// Run the example
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});