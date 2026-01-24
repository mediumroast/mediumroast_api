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
 * - Repository: Create the discovery repository and containers (Studies, Companies, Interactions)
 * - Companies: Create and manage company data in GitHub repositories
 * 
 * For GitHub Actions operations (install, update, delete), see github-update-operations.js
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
 * node examples/github-write-operations.js repository companies
 * 
 * Or specify specific operations within a category:
 * node examples/github-write-operations.js repository:repository repository:containers companies:create-test companies:create-all companies:list
 * 
 * Companies operations:
 * - companies:create-test  - Create first 2 test companies from sample data
 * - companies:create-all   - Create all remaining companies from sample data
 * - companies:list         - List all existing companies with summary
 * 
 * This will run all operations by default, or you can specify individual ones.
 * 
 * Prerequisites: The script automatically checks and ensures:
 * 1. GitHub App is properly installed and has permissions
 * 2. Repository exists (creates if missing)
 * 3. Containers exist (creates if missing)
 * 4. Required files exist (creates if missing)
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

import { Studies, Companies, Interactions } from '../src/api/gitHubServer.js';
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
  
  try {
    // First, check repository and container prerequisites
    console.log('\n🔍 Checking prerequisites for companies operations...');
    
    const github = new GitHubFunctions(token, org, 'companies-prerequisite-check');
    
    // Check if repository exists
    const repoResult = await github.getRepoSize();
    if (!repoResult[0]) {
      console.error(`${ERROR_PREFIX} Repository does not exist or is not accessible`);
      console.log('📋 Please run repository setup first:');
      console.log('   node examples/github-write-operations.js repository');
      return;
    }
    console.log('✅ Repository exists and is accessible');
    
    // Check if Companies container exists
    console.log('🔍 Checking Companies container...');
    const containerResult = await github.getContent('Companies');
    if (!containerResult[0]) {
      console.error(`${ERROR_PREFIX} Companies container does not exist`);
      console.log('📋 Please run container setup first:');
      console.log('   node examples/github-write-operations.js repository:containers');
      return;
    }
    console.log('✅ Companies container exists');
    
    // Check if Companies.json file exists
    console.log('🔍 Checking Companies.json file...');
    const companiesFileResult = await github.getContent('Companies/Companies.json');
    if (!companiesFileResult[0]) {
      console.log(`${WARNING_PREFIX} Companies.json file does not exist, will be created`);
      
      // Create an empty companies file
      console.log('📝 Creating empty Companies.json file...');
      const emptyCompaniesResult = await github.writeBlob(
        'Companies',
        'Companies.json',
        JSON.stringify([], null, 2),
        'main'
      );
      
      if (!emptyCompaniesResult[0]) {
        console.error(`${ERROR_PREFIX} Failed to create Companies.json file: ${emptyCompaniesResult[1]}`);
        return;
      }
      console.log('✅ Created empty Companies.json file');
    } else {
      console.log('✅ Companies.json file exists');
    }
    
    console.log(`\n${SUCCESS_PREFIX} All prerequisites satisfied for companies operations`);
    
    // Load sample company data
    const sampleDataPath = path.join(__dirname, 'sample_data', 'companies.json');
    console.log(`\n📄 Loading sample company data from: ${sampleDataPath}`);
    
    if (!fs.existsSync(sampleDataPath)) {
      console.error(`${ERROR_PREFIX} Sample data file not found: ${sampleDataPath}`);
      return;
    }
    
    const sampleCompanies = JSON.parse(fs.readFileSync(sampleDataPath, 'utf8'));
    console.log(`${SUCCESS_PREFIX} Loaded ${sampleCompanies.length} sample companies`);
    
    // Initialize Companies entity class
    const companies = new Companies(token, org, 'company-operations-example');
    const runAll = operations.length === 0;
    
    // Create initial test companies (first 2)
    if (runAll || operations.includes('create-test')) {
      console.log(`\n${SECTION_DIVIDER}`);
      console.log('CREATE TEST COMPANIES (First 2)');
      console.log(SECTION_DIVIDER);
      
      const testCompanies = sampleCompanies.slice(0, 2);
      console.log(`\n📝 Creating ${testCompanies.length} test companies:`);
      testCompanies.forEach((company, index) => {
        console.log(`  ${index + 1}. ${company.name}`);
      });
      
      // Confirm before proceeding
      const confirmed = await confirmAction(`Create ${testCompanies.length} test companies?`);
      
      if (!confirmed) {
        console.log('\nTest company creation cancelled by user.');
      } else {
        await createCompaniesWithContainer(companies, testCompanies, 'test companies');
      }
    }
    
    // Create all remaining companies
    if (runAll || operations.includes('create-all')) {
      console.log(`\n${SECTION_DIVIDER}`);
      console.log('CREATE ALL REMAINING COMPANIES');
      console.log(SECTION_DIVIDER);
      
      // Get existing companies to avoid duplicates
      const existingCompaniesResult = await companies.getAll();
      let existingCompanyNames = [];
      
      if (existingCompaniesResult[0] && existingCompaniesResult[2]) {
        existingCompanyNames = existingCompaniesResult[2].map(company => company.name);
        console.log(`\n📋 Found ${existingCompanyNames.length} existing companies`);
      } else {
        console.log('\n📋 No existing companies found (or container doesn\'t exist yet)');
      }
      
      // Filter out companies that already exist
      const remainingCompanies = sampleCompanies.filter(company => 
        !existingCompanyNames.includes(company.name)
      );
      
      if (remainingCompanies.length === 0) {
        console.log(`\n${SUCCESS_PREFIX} All sample companies already exist. Nothing to create.`);
      } else {
        console.log(`\n📝 Creating ${remainingCompanies.length} remaining companies:`);
        remainingCompanies.slice(0, 5).forEach((company, index) => {
          console.log(`  ${index + 1}. ${company.name}`);
        });
        if (remainingCompanies.length > 5) {
          console.log(`  ... and ${remainingCompanies.length - 5} more`);
        }
        
        // Confirm before proceeding
        const confirmed = await confirmAction(`Create ${remainingCompanies.length} remaining companies?`);
        
        if (!confirmed) {
          console.log('\nRemaining company creation cancelled by user.');
        } else {
          await createCompaniesWithContainer(companies, remainingCompanies, 'remaining companies');
        }
      }
    }
    
    // List all companies
    if (runAll || operations.includes('list')) {
      console.log(`\n${SECTION_DIVIDER}`);
      console.log('LIST ALL COMPANIES');
      console.log(SECTION_DIVIDER);
      
      console.log('\n📋 Fetching all companies...');
      const allCompaniesResult = await companies.getAll();
      logResult('getAll()', allCompaniesResult, false);
      
      if (allCompaniesResult[0] && allCompaniesResult[2]) {
        const allCompanies = allCompaniesResult[2];
        console.log(`\n${SUCCESS_PREFIX} Company Summary:`);
        console.log(`  Total companies: ${allCompanies.length}`);
        
        // Group by role
        const roleGroups = {};
        allCompanies.forEach(company => {
          const role = company.role || 'Unknown';
          roleGroups[role] = (roleGroups[role] || 0) + 1;
        });
        
        console.log('  By role:');
        Object.entries(roleGroups).forEach(([role, count]) => {
          console.log(`    ${role}: ${count}`);
        });
        
        // Group by region
        const regionGroups = {};
        allCompanies.forEach(company => {
          const region = company.region || 'Unknown';
          regionGroups[region] = (regionGroups[region] || 0) + 1;
        });
        
        console.log('  By region:');
        Object.entries(regionGroups).forEach(([region, count]) => {
          console.log(`    ${region}: ${count}`);
        });
        
        // Show first few companies
        console.log('\n  Recent companies:');
        allCompanies.slice(0, 5).forEach(company => {
          console.log(`    • ${company.name} (${company.role || 'Unknown role'})`);
        });
        
        if (allCompanies.length > 5) {
          console.log(`    ... and ${allCompanies.length - 5} more`);
        }
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error in Companies operations:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
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
    const github = new GitHubFunctions(token, org, 'write-operations-example');
    
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
                                 installationStatus.containers.exists || 
                                 installationStatus.actions.exists;
    
    let userDecisions = {
      proceedWithRepository: true,
      proceedWithContainers: true,
      proceedWithActions: true,
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
        const createContainersResult = await github.createContainers();
        logResult('createContainers()', createContainersResult);
        
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
 * Checks if the Mediumroast for GitHub app is installed and has proper permissions
 * @param {string} token - GitHub token
 * @param {string} org - GitHub organization
 * @returns {Promise<Object>} Installation status and details
 */
/**
 * Checks for existing repository, containers, and actions installations
 * @param {GitHubFunctions} github - GitHubFunctions instance
 * @returns {Promise<Object>} Installation status details
 */
async function checkExistingInstallations(github) {
  const status = {
    repository: { exists: false, error: null },
    containers: { exists: false, existing: [], missing: [] },
    actions: { exists: false, version: null, error: null }
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

    // Check if GitHub Actions are installed (only if repository exists)
    if (status.repository.exists) {
      console.log('🔍 Checking GitHub Actions installation...');
      try {
        // We'll use the Actions class to check for existing installation
        const { Actions } = await import('../src/api/gitHubServer.js');
        const actions = new Actions(github.token, github.orgName, 'installation-check');
        
        const versionResult = await actions.getCurrentVersion();
        if (versionResult[0] && versionResult[2].installed) {
          status.actions.exists = true;
          status.actions.version = versionResult[2].version_file?.content?.version || 'unknown';
          console.log(`✅ GitHub Actions installed (version: ${status.actions.version})`);
        } else {
          console.log('❌ GitHub Actions not installed');
        }
      } catch (err) {
        status.actions.error = err.message;
        console.log('❌ Error checking GitHub Actions installation');
      }
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
    proceedWithActions: true,
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

  // Actions status
  if (installationStatus.actions.exists) {
    console.log(`  ⚡ GitHub Actions: ✅ INSTALLED (version: ${installationStatus.actions.version})`);
    const proceed = await confirmAction('GitHub Actions are already installed. Do you want to proceed? (This may reinstall or update)');
    decisions.proceedWithActions = proceed;
    if (!proceed) {
      console.log('GitHub Actions operations will be skipped.');
    }
  } else if (installationStatus.repository.exists) {
    console.log('  ⚡ GitHub Actions: ❌ NOT INSTALLED (will be installed)');
  }

  // Final confirmation if any components exist
  const hasExistingComponents = installationStatus.repository.exists || 
                               installationStatus.containers.exists || 
                               installationStatus.actions.exists;

  if (hasExistingComponents) {
    console.log('\n📋 Summary of planned actions:');
    console.log(`  Repository: ${decisions.proceedWithRepository ? 'PROCEED' : 'SKIP'}`);
    console.log(`  Containers: ${decisions.proceedWithContainers ? 'PROCEED' : 'SKIP'}`);
    console.log(`  Actions: ${decisions.proceedWithActions ? 'PROCEED' : 'SKIP'}`);

    const allSkipped = !decisions.proceedWithRepository && !decisions.proceedWithContainers && !decisions.proceedWithActions;
    if (allSkipped) {
      console.log('\n⚠️  All operations will be skipped.');
      decisions.skipAll = true;
    } else {
      const finalConfirm = await confirmAction('Continue with the planned actions?');
      if (!finalConfirm) {
        decisions.skipAll = true;
        console.log('All operations cancelled by user.');
      }
    }
  }

  return decisions;
}

/**
 * Helper function to create companies using the container pattern (catch/release)
 * @param {Companies} companies - Companies instance
 * @param {Array} companiesToCreate - Array of company objects to create
 * @param {string} operationDescription - Description for logging
 */
async function createCompaniesWithContainer(companies, companiesToCreate, operationDescription) {
  try {
    console.log(`\n🔒 Starting container-based creation of ${operationDescription}...`);
    
    // Step 1: Catch the Companies container (creates lock, branch, reads objects)
    console.log('\n📦 Step 1: Catching Companies container...');
    const repoMetadata = {
      containers: {
        Companies: {}
      },
      branch: {}
    };
    
    const caughtResult = await companies.serverCtl.catchContainer(repoMetadata);
    logResult('catchContainer()', caughtResult, false);
    
    if (!caughtResult[0]) {
      console.error(`${ERROR_PREFIX} Failed to catch Companies container`);
      return;
    }
    
    const metadata = caughtResult[2];
    console.log(`${SUCCESS_PREFIX} Container caught successfully`);
    console.log(`  📝 Branch: ${metadata.branch.name}`);
    console.log(`  📊 Existing companies: ${metadata.containers.Companies.objects.length}`);
    
    // Step 2: Add new companies to the container
    console.log(`\n📝 Step 2: Adding ${companiesToCreate.length} companies to container...`);
    
    let addedCount = 0;
    for (const [index, company] of companiesToCreate.entries()) {
      try {
        console.log(`\n  Adding ${index + 1}/${companiesToCreate.length}: ${company.name}`);
        
        // Check if company already exists in the current container
        const existingCompany = metadata.containers.Companies.objects.find(
          existing => existing.name === company.name
        );
        
        if (existingCompany) {
          console.log(`    ⚠️  Company "${company.name}" already exists, skipping`);
          continue;
        }
        
        // Add timestamp fields for creation/modification
        const now = new Date().toISOString();
        const companyWithTimestamps = {
          ...company,
          creation_date: company.creation_date || now,
          modification_date: now
        };
        
        // Add the company to the objects array
        metadata.containers.Companies.objects.push(companyWithTimestamps);
        addedCount++;
        
        console.log(`    ✅ Added "${company.name}"`);
        
      } catch (error) {
        console.error(`    ❌ Failed to add "${company.name}": ${error.message}`);
      }
    }
    
    console.log(`\n${SUCCESS_PREFIX} Added ${addedCount} new companies`);
    console.log(`📊 Total companies in container: ${metadata.containers.Companies.objects.length}`);
    
    // Step 3: Write the updated objects back to the repository
    console.log('\n💾 Step 3: Writing updated company data...');
    const writeResult = await companies.serverCtl.writeObject(
      'Companies',
      metadata.containers.Companies.objects,
      metadata.branch.name,
      metadata.containers.Companies.objectSha
    );
    logResult('writeObject()', writeResult, false);
    
    if (!writeResult[0]) {
      console.error(`${ERROR_PREFIX} Failed to write company data`);
      // Still try to release the container to clean up
      await companies.serverCtl.releaseContainer(metadata);
      return;
    }
    
    console.log(`${SUCCESS_PREFIX} Company data written to branch: ${metadata.branch.name}`);
    
    // Step 4: Release the container (merges branch, unlocks)
    console.log('\n🔓 Step 4: Releasing Companies container...');
    const releaseResult = await companies.serverCtl.releaseContainer(metadata);
    logResult('releaseContainer()', releaseResult, false);
    
    if (!releaseResult[0]) {
      console.error(`${ERROR_PREFIX} Failed to release Companies container`);
      console.error('⚠️  Manual intervention may be required to clean up locks and branch');
      return;
    }
    
    console.log(`${SUCCESS_PREFIX} Container released successfully`);
    console.log(`🎉 Successfully created ${addedCount} ${operationDescription}!`);
    
    // Step 5: Verify the creation by reading back
    console.log('\n🔍 Step 5: Verifying creation...');
    const verificationResult = await companies.getAll();
    
    if (verificationResult[0]) {
      const totalCompanies = verificationResult[2].length;
      console.log(`${SUCCESS_PREFIX} Verification complete: ${totalCompanies} total companies in repository`);
      
      // Show the recently added companies
      console.log('\n📋 Recently added companies:');
      companiesToCreate.slice(0, Math.min(addedCount, 5)).forEach((company, index) => {
        console.log(`  ${index + 1}. ${company.name} (${company.role || 'Unknown role'})`);
      });
      
      if (addedCount > 5) {
        console.log(`  ... and ${addedCount - 5} more`);
      }
    } else {
      console.log(`${WARNING_PREFIX} Could not verify creation: ${verificationResult[1]}`);
    }
    
  } catch (error) {
    console.error(`\n${ERROR_PREFIX} Error during company creation:`, error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
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
      repository: [],
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
    
    // Run selected demonstrations in order (repository first, then others)
    let repositorySetupSuccess = false;
    
    // Always run repository setup first if running all or if repository is specified
    if (runAllEntities || args.includes('repository') || entityOperations.repository.length > 0) {
      console.log('\n🔧 Running repository setup first...');
      try {
        await demonstrateRepositorySetup(token, org, entityOperations.repository);
        repositorySetupSuccess = true;
        console.log('\n✅ Repository setup completed successfully');
      } catch (error) {
        console.error('\n❌ Repository setup failed:', error.message);
        console.error('Cannot proceed with other operations without repository setup');
        return;
      }
    } else if (runAllEntities || args.includes('companies') || args.includes('studies') || args.includes('interactions')) {
      // If trying to run entity operations without repository, check if repo exists
      console.log('\n🔍 Checking repository prerequisites...');
      try {
        const github = new GitHubFunctions(token, org, 'prerequisite-check');
        const repoCheck = await github.getRepoSize();
        if (repoCheck[0]) {
          repositorySetupSuccess = true;
          console.log('\n✅ Repository exists and is accessible');
        } else {
          console.log('\n❌ Repository does not exist. Running repository setup first...');
          await demonstrateRepositorySetup(token, org, []);
          repositorySetupSuccess = true;
        }
      } catch (error) {
        console.error('\n❌ Cannot access repository. Running repository setup first...');
        await demonstrateRepositorySetup(token, org, []);
        repositorySetupSuccess = true;
      }
    }
    
    // Only proceed with other operations if repository setup was successful
    if ((runAllEntities || args.includes('companies') || entityOperations.companies.length > 0) && repositorySetupSuccess) {
      console.log('\n🏢 Preparing for companies operations...');
      await demonstrateCompaniesOperations(token, org, entityOperations.companies);
    }
    
    if ((runAllEntities || args.includes('studies') || entityOperations.studies.length > 0) && repositorySetupSuccess) {
      await demonstrateStudiesOperations(token, org, entityOperations.studies);
    }
    
    if ((runAllEntities || args.includes('interactions') || entityOperations.interactions.length > 0) && repositorySetupSuccess) {
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