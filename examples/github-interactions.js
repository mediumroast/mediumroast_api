/**
 * Example demonstrating interactions operations in the mediumroast.io API
 * @author Michael Hay <michael.hay@mediumroast.io>
 * @file github-interactions.js
 * @license Apache-2.0
 * @version 3.0.0
 * @copyright 2025 Mediumroast, Inc. All rights reserved.
 * 
 * This example shows how to use the Interactions entity class to perform
 * CRUD operations against a GitHub organization, including the new fuzzy search functionality.
 * 
 * It demonstrates:
 * - Basic read operations: getAll(), findByName(), findByX()
 * - Fuzzy search functionality with partial string matching
 * - Interaction analysis and filtering
 * - Content type and metadata exploration
 * - Create operations with file uploads and company linking
 * - Update operations with file handling and company linking
 * - Delete operations with file cleanup and company unlinking
 * - Error handling and prerequisite checking
 * - Branch status operations
 * 
 * To run this example, create a config.ini file with your GitHub token and organization.
 * The file should look like this:
 * 
 * [GitHub]
 * token = YOUR_GITHUB_TOKEN
 * org = YOUR_ORGANIZATION_NAME
 * 
 * You can run the example with:
 * node examples/github-interactions.js
 * 
 * Or specify specific operations:
 * node examples/github-interactions.js basic fuzzy analysis metadata branch create update delete
 * 
 * Available operations:
 * - basic        - Basic read operations (getAll, findByName)
 * - fuzzy        - Fuzzy search demonstrations
 * - analysis     - Interaction analysis and filtering
 * - metadata     - Content type and metadata exploration
 * - branch       - Branch status operations
 * - create       - Create interactions with file uploads and company linking
 * - update       - Update interactions with file handling and company linking
 * - delete       - Delete interactions with file cleanup and company unlinking
 * 
 * This will run all operations by default.
 * 
 * Prerequisites: 
 * 1. Repository must exist (run github-repository.js first)
 * 2. Interactions container must exist
 * 3. Data in the Interactions.json file
 * 4. For create operations: sample_data/interactions.json and interactions_files/ directory
 * 5. For create/update/delete operations: Companies container must exist
 * 
 * The script automatically checks these prerequisites and provides guidance.
 * 
 * @requires configparser
 * @requires fs
 * @requires path
 * @requires ../src/api/gitHubServer.js
 */

/* eslint-disable no-console */

import { Interactions, Companies } from '../src/api/gitHubServer.js';
import GitHubFunctions from '../src/api/github.js';
import { logger } from '../src/api/gitHubServer/logger.js';
import fs from 'fs';
import path from 'path';
import ConfigParser from 'configparser';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import readline from 'readline';
import crypto from 'crypto';

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
// eslint-disable-next-line no-unused-vars
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
    console.log(`\n${SUCCESS_PREFIX} ${operationName}:`);
    console.log('Status: Success');
    console.log(`Message: ${message?.status_msg || message}`);
  } else {
    logger.error(`❌ ${operationName}: Failed`, {
      operation: operationName,
      message: message?.status_msg || message,
      error: data
    });
    console.log(`\n${ERROR_PREFIX} ${operationName}:`);
    console.log('Status: Failed');
    console.log(`Message: ${message?.status_msg || message}`);
  }
    
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
    else if (data && data.mrJson) {
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
 * Checks prerequisites for interactions operations
 * @param {string} token - GitHub token
 * @param {string} org - GitHub organization
 * @returns {Promise<boolean>} Whether prerequisites are satisfied
 */
async function checkPrerequisites(token, org) {
  const tracker = logger.trackOperation ? 
    logger.trackOperation('checkPrerequisites', 'interactions-example') : 
    { end: () => {} };
    
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('PREREQUISITE CHECKS');
  console.log(SECTION_DIVIDER);
  
  try {
    logger.debug('Starting prerequisite checks for interactions operations', { organization: org });
    
    const github = new GitHubFunctions(token, org, 'interactions-prerequisite-check');
    
    // Check if repository exists
    console.log('\n🔍 Checking repository...');
    const repoResult = await github.getRepoSize();
    if (!repoResult[0]) {
      logger.error('Repository prerequisite check failed', {
        organization: org,
        error: repoResult[1]
      });
      console.error(`${ERROR_PREFIX} Repository does not exist or is not accessible`);
      console.log(`${INFO_PREFIX} Please run repository setup first:`);
      console.log('   node examples/github-repository.js');
      return false;
    }
    logger.info('Repository prerequisite check passed', { organization: org });
    console.log(`${SUCCESS_PREFIX} Repository exists and is accessible`);
    
    // Check if Interactions container exists
    console.log('🔍 Checking Interactions container...');
    const containerResult = await github.getContent('Interactions');
    if (!containerResult[0]) {
      logger.error('Interactions container prerequisite check failed', {
        organization: org,
        error: containerResult[1]
      });
      console.error(`${ERROR_PREFIX} Interactions container does not exist`);
      console.log(`${INFO_PREFIX} Please run container setup first:`);
      console.log('   node examples/github-repository.js containers');
      return false;
    }
    logger.info('Interactions container prerequisite check passed', { organization: org });
    console.log(`${SUCCESS_PREFIX} Interactions container exists`);
    
    // Check if Interactions.json file exists (optional for read operations)
    console.log('🔍 Checking Interactions.json file...');
    const interactionsFileResult = await github.getContent('Interactions/Interactions.json');
    if (!interactionsFileResult[0]) {
      logger.debug('Interactions.json file does not exist, will be created during operations');
      console.log(`${WARNING_PREFIX} Interactions.json file does not exist, will be created during operations`);
    } else {
      logger.info('Interactions.json file exists', { organization: org });
      console.log(`${SUCCESS_PREFIX} Interactions.json file exists`);
      
      // Check existing data for read operations
      const interactions = new Interactions(token, org, 'interactions-prerequisite-check');
      const allInteractionsResult = await interactions.getAll();
      if (allInteractionsResult[0] && allInteractionsResult[2] && allInteractionsResult[2].mrJson && allInteractionsResult[2].mrJson.length > 0) {
        logger.info('Found existing interactions data', { 
          organization: org, 
          interactionCount: allInteractionsResult[2].mrJson.length 
        });
        console.log(`${SUCCESS_PREFIX} Found ${allInteractionsResult[2].mrJson.length} existing interactions`);
      } else {
        logger.debug('Interactions.json file exists but contains no data');
        console.log(`${INFO_PREFIX} Interactions.json file exists but contains no data yet`);
      }
    }
    
    // Check sample data file for CREATE operations
    console.log('🔍 Checking sample data file...');
    const sampleDataPath = path.join(__dirname, 'sample_data', 'interactions.json');
    if (!fs.existsSync(sampleDataPath)) {
      logger.error('Sample data file prerequisite check failed', { sampleDataPath });
      console.error(`${ERROR_PREFIX} Sample data file not found: ${sampleDataPath}`);
      console.log(`${INFO_PREFIX} Please ensure the sample_data/interactions.json file exists for CREATE operations`);
      return false;
    }
    
    // Validate sample data content
    try {
      const sampleData = JSON.parse(fs.readFileSync(sampleDataPath, 'utf8'));
      if (!Array.isArray(sampleData) || sampleData.length === 0) {
        logger.error('Sample data file is empty or invalid', { sampleDataPath });
        console.error(`${ERROR_PREFIX} Sample data file is empty or invalid`);
        return false;
      }
      logger.info('Sample data file prerequisite check passed', { 
        sampleDataPath, 
        interactionCount: sampleData.length 
      });
      console.log(`${SUCCESS_PREFIX} Sample data file found with ${sampleData.length} interactions`);
    } catch (parseError) {
      logger.error('Sample data file parse error', { sampleDataPath, error: parseError.message });
      console.error(`${ERROR_PREFIX} Sample data file is not valid JSON: ${parseError.message}`);
      return false;
    }
    
    // Check sample interaction files directory
    console.log('🔍 Checking sample interaction files...');
    const sampleFilesPath = path.join(__dirname, 'sample_data', 'interactions_files');
    if (!fs.existsSync(sampleFilesPath)) {
      logger.error('Sample files directory prerequisite check failed', { sampleFilesPath });
      console.error(`${ERROR_PREFIX} Sample files directory not found: ${sampleFilesPath}`);
      console.log(`${INFO_PREFIX} Please ensure the sample_data/interactions_files/ directory exists for CREATE operations`);
      return false;
    }
    
    const sampleFiles = fs.readdirSync(sampleFilesPath).filter(file => file.endsWith('.pdf'));
    if (sampleFiles.length === 0) {
      logger.warn('No sample files found', { sampleFilesPath });
      console.log(`${WARNING_PREFIX} No sample files (.pdf) found in ${sampleFilesPath}`);
      console.log(`${INFO_PREFIX} CREATE operations may not work without sample files`);
    } else {
      logger.info('Sample files prerequisite check passed', { 
        sampleFilesPath, 
        fileCount: sampleFiles.length 
      });
      console.log(`${SUCCESS_PREFIX} Found ${sampleFiles.length} sample interaction files`);
    }
    
    logger.info('All prerequisites satisfied for interactions operations', { organization: org });
    console.log(`\n${SUCCESS_PREFIX} All prerequisites satisfied for interactions operations`);
    return true;
    
  } catch (error) {
    logger.error('Error during prerequisite checks', {
      organization: org,
      error: error.message,
      stack: error.stack
    });
    console.error(`${ERROR_PREFIX} Error during prerequisite checks: ${error.message}`);
    return false;
  } finally {
    tracker.end();
  }
}

/**
 * Demonstrates basic Interactions read operations
 * @param {Interactions} interactions - Interactions instance
 */
async function demonstrateBasicReadOperations(interactions) {
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('BASIC INTERACTIONS READ OPERATIONS');
  console.log(SECTION_DIVIDER);
  
  try {
    // Get all interactions - basic read operation
    console.log('\n📋 Fetching all interactions...');
    const allInteractionsResult = await interactions.getAll();
    logResult('getAll()', allInteractionsResult, false);
    
    if (!allInteractionsResult[0] || !allInteractionsResult[2] || !allInteractionsResult[2].mrJson || allInteractionsResult[2].mrJson.length === 0) {
      console.log(`${INFO_PREFIX} No interactions found in repository yet`);
      console.log(`${INFO_PREFIX} This is expected for a fresh setup - CREATE operations will add data`);
      console.log(`${INFO_PREFIX} Skipping other read operation demonstrations`);
      return;
    }
    
    const allInteractions = allInteractionsResult[2].mrJson;
    console.log(`\n${SUCCESS_PREFIX} Interaction Summary:`);
    console.log(`  Total interactions: ${allInteractions.length}`);
    
    // Group by content type for analysis
    const contentTypeGroups = {};
    allInteractions.forEach(interaction => {
      const contentType = interaction.content_type || 'unknown';
      if (!contentTypeGroups[contentType]) {
        contentTypeGroups[contentType] = 0;
      }
      contentTypeGroups[contentType]++;
    });
    
    console.log(`\n${INFO_PREFIX} Interactions by content type:`);
    Object.keys(contentTypeGroups).forEach(type => {
      console.log(`  ${type}: ${contentTypeGroups[type]} interactions`);
    });
    
    // Find by name operation - exact match
    const sampleName = allInteractions[0].name;
    console.log(`\n🔍 Testing findByName with exact name: "${sampleName.substring(0, 50)}${sampleName.length > 50 ? '...' : ''}"...`);
    const interactionByName = await interactions.findByName(sampleName);
    logResult('findByName() [exact match]', interactionByName, false);
    
    if (interactionByName[0] && interactionByName[2] && interactionByName[2].length > 0) {
      const foundInteraction = interactionByName[2][0];
      console.log(`\n${SUCCESS_PREFIX} Found interaction details:`);
      console.log(`  Name: ${foundInteraction.name}`);
      console.log(`  Content Type: ${foundInteraction.content_type || 'N/A'}`);
      console.log(`  File Size: ${foundInteraction.file_size || 'N/A'}`);
      console.log(`  Reading Time: ${foundInteraction.reading_time || 'N/A'} minutes`);
      console.log(`  Page Count: ${foundInteraction.page_count || 'N/A'}`);
      console.log(`  Word Count: ${foundInteraction.word_count || 'N/A'}`);
      console.log(`  Description: ${(foundInteraction.description || 'N/A').substring(0, 100)}${foundInteraction.description && foundInteraction.description.length > 100 ? '...' : ''}`);
    }
    
    // Find by attribute operation - content type
    console.log('\n🔍 Testing findByX with content_type: \'application/pdf\'...');
    const pdfInteractions = await interactions.findByX('content_type', 'application/pdf');
    logResult('findByX(\'content_type\', \'application/pdf\')', pdfInteractions, false);
    
    if (pdfInteractions[0] && pdfInteractions[2] && pdfInteractions[2].length > 0) {
      console.log(`\n${SUCCESS_PREFIX} Found ${pdfInteractions[2].length} PDF interactions`);
      console.log(`  Sample PDF: "${pdfInteractions[2][0].name}"`);
    }
    
  } catch (error) {
    logger.error('Basic read operations failed', {
      error: error.message,
      stack: error.stack
    });
    console.error(`\n${ERROR_PREFIX} Error in basic read operations: ${error.message}`);
  }
}

/**
 * Demonstrates fuzzy search operations
 * @param {Interactions} interactions - Interactions instance
 */
async function demonstrateFuzzySearchOperations(interactions) {
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('FUZZY SEARCH OPERATIONS');
  console.log(SECTION_DIVIDER);
  
  try {
    // Get all interactions first to understand what data we have
    console.log('\n📋 Fetching all interactions for fuzzy search analysis...');
    const allInteractionsResult = await interactions.getAll();
    
    if (!allInteractionsResult[0] || !allInteractionsResult[2] || !allInteractionsResult[2].mrJson || allInteractionsResult[2].mrJson.length === 0) {
      console.log(`${ERROR_PREFIX} No interactions found - cannot demonstrate fuzzy search`);
      return;
    }
    
    const allInteractions = allInteractionsResult[2].mrJson;
    console.log(`\n${SUCCESS_PREFIX} Found ${allInteractions.length} interactions for fuzzy search testing`);
    
    // Display sample interaction names for reference
    console.log(`\n${INFO_PREFIX} Sample interaction names for reference:`);
    allInteractions.slice(0, 3).forEach((interaction, index) => {
      console.log(`  ${index + 1}. "${interaction.name}"`);
    });
    if (allInteractions.length > 3) {
      console.log(`  ...and ${allInteractions.length - 3} more interactions`);
    }
    
    // Test 1: Fuzzy search for "Confluence" (partial match)
    console.log(`\n${SECTION_DIVIDER}`);
    console.log('TEST 1: FUZZY SEARCH FOR "Confluence"');
    console.log(SECTION_DIVIDER);
    
    console.log('\n🔍 Testing fuzzy search for "Confluence"...');
    const confluenceResult = await interactions.findByName('Confluence', true);
    logResult('findByName("Confluence", true) [fuzzy]', confluenceResult, false);
    
    if (confluenceResult[0] && confluenceResult[2] && confluenceResult[2].length > 0) {
      console.log(`\n${SUCCESS_PREFIX} Fuzzy search found ${confluenceResult[2].length} results:`);
      confluenceResult[2].forEach((interaction, index) => {
        console.log(`  ${index + 1}. "${interaction.name}"`);
      });
    }
    
    // Test 2: Fuzzy search for "SharePoint" (partial match)
    console.log(`\n${SECTION_DIVIDER}`);
    console.log('TEST 2: FUZZY SEARCH FOR "SharePoint"');
    console.log(SECTION_DIVIDER);
    
    console.log('\n🔍 Testing fuzzy search for "SharePoint"...');
    const sharePointResult = await interactions.findByName('SharePoint', true);
    logResult('findByName("SharePoint", true) [fuzzy]', sharePointResult, false);
    
    if (sharePointResult[0] && sharePointResult[2] && sharePointResult[2].length > 0) {
      console.log(`\n${SUCCESS_PREFIX} Fuzzy search found ${sharePointResult[2].length} results:`);
      sharePointResult[2].forEach((interaction, index) => {
        console.log(`  ${index + 1}. "${interaction.name}"`);
      });
    }
    
    // Test 3: Fuzzy search using findByX with different attributes
    console.log(`\n${SECTION_DIVIDER}`);
    console.log('TEST 3: FUZZY SEARCH WITH DIFFERENT ATTRIBUTES');
    console.log(SECTION_DIVIDER);
    
    // Test fuzzy search on description attribute
    console.log('\n🔍 Testing fuzzy search on description for "team"...');
    const teamInDescriptionResult = await interactions.findByX('description', 'team', null, true);
    logResult('findByX("description", "team", null, true) [fuzzy]', teamInDescriptionResult, false);
    
    if (teamInDescriptionResult[0] && teamInDescriptionResult[2] && teamInDescriptionResult[2].length > 0) {
      console.log(`\n${SUCCESS_PREFIX} Fuzzy search on description found ${teamInDescriptionResult[2].length} results:`);
      teamInDescriptionResult[2].slice(0, 2).forEach((interaction, index) => {
        console.log(`  ${index + 1}. "${interaction.name}"`);
        console.log(`      Description: ${(interaction.description || 'N/A').substring(0, 100)}...`);
      });
    }
    
    // Test 4: Comparison between exact and fuzzy search
    console.log(`\n${SECTION_DIVIDER}`);
    console.log('TEST 4: EXACT vs FUZZY SEARCH COMPARISON');
    console.log(SECTION_DIVIDER);
    
    const searchTerm = 'Product';
    
    // Exact search
    console.log(`\n🔍 Exact search for "${searchTerm}"...`);
    const exactResult = await interactions.findByName(searchTerm, false);
    logResult(`findByName("${searchTerm}", false) [exact]`, exactResult, false);
    
    // Fuzzy search
    console.log(`\n🔍 Fuzzy search for "${searchTerm}"...`);
    const fuzzyResult = await interactions.findByName(searchTerm, true);
    logResult(`findByName("${searchTerm}", true) [fuzzy]`, fuzzyResult, false);
    
    // Compare results
    const exactCount = exactResult[0] && exactResult[2] ? exactResult[2].length : 0;
    const fuzzyCount = fuzzyResult[0] && fuzzyResult[2] ? fuzzyResult[2].length : 0;
    
    console.log(`\n${SUCCESS_PREFIX} Search comparison results:`);
    console.log(`  Exact search: ${exactCount} results`);
    console.log(`  Fuzzy search: ${fuzzyCount} results`);
    console.log(`  Difference: ${fuzzyCount - exactCount} additional results with fuzzy search`);
    
    if (fuzzyResult[0] && fuzzyResult[2] && fuzzyResult[2].length > 0) {
      console.log(`\n${INFO_PREFIX} Fuzzy search results for "${searchTerm}":`);
      fuzzyResult[2].slice(0, 3).forEach((interaction, index) => {
        console.log(`  ${index + 1}. "${interaction.name}"`);
      });
    }
    
  } catch (error) {
    logger.error('Fuzzy search operations failed', {
      error: error.message,
      stack: error.stack
    });
    console.error(`\n${ERROR_PREFIX} Error in fuzzy search operations: ${error.message}`);
  }
}

/**
 * Demonstrates interaction analysis and filtering
 * @param {Interactions} interactions - Interactions instance
 */
async function demonstrateAnalysisOperations(interactions) {
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('INTERACTION ANALYSIS AND FILTERING');
  console.log(SECTION_DIVIDER);
  
  try {
    // Get all interactions
    console.log('\n📊 Fetching all interactions for analysis...');
    const allInteractionsResult = await interactions.getAll();
    
    if (!allInteractionsResult[0] || !allInteractionsResult[2] || !allInteractionsResult[2].mrJson || allInteractionsResult[2].mrJson.length === 0) {
      console.log(`${ERROR_PREFIX} No interactions found - cannot perform analysis`);
      return;
    }
    
    const allInteractions = allInteractionsResult[2].mrJson;
    
    // Content type analysis
    console.log(`\n${INFO_PREFIX} Content Type Analysis:`);
    const contentTypes = {};
    allInteractions.forEach(interaction => {
      const type = interaction.content_type || 'unknown';
      contentTypes[type] = (contentTypes[type] || 0) + 1;
    });
    
    Object.keys(contentTypes).forEach(type => {
      console.log(`  ${type}: ${contentTypes[type]} interactions`);
    });
    
    // File size analysis
    console.log(`\n${INFO_PREFIX} File Size Analysis:`);
    const fileSizes = allInteractions
      .filter(i => i.file_size)
      .map(i => parseFloat(i.file_size.replace(/[^0-9.]/g, '')))
      .filter(size => !isNaN(size));
    
    if (fileSizes.length > 0) {
      const avgSize = fileSizes.reduce((sum, size) => sum + size, 0) / fileSizes.length;
      const maxSize = Math.max(...fileSizes);
      const minSize = Math.min(...fileSizes);
      
      console.log(`  Average file size: ${avgSize.toFixed(2)} KB`);
      console.log(`  Largest file: ${maxSize.toFixed(2)} KB`);
      console.log(`  Smallest file: ${minSize.toFixed(2)} KB`);
    }
    
    // Reading time analysis
    console.log(`\n${INFO_PREFIX} Reading Time Analysis:`);
    const readingTimes = allInteractions
      .filter(i => i.reading_time && !isNaN(i.reading_time))
      .map(i => parseInt(i.reading_time));
    
    if (readingTimes.length > 0) {
      const avgTime = readingTimes.reduce((sum, time) => sum + time, 0) / readingTimes.length;
      const maxTime = Math.max(...readingTimes);
      const minTime = Math.min(...readingTimes);
      
      console.log(`  Average reading time: ${avgTime.toFixed(1)} minutes`);
      console.log(`  Longest read: ${maxTime} minutes`);
      console.log(`  Shortest read: ${minTime} minutes`);
    }
    
    // Organization analysis
    console.log(`\n${INFO_PREFIX} Organization Analysis:`);
    const organizations = {};
    allInteractions.forEach(interaction => {
      const org = interaction.organization || 'unknown';
      organizations[org] = (organizations[org] || 0) + 1;
    });
    
    Object.keys(organizations).forEach(org => {
      console.log(`  ${org}: ${organizations[org]} interactions`);
    });
    
    // Find interactions by specific criteria
    console.log(`\n${SECTION_DIVIDER}`);
    console.log('FILTERING DEMONSTRATIONS');
    console.log(SECTION_DIVIDER);
    
    // Find long-form content (high reading time)
    console.log('\n🔍 Finding long-form content (>10 minutes reading time)...');
    const longFormInteractions = allInteractions.filter(i => 
      i.reading_time && parseInt(i.reading_time) > 10
    );
    
    console.log(`${SUCCESS_PREFIX} Found ${longFormInteractions.length} long-form interactions:`);
    longFormInteractions.slice(0, 3).forEach((interaction, index) => {
      console.log(`  ${index + 1}. "${interaction.name}" (${interaction.reading_time} min)`);
    });
    
    // Find recent interactions (created in the last year)
    console.log('\n🔍 Finding recent interactions (created in 2024)...');
    const recentInteractions = allInteractions.filter(i => 
      i.creation_date && i.creation_date.includes('2024')
    );
    
    console.log(`${SUCCESS_PREFIX} Found ${recentInteractions.length} recent interactions (2024):`);
    recentInteractions.slice(0, 3).forEach((interaction, index) => {
      console.log(`  ${index + 1}. "${interaction.name}" (${interaction.creation_date})`);
    });
    
    // Find interactions with linked companies
    console.log('\n🔍 Finding interactions with linked companies...');
    const linkedInteractions = allInteractions.filter(i => 
      i.linked_companies && Object.keys(i.linked_companies).length > 0
    );
    
    console.log(`${SUCCESS_PREFIX} Found ${linkedInteractions.length} interactions with linked companies:`);
    linkedInteractions.slice(0, 3).forEach((interaction, index) => {
      const companyNames = Object.keys(interaction.linked_companies);
      console.log(`  ${index + 1}. "${interaction.name}" (linked to: ${companyNames.join(', ')})`);
    });
    
  } catch (error) {
    logger.error('Analysis operations failed', {
      error: error.message,
      stack: error.stack
    });
    console.error(`\n${ERROR_PREFIX} Error in analysis operations: ${error.message}`);
  }
}

/**
 * Demonstrates metadata exploration
 * @param {Interactions} interactions - Interactions instance
 */
async function demonstrateMetadataOperations(interactions) {
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('METADATA EXPLORATION');
  console.log(SECTION_DIVIDER);
  
  try {
    // Get all interactions
    console.log('\n📋 Fetching all interactions for metadata exploration...');
    const allInteractionsResult = await interactions.getAll();
    
    if (!allInteractionsResult[0] || !allInteractionsResult[2] || !allInteractionsResult[2].mrJson || allInteractionsResult[2].mrJson.length === 0) {
      console.log(`${ERROR_PREFIX} No interactions found - cannot explore metadata`);
      return;
    }
    
    const allInteractions = allInteractionsResult[2].mrJson;
    
    // Explore a sample interaction's metadata
    const sampleInteraction = allInteractions[0];
    console.log(`\n${INFO_PREFIX} Sample interaction metadata for: "${sampleInteraction.name}"`);
    
    // Core metadata
    console.log('\n📊 Core Metadata:');
    console.log(`  Content Type: ${sampleInteraction.content_type || 'N/A'}`);
    console.log(`  File Size: ${sampleInteraction.file_size || 'N/A'}`);
    console.log(`  Reading Time: ${sampleInteraction.reading_time || 'N/A'} minutes`);
    console.log(`  Word Count: ${sampleInteraction.word_count || 'N/A'}`);
    console.log(`  Page Count: ${sampleInteraction.page_count || 'N/A'}`);
    console.log(`  Status: ${sampleInteraction.status || 'N/A'}`);
    
    // Geographic metadata
    console.log('\n🌍 Geographic Metadata:');
    console.log(`  Country: ${sampleInteraction.country || 'N/A'}`);
    console.log(`  Region: ${sampleInteraction.region || 'N/A'}`);
    console.log(`  City: ${sampleInteraction.city || 'N/A'}`);
    console.log(`  State/Province: ${sampleInteraction.state_province || 'N/A'}`);
    console.log(`  Latitude: ${sampleInteraction.latitude || 'N/A'}`);
    console.log(`  Longitude: ${sampleInteraction.longitude || 'N/A'}`);
    
    // Interaction type details
    console.log('\n📄 Interaction Type Details:');
    if (sampleInteraction.interaction_type_detail) {
      Object.keys(sampleInteraction.interaction_type_detail).forEach(key => {
        console.log(`  ${key}: ${sampleInteraction.interaction_type_detail[key] || 'N/A'}`);
      });
    } else {
      console.log('  No interaction type details available');
    }
    
    // Tags analysis
    console.log('\n🏷️ Tags Analysis:');
    if (sampleInteraction.tags && Object.keys(sampleInteraction.tags).length > 0) {
      const tagEntries = Object.entries(sampleInteraction.tags);
      console.log(`  Total tags: ${tagEntries.length}`);
      console.log('  Top tags:');
      tagEntries
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .forEach(([tag, score]) => {
          console.log(`    ${tag}: ${score.toFixed(2)}`);
        });
    } else {
      console.log('  No tags available');
    }
    
    // Topics analysis
    console.log('\n💡 Topics Analysis:');
    if (sampleInteraction.topics && Object.keys(sampleInteraction.topics).length > 0) {
      const topicEntries = Object.entries(sampleInteraction.topics);
      console.log(`  Total topics: ${topicEntries.length}`);
      console.log('  Sample topics:');
      topicEntries.slice(0, 3).forEach(([topicId, topicData]) => {
        console.log(`    Topic ${topicId}: ${topicData.frequency} occurrences`);
        console.log(`      Keywords: ${topicData.keywords?.slice(0, 5).join(', ') || 'N/A'}`);
      });
    } else {
      console.log('  No topics available');
    }
    
    // Linked entities
    console.log('\n🔗 Linked Entities:');
    console.log(`  Linked Companies: ${Object.keys(sampleInteraction.linked_companies || {}).length}`);
    console.log(`  Linked Studies: ${Object.keys(sampleInteraction.linked_studies || {}).length}`);
    
    if (sampleInteraction.linked_companies && Object.keys(sampleInteraction.linked_companies).length > 0) {
      console.log('  Company names:');
      Object.keys(sampleInteraction.linked_companies).forEach(company => {
        console.log(`    - ${company}`);
      });
    }
    
    // Temporal metadata
    console.log('\n⏰ Temporal Metadata:');
    console.log(`  Creation Date: ${sampleInteraction.creation_date || 'N/A'}`);
    console.log(`  Modification Date: ${sampleInteraction.modification_date || 'N/A'}`);
    
    // Access and permissions
    console.log('\n🔐 Access and Permissions:');
    console.log(`  Public: ${sampleInteraction.public || 'N/A'}`);
    console.log(`  Groups: ${sampleInteraction.groups || 'N/A'}`);
    console.log(`  Creator: ${sampleInteraction.creator_name || 'N/A'}`);
    console.log(`  Creator ID: ${sampleInteraction.creator_id || 'N/A'}`);
    
  } catch (error) {
    logger.error('Metadata operations failed', {
      error: error.message,
      stack: error.stack
    });
    console.error(`\n${ERROR_PREFIX} Error in metadata operations: ${error.message}`);
  }
}

/**
 * Demonstrates branch status operations
 * @param {Interactions} interactions - Interactions instance
 * @param {string} org - GitHub organization
 */
async function demonstrateBranchOperations(interactions, org) {
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('BRANCH STATUS OPERATIONS');
  console.log(SECTION_DIVIDER);
  
  try {
    // Create the repository name by appending "_discovery" to the org name
    const discoveryRepo = `${org}_discovery`;
    
    // Get branch status for the discovery repository
    console.log('\n📊 Fetching branch status for the discovery repository...');
    console.log(`(Using: branch="main", repo="${discoveryRepo}")`);
    const branchStatus = await interactions.getBranchStatus('main', discoveryRepo);
    logResult('getBranchStatus(\'main\', discoveryRepo)', branchStatus, false);
    
    if (branchStatus[0] && branchStatus[2]) {
      const statusData = branchStatus[2];
      console.log(`\n${SUCCESS_PREFIX} Branch Status Details:`);
      console.log(`  Repository: ${statusData.repository}`);
      console.log(`  Branch: ${statusData.branch}`);
      console.log(`  Latest Commit SHA: ${statusData.sha.substring(0, 8)}...`);
      console.log(`  Commit Message: ${statusData.commit.message}`);
      console.log(`  Author: ${statusData.commit.author.name} <${statusData.commit.author.email}>`);
      console.log(`  Commit Date: ${statusData.commit.committer.date}`);
      console.log(`  GitHub URL: ${statusData.html_url}`);
      
      // Demonstrate checkForUpdates
      console.log(`\n${SECTION_DIVIDER}`);
      console.log('UPDATE CHECKING DEMONSTRATION');
      console.log(SECTION_DIVIDER);
      
      const currentSha = statusData.sha;
      
      // Check for updates using current SHA (should show no updates)
      console.log('\n🔍 Checking for updates with current SHA (should show no updates needed)...');
      const upToDate = await interactions.checkForUpdates(currentSha, 'main', discoveryRepo);
      logResult('checkForUpdates(currentSha)', upToDate, false);
      
      // Check for updates using an old SHA (should show updates needed)
      console.log('\n🔍 Checking for updates with outdated SHA (should show updates needed)...');
      const needsUpdate = await interactions.checkForUpdates('0000000000000000000000000000000000000000', 'main', discoveryRepo);
      logResult('checkForUpdates(\'0000...\')', needsUpdate, false);
      
      // Show practical usage example
      console.log(`\n${INFO_PREFIX} Practical Usage Example:`);
      console.log('```javascript');
      console.log('// Client-side synchronization pattern');
      console.log('async function syncInteractions() {');
      console.log('  const lastKnownSha = localStorage.getItem(\'lastCommitSha\');');
      console.log('  ');
      console.log('  const updateCheck = await interactions.checkForUpdates(');
      console.log(`    lastKnownSha, 'main', '${discoveryRepo}'`);
      console.log('  );');
      console.log('  ');
      console.log('  if (updateCheck[0] && updateCheck[2].updateNeeded) {');
      console.log('    console.log(\'New data available, fetching...\');');
      console.log('    const latestData = await interactions.getAll();');
      console.log('    localStorage.setItem(\'lastCommitSha\', updateCheck[2].currentCommitSha);');
      console.log('    return latestData;');
      console.log('  } else {');
      console.log('    console.log(\'Using cached data\');');
      console.log('    return getCachedData();');
      console.log('  }');
      console.log('}');
      console.log('```');
    }
    
  } catch (error) {
    logger.error('Branch operations failed', {
      error: error.message,
      stack: error.stack
    });
    console.error(`\n${ERROR_PREFIX} Error in branch operations: ${error.message}`);
  }
}

/**
 * Helper function to create sample interactions with file uploads
 * @param {Interactions} interactions - Interactions instance
 * @param {Array} sampleInteractions - Array of interaction objects to create
 * @param {string} operationDescription - Description for logging
 */
async function createInteractionsWithFiles(interactions, sampleInteractions, operationDescription) {
  const tracker = logger.trackOperation ? 
    logger.trackOperation('createInteractionsWithFiles', operationDescription) : 
    { end: () => {} };
    
  try {
    logger.info('Starting interaction creation using container pattern', {
      operation: operationDescription,
      interactionCount: sampleInteractions.length
    });
    
    console.log(`\n${INFO_PREFIX} Starting ${operationDescription} creation using container pattern...`);
    console.log(`${INFO_PREFIX} Interactions to create: ${sampleInteractions.length}`);
    
    // Add file paths to interactions
    const interactionsWithFiles = sampleInteractions.map(interaction => {
      const interactionCopy = { ...interaction };
      
      // If url exists, derive the file path
      if (interaction.url && interaction.url.startsWith('Interactions/')) {
        const fileName = interaction.url.replace('Interactions/', '');
        const filePath = path.join(__dirname, 'sample_data', 'interactions_files', fileName);
        
        // Check if file exists
        if (fs.existsSync(filePath)) {
          interactionCopy.filePath = filePath;
          interactionCopy.fileName = fileName;
        }
      }
      
      return interactionCopy;
    });
    
    // Use the createObj method which handles the full workflow
    const createResult = await interactions.createObj(interactionsWithFiles);
    
    if (createResult[0]) {
      logger.info('Interaction creation completed successfully', {
        operation: operationDescription,
        interactionCount: sampleInteractions.length,
        workflowData: createResult[2]
      });
      
      console.log(`\n${SUCCESS_PREFIX} ${operationDescription} creation completed successfully!`);
      console.log(`${SUCCESS_PREFIX} Created ${sampleInteractions.length} interactions`);
      
      // Show workflow details if available
      const workflowData = createResult[2];
      if (workflowData && workflowData.containers) {
        console.log(`\n${INFO_PREFIX} Workflow Details:`);
        console.log('   - Containers processed: ' + Object.keys(workflowData.containers).join(', '));
        if (workflowData.containers.interactions) {
          console.log('   - Interactions container updated');
        }
        if (workflowData.containers.companies) {
          console.log('   - Companies container updated with links');
        }
      }
      
      // List the created interactions
      console.log(`\n${INFO_PREFIX} Created interactions:`);
      sampleInteractions.forEach((interaction, index) => {
        const hasFile = interaction.url ? ' (with file)' : '';
        console.log(`  ${index + 1}. ${interaction.name}${hasFile}`);
      });
      
    } else {
      logger.error('Interaction creation failed', {
        operation: operationDescription,
        interactionCount: sampleInteractions.length,
        error: createResult[1],
        errorData: createResult[2]
      });
      
      console.error(`\n${ERROR_PREFIX} ${operationDescription} creation failed`);
      console.error(`Error: ${createResult[1]?.status_msg || createResult[1]}`);
      
      if (createResult[2]) {
        console.error('\nDetailed error information:');
        console.error(JSON.stringify(createResult[2], null, 2));
      }
    }
    
  } catch (error) {
    logger.error('Error during interaction creation', {
      operation: operationDescription,
      interactionCount: sampleInteractions.length,
      error: error.message,
      stack: error.stack
    });
    
    console.error(`\n${ERROR_PREFIX} Error during ${operationDescription} creation:`, error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  } finally {
    tracker.end();
  }
}

/**
 * Demonstrates Interactions CREATE operations
 * @param {Interactions} interactions - Interactions instance
 * @param {Array} sampleInteractions - Sample interactions data
 */
async function demonstrateInteractionsCreateOperations(interactions, sampleInteractions) {
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('INTERACTIONS CREATE OPERATIONS');
  console.log(SECTION_DIVIDER);
  
  try {
    // Get existing interactions to avoid duplicates
    const existingInteractionsResult = await interactions.getAll();
    let existingInteractionNames = [];
    
    if (existingInteractionsResult[0] && existingInteractionsResult[2] && existingInteractionsResult[2].mrJson) {
      existingInteractionNames = existingInteractionsResult[2].mrJson.map(interaction => interaction.name);
      console.log(`\n${INFO_PREFIX} Found ${existingInteractionNames.length} existing interactions`);
    } else {
      console.log('\n${INFO_PREFIX} No existing interactions found (or container doesn\'t exist yet)');
    }
    
    // Filter out interactions that already exist
    const interactionsToCreate = sampleInteractions.filter(interaction => 
      !existingInteractionNames.includes(interaction.name)
    );
    
    if (interactionsToCreate.length === 0) {
      console.log('\n✅ All sample interactions already exist. Nothing to create.');
      return;
    }
    
    // Step 1: Create first 2 test interactions
    const testInteractions = interactionsToCreate.slice(0, 2);
    if (testInteractions.length > 0) {
      console.log(`\n${INFO_PREFIX} Step 1: Create test interactions`);
      console.log(`${INFO_PREFIX} First ${testInteractions.length} test interactions to create:`);
      testInteractions.forEach((interaction, index) => {
        console.log(`  ${index + 1}. ${interaction.name}`);
      });
      
      const testConfirmed = await confirmAction(`Create ${testInteractions.length} test interactions?`);
      
      if (testConfirmed) {
        await createInteractionsWithFiles(interactions, testInteractions, 'test interactions');
      } else {
        console.log('\nTest interaction creation skipped.');
      }
    } else {
      console.log(`\n${INFO_PREFIX} No test interactions to create (first 2 already exist).`);
    }
    
    // Step 2: Create remaining interactions
    const remainingInteractions = interactionsToCreate.slice(2);
    if (remainingInteractions.length > 0) {
      console.log(`\n${INFO_PREFIX} Step 2: Create remaining interactions`);
      console.log(`${INFO_PREFIX} ${remainingInteractions.length} remaining interactions to create:`);
      remainingInteractions.slice(0, 3).forEach((interaction, index) => {
        console.log(`  ${index + 1}. ${interaction.name}`);
      });
      if (remainingInteractions.length > 3) {
        console.log(`  ... and ${remainingInteractions.length - 3} more`);
      }
      
      const remainingConfirmed = await confirmAction(`Create ${remainingInteractions.length} remaining interactions?`);
      
      if (remainingConfirmed) {
        await createInteractionsWithFiles(interactions, remainingInteractions, 'remaining interactions');
      } else {
        console.log('\nRemaining interaction creation skipped.');
      }
    } else {
      console.log(`\n${INFO_PREFIX} No remaining interactions to create (all already exist).`);
    }
    
  } catch (error) {
    logger.error('Interactions CREATE operations failed', {
      error: error.message,
      stack: error.stack
    });
    console.error('\n❌ Error in Interactions CREATE operations:', error.message);
  }
}

/**
 * Demonstrates Interactions UPDATE operations
 * @param {Interactions} interactions - Interactions instance
 */
async function demonstrateInteractionsUpdateOperations(interactions) {
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('INTERACTIONS UPDATE OPERATIONS');
  console.log(SECTION_DIVIDER);
  
  try {
    // Get all interactions to find one to update
    console.log('\n🔍 Finding interactions to update...');
    const allInteractionsResult = await interactions.getAll();
    
    if (!allInteractionsResult[0] || !allInteractionsResult[2] || !allInteractionsResult[2].mrJson || allInteractionsResult[2].mrJson.length === 0) {
      console.log(`${ERROR_PREFIX} No interactions found to update`);
      return;
    }
    
    const allInteractions = allInteractionsResult[2].mrJson;
    console.log(`${SUCCESS_PREFIX} Found ${allInteractions.length} interactions`);
    
    // Pick the first interaction to update
    const interactionToUpdate = allInteractions[0];
    console.log(`\n${INFO_PREFIX} Selected interaction to update: "${interactionToUpdate.name}"`);
    
    // Update test 1: Modify description
    console.log(`\n${SECTION_DIVIDER}`);
    console.log('UPDATE TEST 1: MODIFY DESCRIPTION');
    console.log(SECTION_DIVIDER);
    
    const confirmed = await confirmAction(`Update description for "${interactionToUpdate.name}"?`);
    
    if (confirmed) {
      const originalDescription = interactionToUpdate.description;
      const updatedInteraction = {
        ...interactionToUpdate,
        description: `${originalDescription} [Updated on ${new Date().toISOString()}]`,
        modification_date: new Date().toISOString()
      };
      
      console.log(`\n${INFO_PREFIX} Updating interaction description...`);
      const updateResult = await interactions.updateObj(updatedInteraction);
      logResult('updateObj() [description update]', updateResult, false);
      
      if (updateResult[0]) {
        console.log(`${SUCCESS_PREFIX} Description updated successfully`);
        console.log(`${INFO_PREFIX} Original: ${originalDescription.substring(0, 100)}...`);
        console.log(`${INFO_PREFIX} Updated: ${updatedInteraction.description.substring(0, 100)}...`);
      }
    } else {
      console.log('\nUpdate operation skipped.');
    }
    
    // Update test 2: Add/modify tags
    console.log(`\n${SECTION_DIVIDER}`);
    console.log('UPDATE TEST 2: MODIFY TAGS');
    console.log(SECTION_DIVIDER);
    
    const tagsConfirmed = await confirmAction(`Add/modify tags for "${interactionToUpdate.name}"?`);
    
    if (tagsConfirmed) {
      const updatedInteraction = {
        ...interactionToUpdate,
        tags: {
          ...interactionToUpdate.tags,
          'updated-tag': 5.0,
          'example-tag': 3.5
        },
        modification_date: new Date().toISOString()
      };
      
      console.log(`\n${INFO_PREFIX} Updating interaction tags...`);
      const updateResult = await interactions.updateObj(updatedInteraction);
      logResult('updateObj() [tags update]', updateResult, false);
      
      if (updateResult[0]) {
        console.log(`${SUCCESS_PREFIX} Tags updated successfully`);
        console.log(`${INFO_PREFIX} Added tags: updated-tag (5.0), example-tag (3.5)`);
      }
    } else {
      console.log('\nTags update operation skipped.');
    }
    
    // Update test 3: Modify company links
    console.log(`\n${SECTION_DIVIDER}`);
    console.log('UPDATE TEST 3: MODIFY COMPANY LINKS');
    console.log(SECTION_DIVIDER);
    
    const linksConfirmed = await confirmAction(`Update company links for "${interactionToUpdate.name}"?`);
    
    if (linksConfirmed) {
      // Get available companies
      const companies = new Companies(interactions.token, interactions.org, 'update-test');
      const companiesResult = await companies.getAll();
      
      if (companiesResult[0] && companiesResult[2] && companiesResult[2].mrJson && companiesResult[2].mrJson.length > 0) {
        const availableCompanies = companiesResult[2].mrJson;
        const companyToLink = availableCompanies[0];
        
        const updatedInteraction = {
          ...interactionToUpdate,
          linked_companies: {
            ...interactionToUpdate.linked_companies,
            [companyToLink.name]: crypto.createHash('sha256').update(companyToLink.name).digest('hex')
          },
          modification_date: new Date().toISOString()
        };
        
        console.log(`\n${INFO_PREFIX} Linking to company: ${companyToLink.name}`);
        const updateResult = await interactions.updateObj(updatedInteraction);
        logResult('updateObj() [company links update]', updateResult, false);
        
        if (updateResult[0]) {
          console.log(`${SUCCESS_PREFIX} Company links updated successfully`);
          console.log(`${INFO_PREFIX} Linked to: ${companyToLink.name}`);
        }
      } else {
        console.log(`${WARNING_PREFIX} No companies available to link to`);
      }
    } else {
      console.log('\nCompany links update operation skipped.');
    }
    
  } catch (error) {
    logger.error('Interactions UPDATE operations failed', {
      error: error.message,
      stack: error.stack
    });
    console.error('\n❌ Error in Interactions UPDATE operations:', error.message);
  }
}

/**
 * Demonstrates Interactions DELETE operations
 * @param {Interactions} interactions - Interactions instance
 */
async function demonstrateInteractionsDeleteOperations(interactions) {
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('INTERACTIONS DELETE OPERATIONS');
  console.log(SECTION_DIVIDER);
  
  try {
    // Get all interactions to find ones to delete
    console.log('\n🔍 Finding interactions to delete...');
    const allInteractionsResult = await interactions.getAll();
    
    if (!allInteractionsResult[0] || !allInteractionsResult[2] || !allInteractionsResult[2].mrJson || allInteractionsResult[2].mrJson.length === 0) {
      console.log(`${ERROR_PREFIX} No interactions found to delete`);
      return;
    }
    
    const allInteractions = allInteractionsResult[2].mrJson;
    console.log(`${SUCCESS_PREFIX} Found ${allInteractions.length} interactions`);
    
    // Find interactions that might be safe to delete (look for test interactions)
    const testInteractions = allInteractions.filter(interaction => 
      interaction.name.toLowerCase().includes('test') || 
      interaction.description?.toLowerCase().includes('test') ||
      interaction.description?.toLowerCase().includes('updated on')
    );
    
    if (testInteractions.length === 0) {
      console.log(`${WARNING_PREFIX} No test interactions found to safely delete`);
      console.log(`${INFO_PREFIX} Available interactions:`);
      allInteractions.slice(0, 3).forEach((interaction, index) => {
        console.log(`  ${index + 1}. ${interaction.name}`);
      });
      
      const confirmed = await confirmAction(`Delete the first interaction "${allInteractions[0].name}"?`);
      
      if (confirmed) {
        await performDeleteOperation(interactions, allInteractions[0]);
      } else {
        console.log('\nDelete operation skipped.');
      }
      return;
    }
    
    console.log(`\n${INFO_PREFIX} Found ${testInteractions.length} test interactions that can be safely deleted:`);
    testInteractions.forEach((interaction, index) => {
      console.log(`  ${index + 1}. ${interaction.name}`);
    });
    
    // Delete test 1: Delete first test interaction
    console.log(`\n${SECTION_DIVIDER}`);
    console.log('DELETE TEST 1: DELETE TEST INTERACTION');
    console.log(SECTION_DIVIDER);
    
    const interactionToDelete = testInteractions[0];
    const confirmed = await confirmAction(`Delete interaction "${interactionToDelete.name}"?`);
    
    if (confirmed) {
      await performDeleteOperation(interactions, interactionToDelete);
    } else {
      console.log('\nDelete operation skipped.');
    }
    
    // Delete test 2: Bulk delete if multiple test interactions
    if (testInteractions.length > 1) {
      console.log(`\n${SECTION_DIVIDER}`);
      console.log('DELETE TEST 2: BULK DELETE TEST INTERACTIONS');
      console.log(SECTION_DIVIDER);
      
      const remainingTestInteractions = testInteractions.slice(1);
      console.log(`${INFO_PREFIX} ${remainingTestInteractions.length} remaining test interactions:`);
      remainingTestInteractions.forEach((interaction, index) => {
        console.log(`  ${index + 1}. ${interaction.name}`);
      });
      
      const bulkConfirmed = await confirmAction(`Delete all ${remainingTestInteractions.length} remaining test interactions?`);
      
      if (bulkConfirmed) {
        for (const interaction of remainingTestInteractions) {
          await performDeleteOperation(interactions, interaction);
        }
      } else {
        console.log('\nBulk delete operation skipped.');
      }
    }
    
  } catch (error) {
    logger.error('Interactions DELETE operations failed', {
      error: error.message,
      stack: error.stack
    });
    console.error('\n❌ Error in Interactions DELETE operations:', error.message);
  }
}

/**
 * Helper function to perform delete operation
 * @param {Interactions} interactions - Interactions instance
 * @param {Object} interaction - Interaction to delete
 */
async function performDeleteOperation(interactions, interaction) {
  console.log(`\n${INFO_PREFIX} Deleting interaction: "${interaction.name}"`);
  
  // Show what will be deleted
  console.log(`${INFO_PREFIX} Interaction details:`);
  console.log(`  - Name: ${interaction.name}`);
  console.log(`  - File: ${interaction.url || 'No file'}`);
  console.log(`  - Linked companies: ${Object.keys(interaction.linked_companies || {}).length}`);
  
  const deleteResult = await interactions.deleteObj(interaction.name);
  logResult('deleteObj() [interaction deletion]', deleteResult, false);
  
  if (deleteResult[0]) {
    console.log(`${SUCCESS_PREFIX} Interaction deleted successfully`);
    console.log(`${INFO_PREFIX} Deleted: ${interaction.name}`);
    
    // Show what was cleaned up
    const deletionData = deleteResult[2];
    if (deletionData && deletionData.containers) {
      console.log(`${INFO_PREFIX} Cleanup completed:`);
      console.log('  - Interaction removed from container');
      console.log('  - File deleted (if existed)');
      console.log('  - Company links removed');
    }
  }
}

/**
 * Demonstrates Interactions operations
 * @param {string} token - GitHub token
 * @param {string} org - GitHub organization
 * @param {Array<string>} operations - Specific operations to run
 */
async function demonstrateInteractionsOperations(token, org, operations) {
  const operationTracker = logger.trackTransaction('github-interactions-operations');
  
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('INTERACTIONS OPERATIONS');
  console.log(SECTION_DIVIDER);
  
  try {
    logger.debug('Starting Interactions operations', { organization: org, operations });
    
    // Initialize Interactions entity class
    const interactions = new Interactions(token, org, 'interactions-operations-example');
    const runAll = operations.length === 0;
    
    // BASIC READ Operations
    if (runAll || operations.includes('basic')) {
      await demonstrateBasicReadOperations(interactions);
    }
    
    // FUZZY SEARCH Operations
    if (runAll || operations.includes('fuzzy')) {
      await demonstrateFuzzySearchOperations(interactions);
    }
    
    // ANALYSIS Operations
    if (runAll || operations.includes('analysis')) {
      await demonstrateAnalysisOperations(interactions);
    }
    
    // METADATA Operations
    if (runAll || operations.includes('metadata')) {
      await demonstrateMetadataOperations(interactions);
    }
    
    // BRANCH Operations
    if (runAll || operations.includes('branch')) {
      await demonstrateBranchOperations(interactions, org);
    }
    
    // CREATE Operations
    if (runAll || operations.includes('create')) {
      // Load sample interaction data
      const sampleDataPath = path.join(__dirname, 'sample_data', 'interactions.json');
      console.log(`\n${INFO_PREFIX} Loading sample interaction data from: ${sampleDataPath}`);
      
      if (!fs.existsSync(sampleDataPath)) {
        console.error(`${ERROR_PREFIX} Sample data file not found: ${sampleDataPath}`);
        console.log(`${INFO_PREFIX} Please ensure the sample_data/interactions.json file exists`);
        return;
      }
      
      const sampleInteractions = JSON.parse(fs.readFileSync(sampleDataPath, 'utf8'));
      
      // Filter to only those with files for testing
      const interactionsWithFiles = sampleInteractions.filter(interaction => 
        interaction.url && interaction.url.startsWith('Interactions/')
      );
      
      console.log(`${SUCCESS_PREFIX} Loaded ${sampleInteractions.length} sample interactions`);
      console.log(`${INFO_PREFIX} Found ${interactionsWithFiles.length} interactions with files`);
      
      // Use first 4 interactions for testing
      const testInteractions = interactionsWithFiles.slice(0, 4);
      
      await demonstrateInteractionsCreateOperations(interactions, testInteractions);
    }
    
    // UPDATE Operations
    if (runAll || operations.includes('update')) {
      await demonstrateInteractionsUpdateOperations(interactions);
    }
    
    // DELETE Operations
    if (runAll || operations.includes('delete')) {
      await demonstrateInteractionsDeleteOperations(interactions);
    }
    
  } catch (error) {
    logger.error('Error in Interactions operations', {
      organization: org,
      operations,
      error: error.message,
      stack: error.stack
    });
    console.error(`\n${ERROR_PREFIX} Error in Interactions operations: ${error.message}`);
  } finally {
    operationTracker.end();
  }
}

/**
 * Main function to run the interactions example
 */
async function main() {
  console.log(`${SECTION_DIVIDER}`);
  console.log('MEDIUMROAST API - INTERACTIONS OPERATIONS EXAMPLE');
  console.log(`${SECTION_DIVIDER}`);
  
  try {
    // Load configuration
    const config = new ConfigParser();
    const configPath = path.join(__dirname, 'config.ini');
    
    if (!fs.existsSync(configPath)) {
      console.error(`${ERROR_PREFIX} Configuration file not found: ${configPath}`);
      console.log(`${INFO_PREFIX} Please create a config.ini file with your GitHub token and organization.`);
      console.log(`${INFO_PREFIX} Example config.ini:`);
      console.log('[GitHub]');
      console.log('token = YOUR_GITHUB_TOKEN');
      console.log('org = YOUR_ORGANIZATION_NAME');
      return;
    }
    
    config.read(configPath);
    const token = config.get('GitHub', 'token');
    const org = config.get('GitHub', 'org');
    
    if (!token || !org) {
      console.error(`${ERROR_PREFIX} Missing GitHub token or organization in config.ini`);
      return;
    }
    
    logger.info('Starting GitHub Interactions example', { organization: org });
    
    // Check prerequisites
    const prerequisitesPassed = await checkPrerequisites(token, org);
    
    if (!prerequisitesPassed) {
      console.log(`\n${ERROR_PREFIX} Prerequisites not met. Please resolve the issues above before running the example.`);
      return;
    }
    
    // Get command-line arguments to determine which operations to run
    const args = process.argv.slice(2);
    console.log(`\n${INFO_PREFIX} Operations to run: ${args.length === 0 ? 'all' : args.join(', ')}`);
    
    // Run the demonstrations
    await demonstrateInteractionsOperations(token, org, args);
    
    console.log(`\n${SECTION_DIVIDER}`);
    console.log(`${SUCCESS_PREFIX} Example completed successfully!`);
    console.log(`${INFO_PREFIX} You can run specific operations by passing arguments:`);
    console.log(`${INFO_PREFIX} node examples/github-interactions.js basic fuzzy analysis metadata branch create update delete`);
    console.log(`${INFO_PREFIX} Available operations:`);
    console.log(`${INFO_PREFIX} - basic: Basic read operations (getAll, findByName)`);
    console.log(`${INFO_PREFIX} - fuzzy: Fuzzy search demonstrations`);
    console.log(`${INFO_PREFIX} - analysis: Interaction analysis and filtering`);
    console.log(`${INFO_PREFIX} - metadata: Content type and metadata exploration`);
    console.log(`${INFO_PREFIX} - branch: Branch status operations`);
    console.log(`${INFO_PREFIX} - create: Create interactions with file uploads and company linking`);
    console.log(`${INFO_PREFIX} - update: Update interactions with file handling and company linking`);
    console.log(`${INFO_PREFIX} - delete: Delete interactions with file cleanup and company unlinking`);
    
  } catch (error) {
    logger.error('Unhandled error in GitHub Interactions example', {
      error: error.message,
      stack: error.stack
    });
    console.error(`\n${ERROR_PREFIX} An error occurred while running the example:`);
    console.error(`  ${error.message}`);
    console.error(`\n${INFO_PREFIX} Stack trace:`);
    console.error(error.stack);
  }
}

// Run the example
main().catch(error => {
  logger.error('Unhandled error in GitHub Interactions example', {
    error: error.message,
    stack: error.stack
  });
  console.error('Unhandled error:', error);
  process.exit(1);
});
