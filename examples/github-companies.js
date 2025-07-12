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
 *       if (existingCompaniesResult[0] && existingCompaniesResult[2] && existingCompaniesResult[2].mrJson) {
        existingCompanyNames = existingCompaniesResult[2].mrJson.map(company => company.name);
        console.log(`\n📋 Found ${existingCompanyNames.length} existing companies`);
      } else {
        console.log('\n📋 No existing companies found (or container doesn\'t exist yet)');
      } demonstrates:
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
 * node examples/github-companies.js create read update delete
 * 
 * Available operations:
 * - create       - Create companies in two steps: first 2 test companies, then remaining ones
 * - read         - Read and display company information (list, find by name, profiles)
 * - update       - Update company information and link interactions
 * - delete       - Delete companies from the repository
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
  
  if (success) {
    logger.info(`✅ ${operationName}: Success`, {
      operation: operationName,
      message: message?.status_msg || message,
      dataType: data ? typeof data : 'none'
    });
    console.log(`\n✅ ${operationName}:`);
    console.log('Status: Success');
    console.log(`Message: ${message?.status_msg || message}`);
  } else {
    logger.error(`❌ ${operationName}: Failed`, {
      operation: operationName,
      message: message?.status_msg || message,
      error: data
    });
    console.log(`\n❌ ${operationName}:`);
    console.log('Status: Failed');
    console.log(`Message: ${message?.status_msg || message}`);
  }
    
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
  const tracker = logger.trackOperation ? 
    logger.trackOperation('checkPrerequisites', 'companies-example') : 
    { end: () => {} };
    
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('PREREQUISITE CHECKS');
  console.log(SECTION_DIVIDER);
  
  try {
    logger.debug('Starting prerequisite checks for companies operations', { organization: org });
    
    const github = new GitHubFunctions(token, org, 'companies-prerequisite-check');
    
    // Check if repository exists
    console.log('\n🔍 Checking repository...');
    const repoResult = await github.getRepoSize();
    if (!repoResult[0]) {
      logger.error('Repository prerequisite check failed', {
        organization: org,
        error: repoResult[1]
      });
      console.error('❌ Repository does not exist or is not accessible');
      console.log('📋 Please run repository setup first:');
      console.log('   node examples/github-repository.js');
      return false;
    }
    logger.info('Repository prerequisite check passed', { organization: org });
    console.log('✅ Repository exists and is accessible');
    
    // Check if Companies container exists
    console.log('🔍 Checking Companies container...');
    const containerResult = await github.getContent('Companies');
    if (!containerResult[0]) {
      logger.error('Companies container prerequisite check failed', {
        organization: org,
        error: containerResult[1]
      });
      console.error('❌ Companies container does not exist');
      console.log('📋 Please run container setup first:');
      console.log('   node examples/github-repository.js containers');
      return false;
    }
    logger.info('Companies container prerequisite check passed', { organization: org });
    console.log('✅ Companies container exists');
    
    // Check if Companies.json file exists
    console.log('🔍 Checking Companies.json file...');
    const companiesFileResult = await github.getContent('Companies/Companies.json');
    if (!companiesFileResult[0]) {
      logger.debug('Companies.json file does not exist, will be created during operations');
      console.log(`${WARNING_PREFIX} Companies.json file does not exist, will be created during operations`);
    } else {
      logger.info('Companies.json file exists', { organization: org });
      console.log('✅ Companies.json file exists');
    }
    
    // Check sample data file
    console.log('🔍 Checking sample data file...');
    const sampleDataPath = path.join(__dirname, 'sample_data', 'companies.json');
    if (!fs.existsSync(sampleDataPath)) {
      logger.error('Sample data file prerequisite check failed', {
        sampleDataPath,
        organization: org
      });
      console.error(`❌ Sample data file not found at: ${sampleDataPath}`);
      return false;
    }
    logger.info('Sample data file prerequisite check passed', { sampleDataPath });
    console.log('✅ Sample data file found');
    
    logger.info('All prerequisites satisfied for companies operations', { organization: org });
    console.log('\n✅ All prerequisites satisfied for companies operations');
    return true;
    
  } catch (error) {
    logger.error('Error during prerequisite checks', {
      organization: org,
      error: error.message,
      stack: error.stack
    });
    console.error(`❌ Error during prerequisite checks: ${error.message}`);
    return false;
  } finally {
    tracker.end();
  }
}

/**
 * Helper function to create companies using the container pattern (catch/write/release)
 * @param {Companies} companies - Companies instance
 * @param {Array} companiesToCreate - Array of company objects to create
 * @param {string} operationDescription - Description for logging
 */
async function createCompaniesWithContainer(companies, companiesToCreate, operationDescription) {
  const tracker = logger.trackOperation ? 
    logger.trackOperation('createCompaniesWithContainer', operationDescription) : 
    { end: () => {} };
    
  try {
    logger.info('Starting company creation using catch/write/release pattern', {
      operation: operationDescription,
      companyCount: companiesToCreate.length
    });
    
    console.log(`\n${INFO_PREFIX} Starting ${operationDescription} creation using catch/write/release pattern...`);
    console.log(`${INFO_PREFIX} Companies to create: ${companiesToCreate.length}`);
    
    // Use the createObj method which handles the full catch/write/release workflow
    const createResult = await companies.createObj(companiesToCreate);
    
    if (createResult[0]) {
      logger.info('Company creation completed successfully', {
        operation: operationDescription,
        companyCount: companiesToCreate.length,
        workflowData: createResult[2]
      });
      
      console.log(`\n✅ ${operationDescription} creation completed successfully!`);
      console.log(`✅ Created ${companiesToCreate.length} companies`);
      
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
      logger.error('Company creation failed', {
        operation: operationDescription,
        companyCount: companiesToCreate.length,
        error: createResult[1],
        errorData: createResult[2]
      });
      
      console.error(`\n❌ ${operationDescription} creation failed`);
      console.error(`Error: ${createResult[1]?.status_msg || createResult[1]}`);
      
      if (createResult[2]) {
        console.error('\nDetailed error information:');
        console.error(JSON.stringify(createResult[2], null, 2));
      }
    }
    
  } catch (error) {
    logger.error('Error during company creation', {
      operation: operationDescription,
      companyCount: companiesToCreate.length,
      error: error.message,
      stack: error.stack
    });
    
    console.error(`\n❌ Error during ${operationDescription} creation:`, error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  } finally {
    tracker.end();
  }
}

/**
 * Demonstrates Companies operations
 * @param {string} token - GitHub token
 * @param {string} org - GitHub organization
 * @param {Array<string>} operations - Specific operations to run
 */
async function demonstrateCompaniesOperations(token, org, operations) {
  const operationTracker = logger.trackTransaction('github-companies-operations');
  
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('COMPANIES OPERATIONS');
  console.log(SECTION_DIVIDER);
  
  try {
    logger.debug('Starting Companies operations', { organization: org, operations });
    
    // Load sample company data
    const sampleDataPath = path.join(__dirname, 'sample_data', 'companies.json');
    console.log(`\n📄 Loading sample company data from: ${sampleDataPath}`);
    
    const sampleCompanies = JSON.parse(fs.readFileSync(sampleDataPath, 'utf8'));
    logger.info('Sample company data loaded successfully', { 
      sampleDataPath, 
      companyCount: sampleCompanies.length 
    });
    console.log(`✅ Loaded ${sampleCompanies.length} sample companies`);
    
    // Initialize Companies entity class
    const companies = new Companies(token, org, 'company-operations-example');
    const runAll = operations.length === 0;
    
    // CREATE Operations
    if (runAll || operations.includes('create')) {
      await demonstrateCompaniesCreateOperations(companies, sampleCompanies);
    }
    
    // READ Operations
    if (runAll || operations.includes('read')) {
      await demonstrateCompaniesReadOperations(companies);
    }
    
    // UPDATE Operations
    if (runAll || operations.includes('update')) {
      await demonstrateCompaniesUpdateOperations(companies);
    }
    
    // DELETE Operations
    if (runAll || operations.includes('delete')) {
      await demonstrateCompaniesDeleteOperations(companies);
    }
    
  } catch (error) {
    logger.error('Error in Companies operations', {
      organization: org,
      operations,
      error: error.message,
      stack: error.stack
    });
    console.error('\n❌ Error in Companies operations:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  } finally {
    operationTracker.end();
  }
}

/**
 * Demonstrates Companies CREATE operations
 * @param {Companies} companies - Companies instance
 * @param {Array} sampleCompanies - Sample companies data
 */
async function demonstrateCompaniesCreateOperations(companies, sampleCompanies) {
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('COMPANIES CREATE OPERATIONS');
  console.log(SECTION_DIVIDER);
  
  try {
    // Get existing companies to avoid duplicates
    const existingCompaniesResult = await companies.getAll();
    let existingCompanyNames = [];
    
    if (existingCompaniesResult[0] && existingCompaniesResult[2] && existingCompaniesResult[2].mrJson) {
      existingCompanyNames = existingCompaniesResult[2].mrJson.map(company => company.name);
      console.log(`\n📋 Found ${existingCompanyNames.length} existing companies`);
    } else {
      console.log('\n📋 No existing companies found (or container doesn\'t exist yet)');
    }
    
    // Filter out companies that already exist
    const companiesToCreate = sampleCompanies.filter(company => 
      !existingCompanyNames.includes(company.name)
    );
    
    if (companiesToCreate.length === 0) {
      console.log('\n✅ All sample companies already exist. Nothing to create.');
      return;
    }
    
    // Step 1: Create first 2 test companies
    const testCompanies = companiesToCreate.slice(0, 2);
    if (testCompanies.length > 0) {
      console.log(`\n${INFO_PREFIX} Step 1: Create test companies`);
      console.log(`📝 First ${testCompanies.length} test companies to create:`);
      testCompanies.forEach((company, index) => {
        console.log(`  ${index + 1}. ${company.name}`);
      });
      
      const testConfirmed = await confirmAction(`Create ${testCompanies.length} test companies?`);
      
      if (testConfirmed) {
        await createCompaniesWithContainer(companies, testCompanies, 'test companies');
      } else {
        console.log('\nTest company creation skipped.');
      }
    } else {
      console.log(`\n${INFO_PREFIX} No test companies to create (first 2 already exist).`);
    }
    
    // Step 2: Create remaining companies
    const remainingCompanies = companiesToCreate.slice(2);
    if (remainingCompanies.length > 0) {
      console.log(`\n${INFO_PREFIX} Step 2: Create remaining companies`);
      console.log(`📝 ${remainingCompanies.length} remaining companies to create:`);
      remainingCompanies.slice(0, 5).forEach((company, index) => {
        console.log(`  ${index + 1}. ${company.name}`);
      });
      if (remainingCompanies.length > 5) {
        console.log(`  ... and ${remainingCompanies.length - 5} more`);
      }
      
      const remainingConfirmed = await confirmAction(`Create ${remainingCompanies.length} remaining companies?`);
      
      if (remainingConfirmed) {
        await createCompaniesWithContainer(companies, remainingCompanies, 'remaining companies');
      } else {
        console.log('\nRemaining company creation skipped.');
      }
    } else {
      console.log(`\n${INFO_PREFIX} No remaining companies to create (all already exist).`);
    }
    
  } catch (error) {
    logger.error('Companies CREATE operations failed', {
      error: error.message,
      stack: error.stack
    });
    console.error('\n❌ Error in Companies CREATE operations:', error.message);
  }
}

/**
 * Demonstrates Companies READ operations
 * @param {Companies} companies - Companies instance
 */
async function demonstrateCompaniesReadOperations(companies) {
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('COMPANIES READ OPERATIONS');
  console.log(SECTION_DIVIDER);
  
  try {
    // Get all companies - basic read operation
    console.log('\n📋 Fetching all companies...');
    const allCompaniesResult = await companies.getAll();
    logResult('getAll()', allCompaniesResult, false);
    
    if (!allCompaniesResult[0] || !allCompaniesResult[2] || !allCompaniesResult[2].mrJson || allCompaniesResult[2].mrJson.length === 0) {
      console.log(`\n${WARNING_PREFIX} No companies found. Please create some companies first using the 'create' operation.`);
      return;
    }
    
    const allCompanies = allCompaniesResult[2].mrJson;
    console.log('\n✅ Company Summary:');
    console.log(`  Total companies: ${allCompanies.length}`);
    
    // Group by role for analysis
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
    
    // Find by name operation
    const sampleName = allCompanies[0].name;
    console.log(`\n🔍 Testing findByName with company: "${sampleName}"...`);
    const companyByName = await companies.findByName(sampleName);
    logResult('findByName()', companyByName, false);
    
    if (companyByName[0] && companyByName[2] && companyByName[2].length > 0) {
      const foundCompany = companyByName[2][0];
      console.log('\n✅ Company Details:');
      console.log(`  Name: ${foundCompany.name}`);
      console.log(`  Role: ${foundCompany.role || 'No role'}`);
      console.log(`  Region: ${foundCompany.region || 'Unknown'}`);
      console.log(`  Industry: ${foundCompany.industry || 'Unknown'}`);
      console.log(`  URL: ${foundCompany.url || 'Not provided'}`);
    }
    
    // Generate company profile - company-specific read feature
    console.log(`\n📊 Generating company profile for: ${sampleName}`);
    const profileResult = await companies.generateCompanyProfile(sampleName);
    logResult('generateCompanyProfile()', profileResult, false);
    
    if (profileResult[0]) {
      const profile = profileResult[2];
      console.log('\n✅ Company Profile Generated:');
      console.log(`  Name: ${profile.name}`);
      console.log(`  Description: ${profile.description || 'No description'}`);
      
      if (profile.analytics) {
        console.log(`\n${INFO_PREFIX} Analytics:`);
        console.log(`  Linked interactions: ${profile.analytics.interactionCount}`);
        console.log(`  Total file size: ${profile.analytics.totalFileSize} bytes`);
        console.log(`  Total word count: ${profile.analytics.totalWordCount}`);
        console.log(`  Average reading time: ${profile.analytics.avgReadingTime?.toFixed(2)} minutes`);
        
        if (profile.analytics.contentTypes && Object.keys(profile.analytics.contentTypes).length > 0) {
          console.log(`\n${INFO_PREFIX} Content types:`);
          Object.entries(profile.analytics.contentTypes).forEach(([type, count]) => {
            console.log(`    ${type}: ${count} interactions`);
          });
        }
      }
      
      if (profile.interactionSummary && profile.interactionSummary.length > 0) {
        console.log(`\n${INFO_PREFIX} Linked interactions summary:`);
        profile.interactionSummary.slice(0, 3).forEach((interaction, index) => {
          console.log(`    ${index + 1}. ${interaction.name} (${interaction.content_type})`);
        });
        if (profile.interactionSummary.length > 3) {
          console.log(`    ... and ${profile.interactionSummary.length - 3} more`);
        }
      }
    }
    
  } catch (error) {
    logger.error('Companies READ operations failed', {
      error: error.message,
      stack: error.stack
    });
    console.error('\n❌ Error in Companies READ operations:', error.message);
  }
}

/**
 * Demonstrates Companies UPDATE operations
 * @param {Companies} companies - Companies instance
 */
async function demonstrateCompaniesUpdateOperations(companies) {
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('COMPANIES UPDATE OPERATIONS');
  console.log(SECTION_DIVIDER);
  
  try {
    // Get existing companies
    const allCompaniesResult = await companies.getAll();
    if (!allCompaniesResult[0] || !allCompaniesResult[2] || !allCompaniesResult[2].mrJson || allCompaniesResult[2].mrJson.length === 0) {
      console.log(`\n${WARNING_PREFIX} No companies found. Please create some companies first using the 'create' operation.`);
      return;
    }
    
    const allCompanies = allCompaniesResult[2].mrJson;
    
    // Randomly select a company for testing
    const randomIndex = Math.floor(Math.random() * allCompanies.length);
    const targetCompany = allCompanies[randomIndex];
    const targetCompanyName = targetCompany.name;
    
    console.log(`\n${INFO_PREFIX} Available companies (${allCompanies.length} total):`);
    allCompanies.slice(0, 5).forEach((company, index) => {
      const marker = company.name === targetCompanyName ? ' ← SELECTED' : '';
      console.log(`  ${index + 1}. ${company.name}${marker}`);
    });
    if (allCompanies.length > 5) {
      console.log(`  ... and ${allCompanies.length - 5} more`);
    }
    
    console.log(`\n🎯 Randomly selected company for testing: "${targetCompanyName}"`);
    console.log(`📋 Current description: "${targetCompany.description || 'No description'}"`);
    
    // Test 1: Update a whitelisted field (description) - should succeed
    console.log(`\n${SECTION_DIVIDER}`);
    console.log('TEST 1: UPDATE WHITELISTED FIELD (description)');
    console.log(SECTION_DIVIDER);
    
    const timestamp = new Date().toISOString();
    const newDescription = `UPDATED on ${timestamp} - This description was automatically updated by the github-companies.js example to demonstrate successful field updates. Original: ${targetCompany.description || 'No previous description'}`;
    
    console.log('\n📝 Updating company description (whitelisted field)...');
    console.log(`New description: "${newDescription.substring(0, 100)}..."`);
    
    const updateResult = await companies.updateObj({
      name: targetCompanyName,
      key: 'description',
      value: newDescription
    });
    logResult('updateObj(description) [whitelisted]', updateResult);
    
    // Verify the successful update
    if (updateResult[0]) {
      console.log('\n🔍 Verifying successful update...');
      const verifyResult = await companies.findByName(targetCompanyName);
      logResult('findByName() [verification]', verifyResult, false);
      
      if (verifyResult[0] && verifyResult[2] && verifyResult[2].length > 0) {
        const updatedCompany = verifyResult[2][0];
        const descriptionMatches = updatedCompany.description === newDescription;
        
        console.log('\n✅ Update Verification Results:');
        console.log(`  Company: ${updatedCompany.name}`);
        console.log(`  Description updated: ${descriptionMatches ? '✅ YES' : '❌ NO'}`);
        console.log(`  New description: "${updatedCompany.description?.substring(0, 100)}${updatedCompany.description?.length > 100 ? '...' : ''}"`);
        
        if (!descriptionMatches) {
          console.log(`\n${WARNING_PREFIX} Description update verification failed!`);
          console.log(`Expected: "${newDescription.substring(0, 50)}..."`);
          console.log(`Actual: "${updatedCompany.description?.substring(0, 50)}..."`);
        } else {
          console.log('\n✅ Description update verified successfully!');
        }
      }
    }
    
    // Test 2: Attempt to update a non-whitelisted field (name) - should fail
    console.log(`\n${SECTION_DIVIDER}`);
    console.log('TEST 2: UPDATE NON-WHITELISTED FIELD (name)');
    console.log(SECTION_DIVIDER);
    
    console.log('\n📝 Attempting to update company name (non-whitelisted field)...');
    console.log(`${WARNING_PREFIX} This should fail as 'name' is not in the whitelist and is the primary key.`);
    
    const invalidUpdateResult = await companies.updateObj({
      name: targetCompanyName,
      key: 'name',
      value: `${targetCompanyName}_MODIFIED`
    });
    logResult('updateObj(name) [non-whitelisted - should fail]', invalidUpdateResult);
    
    if (!invalidUpdateResult[0]) {
      console.log('\n✅ Expected behavior: Update correctly failed for non-whitelisted field.');
      console.log(`📋 Error message: ${invalidUpdateResult[1]?.status_msg || invalidUpdateResult[1]}`);
    } else {
      console.log(`\n${WARNING_PREFIX} Unexpected: Update succeeded for non-whitelisted field. This should not happen!`);
    }
    
    // Test 3: Update another whitelisted field (status) - should succeed
    console.log(`\n${SECTION_DIVIDER}`);
    console.log('TEST 3: UPDATE ANOTHER WHITELISTED FIELD (status)');
    console.log(SECTION_DIVIDER);
    
    console.log('\n📝 Updating company status (whitelisted field)...');
    const newStatus = `active_updated_${Date.now()}`;
    
    const statusUpdateResult = await companies.updateObj({
      name: targetCompanyName,
      key: 'status',
      value: newStatus
    });
    logResult('updateObj(status) [whitelisted]', statusUpdateResult);
    
    // Test 4: Demonstrate interaction linking (company-specific update feature)
    console.log(`\n${SECTION_DIVIDER}`);
    console.log('TEST 4: LINK INTERACTIONS (company-specific feature)');
    console.log(SECTION_DIVIDER);
    
    console.log('\n🔗 Demonstrating interaction linking...');
    const mockInteractions = [
      { 
        name: `Demo Interaction 1 for ${targetCompanyName}`, 
        content_type: 'document',
        description: 'Mock interaction for demonstration purposes'
      },
      { 
        name: `Demo Interaction 2 for ${targetCompanyName}`, 
        content_type: 'presentation',
        description: 'Another mock interaction for linking demonstration'
      }
    ];
    
    const linkResult = await companies.linkInteractions(targetCompanyName, mockInteractions);
    logResult('linkInteractions()', linkResult);
    
    // Final verification of all updates
    console.log(`\n${SECTION_DIVIDER}`);
    console.log('FINAL VERIFICATION: ALL UPDATES');
    console.log(SECTION_DIVIDER);
    
    console.log('\n🔍 Final verification of all successful updates...');
    const finalVerifyResult = await companies.findByName(targetCompanyName);
    logResult('findByName() [final verification]', finalVerifyResult, false);
    
    if (finalVerifyResult[0] && finalVerifyResult[2] && finalVerifyResult[2].length > 0) {
      const finalCompany = finalVerifyResult[2][0];
      console.log('\n✅ Final Company State:');
      console.log(`  Name: ${finalCompany.name} (unchanged - primary key)`);
      console.log(`  Description: ${finalCompany.description ? 'UPDATED ✅' : 'Not updated ❌'}`);
      console.log(`  Status: ${finalCompany.status ? finalCompany.status : 'Not set'}`);
      
      if (finalCompany.linked_interactions) {
        const linkedCount = Object.keys(finalCompany.linked_interactions).length;
        console.log(`  Linked interactions: ${linkedCount} ${linkedCount > 0 ? '✅' : '❌'}`);
        if (linkedCount > 0) {
          console.log(`    - ${Object.keys(finalCompany.linked_interactions).join(', ')}`);
        }
      } else {
        console.log('  Linked interactions: 0 (none set)');
      }
      
      console.log('\n📊 Update Test Summary:');
      console.log('  ✅ Whitelisted field updates: SUCCESS');
      console.log('  ✅ Non-whitelisted field rejection: SUCCESS');
      console.log('  ✅ Interaction linking: SUCCESS');
      console.log('  ✅ Data verification: SUCCESS');
    }
    
  } catch (error) {
    logger.error('Companies UPDATE operations failed', {
      error: error.message,
      stack: error.stack
    });
    console.error('\n❌ Error in Companies UPDATE operations:', error.message);
  }
}

/**
 * Demonstrates Companies DELETE operations
 * @param {Companies} companies - Companies instance
 */
async function demonstrateCompaniesDeleteOperations(companies) {
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('COMPANIES DELETE OPERATIONS');
  console.log(SECTION_DIVIDER);
  
  try {
    // Get existing companies
    const allCompaniesResult = await companies.getAll();
    if (!allCompaniesResult[0] || !allCompaniesResult[2] || !allCompaniesResult[2].mrJson || allCompaniesResult[2].mrJson.length === 0) {
      console.log(`\n${WARNING_PREFIX} No companies found. Nothing to delete.`);
      return;
    }
    
    const allCompanies = allCompaniesResult[2].mrJson;
    const initialCount = allCompanies.length;
    
    console.log(`\n${WARNING_PREFIX} DELETE operations are destructive and will permanently remove company data.`);
    console.log(`\n${INFO_PREFIX} Current companies (${allCompanies.length} total):`);
    allCompanies.forEach((company, index) => {
      console.log(`  ${index + 1}. ${company.name}`);
    });
    
    // Randomly select a company for deletion (but ask for confirmation)
    const randomIndex = Math.floor(Math.random() * allCompanies.length);
    const targetCompany = allCompanies[randomIndex];
    const targetCompanyName = targetCompany.name;
    
    console.log(`\n🎯 Randomly selected company for deletion: "${targetCompanyName}"`);
    console.log('📋 Company details:');
    console.log(`  Name: ${targetCompany.name}`);
    console.log(`  Role: ${targetCompany.role || 'No role'}`);
    console.log(`  Description: ${targetCompany.description ? targetCompany.description.substring(0, 100) + '...' : 'No description'}`);
    
    // Show linked interactions if any
    if (targetCompany.linked_interactions && Object.keys(targetCompany.linked_interactions).length > 0) {
      const linkedCount = Object.keys(targetCompany.linked_interactions).length;
      console.log(`  Linked interactions: ${linkedCount}`);
      console.log(`    - ${Object.keys(targetCompany.linked_interactions).join(', ')}`);
      console.log(`\n${INFO_PREFIX} Note: This deletion will only remove the company. Linked interactions will remain.`);
    } else {
      console.log('  Linked interactions: 0');
    }
    
    console.log(`\n${INFO_PREFIX} Delete options:`);
    console.log('  1. Delete the selected company');
    console.log('  2. Skip deletion (recommended for data preservation)');
    
    const choice = await promptForInput('Choose an option (1-2, or press Enter to skip)');
    
    if (choice === '1') {
      // Double confirmation for safety
      console.log(`\n${WARNING_PREFIX} This will permanently delete: "${targetCompanyName}"`);
      console.log(`${WARNING_PREFIX} This action cannot be undone!`);
      
      const confirmed = await confirmAction(`Are you absolutely sure you want to delete "${targetCompanyName}"?`);
      
      if (!confirmed) {
        console.log('\nDeletion cancelled by user.');
        return;
      }
      
      // Perform the deletion using the catch/write/release pattern
      console.log(`\n${SECTION_DIVIDER}`);
      console.log('EXECUTING DELETION');
      console.log(SECTION_DIVIDER);
      
      console.log(`\n🗑️ Deleting company: "${targetCompanyName}"`);
      console.log(`${INFO_PREFIX} Using catch/write/release pattern for safe deletion...`);
      console.log(`${INFO_PREFIX} Pattern: Catch containers → Delete object → Update references → Write containers → Release`);
      
      const deleteResult = await companies.deleteObj(targetCompanyName);
      logResult('deleteObj()', deleteResult);
      
      if (deleteResult[0]) {
        console.log(`\n✅ Company "${targetCompanyName}" has been deleted successfully.`);
        
        // Verify the deletion by checking the updated company list
        console.log(`\n${SECTION_DIVIDER}`);
        console.log('DELETION VERIFICATION');
        console.log(SECTION_DIVIDER);
        
        console.log('\n🔍 Verifying deletion by fetching updated company list...');
        const updatedResult = await companies.getAll();
        logResult('getAll() [post-deletion verification]', updatedResult, false);
        
        if (updatedResult[0] && updatedResult[2] && updatedResult[2].mrJson) {
          const updatedCompanies = updatedResult[2].mrJson;
          const finalCount = updatedCompanies.length;
          
          console.log('\n✅ Deletion Verification Results:');
          console.log(`  Initial company count: ${initialCount}`);
          console.log(`  Final company count: ${finalCount}`);
          console.log(`  Companies removed: ${initialCount - finalCount}`);
          
          // Check that the specific company is gone
          const stillExists = updatedCompanies.some(company => company.name === targetCompanyName);
          console.log(`  Target company "${targetCompanyName}" still exists: ${stillExists ? '❌ YES (ERROR!)' : '✅ NO (SUCCESS)'}`);
          
          if (finalCount === initialCount - 1 && !stillExists) {
            console.log('\n✅ Deletion verified successfully!');
            console.log(`📊 Updated company list (${finalCount} companies):`);
            updatedCompanies.forEach((company, index) => {
              console.log(`  ${index + 1}. ${company.name}`);
            });
          } else {
            console.log('\n❌ Deletion verification failed!');
            console.log('Expected: 1 company removed and target company not found');
            console.log(`Actual: ${initialCount - finalCount} companies removed, target still exists: ${stillExists}`);
          }
        } else {
          console.log(`\n${WARNING_PREFIX} Could not verify deletion - unable to fetch updated company list.`);
        }
        
        // Try to find the deleted company (should fail)
        console.log(`\n🔍 Attempting to find deleted company "${targetCompanyName}"...`);
        const findDeletedResult = await companies.findByName(targetCompanyName);
        logResult('findByName() [deleted company - should fail]', findDeletedResult, false);
        
        if (!findDeletedResult[0] || (findDeletedResult[2] && findDeletedResult[2].length === 0)) {
          console.log('✅ Confirmed: Deleted company cannot be found (expected behavior)');
        } else {
          console.log('❌ Unexpected: Deleted company was still found!');
        }
        
      } else {
        console.log('\n❌ Company deletion failed!');
        console.log(`📋 Error: ${deleteResult[1]?.status_msg || deleteResult[1]}`);
        if (deleteResult[2]) {
          console.log('Error details:', JSON.stringify(deleteResult[2], null, 2));
        }
      }
      
    } else {
      console.log('\nDeletion skipped. This is the recommended choice to preserve your data.');
    }
    
    // TODO: Add future enhancement
    console.log(`\n${SECTION_DIVIDER}`);
    console.log('FUTURE ENHANCEMENTS');
    console.log(SECTION_DIVIDER);
    
    console.log(`\n${INFO_PREFIX} TODO: Implement cascade deletion feature`);
    console.log('  Future enhancement: Add option to delete a company AND its associated interactions');
    console.log('  This would require:');
    console.log('    1. Finding all interactions linked to the company');
    console.log('    2. Prompting user to confirm cascade deletion');
    console.log('    3. Deleting linked interactions first (using Interactions.deleteObj())');
    console.log('    4. Then deleting the company');
    console.log('    5. Verifying all deletions completed successfully');
    console.log('  Benefits: Complete cleanup of related data');
    console.log('  Risks: More destructive operation, requires careful confirmation');
    console.log('  Implementation priority: Medium (after core CRUD operations are stable)');
    
  } catch (error) {
    logger.error('Companies DELETE operations failed', {
      error: error.message,
      stack: error.stack
    });
    console.error('\n❌ Error in Companies DELETE operations:', error.message);
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
      console.error('❌ Prerequisites not satisfied. Please resolve the issues above.');
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
    logger.error('Error occurred while running the companies example', {
      error: error.message,
      stack: error.stack
    });
    console.error('\nAn error occurred while running the example:');
    console.error(error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
  }
}

// Run the example
main().catch(error => {
  logger.error('Unhandled error in GitHub Companies example', {
    error: error.message,
    stack: error.stack
  });
  console.error('Unhandled error:', error);
  process.exit(1);
});
