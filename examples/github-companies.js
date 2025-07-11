/**
 * Example demonstrating company operations in the mediumroast.io API
 * @author Michael Hay <michael.hay@mediumroast.io>
 * @file github-companies.js
 * @license Apache-2.0
 * @version 3.0.0
 * @copyright 2025 Mediumroast, Inc. All rights reserved.
 * 
 * This example shows how to use the Companies entity class to perform
 * company-related operations against a GitHub organization.
 * 
 * It demonstrates:
 * - Companies: Create, list, and manage company data
 * - Container workflow: Catch/write/release pattern for safe operations
 * - Prerequisite checking: Ensures repository and containers exist
 * - Sample data loading: Uses sample company data for testing
 * 
 * To run this example, create a config.ini file with your GitHub token and organization.
 * The file should look like this:
 * 
 * [GitHub]
 * token = YOUR_GITHUB_TOKEN
 * org = YOUR_ORGANIZATION_NAME
 * 
 * You can run the example with:
 * node examples/github-companies.js
 * 
 * Or specify specific operations:
 * node examples/github-companies.js create-test create-all list
 * 
 * Available operations:
 * - create-test  - Create first 2 test companies from sample data
 * - create-all   - Create all remaining companies from sample data
 * - list         - List all existing companies with summary
 * - profile      - Generate company profile for a specific company
 * 
 * This will run all operations by default.
 * 
 * Prerequisites: 
 * 1. Repository must exist (run github-repository.js first)
 * 2. Companies container must exist
 * 3. sample_data/companies.json file must exist
 * 
 * The script automatically checks these prerequisites and provides guidance.
 * 
 * @requires configparser
 * @requires fs
 * @requires path
 * @requires ../src/api/gitHubServer.js
 * @requires ../src/api/github.js
 */

/* eslint-disable no-console */

import { Companies } from '../src/api/gitHubServer.js';
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
 * Prompts the user for input
 * @param {string} message - Input message
 * @returns {Promise<string>} User input
 */
async function promptForInput(message) {
  const rl = createReadlineInterface();
  
  return new Promise((resolve) => {
    rl.question(`${INFO_PREFIX} ${message}: `, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Formats and logs operation results
 * @param {string} operationName - Name of the operation
 * @param {Array} result - Result array [success, message, data]
 * @param {boolean} showData - Whether to display full data object
 */
function logResult(operationName, result, showData = false) {
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
 * Checks prerequisites for companies operations
 * @param {string} token - GitHub token
 * @param {string} org - GitHub organization
 * @returns {Promise<boolean>} Whether prerequisites are satisfied
 */
async function checkPrerequisites(token, org) {
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('PREREQUISITE CHECKS');
  console.log(SECTION_DIVIDER);
  
  try {
    const github = new GitHubFunctions(token, org, 'companies-prerequisite-check');
    
    // Check if repository exists
    console.log('\n🔍 Checking repository...');
    const repoResult = await github.getRepoSize();
    if (!repoResult[0]) {
      console.error(`${ERROR_PREFIX} Repository does not exist or is not accessible`);
      console.log('📋 Please run repository setup first:');
      console.log('   node examples/github-repository.js');
      return false;
    }
    console.log(`${SUCCESS_PREFIX} Repository exists and is accessible`);
    
    // Check if Companies container exists
    console.log('🔍 Checking Companies container...');
    const containerResult = await github.getContent('Companies');
    if (!containerResult[0]) {
      console.error(`${ERROR_PREFIX} Companies container does not exist`);
      console.log('📋 Please run container setup first:');
      console.log('   node examples/github-repository.js containers');
      return false;
    }
    console.log(`${SUCCESS_PREFIX} Companies container exists`);
    
    // Check if Companies.json file exists
    console.log('🔍 Checking Companies.json file...');
    const companiesFileResult = await github.getContent('Companies/Companies.json');
    if (!companiesFileResult[0]) {
      console.log(`${WARNING_PREFIX} Companies.json file does not exist, will be created during operations`);
    } else {
      console.log(`${SUCCESS_PREFIX} Companies.json file exists`);
    }
    
    // Check sample data file
    console.log('🔍 Checking sample data file...');
    const sampleDataPath = path.join(__dirname, 'sample_data', 'companies.json');
    if (!fs.existsSync(sampleDataPath)) {
      console.error(`${ERROR_PREFIX} Sample data file not found at: ${sampleDataPath}`);
      return false;
    }
    console.log(`${SUCCESS_PREFIX} Sample data file found`);
    
    console.log(`\n${SUCCESS_PREFIX} All prerequisites satisfied for companies operations`);
    return true;
    
  } catch (error) {
    console.error(`${ERROR_PREFIX} Error during prerequisite checks: ${error.message}`);
    return false;
  }
}

/**
 * Helper function to create companies using the container pattern (catch/write/release)
 * @param {Companies} companies - Companies instance
 * @param {Array} companiesToCreate - Array of company objects to create
 * @param {string} operationDescription - Description for logging
 */
async function createCompaniesWithContainer(companies, companiesToCreate, operationDescription) {
  try {
    console.log(`\n${INFO_PREFIX} Starting ${operationDescription} creation using catch/write/release pattern...`);
    console.log(`${INFO_PREFIX} Companies to create: ${companiesToCreate.length}`);
    
    // Use the createObj method which handles the full catch/write/release workflow
    const createResult = await companies.createObj(companiesToCreate);
    
    if (createResult[0]) {
      console.log(`\n${SUCCESS_PREFIX} ${operationDescription} creation completed successfully!`);
      console.log(`${SUCCESS_PREFIX} Created ${companiesToCreate.length} companies`);
      
      // Show workflow details if available
      const workflowData = createResult[2];
      if (workflowData && workflowData.containers) {
        console.log(`\n${INFO_PREFIX} Workflow Details:`);
        console.log(`   - Containers processed: ${Object.keys(workflowData.containers).join(', ')}`);
        if (workflowData.branch) {
          console.log(`   - Branch created: ${workflowData.branch.name}`);
        }
        if (workflowData.containers.Companies) {
          console.log(`   - Total objects in container: ${workflowData.containers.Companies.objects?.length || 'unknown'}`);
        }
      }
      
      // List the created companies
      console.log(`\n${INFO_PREFIX} Created companies:`);
      companiesToCreate.forEach((company, index) => {
        console.log(`  ${index + 1}. ${company.name} (${company.role || 'No role'})`);
      });
      
    } else {
      console.error(`\n${ERROR_PREFIX} ${operationDescription} creation failed`);
      console.error(`Error: ${createResult[1]?.status_msg || createResult[1]}`);
      
      if (createResult[2]) {
        console.error('\nDetailed error information:');
        console.error(JSON.stringify(createResult[2], null, 2));
      }
    }
    
  } catch (error) {
    console.error(`\n${ERROR_PREFIX} Error during ${operationDescription} creation:`, error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

/**
 * Demonstrates Companies operations
 * @param {string} token - GitHub token
 * @param {string} org - GitHub organization
 * @param {Array<string>} operations - Specific operations to run
 */
async function demonstrateCompaniesOperations(token, org, operations) {
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('COMPANIES OPERATIONS');
  console.log(SECTION_DIVIDER);
  
  try {
    // Load sample company data
    const sampleDataPath = path.join(__dirname, 'sample_data', 'companies.json');
    console.log(`\n📄 Loading sample company data from: ${sampleDataPath}`);
    
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
          const role = company.role || 'No role';
          if (!roleGroups[role]) {
            roleGroups[role] = [];
          }
          roleGroups[role].push(company);
        });
        
        console.log(`\n${INFO_PREFIX} Companies by role:`);
        Object.keys(roleGroups).forEach(role => {
          console.log(`  ${role}: ${roleGroups[role].length} companies`);
          roleGroups[role].slice(0, 3).forEach(company => {
            console.log(`    - ${company.name}`);
          });
          if (roleGroups[role].length > 3) {
            console.log(`    ... and ${roleGroups[role].length - 3} more`);
          }
        });
      }
    }
    
    // Generate company profile
    if (runAll || operations.includes('profile')) {
      console.log(`\n${SECTION_DIVIDER}`);
      console.log('COMPANY PROFILE GENERATION');
      console.log(SECTION_DIVIDER);
      
      // Get list of companies to choose from
      const allCompaniesResult = await companies.getAll();
      if (allCompaniesResult[0] && allCompaniesResult[2] && allCompaniesResult[2].length > 0) {
        const allCompanies = allCompaniesResult[2];
        
        console.log(`\n${INFO_PREFIX} Available companies:`);
        allCompanies.slice(0, 10).forEach((company, index) => {
          console.log(`  ${index + 1}. ${company.name}`);
        });
        
        const companyName = await promptForInput('Enter the name of the company to profile (or press Enter to skip)');
        
        if (companyName) {
          console.log(`\n📊 Generating profile for: ${companyName}`);
          const profileResult = await companies.generateCompanyProfile(companyName);
          logResult('generateCompanyProfile()', profileResult, false);
          
          if (profileResult[0]) {
            const profile = profileResult[2];
            console.log(`\n${SUCCESS_PREFIX} Company Profile Generated:`);
            console.log(`  Name: ${profile.name}`);
            console.log(`  Role: ${profile.role || 'No role'}`);
            console.log(`  Region: ${profile.region || 'Unknown'}`);
            console.log(`  Industry: ${profile.industry || 'Unknown'}`);
            console.log(`  URL: ${profile.url || 'Not provided'}`);
            
            if (profile.analytics) {
              console.log(`\n${INFO_PREFIX} Analytics:`);
              console.log(`  Linked interactions: ${profile.analytics.interactionCount}`);
              console.log(`  Total file size: ${profile.analytics.totalFileSize} bytes`);
              console.log(`  Total word count: ${profile.analytics.totalWordCount}`);
              console.log(`  Average reading time: ${profile.analytics.avgReadingTime?.toFixed(2)} minutes`);
            }
          }
        } else {
          console.log('\nProfile generation skipped.');
        }
      } else {
        console.log(`\n${WARNING_PREFIX} No companies found. Please create some companies first.`);
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
 * Main function to run the companies example
 */
async function main() {
  console.log(`${SECTION_DIVIDER}`);
  console.log('MEDIUMROAST API - COMPANIES OPERATIONS EXAMPLE');
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
    
    // Check prerequisites first
    const prerequisitesSatisfied = await checkPrerequisites(token, org);
    if (!prerequisitesSatisfied) {
      console.error(`\n${ERROR_PREFIX} Prerequisites not satisfied. Please resolve the issues above.`);
      return;
    }
    
    // Warn about write operations
    console.log(`${WARNING_PREFIX} This example performs WRITE operations that will modify your repository.`);
    const globalConfirmation = await confirmAction('Do you want to continue with companies operations?');
    
    if (!globalConfirmation) {
      console.log('\nExample cancelled by user.');
      return;
    }
        
    // Get command-line arguments to determine which operations to run
    const args = process.argv.slice(2);
    const operations = args.length > 0 ? args : []; // Empty array means run all
    
    console.log(`\nRunning operations: ${operations.length > 0 ? operations.join(', ') : 'all'}`);
    
    // Run companies operations
    await demonstrateCompaniesOperations(token, org, operations);
    
    console.log(`\n${SECTION_DIVIDER}`);
    console.log('Companies operations example completed successfully!');
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
