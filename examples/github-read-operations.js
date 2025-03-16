/**
 * Example demonstrating read operations in gitHubServer.js that work with our implementation
 */

/* eslint-disable no-console */

import { Studies, Companies, Interactions, Users } from '../src/api/gitHubServer.js';
import fs from 'fs';
import path from 'path';
import ConfigParser from 'configparser';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Helper to get current directory with ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// For formatting output
const SUCCESS_PREFIX = '✅ ';
const ERROR_PREFIX = '❌ ';
const SECTION_DIVIDER = '='.repeat(80);

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
    // If data is an array, show count and a sample
    if (Array.isArray(data)) {
      console.log(`Found ${data.length} items`);
      if (data.length > 0) {
        console.log('Sample item:', JSON.stringify(data[0], null, 2));
        if (data.length > 1) {
          console.log(`...and ${data.length - 1} more items`);
        }
      }
    } 
    // If data has mrJson property
    else if (data.mrJson) {
      console.log(`Found ${data.mrJson.length} items`);
      if (data.mrJson.length > 0) {
        console.log('Sample item:', JSON.stringify(data.mrJson[0], null, 2));
        if (data.mrJson.length > 1) {
          console.log(`...and ${data.mrJson.length - 1} more items`);
        }
      }
    }
    // Otherwise show the data object
    else {
      console.log('Data:', JSON.stringify(data, null, 2));
    }
  }
}

/**
 * Demonstrates Studies read operations
 * @param {string} token - GitHub token
 * @param {string} org - GitHub organization
 */
async function demonstrateStudiesOperations(token, org) {
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('STUDIES OPERATIONS');
  console.log(SECTION_DIVIDER);
    
  try {
    const studies = new Studies(token, org, 'example-process');
    
    // Get all studies - basic operation that should always work
    console.log('\nFetching all studies...');
    const allStudies = await studies.getAll();
    logResult('getAll()', allStudies);
    
    if (allStudies[0] && allStudies[2]?.mrJson?.length > 0) {
      const sampleName = allStudies[2].mrJson[0].name;
        
      // Find by name
      console.log(`\nFinding study by name: "${sampleName}"...`);
      const studyByName = await studies.findByName(sampleName);
      logResult('findByName()', studyByName);
    }
  } catch (error) {
    console.error('\n❌ Error in Studies operations:', error.message);
  }
}

/**
 * Demonstrates Companies read operations
 * @param {string} token - GitHub token
 * @param {string} org - GitHub organization
 */
async function demonstrateCompaniesOperations(token, org) {
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('COMPANIES OPERATIONS');
  console.log(SECTION_DIVIDER);
  
  try {
    const companies = new Companies(token, org, 'example-process');
    
    // Get all companies
    console.log('\nFetching all companies...');
    const allCompanies = await companies.getAll();
    logResult('getAll()', allCompanies);
    
    if (allCompanies[0] && allCompanies[2]?.mrJson?.length > 0) {
      const sampleName = allCompanies[2].mrJson[0].name;
        
      // Find by name
      console.log(`\nFinding company by name: "${sampleName}"...`);
      const companyByName = await companies.findByName(sampleName);
      logResult('findByName()', companyByName);
    }
  } catch (error) {
    console.error('\n❌ Error in Companies operations:', error.message);
  }
}

/**
 * Demonstrates Interactions read operations
 * @param {string} token - GitHub token
 * @param {string} org - GitHub organization
 */
async function demonstrateInteractionsOperations(token, org) {
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('INTERACTIONS OPERATIONS');
  console.log(SECTION_DIVIDER);
  
  try {
    const interactions = new Interactions(token, org, 'example-process');
    
    // Get all interactions
    console.log('\nFetching all interactions...');
    const allInteractions = await interactions.getAll();
    logResult('getAll()', allInteractions);
    
    if (allInteractions[0] && allInteractions[2]?.mrJson?.length > 0) {
      const sampleName = allInteractions[2].mrJson[0].name;
        
      // Find by name
      console.log(`\nFinding interaction by name: "${sampleName}"...`);
      const interactionByName = await interactions.findByName(sampleName);
      logResult('findByName()', interactionByName);
    }
  } catch (error) {
    console.error('\n❌ Error in Interactions operations:', error.message);
  }
}

/**
 * Demonstrates Users read operations
 * @param {string} token - GitHub token
 * @param {string} org - GitHub organization
 */
async function demonstrateUsersOperations(token, org) {
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('USERS OPERATIONS');
  console.log(SECTION_DIVIDER);
  
  try {
    const users = new Users(token, org, 'example-process');
    
    // Get all users
    console.log('\nFetching all users...');
    const allUsers = await users.getAll();
    logResult('getAll()', allUsers);
    
    // Get current user info
    console.log('\nFetching current user information...');
    const currentUser = await users.getAuthenticatedUser();
    logResult('getAuthenticatedUser()', currentUser);
  } catch (error) {
    console.error('\n❌ Error in Users operations:', error.message);
  }
}

/**
 * Demonstrates Branch Status operations using Octokit
 * @param {string} token - GitHub token
 * @param {string} org - GitHub organization
 */
async function demonstrateBranchOperations(token, org) {
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('BRANCH STATUS OPERATIONS');
  console.log(SECTION_DIVIDER);
  
  try {
    const studies = new Studies(token, org, 'example-process');
    
    // Create the repository name by appending "_discovery" to the org name
    const discoveryRepo = `${org}_discovery`;
    
    // First get status for the discovery repository
    console.log('\nFetching branch status for the discovery repository...');
    console.log(`(Using: branch="main", repo="${discoveryRepo}")`);
    const defaultStatus = await studies.getBranchStatus('main', discoveryRepo);
    logResult('getBranchStatus(\'main\', discoveryRepo)', defaultStatus);
    
    // If we have a successful result, demonstrate the checkForUpdates method
    if (defaultStatus[0]) {
      const currentSha = defaultStatus[2].sha;
      
      // Display the SHA we're using
      console.log(`\nUsing current SHA for comparison: ${currentSha.substring(0, 8)}...`);
      
      // Check for updates using the current SHA (should return no update needed)
      console.log('\nChecking for updates with current SHA (should show no updates needed)...');
      const upToDate = await studies.checkForUpdates(currentSha, 'main', discoveryRepo);
      logResult('checkForUpdates(currentSha, \'main\', discoveryRepo)', upToDate);
      
      // Check for updates using a made-up SHA (should indicate update needed)
      console.log('\nChecking for updates with outdated SHA (should show updates needed)...');
      const needsUpdate = await studies.checkForUpdates('0000000000000000000000000000000000000000', 'main', discoveryRepo);
      logResult('checkForUpdates(\'0000...\', \'main\', discoveryRepo)', needsUpdate);
      
      // Show an example of how clients could use this information
      console.log('\nExample client implementation:');
      console.log('```javascript');
      console.log(`// Client-side code example
async function synchronizeData(clientSha = null) {
  // Step 1: Get current commit SHA if we don't have it
  let commitSha = clientSha || localStorage.getItem('lastCommitSha');
  
  // Step 2: Check if updates are needed
  const updateCheck = await api.checkForUpdates(commitSha, 'main', '${discoveryRepo}');
  
  if (updateCheck.data.updateNeeded) {
    console.log('Repository has changed, downloading latest data...');
    
    // Step 3: Fetch the latest data
    const latestData = await api.getAll();
    
    // Step 4: Save the new data and SHA
    localStorage.setItem('lastCommitSha', updateCheck.data.currentCommitSha);
    localStorage.setItem('cachedData', JSON.stringify(latestData));
    
    return latestData;
  } else {
    console.log('Using cached data - no updates needed');
    return JSON.parse(localStorage.getItem('cachedData'));
  }
}`);
      console.log('```');
    }
  } catch (error) {
    console.error('\n❌ Error in Branch operations:', error.message);
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
    console.log('GitHub Server Read Operations Example');
    console.log('=====================================');
        
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
        
    // Get command-line arguments to determine which demos to run
    const args = process.argv.slice(2);
    const runAll = args.length === 0;
        
    // Run selected demonstrations
    if (runAll || args.includes('studies')) {
      await demonstrateStudiesOperations(token, org);
    }
        
    if (runAll || args.includes('companies')) {
      await demonstrateCompaniesOperations(token, org);
    }
        
    if (runAll || args.includes('interactions')) {
      await demonstrateInteractionsOperations(token, org);
    }
        
    if (runAll || args.includes('users')) {
      await demonstrateUsersOperations(token, org);
    }
    
    // Run branch status operations
    if (runAll || args.includes('branch')) {
      await demonstrateBranchOperations(token, org);
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