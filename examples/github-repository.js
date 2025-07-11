/**
 * Example demonstrating repository and container setup operations
 * @author Michael Hay <michael.hay@mediumroast.io>
 * @file github-repository.js
 * @license Apache-2.0
 * @version 3.0.0
 * @copyright 2025 Mediumroast, Inc. All rights reserved.
 * 
 * This example shows how to set up the GitHub repository infrastructure
 * for mediumroast.io applications.
 * 
 * It demonstrates:
 * - Repository: Create the discovery repository
 * - Containers: Create container directories (Studies, Companies, Interactions)
 * - Organization: Get organization information
 * - Repository size: Check repository size
 * 
 * To run this example, create a config.ini file with your GitHub token and organization.
 * The file should look like this:
 * 
 * [GitHub]
 * token = YOUR_GITHUB_TOKEN
 * org = YOUR_ORGANIZATION_NAME
 * 
 * You can run the example with:
 * node examples/github-repository.js
 * 
 * Or specify specific operations:
 * node examples/github-repository.js repository containers orginfo reposize
 * 
 * Available operations:
 * - repository   - Create the discovery repository
 * - containers   - Create container directories
 * - orginfo      - Display organization information
 * - reposize     - Display repository size information
 * 
 * This will run all operations by default.
 * 
 * Prerequisites: The script automatically checks and ensures:
 * 1. GitHub App is properly installed and has permissions
 * 2. Prompts for confirmation before making changes
 * 3. Handles existing installations gracefully
 * 
 * Note: Make sure you have the necessary permissions for the token to perform write operations.
 * 
 * @requires configparser
 * @requires fs
 * @requires path
 * @requires ../src/api/github.js
 */

/* eslint-disable no-console */

import GitHubFunctions from '../src/api/github.js';
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
 * Demonstrates Repository and Container setup operations
 * @param {string} token - GitHub token
 * @param {string} org - GitHub organization
 * @param {Array<string>} operations - Specific operations to run
 */
async function demonstrateRepositorySetup(token, org, operations) {
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('REPOSITORY AND CONTAINER SETUP');
  console.log(SECTION_DIVIDER);
  
  try {
    const github = new GitHubFunctions(token, org, 'repository-setup-example');
    
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
        return await demonstrateRepositorySetup(token, org, operations);
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
    console.log('CHECKING EXISTING INSTALLATIONS');
    console.log(SECTION_DIVIDER);
    
    const installationStatus = await checkExistingInstallations(github);
    
    // If anything exists, prompt the user
    const hasExistingComponents = installationStatus.repository.exists || 
                                 installationStatus.containers.exists;
    
    let userDecisions = {
      proceedWithRepository: true,
      proceedWithContainers: true,
      skipAll: false
    };
    
    if (hasExistingComponents) {
      userDecisions = await promptForExistingInstallations(installationStatus);
      
      if (userDecisions.skipAll) {
        console.log('\n🚫 All operations cancelled by user.');
        return;
      }
    } else {
      console.log('\n✅ No existing installations detected. Proceeding with fresh setup...');
    }
    
    const runAll = operations.length === 0;
    
    // Create Repository
    if ((runAll || operations.includes('repository')) && userDecisions.proceedWithRepository) {
      console.log(`\n${SECTION_DIVIDER}`);
      console.log('CREATE DISCOVERY REPOSITORY');
      console.log(SECTION_DIVIDER);
      
      console.log(`\nCreating repository: ${org}_discovery`);
      console.log('This repository will store all mediumroast.io application assets.');
      
      // Confirm before proceeding
      const confirmed = await confirmAction(`This will create the repository ${org}_discovery in your organization. Continue?`);
      
      if (!confirmed) {
        console.log('\nRepository creation cancelled by user.');
      } else {
        console.log('\nCreating repository...');
        const createRepoResult = await github.createRepository();
        logResult('createRepository()', createRepoResult);
        
        if (createRepoResult[0]) {
          console.log(`\n${SUCCESS_PREFIX} Repository ${org}_discovery created successfully!`);
          console.log(`Repository URL: https://github.com/${org}/${org}_discovery`);
        }
      }
    }
    
    // Create Containers
    if ((runAll || operations.includes('containers')) && userDecisions.proceedWithContainers) {
      console.log(`\n${SECTION_DIVIDER}`);
      console.log('CREATE CONTAINERS (DIRECTORIES)');
      console.log(SECTION_DIVIDER);
      
      console.log('\nCreating container directories for Studies, Companies, and Interactions...');
      
      // Confirm before proceeding
      const confirmed = await confirmAction('This will create three directories (Studies, Companies, Interactions) in the discovery repository. Continue?');
      
      if (!confirmed) {
        console.log('\nContainer creation cancelled by user.');
      } else {
        console.log('\nCreating containers...');
        const createContainersResult = await github.containerOps.createContainers();
        logResult('containerOps.createContainers()', createContainersResult);
        
        if (createContainersResult[0]) {
          console.log(`\n${SUCCESS_PREFIX} Containers created successfully!`);
          
          // Show the created containers
          const containerData = createContainersResult[2];
          if (containerData && Array.isArray(containerData)) {
            console.log('\nContainer creation results:');
            containerData.forEach(result => {
              const status = result.success ? SUCCESS_PREFIX : ERROR_PREFIX;
              const message = typeof result.message === 'object' && result.message.status_msg 
                ? result.message.status_msg 
                : result.message;
              console.log(`  ${status} ${result.container}: ${message}`);
            });
          }
          
          console.log('\n📝 JSON files are automatically created as part of container creation.');
          console.log('No additional JSON file creation needed - containers are ready to use!');
        }
      }
    }
    
    // Get Organization info
    if (runAll || operations.includes('orginfo')) {
      console.log(`\n${SECTION_DIVIDER}`);
      console.log('ORGANIZATION INFORMATION');
      console.log(SECTION_DIVIDER);
      
      console.log('\nFetching organization information...');
      const orgResult = await github.getGitHubOrg();
      logResult('getGitHubOrg()', orgResult, false);
      
      if (orgResult[0]) {
        const orgData = orgResult[2];
        console.log(`\n${SUCCESS_PREFIX} Organization Details:`);
        console.log(`  Name: ${orgData.name || orgData.login}`);
        console.log(`  Login: ${orgData.login}`);
        console.log(`  Description: ${orgData.description || 'No description'}`);
        console.log(`  Location: ${orgData.location || 'Not specified'}`);
        console.log(`  Public repos: ${orgData.public_repos}`);
        console.log(`  Private repos: ${orgData.total_private_repos || 'N/A'}`);
        console.log(`  Members: ${orgData.collaborators || 'N/A'}`);
        console.log(`  Created: ${new Date(orgData.created_at).toLocaleDateString()}`);
      }
    }
    
    // Get Repository size
    if (runAll || operations.includes('reposize')) {
      console.log(`\n${SECTION_DIVIDER}`);
      console.log('REPOSITORY SIZE INFORMATION');
      console.log(SECTION_DIVIDER);
      
      console.log('\nFetching repository size...');
      const sizeResult = await github.getRepoSize();
      logResult('getRepoSize()', sizeResult, false);
      
      if (sizeResult[0]) {
        const sizeData = sizeResult[2];
        console.log(`\n${SUCCESS_PREFIX} Repository Size:`);
        console.log(`  Repository: ${sizeData.repository}`);
        console.log(`  Size: ${sizeData.size_kb} KB (${sizeData.size_mb} MB)`);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error in Repository setup operations:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

/**
 * Checks for existing repository and container installations
 * @param {GitHubFunctions} github - GitHubFunctions instance
 * @returns {Promise<Object>} Installation status details
 */
async function checkExistingInstallations(github) {
  const status = {
    repository: { exists: false, error: null },
    containers: { exists: false, existing: [], missing: [] }
  };

  try {
    // Check if repository exists
    console.log('🔍 Checking if repository exists...');
    try {
      const repoResult = await github.getRepoSize();
      if (repoResult[0]) {
        status.repository.exists = true;
        console.log('✅ Repository exists');
      }
    } catch (err) {
      status.repository.error = err.message;
      console.log('❌ Repository does not exist');
    }

    // Check if containers exist (only if repository exists)
    if (status.repository.exists) {
      console.log('🔍 Checking container directories...');
      const containers = ['Studies', 'Companies', 'Interactions'];
      
      for (const container of containers) {
        try {
          const contentResult = await github.getContent(container);
          if (contentResult[0]) {
            status.containers.existing.push(container);
            console.log(`✅ ${container} directory exists`);
          } else {
            status.containers.missing.push(container);
            console.log(`❌ ${container} directory missing`);
          }
        } catch (err) {
          status.containers.missing.push(container);
          console.log(`❌ ${container} directory missing`);
        }
      }
      
      status.containers.exists = status.containers.existing.length > 0;
    }

  } catch (error) {
    console.error('Error during installation check:', error.message);
  }

  return status;
}

/**
 * Prompts user about existing installations and returns what actions to take
 * @param {Object} installationStatus - Status from checkExistingInstallations
 * @returns {Promise<Object>} User decisions about what to proceed with
 */
async function promptForExistingInstallations(installationStatus) {
  const decisions = {
    proceedWithRepository: true,
    proceedWithContainers: true,
    skipAll: false
  };

  console.log(`\n${WARNING_PREFIX} EXISTING INSTALLATION DETECTED`);
  console.log('The following components are already installed:');

  // Repository status
  if (installationStatus.repository.exists) {
    console.log('  📁 Repository: ✅ EXISTS');
    const proceed = await confirmAction('Repository already exists. Do you want to proceed anyway? (This will skip repository creation)');
    decisions.proceedWithRepository = proceed;
    if (!proceed) {
      console.log('Repository operations will be skipped.');
    }
  } else {
    console.log('  📁 Repository: ❌ NOT FOUND (will be created)');
  }

  // Containers status
  if (installationStatus.containers.exists) {
    console.log(`  📂 Containers: ✅ ${installationStatus.containers.existing.length}/3 EXIST`);
    if (installationStatus.containers.existing.length > 0) {
      console.log(`     Existing: ${installationStatus.containers.existing.join(', ')}`);
    }
    if (installationStatus.containers.missing.length > 0) {
      console.log(`     Missing: ${installationStatus.containers.missing.join(', ')}`);
    }
    
    const proceed = await confirmAction('Some containers already exist. Do you want to proceed? (Existing containers will be left unchanged)');
    decisions.proceedWithContainers = proceed;
    if (!proceed) {
      console.log('Container operations will be skipped.');
    }
  } else if (installationStatus.repository.exists) {
    console.log('  📂 Containers: ❌ NOT FOUND (will be created)');
  }

  // Final confirmation if any components exist
  const hasExistingComponents = installationStatus.repository.exists || 
                               installationStatus.containers.exists;

  if (hasExistingComponents) {
    const finalConfirm = await confirmAction('Do you want to proceed with the selected operations?');
    if (!finalConfirm) {
      decisions.skipAll = true;
    }
  }

  return decisions;
}

/**
 * Main function to run the repository setup example
 */
async function main() {
  console.log(`${SECTION_DIVIDER}`);
  console.log('MEDIUMROAST API - REPOSITORY SETUP EXAMPLE');
  console.log(`${SECTION_DIVIDER}`);
  
  try {
    // Load configuration
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
      console.log('\nExample cancelled by user.');
      return;
    }
        
    // Get command-line arguments to determine which operations to run
    const args = process.argv.slice(2);
    const operations = args.length > 0 ? args : []; // Empty array means run all
    
    console.log(`\nRunning operations: ${operations.length > 0 ? operations.join(', ') : 'all'}`);
    
    // Run repository setup demonstration
    await demonstrateRepositorySetup(token, org, operations);
    
    console.log(`\n${SECTION_DIVIDER}`);
    console.log('Repository setup example completed successfully!');
    console.log(`${SECTION_DIVIDER}`);
        
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
