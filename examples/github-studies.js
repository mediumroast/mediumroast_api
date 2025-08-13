/**
 * Example demonstrating studies operations in the mediumroast.io API
 * @author Michael Hay <michael.hay@mediumroast.io>
 * @file github-studies.js
 * @license Apache-2.0
 * @version 3.0.0
 * @copyright 2025 Mediumroast, Inc. All rights reserved.
 * 
 * This example shows how to use the Studies entity class to perform
 * study-related operations against a GitHub organization.
 * 
 * It demonstrates:
 * - Studies: Create, list, and manage study data
 * - Container workflow: Catch/write/release pattern for safe operations
 * - Prerequisite checking: Ensures repository and containers exist
 * - Sample data loading: Uses sample study data for testing
 * - Study-specific operations: Search by status, access level, and groups
 * - Entity management: Add/remove companies and interactions to/from studies
 * 
 * To run this example, create a config.ini file with your GitHub token and organization.
 * The file should look like this:
 * 
 * [GitHub]
 * token = YOUR_GITHUB_TOKEN
 * org = YOUR_ORGANIZATION_NAME
 * 
 * You can run the example with:
 * node examples/github-studies.js
 * 
 * Or specify specific operations:
 * node examples/github-studies.js create read update delete
 * 
 * Available operations:
 * - create       - Create studies from sample data
 * - read         - Read and display study information (list, find by name, search by attributes)
 * - update       - Update study information and manage linked entities
 * - delete       - Delete studies from the repository
 * 
 * This will run all operations by default.
 * 
 * Prerequisites: 
 * 1. Repository must exist (run github-repository.js first)
 * 2. Studies container must exist
 * 3. sample_data/studies.json file must exist
 * 4. For entity management: Companies and Interactions containers must exist
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

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import path from 'path';
import ConfigParser from 'configparser';
import readline from 'readline';
import { Studies } from '../src/api/gitHubServer.js';
import GitHubFunctions from '../src/api/github.js';
import { logger } from '../src/api/gitHubServer/logger.js';

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
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
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
 * Checks prerequisites for studies operations
 * @param {string} token - GitHub token
 * @param {string} org - GitHub organization
 * @returns {Promise<boolean>} Whether prerequisites are satisfied
 */
async function checkPrerequisites(token, org) {
  const tracker = logger.trackOperation ? 
    logger.trackOperation('checkPrerequisites', 'studies-example') : 
    { end: () => {} };
    
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('PREREQUISITE CHECKS');
  console.log(SECTION_DIVIDER);
  
  try {
    logger.debug('Starting prerequisite checks for studies operations', { organization: org });
    
    const github = new GitHubFunctions(token, org, 'studies-prerequisite-check');
    
    // Check if repository exists
    console.log('\n🔍 Checking repository...');
    const repoResult = await github.getRepoSize();
    if (!repoResult[0]) {
      console.error(`❌ Repository not found or inaccessible: ${repoResult[1]}`);
      console.error('Please run github-repository.js first to create the repository');
      return false;
    }
    logger.info('Repository prerequisite check passed', { organization: org });
    console.log('✅ Repository exists and is accessible');
    
    // Check if Studies container exists
    console.log('🔍 Checking Studies container...');
    const containerResult = await github.getContent('Studies');
    if (!containerResult[0]) {
      console.error(`❌ Studies container not found: ${containerResult[1]}`);
      console.error('Please run github-repository.js with containers operation first');
      return false;
    }
    logger.info('Studies container prerequisite check passed', { organization: org });
    console.log('✅ Studies container exists');
    
    // Check if Studies.json file exists
    console.log('🔍 Checking Studies.json file...');
    const studiesFileResult = await github.getContent('Studies/Studies.json');
    if (!studiesFileResult[0]) {
      console.log('⚠️ Studies.json file not found (will be created during first operation)');
    } else {
      console.log('✅ Studies.json file exists');
    }
    
    // Check sample data file
    console.log('🔍 Checking sample data file...');
    const sampleDataPath = path.join(__dirname, 'sample_data', 'studies.json');
    if (!fs.existsSync(sampleDataPath)) {
      console.error(`❌ Sample data file not found: ${sampleDataPath}`);
      console.error('Please ensure examples/sample_data/studies.json exists');
      return false;
    }
    logger.info('Sample data file prerequisite check passed', { sampleDataPath });
    console.log('✅ Sample data file found');
    
    logger.info('All prerequisites satisfied for studies operations', { organization: org });
    console.log('\n✅ All prerequisites satisfied for studies operations');
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
 * Helper function to create studies using the container pattern (catch/write/release)
 * @param {Studies} studies - Studies instance
 * @param {Array} studiesToCreate - Array of study objects to create
 * @param {string} operationDescription - Description for logging
 */
async function createStudiesWithContainer(studies, studiesToCreate, operationDescription) {
  const tracker = logger.trackOperation ? 
    logger.trackOperation('createStudiesWithContainer', operationDescription) : 
    { end: () => {} };
    
  try {
    logger.info('Starting study creation using catch/write/release pattern', {
      operation: operationDescription,
      studyCount: studiesToCreate.length
    });
    
    console.log(`\n${INFO_PREFIX} Starting ${operationDescription} creation using catch/write/release pattern...`);
    console.log(`${INFO_PREFIX} Studies to create: ${studiesToCreate.length}`);
    
    // Use the createObj method which handles the full catch/write/release workflow
    const createResult = await studies.createObj(studiesToCreate);
    
    if (createResult[0]) {
      logger.info('Study creation completed successfully', {
        operation: operationDescription,
        studyCount: studiesToCreate.length,
        message: createResult[1]?.status_msg || createResult[1]
      });
      
      console.log(`\n✅ ${operationDescription} creation completed successfully!`);
      console.log(`📊 Created ${studiesToCreate.length} studies`);
      
      // Show created studies
      if (createResult[2] && createResult[2].created) {
        console.log('\n📋 Created studies:');
        createResult[2].created.forEach((study, index) => {
          console.log(`  ${index + 1}. ${study.name} (Status: ${study.status || 'active'})`);
        });
      }
    } else {
      logger.error('Study creation failed', {
        operation: operationDescription,
        studyCount: studiesToCreate.length,
        error: createResult[1]
      });
      
      console.error(`\n❌ ${operationDescription} creation failed:`);
      console.error(`Error: ${createResult[1]?.status_msg || createResult[1]}`);
      if (createResult[2]) {
        console.error('Details:', JSON.stringify(createResult[2], null, 2));
      }
    }
    
  } catch (error) {
    logger.error('Error during study creation', {
      operation: operationDescription,
      studyCount: studiesToCreate.length,
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
 * Demonstrates Studies operations
 * @param {string} token - GitHub token
 * @param {string} org - GitHub organization
 * @param {Array<string>} operations - Specific operations to run
 */
async function demonstrateStudiesOperations(token, org, operations) {
  const operationTracker = logger.trackTransaction('github-studies-operations');
  
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('STUDIES OPERATIONS');
  console.log(SECTION_DIVIDER);
  
  try {
    logger.debug('Starting Studies operations', { organization: org, operations });
    
    // Load sample study data
    const sampleDataPath = path.join(__dirname, 'sample_data', 'studies.json');
    console.log(`\n📄 Loading sample study data from: ${sampleDataPath}`);
    
    const sampleStudies = JSON.parse(fs.readFileSync(sampleDataPath, 'utf8'));
    logger.info('Sample study data loaded successfully', { 
      sampleDataPath, 
      studyCount: sampleStudies.length 
    });
    console.log(`✅ Loaded ${sampleStudies.length} sample studies`);
    
    // Initialize Studies entity class
    const studies = new Studies(token, org, 'study-operations-example');
    const runAll = operations.length === 0;
    
    // CREATE Operations
    if (runAll || operations.includes('create')) {
      await demonstrateStudiesCreateOperations(studies, sampleStudies);
    }
    
    // READ Operations
    if (runAll || operations.includes('read')) {
      await demonstrateStudiesReadOperations(studies);
    }
    
    // UPDATE Operations
    if (runAll || operations.includes('update')) {
      await demonstrateStudiesUpdateOperations(studies);
    }
    
    // DELETE Operations
    if (runAll || operations.includes('delete')) {
      await demonstrateStudiesDeleteOperations(studies);
    }
    
  } catch (error) {
    logger.error('Studies operations failed', {
      organization: org,
      error: error.message,
      stack: error.stack
    });
    console.error('\n❌ Error in Studies operations:', error.message);
  } finally {
    operationTracker.end();
  }
}

/**
 * Demonstrates Studies CREATE operations
 * @param {Studies} studies - Studies instance
 * @param {Array} sampleStudies - Sample studies data
 */
async function demonstrateStudiesCreateOperations(studies, sampleStudies) {
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('STUDIES CREATE OPERATIONS');
  console.log(SECTION_DIVIDER);
  
  try {
    // Check for existing studies
    console.log('\n📋 Checking for existing studies...');
    const existingStudiesResult = await studies.getAll();
    let existingStudyNames = [];
    
    if (existingStudiesResult[0] && existingStudiesResult[2] && existingStudiesResult[2].mrJson) {
      existingStudyNames = existingStudiesResult[2].mrJson.map(study => study.name);
      console.log(`\n📋 Found ${existingStudyNames.length} existing studies`);
    } else {
      console.log('\n📋 No existing studies found (or container doesn\'t exist yet)');
    }
    
    // Filter out studies that already exist
    const studiesToCreate = sampleStudies.filter(study => !existingStudyNames.includes(study.name));
    
    if (studiesToCreate.length === 0) {
      console.log('\n⚠️ All sample studies already exist in the repository');
      console.log('Existing studies:');
      existingStudyNames.forEach((name, index) => {
        console.log(`  ${index + 1}. ${name}`);
      });
      
      const recreate = await confirmAction('Do you want to delete existing studies and recreate them?');
      if (!recreate) {
        console.log('Skipping CREATE operations');
        return;
      }
      
      // Delete existing studies first
      console.log('\n🗑️ Deleting existing studies...');
      for (const studyName of existingStudyNames) {
        const deleteResult = await studies.deleteObj(studyName);
        if (deleteResult[0]) {
          console.log(`✅ Deleted study: ${studyName}`);
        } else {
          console.error(`❌ Failed to delete study: ${studyName} - ${deleteResult[1]}`);
        }
      }
      
      // Now create all sample studies
      studiesToCreate.push(...sampleStudies);
    }
    
    console.log(`\n📊 Creating ${studiesToCreate.length} studies...`);
    
    // Show what will be created
    console.log('\n📋 Studies to be created:');
    studiesToCreate.forEach((study, index) => {
      console.log(`  ${index + 1}. ${study.name} (Status: ${study.status || 'active'}, Public: ${study.public || false})`);
    });
    
    const proceed = await confirmAction('Do you want to proceed with creating these studies?');
    if (!proceed) {
      console.log('Skipping study creation');
      return;
    }
    
    // Create all studies in one operation
    await createStudiesWithContainer(studies, studiesToCreate, 'Sample studies');
    
  } catch (error) {
    logger.error('Studies CREATE operations failed', {
      error: error.message,
      stack: error.stack
    });
    console.error('\n❌ Error in Studies CREATE operations:', error.message);
  }
}

/**
 * Demonstrates Studies READ operations
 * @param {Studies} studies - Studies instance
 */
async function demonstrateStudiesReadOperations(studies) {
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('STUDIES READ OPERATIONS');
  console.log(SECTION_DIVIDER);
  
  try {
    // Get all studies
    console.log('\n📚 Getting all studies...');
    const allStudiesResult = await studies.getAll();
    logResult('getAll() [all studies]', allStudiesResult, false);
    
    if (allStudiesResult[0] && allStudiesResult[2] && allStudiesResult[2].mrJson) {
      const allStudies = allStudiesResult[2].mrJson;
      console.log(`\n📊 Total studies found: ${allStudies.length}`);
      
      // Display study summary
      console.log('\n📋 Study Summary:');
      allStudies.forEach((study, index) => {
        console.log(`  ${index + 1}. ${study.name}`);
        console.log(`     Status: ${study.status || 'Unknown'}`);
        console.log(`     Public: ${study.public ? 'Yes' : 'No'}`);
        console.log(`     Groups: ${Array.isArray(study.groups) ? study.groups.join(', ') || 'None' : 'None'}`);
        console.log(`     Created: ${study.creation_date || 'Unknown'}`);
        console.log(`     Modified: ${study.modification_date || 'Unknown'}`);
        console.log('');
      });
      
      if (allStudies.length > 0) {
        // Find by name (use first study)
        const firstStudy = allStudies[0];
        console.log(`\n🔍 Finding study by name: "${firstStudy.name}"`);
        const findByNameResult = await studies.findByName(firstStudy.name);
        logResult('findByName() [first study]', findByNameResult, false);
        
        // Find by status
        console.log('\n🔍 Finding studies by status: "active"');
        const findByStatusResult = await studies.findByStatus('active');
        logResult('findByStatus() [active studies]', findByStatusResult, false);
        
        // Find by access (public studies)
        console.log('\n🔍 Finding public studies...');
        const findByAccessResult = await studies.findByAccess(true);
        logResult('findByAccess() [public studies]', findByAccessResult, false);
        
        // Find by group (if any studies have groups)
        const studiesWithGroups = allStudies.filter(study => 
          Array.isArray(study.groups) && study.groups.length > 0
        );
        
        if (studiesWithGroups.length > 0) {
          const firstGroup = studiesWithGroups[0].groups[0];
          console.log(`\n🔍 Finding studies by group: "${firstGroup}"`);
          const findByGroupResult = await studies.findByGroup(firstGroup);
          logResult('findByGroup() [group studies]', findByGroupResult, false);
        }
        
        // Get study summary for first study
        console.log(`\n📊 Getting study summary for: "${firstStudy.name}"`);
        const summaryResult = await studies.getStudySummary(firstStudy.name);
        logResult('getStudySummary() [study summary]', summaryResult, true);
      }
    } else {
      console.log('\n📋 No studies found in the repository');
      console.log('Consider running the CREATE operations first');
    }
    
  } catch (error) {
    logger.error('Studies READ operations failed', {
      error: error.message,
      stack: error.stack
    });
    console.error('\n❌ Error in Studies READ operations:', error.message);
  }
}

/**
 * Demonstrates Studies UPDATE operations
 * @param {Studies} studies - Studies instance
 */
async function demonstrateStudiesUpdateOperations(studies) {
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('STUDIES UPDATE OPERATIONS');
  console.log(SECTION_DIVIDER);
  
  try {
    // Get all studies first
    console.log('\n📚 Getting existing studies for update operations...');
    const allStudiesResult = await studies.getAll();
    
    if (!allStudiesResult[0] || !allStudiesResult[2] || !allStudiesResult[2].mrJson || allStudiesResult[2].mrJson.length === 0) {
      console.log('\n⚠️ No studies found for update operations');
      console.log('Please run CREATE operations first');
      return;
    }
    
    const allStudies = allStudiesResult[2].mrJson;
    console.log(`✅ Found ${allStudies.length} studies for update operations`);
    
    // Select a study to update
    let studyToUpdate = allStudies[0];
    
    if (allStudies.length > 1) {
      console.log('\n📋 Available studies:');
      allStudies.forEach((study, index) => {
        console.log(`  ${index + 1}. ${study.name} (Status: ${study.status || 'Unknown'})`);
      });
      
      const studyChoice = await promptForInput(`Select study to update (1-${allStudies.length}) or press Enter for first study`);
      if (studyChoice && !isNaN(studyChoice)) {
        const index = parseInt(studyChoice) - 1;
        if (index >= 0 && index < allStudies.length) {
          studyToUpdate = allStudies[index];
        }
      }
    }
    
    console.log(`\n🔄 Selected study for update: "${studyToUpdate.name}"`);
    
    // Update study description
    // Update study description and status using direct updateObject calls
    let updateResults = [];
    
    const newDescription = await promptForInput(`Enter new description for "${studyToUpdate.name}" (current: "${studyToUpdate.description || 'None'}")`);
    if (newDescription) {
      console.log('\n📝 Updating study description with updateObj...');
      // Use the proper inherited updateObj method like Companies does
      const descUpdateResult = await studies.updateObj({
        name: studyToUpdate.name,
        key: 'description',
        value: newDescription
      });
      logResult('updateObject() [description update]', descUpdateResult, false);
      updateResults.push({ field: 'description', result: descUpdateResult });
    }
    
    const currentStatus = studyToUpdate.status || 'active';
    const newStatus = currentStatus === 1 ? 2 : 1;  // Use numeric status values
    
    const changeStatus = await confirmAction(`Do you want to change status from "${currentStatus}" to "${newStatus}"?`);
    if (changeStatus) {
      console.log('\n📊 Updating study status with updateObj...');
      const statusUpdateResult = await studies.updateObj({
        name: studyToUpdate.name,
        key: 'status',
        value: newStatus
      });
      logResult('updateObject() [status update]', statusUpdateResult, false);
      updateResults.push({ field: 'status', result: statusUpdateResult });
    }
    
    // Summary of updates
    if (updateResults.length > 0) {
      console.log('\n� Update Summary:');
      const successful = updateResults.filter(r => r.result[0]);
      const failed = updateResults.filter(r => !r.result[0]);
      console.log(`✅ Successful updates: ${successful.length}`);
      console.log(`❌ Failed updates: ${failed.length}`);
      
      if (successful.length > 0) {
        console.log('Successful fields:', successful.map(r => r.field).join(', '));
      }
      if (failed.length > 0) {
        console.log('Failed fields:', failed.map(r => r.field).join(', '));
      }
    }
    
    // Demonstrate adding entities to study (if Companies/Interactions exist)
    const addEntities = await confirmAction('Do you want to try adding entities (companies/interactions) to this study?');
    if (addEntities) {
      // Try to add a company
      try {
        console.log('\n🏢 Attempting to add a company to the study...');
        const addCompanyResult = await studies.addToStudy(studyToUpdate.name, 'Companies', 'TestCompany');
        logResult('addToStudy() [company]', addCompanyResult, false);
      } catch (error) {
        console.log(`ℹ️ Could not add company: ${error.message} (Company may not exist)`);
      }
      
      // Try to add an interaction
      try {
        console.log('\n🤝 Attempting to add an interaction to the study...');
        const addInteractionResult = await studies.addToStudy(studyToUpdate.name, 'Interactions', 'TestInteraction');
        logResult('addToStudy() [interaction]', addInteractionResult, false);
      } catch (error) {
        console.log(`ℹ️ Could not add interaction: ${error.message} (Interaction may not exist)`);
      }
    }
    
  } catch (error) {
    logger.error('Studies UPDATE operations failed', {
      error: error.message,
      stack: error.stack
    });
    console.error('\n❌ Error in Studies UPDATE operations:', error.message);
  }
}

/**
 * Demonstrates Studies DELETE operations
 * @param {Studies} studies - Studies instance
 */
async function demonstrateStudiesDeleteOperations(studies) {
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('STUDIES DELETE OPERATIONS');
  console.log(SECTION_DIVIDER);
  
  try {
    // Get all studies first
    console.log('\n📚 Getting existing studies for delete operations...');
    const allStudiesResult = await studies.getAll();
    
    if (!allStudiesResult[0] || !allStudiesResult[2] || !allStudiesResult[2].mrJson || allStudiesResult[2].mrJson.length === 0) {
      console.log('\n⚠️ No studies found for delete operations');
      console.log('Please run CREATE operations first');
      return;
    }
    
    const allStudies = allStudiesResult[2].mrJson;
    console.log(`✅ Found ${allStudies.length} studies available for deletion`);
    
    // Show available studies
    console.log('\n📋 Available studies:');
    allStudies.forEach((study, index) => {
      console.log(`  ${index + 1}. ${study.name} (Status: ${study.status || 'Unknown'})`);
    });
    
    // Warn about destructive operation
    console.log(`\n${WARNING_PREFIX} DELETE operations are destructive and cannot be undone!`);
    const confirmDelete = await confirmAction('Do you want to proceed with deleting studies?');
    
    if (!confirmDelete) {
      console.log('Skipping DELETE operations');
      return;
    }
    
    // Ask which studies to delete
    const deleteChoice = await promptForInput('Enter study numbers to delete (comma-separated, e.g., "1,3") or "all" for all studies');
    
    let studiesToDelete = [];
    
    if (deleteChoice.toLowerCase() === 'all') {
      studiesToDelete = [...allStudies];
    } else if (deleteChoice.trim()) {
      const indices = deleteChoice.split(',').map(s => parseInt(s.trim()) - 1);
      studiesToDelete = indices
        .filter(index => index >= 0 && index < allStudies.length)
        .map(index => allStudies[index]);
    }
    
    if (studiesToDelete.length === 0) {
      console.log('No valid studies selected for deletion');
      return;
    }
    
    console.log(`\n🗑️ Selected ${studiesToDelete.length} studies for deletion:`);
    studiesToDelete.forEach((study, index) => {
      console.log(`  ${index + 1}. ${study.name}`);
    });
    
    const finalConfirm = await confirmAction(`Are you sure you want to delete these ${studiesToDelete.length} studies? This cannot be undone!`);
    if (!finalConfirm) {
      console.log('Delete operation cancelled');
      return;
    }
    
    // Perform deletions
    console.log('\n🗑️ Deleting studies...');
    let deletedCount = 0;
    let failedCount = 0;
    
    for (const study of studiesToDelete) {
      console.log(`\n🗑️ Processing study for deletion: "${study.name}"`);
      console.log(`${INFO_PREFIX} Using catch/write/release pattern for safe deletion...`);
      
      // Check for linked companies and interactions
      const linkedCompanies = study.linked_companies ? Object.keys(study.linked_companies) : [];
      const linkedInteractions = study.linked_interactions ? Object.keys(study.linked_interactions) : [];
      
      if (linkedCompanies.length > 0 || linkedInteractions.length > 0) {
        console.log(`${INFO_PREFIX} Found linked entities:`);
        if (linkedCompanies.length > 0) {
          console.log(`  📢 Companies (${linkedCompanies.length}): ${linkedCompanies.join(', ')}`);
        }
        if (linkedInteractions.length > 0) {
          console.log(`  🤝 Interactions (${linkedInteractions.length}): ${linkedInteractions.slice(0, 3).join(', ')}${linkedInteractions.length > 3 ? '...' : ''}`);
        }
        
        console.log(`${INFO_PREFIX} These links will be automatically cleaned during deletion using catch/write/release pattern`);
      } else {
        console.log(`${INFO_PREFIX} No linked entities found - proceeding with direct deletion`);
      }
      
      // Perform deletion using catch/write/release pattern
      console.log(`${INFO_PREFIX} Pattern: Catch containers → Delete study → Update references → Write containers → Release`);
      const deleteResult = await studies.deleteObj(study.name);
      
      if (deleteResult[0]) {
        console.log(`${SUCCESS_PREFIX} Successfully deleted study: ${study.name}`);
        if (linkedCompanies.length > 0 || linkedInteractions.length > 0) {
          console.log(`${SUCCESS_PREFIX} All linked entities automatically unlinked during deletion`);
        }
        deletedCount++;
      } else {
        console.error(`${ERROR_PREFIX} Failed to delete study: ${study.name}`);
        console.error(`Error message: ${deleteResult[1]?.status_msg || deleteResult[1]}`);
        if (deleteResult[2]) {
          console.error('Error details:', JSON.stringify(deleteResult[2], null, 2));
        }
        failedCount++;
      }
    }
    
    // Summary
    console.log('\n📊 Delete operation summary:');
    console.log(`  ✅ Successfully deleted: ${deletedCount} studies`);
    console.log(`  ❌ Failed to delete: ${failedCount} studies`);
    console.log(`  📊 Total processed: ${deletedCount + failedCount} studies`);
    
  } catch (error) {
    logger.error('Studies DELETE operations failed', {
      error: error.message,
      stack: error.stack
    });
    console.error('\n❌ Error in Studies DELETE operations:', error.message);
  }
}

/**
 * Main function to run the studies example
 */
async function main() {
  console.log(`${SECTION_DIVIDER}`);
  console.log('MEDIUMROAST API - STUDIES OPERATIONS EXAMPLE');
  console.log(`${SECTION_DIVIDER}`);
  
  try {
    // Load configuration
    const configFile = path.join(__dirname, 'config.ini');
    
    // Check if config exists
    if (!fs.existsSync(configFile)) {
      console.error(`❌ Configuration file not found: ${configFile}`);
      console.error('\nPlease create examples/config.ini with your GitHub token and organization:');
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
      console.error('❌ Missing required configuration in config.ini');
      console.error('Please ensure your config.ini contains:');
      console.error('[GitHub]');
      console.error('token = YOUR_GITHUB_TOKEN');
      console.error('org = YOUR_ORGANIZATION_NAME');
      process.exit(1);
    }
        
    const token = config.get('GitHub', 'token');
    const org = config.get('GitHub', 'org');
        
    logger.info('Starting studies operations example', { organization: org });
    
    // Check prerequisites
    const prerequisitesPassed = await checkPrerequisites(token, org);
    if (!prerequisitesPassed) {
      console.error('\n❌ Prerequisites not satisfied. Please address the issues above.');
      process.exit(1);
    }
    
    // Warn about write operations
    console.log(`\n${WARNING_PREFIX} This example performs WRITE operations that will modify your repository.`);
    const globalConfirmation = await confirmAction('Do you want to continue with these examples?');
    
    if (!globalConfirmation) {
      console.log('Operation cancelled by user');
      process.exit(0);
    }
        
    // Get command-line arguments to determine which operations to run
    const args = process.argv.slice(2);
        
    // Run the studies operations
    await demonstrateStudiesOperations(token, org, args);
    
    console.log(`\n${SECTION_DIVIDER}`);
    console.log('✅ STUDIES OPERATIONS EXAMPLE COMPLETED');
    console.log(`${SECTION_DIVIDER}`);
    
  } catch (error) {
    logger.error('Unhandled error in studies example', {
      error: error.message,
      stack: error.stack
    });
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  }
}

// Run the example
main().catch(error => {
  logger.error('Unhandled error in GitHub Studies example', {
    error: error.message,
    stack: error.stack
  });
  console.error('Unhandled error:', error);
  process.exit(1);
});
