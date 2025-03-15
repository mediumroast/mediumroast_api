/**
 * Example demonstrating all read operations in gitHubServer.js
 * 
 * INSTRUCTIONS
 * ============
 * 
 * Prerequisites:
 * 1. You must have a valid GitHub token in examples/config.ini
 * 2. The token must have access to the organization specified in config.ini
 * 
 * Running the example:
 * 1. Make sure you've installed all dependencies:
 *    npm install configparser
 * 
 * 2. Run this example:
 *    node examples/github-read-operations.js
 * 
 * 3. The script will:
 *    - Load your GitHub token from config.ini
 *    - Demonstrate various read operations on different types of objects
 *    - Display the results in a formatted way
 * 
 * 4. To run specific operations only, use command-line arguments:
 *    node examples/github-read-operations.js studies companies interactions
 *    
 *    Available options: studies, companies, interactions, users, storage, actions
 * 
 * @author Your Name
 */

/* eslint-disable no-console */

import { Studies, Companies, Interactions, Users, Storage, Actions } from '../src/api/gitHubServer.js';
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
    
  const studies = new Studies(token, org, 'example-process');
    
  // Get all studies
  console.log('\nFetching all studies...');
  const allStudies = await studies.getAll();
  logResult('getAll()', allStudies);
    
  if (allStudies[0] && allStudies[2]?.mrJson?.length > 0) {
    const sampleName = allStudies[2].mrJson[0].name;
        
    // Find by name
    console.log(`\nFinding study by name: "${sampleName}"...`);
    const studyByName = await studies.findByName(sampleName);
    logResult('findByName()', studyByName);
        
    // Find by attribute
    if (allStudies[2].mrJson[0].status) {
      const sampleStatus = allStudies[2].mrJson[0].status;
      console.log(`\nFinding studies by status: "${sampleStatus}"...`);
      const studiesByStatus = await studies.findByX('status', sampleStatus);
      logResult('findByX(\'status\')', studiesByStatus);
    }
        
    // Search with filters
    console.log('\nSearching studies with filters...');
    const searchResult = await studies.search({ name: sampleName.substring(0, 3) });
    logResult('search({ name: \'...\' })', searchResult);
        
    // Search with sorting
    console.log('\nSearching studies with sorting...');
    const sortedResult = await studies.search({}, { sort: 'name', descending: true, limit: 5 });
    logResult('search({}, { sort: \'name\', descending: true, limit: 5 })', sortedResult);
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
        
    // Find by attribute
    if (allCompanies[2].mrJson[0].company_type) {
      const sampleType = allCompanies[2].mrJson[0].company_type;
      console.log(`\nFinding companies by type: "${sampleType}"...`);
      const companiesByType = await companies.findByX('company_type', sampleType);
      logResult('findByX(\'company_type\')', companiesByType);
    }
        
    // Search with filters
    console.log('\nSearching companies with filters...');
    const searchResult = await companies.search({ name: sampleName.substring(0, 3) });
    logResult('search({ name: \'...\' })', searchResult);
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
        
    // Find by hash if available
    if (allInteractions[2].mrJson[0].file_hash) {
      const sampleHash = allInteractions[2].mrJson[0].file_hash;
      console.log(`\nFinding interaction by file hash: "${sampleHash}"...`);
      const interactionByHash = await interactions.findByHash(sampleHash);
      logResult('findByHash()', interactionByHash);
    }
        
    // Find by content type if available
    if (allInteractions[2].mrJson[0].content_type) {
      const sampleType = allInteractions[2].mrJson[0].content_type;
      console.log(`\nFinding interactions by content type: "${sampleType}"...`);
      const interactionsByType = await interactions.findByX('content_type', sampleType);
      logResult('findByX(\'content_type\')', interactionsByType);
    }
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
    
  const users = new Users(token, org, 'example-process');
    
  // Get all users
  console.log('\nFetching all users...');
  const allUsers = await users.getAll();
  logResult('getAll()', allUsers);
    
  // Get current user
  console.log('\nFetching current user...');
  const myself = await users.getMyself();
  logResult('getMyself()', myself);
    
  if (allUsers[0] && allUsers[2].length > 0) {
    const sampleLogin = allUsers[2][0].login;
        
    // Find by name (login)
    console.log(`\nFinding user by login: "${sampleLogin}"...`);
    const userByLogin = await users.findByName(sampleLogin);
    logResult('findByName()', userByLogin);
        
    // Find by attribute
    console.log(`\nFinding users by login attribute: "${sampleLogin}"...`);
    const usersByAttribute = await users.findByX('login', sampleLogin);
    logResult('findByX(\'login\')', usersByAttribute);
  }
}

/**
 * Demonstrates Storage read operations
 * @param {string} token - GitHub token
 * @param {string} org - GitHub organization
 */
async function demonstrateStorageOperations(token, org) {
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('STORAGE OPERATIONS');
  console.log(SECTION_DIVIDER);
    
  const storage = new Storage(token, org, 'example-process');
    
  // Skip the non-existent getAll()/getRepoSize() method
  console.log('\nSkipping repository size information (method not available).');
    
  // Get storage billing - this should still work
  console.log('\nFetching storage billing information...');
  const storageBilling = await storage.getStorageBilling();
  logResult('getStorageBilling()', storageBilling);
}

/**
 * Demonstrates Actions read operations
 * @param {string} token - GitHub token
 * @param {string} org - GitHub organization
 */
async function demonstrateActionsOperations(token, org) {
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('ACTIONS OPERATIONS');
  console.log(SECTION_DIVIDER);
    
  const actions = new Actions(token, org, 'example-process');
    
  // Skip the non-existent getAll()/getWorkflowRuns() method
  console.log('\nSkipping workflow runs information (method not available).');
    
  // Get actions billing - this should still work
  console.log('\nFetching actions billing information...');
  const actionsBilling = await actions.getActionsBilling();
  logResult('getActionsBilling()', actionsBilling);
}

/**
 * Main function to run all demonstrations
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
        
    if (runAll || args.includes('storage')) {
      await demonstrateStorageOperations(token, org);
    }
        
    if (runAll || args.includes('actions')) {
      await demonstrateActionsOperations(token, org);
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