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
    if (data && showData) {
      logger.debug(`Operation data for ${operationName}:`, data);
    }
  } else {
    logger.error(`Operation failed: ${operationName}`, logData);
  }
}

/**
 * Demonstrates Repository and Container setup operations
 * @param {string} token - GitHub token
 * @param {string} org - GitHub organization
 * @param {Array<string>} operations - Specific operations to run
 */
async function demonstrateRepositorySetup(token, org, operations) {
  const operationTracker = logger.trackTransaction('repository-setup');
  
  try {
    logger.debug('Starting repository and container setup', { organization: org });
    
    const github = new GitHubFunctions(token, org, 'repository-setup-example');
    
    // First, check if the GitHub App is properly installed
    logger.debug('Starting pre-flight checks');
    const appCheckResult = await github.checkGitHubAppInstallation();
    
    if (!appCheckResult[0]) {
      const appCheck = appCheckResult[2];
      logger.error('GitHub App installation check failed', {
        organization: org,
        error: appCheck.error,
        canAccessOrg: appCheck.canAccessOrg
      });
      
      if (!appCheck.canAccessOrg) {
        logger.error('Cannot access organization', {
          organization: org,
          message: 'Please ensure the organization name is correct and your token has access'
        });
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
      
      const retry = await confirmAction('Have you installed the GitHub App? Would you like to retry the check?');
      if (retry) {
        // Recursive call to re-check
        return await demonstrateRepositorySetup(token, org, operations);
      } else {
        logger.info('Setup cancelled - GitHub App installation required');
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
    
    // Check for existing installations
    logger.debug('Checking for existing installations');
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
      logger.info('Existing installations detected', {
        repository: installationStatus.repository.exists,
        containers: installationStatus.containers.existing.length
      });
      userDecisions = await promptForExistingInstallations(installationStatus);
      
      if (userDecisions.skipAll) {
        logger.info('All operations cancelled by user');
        return;
      }
    } else {
      logger.info('No existing installations detected, proceeding with fresh setup');
    }
    
    const runAll = operations.length === 0;
    
    // Create Repository
    if ((runAll || operations.includes('repository')) && userDecisions.proceedWithRepository) {
      const repoTracker = logger.trackOperation('repository', 'create');
      
      try {
        logger.debug('Starting repository creation', {
          repository: `${org}_discovery`,
          organization: org
        });
        
        // Confirm before proceeding
        const confirmed = await confirmAction(`This will create the repository ${org}_discovery in your organization. Continue?`);
        
        if (!confirmed) {
          logger.info('Repository creation cancelled by user');
        } else {
          const createRepoResult = await github.createRepository();
          logResult('createRepository()', createRepoResult);
          
          if (createRepoResult[0]) {
            logger.info('Repository created successfully', {
              organization: org,
              repository: `${org}_discovery`,
              url: `https://github.com/${org}/${org}_discovery`
            });
          }
        }
      } finally {
        repoTracker.end();
      }
    }
    
    // Create Containers
    if ((runAll || operations.includes('containers')) && userDecisions.proceedWithContainers) {
      const containerTracker = logger.trackOperation('containers', 'create');
      
      try {
        logger.debug('Starting container creation', {
          containers: ['Studies', 'Companies', 'Interactions'],
          organization: org
        });
        
        // Confirm before proceeding
        const confirmed = await confirmAction('This will create three directories (Studies, Companies, Interactions) in the discovery repository. Continue?');
        
        if (!confirmed) {
          logger.info('Container creation cancelled by user');
        } else {
          const createContainersResult = await github.containerOps.createContainers();
          logResult('containerOps.createContainers()', createContainersResult);
          
          if (createContainersResult[0]) {
            // Aggregate container results
            const containerData = createContainersResult[2];
            if (containerData && Array.isArray(containerData)) {
              const summary = { success: 0, failed: 0, failures: [] };
              
              containerData.forEach(result => {
                if (result.success) {
                  summary.success++;
                } else {
                  summary.failed++;
                  summary.failures.push({
                    container: result.container,
                    message: typeof result.message === 'object' && result.message.status_msg 
                      ? result.message.status_msg 
                      : result.message
                  });
                }
              });
              
              logger.info('Container creation completed', {
                total: containerData.length,
                succeeded: summary.success,
                failed: summary.failed,
                organization: org
              });
              
              // Log failures in detail
              if (summary.failed > 0) {
                logger.warn('Container creation failures', summary.failures);
              }
              
              logger.debug('JSON files automatically created as part of container creation');
            }
          }
        }
      } finally {
        containerTracker.end();
      }
    }
    
    // Get Organization info
    if (runAll || operations.includes('orginfo')) {
      const orgTracker = logger.trackOperation('organization', 'getInfo');
      
      try {
        logger.debug('Fetching organization information', { organization: org });
        const orgResult = await github.getGitHubOrg();
        logResult('getGitHubOrg()', orgResult, false);
        
        if (orgResult[0]) {
          const orgData = orgResult[2];
          logger.info('Organization information retrieved', {
            name: orgData.name || orgData.login,
            login: orgData.login,
            description: orgData.description || 'No description',
            location: orgData.location || 'Not specified',
            public_repos: orgData.public_repos,
            private_repos: orgData.total_private_repos || 'N/A',
            members: orgData.collaborators || 'N/A',
            created: new Date(orgData.created_at).toLocaleDateString()
          });
        }
      } finally {
        orgTracker.end();
      }
    }
    
    // Get Repository size
    if (runAll || operations.includes('reposize')) {
      const sizeTracker = logger.trackOperation('repository', 'getSize');
      
      try {
        logger.debug('Fetching repository size information', { organization: org });
        const sizeResult = await github.getRepoSize();
        logResult('getRepoSize()', sizeResult, false);
        
        if (sizeResult[0]) {
          const sizeData = sizeResult[2];
          logger.info('Repository size information retrieved', {
            repository: sizeData.repository,
            size_kb: sizeData.size_kb,
            size_mb: sizeData.size_mb,
            organization: org
          });
        }
      } finally {
        sizeTracker.end();
      }
    }
    
  } catch (error) {
    logger.error('Repository setup operations failed', {
      organization: org,
      error: error.message,
      stack: error.stack
    });
  } finally {
    operationTracker.end();
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
    logger.debug('Checking if repository exists');
    try {
      const repoResult = await github.getRepoSize();
      if (repoResult[0]) {
        status.repository.exists = true;
        logger.debug('Repository exists');
      }
    } catch (err) {
      status.repository.error = err.message;
      logger.debug('Repository does not exist');
    }

    // Check if containers exist (only if repository exists)
    if (status.repository.exists) {
      logger.debug('Checking container directories');
      const containers = ['Studies', 'Companies', 'Interactions'];
      
      for (const container of containers) {
        try {
          const contentResult = await github.getContent(container);
          if (contentResult[0]) {
            status.containers.existing.push(container);
            logger.debug(`${container} directory exists`);
          } else {
            status.containers.missing.push(container);
            logger.debug(`${container} directory missing`);
          }
        } catch (err) {
          status.containers.missing.push(container);
          logger.debug(`${container} directory missing`);
        }
      }
      
      status.containers.exists = status.containers.existing.length > 0;
    }

  } catch (error) {
    logger.error('Error during installation check', {
      error: error.message,
      stack: error.stack
    });
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
      logger.info('Repository operations will be skipped by user choice');
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
      logger.info('Container operations will be skipped by user choice');
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

  logger.debug('User decisions for existing installations', decisions);
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
      logger.error('Configuration file not found', {
        configFile,
        message: 'Please create a config.ini file in the examples directory with your GitHub token and org.'
      });
      return;
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
      return;
    }
        
    const token = config.get('GitHub', 'token');
    const org = config.get('GitHub', 'org');
        
    logger.info('Starting repository setup example', { organization: org });
    
    // Warn about write operations
    console.log(`${WARNING_PREFIX} This example performs WRITE operations that will modify your repository.`);
    const globalConfirmation = await confirmAction('Do you want to continue with these examples?');
    
    if (!globalConfirmation) {
      logger.info('Repository setup cancelled by user');
      return;
    }
        
    // Get command-line arguments to determine which operations to run
    const args = process.argv.slice(2);
    const operations = args.length > 0 ? args : []; // Empty array means run all
    
    logger.info('Repository setup operations selected', {
      operations: operations.length > 0 ? operations : ['all'],
      organization: org
    });
    
    // Run repository setup demonstration
    const startTime = Date.now();
    await demonstrateRepositorySetup(token, org, operations);
    
    const duration = Date.now() - startTime;
    logger.info('Repository setup example completed successfully', {
      organization: org,
      operations: operations.length > 0 ? operations : ['all'],
      duration_ms: duration
    });
        
  } catch (error) {
    logger.error('Repository setup example failed', {
      error: error.message,
      stack: error.stack
    });
  }
}

// Run the example
main().catch(error => {
  logger.error('Unhandled error in repository setup example', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});
