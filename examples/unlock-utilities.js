/**
 * Unlock utilities for development and debugging
 * @author Michael Hay <michael.hay@mediumroast.io>
 * @file unlock-utilities.js
 * @license Apache-2.0
 * @version 3.0.0
 * @copyright 2025 Mediumroast, Inc. All rights reserved.
 * 
 * This utility provides functions to unlock containers and clear stuck locks
 * that can occur during development when transactions fail or are interrupted.
 * 
 * Common scenarios where unlocking is needed:
 * - Transaction failures that don't properly release containers
 * - Interrupted operations (Ctrl+C during execution)
 * - Development errors that leave containers in locked state
 * - Testing scenarios where cleanup is needed
 * 
 * Usage:
 * node examples/unlock-utilities.js --container Studies
 * node examples/unlock-utilities.js --container Companies 
 * node examples/unlock-utilities.js --container Interactions
 * node examples/unlock-utilities.js --all
 * node examples/unlock-utilities.js --status
 * 
 * Available operations:
 * --container <name>  - Unlock specific container
 * --all              - Unlock all containers
 * --status           - Show lock status of all containers
 * --force            - Force unlock even if lock seems valid
 * --dry-run          - Show what would be unlocked without doing it
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
import GitHubFunctions from '../src/api/github.js';
import { logger } from '../src/api/gitHubServer/logger.js';

// Helper to get current directory with ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// For formatting output
const WARNING_PREFIX = '⚠️ ';
const INFO_PREFIX = 'ℹ️ ';
const SUCCESS_PREFIX = '✅';
const ERROR_PREFIX = '❌';
const SECTION_DIVIDER = '='.repeat(80);

// Container types available for unlocking
const CONTAINER_TYPES = ['Studies', 'Companies', 'Interactions', 'Users', 'Actions'];

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
 * Display help information
 */
function displayHelp() {
  console.log(`${SECTION_DIVIDER}`);
  console.log('UNLOCK UTILITIES - HELP');
  console.log(`${SECTION_DIVIDER}`);
  console.log('');
  console.log('This utility helps unlock containers that may be stuck in a locked state');
  console.log('during development, testing, or after failed transactions.');
  console.log('');
  console.log('Usage:');
  console.log('  node examples/unlock-utilities.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --container <name>  Unlock specific container (Studies, Companies, Interactions, Users, Actions)');
  console.log('  --all              Unlock all containers');
  console.log('  --status           Show lock status of all containers');
  console.log('  --force            Force unlock even if lock seems valid');
  console.log('  --dry-run          Show what would be unlocked without doing it');
  console.log('  --help             Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  node examples/unlock-utilities.js --status');
  console.log('  node examples/unlock-utilities.js --container Studies');
  console.log('  node examples/unlock-utilities.js --all --dry-run');
  console.log('  node examples/unlock-utilities.js --container Companies --force');
  console.log('');
  console.log('Common scenarios:');
  console.log('  - Transaction failed and left container locked');
  console.log('  - Interrupted operation (Ctrl+C) during container operations');
  console.log('  - Development testing that needs cleanup');
  console.log('  - Error recovery after failed batch operations');
  console.log('');
}

/**
 * Check if a container is locked
 * @param {GitHubFunctions} github - GitHub functions instance
 * @param {string} containerName - Name of the container
 * @returns {Promise<Object>} Lock status information
 */
async function checkContainerLockStatus(github, containerName) {
  const tracker = logger.trackOperation ? 
    logger.trackOperation('checkContainerLockStatus', containerName) : 
    { end: () => {} };
    
  try {
    logger.debug('Checking container lock status', { container: containerName });
    
    // Try to check if container is locked using the GitHubFunctions method
    const lockCheckResult = await github.checkForLock(containerName);
    
    if (lockCheckResult[0]) {
      // Successfully checked lock status
      const isLocked = lockCheckResult[2];
      const lockInfo = lockCheckResult[2];
      
      return {
        success: true,
        exists: true,
        locked: isLocked,
        lockInfo: lockInfo,
        message: isLocked ? 'Container is locked' : 'Container is not locked'
      };
    } else {
      // Could not check lock status - might be because container doesn't exist
      return {
        success: false,
        exists: false,
        locked: false,
        error: lockCheckResult[1],
        message: `Could not check lock status: ${lockCheckResult[1]}`
      };
    }
    
  } catch (error) {
    logger.error('Error checking container lock status', {
      container: containerName,
      error: error.message
    });
    
    return {
      success: false,
      exists: false,
      locked: false,
      error: error.message,
      message: `Error checking lock status: ${error.message}`
    };
  } finally {
    tracker.end();
  }
}

/**
 * Attempt to unlock a container using a simulated release operation
 * @param {GitHubFunctions} github - GitHub functions instance
 * @param {string} containerName - Name of the container to unlock
 * @param {boolean} force - Force unlock even if lock seems valid
 * @param {boolean} dryRun - Show what would be done without doing it
 * @returns {Promise<Object>} Unlock result
 */
async function unlockContainer(github, containerName, force = false, dryRun = false) {
  const tracker = logger.trackOperation ? 
    logger.trackOperation('unlockContainer', containerName) : 
    { end: () => {} };
    
  try {
    logger.info('Attempting to unlock container', { 
      container: containerName, 
      force, 
      dryRun 
    });
    
    if (dryRun) {
      console.log(`${INFO_PREFIX} [DRY RUN] Would attempt to unlock container: ${containerName}`);
      return {
        success: true,
        action: 'dry-run',
        message: `Dry run: Would unlock ${containerName}`
      };
    }
    
    // First check if the container is actually locked
    const lockStatus = await checkContainerLockStatus(github, containerName);
    
    if (!lockStatus.exists) {
      return {
        success: false,
        action: 'skip',
        message: `Container ${containerName} does not exist or is not accessible`
      };
    }
    
    if (!lockStatus.locked) {
      return {
        success: true,
        action: 'skip',
        message: `Container ${containerName} is not locked`
      };
    }
    
    // If not forcing, warn about potentially valid locks
    if (!force && lockStatus.lockInfo) {
      console.log(`${WARNING_PREFIX} Container ${containerName} appears to be locked by a valid process`);
      console.log(`${INFO_PREFIX} Lock info:`, JSON.stringify(lockStatus.lockInfo, null, 2));
      
      const confirmUnlock = await confirmAction('Do you want to force unlock this container?');
      if (!confirmUnlock) {
        return {
          success: false,
          action: 'cancelled',
          message: 'Unlock cancelled by user'
        };
      }
    }
    
    // Attempt to unlock the container by creating a minimal metadata and releasing
    console.log(`${INFO_PREFIX} Attempting to unlock container: ${containerName}`);
    
    try {
      // Create minimal repo metadata for the unlock operation
      const repoMetadata = {
        containers: {
          [containerName]: {}
        },
        branch: {
          name: `unlock-${containerName}-${Date.now()}`,
          sha: null
        }
      };
      
      // Try to catch the container first to get proper metadata
      const catchResult = await github.catchContainer(repoMetadata);
      
      if (catchResult[0]) {
        // Successfully caught container, now release it to unlock
        const releaseResult = await github.releaseContainer(catchResult[2]);
        
        if (releaseResult[0]) {
          logger.info('Container unlocked successfully via release', { container: containerName });
          return {
            success: true,
            action: 'unlocked',
            message: `Successfully unlocked ${containerName} via container release`,
            result: releaseResult[2]
          };
        } else {
          logger.error('Failed to release container for unlock', { 
            container: containerName, 
            error: releaseResult[1] 
          });
          return {
            success: false,
            action: 'failed',
            message: `Failed to release ${containerName} for unlock: ${releaseResult[1]}`,
            error: releaseResult[1]
          };
        }
      } else {
        // Could not catch container - try direct unlock with getSha
        console.log(`${INFO_PREFIX} Container catch failed, trying direct unlock...`);
        
        // Get the current commit SHA for the main branch
        const shaResult = await github.getSha(containerName, `${containerName}/${containerName}.json`);
        
        if (shaResult[0]) {
          const unlockResult = await github.unlockContainer(containerName, shaResult[2]);
          
          if (unlockResult[0]) {
            logger.info('Container unlocked successfully via direct unlock', { container: containerName });
            return {
              success: true,
              action: 'unlocked',
              message: `Successfully unlocked ${containerName} via direct unlock`,
              result: unlockResult[2]
            };
          } else {
            logger.error('Failed to unlock container directly', { 
              container: containerName, 
              error: unlockResult[1] 
            });
            return {
              success: false,
              action: 'failed',
              message: `Failed to unlock ${containerName} directly: ${unlockResult[1]}`,
              error: unlockResult[1]
            };
          }
        } else {
          return {
            success: false,
            action: 'failed',
            message: `Could not get commit SHA for ${containerName}: ${shaResult[1]}`,
            error: shaResult[1]
          };
        }
      }
    } catch (unlockError) {
      logger.error('Error during unlock attempt', {
        container: containerName,
        error: unlockError.message
      });
      return {
        success: false,
        action: 'error',
        message: `Error during unlock: ${unlockError.message}`,
        error: unlockError.message
      };
    }
    
  } catch (error) {
    logger.error('Error during container unlock', {
      container: containerName,
      error: error.message,
      stack: error.stack
    });
    
    return {
      success: false,
      action: 'error',
      message: `Error unlocking ${containerName}: ${error.message}`,
      error: error.message
    };
  } finally {
    tracker.end();
  }
}

/**
 * Show status of all containers
 * @param {GitHubFunctions} github - GitHub functions instance
 * @returns {Promise<void>}
 */
async function showContainerStatus(github) {
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('CONTAINER LOCK STATUS');
  console.log(`${SECTION_DIVIDER}`);
  
  const statusResults = [];
  
  for (const containerName of CONTAINER_TYPES) {
    console.log(`\n🔍 Checking ${containerName}...`);
    const status = await checkContainerLockStatus(github, containerName);
    statusResults.push({ container: containerName, ...status });
    
    if (status.success) {
      if (status.locked) {
        console.log(`${ERROR_PREFIX} ${containerName}: LOCKED`);
        if (status.lockInfo) {
          console.log(`${INFO_PREFIX} Lock details:`, JSON.stringify(status.lockInfo, null, 2));
        }
      } else {
        console.log(`${SUCCESS_PREFIX} ${containerName}: UNLOCKED`);
      }
    } else {
      console.log(`${WARNING_PREFIX} ${containerName}: ${status.message}`);
    }
  }
  
  // Summary
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('SUMMARY');
  console.log(`${SECTION_DIVIDER}`);
  
  const locked = statusResults.filter(r => r.locked);
  const unlocked = statusResults.filter(r => r.success && !r.locked);
  const errors = statusResults.filter(r => !r.success);
  
  console.log(`${SUCCESS_PREFIX} Unlocked containers: ${unlocked.length}`);
  console.log(`${ERROR_PREFIX} Locked containers: ${locked.length}`);
  console.log(`${WARNING_PREFIX} Containers with errors: ${errors.length}`);
  
  if (locked.length > 0) {
    console.log('\nLocked containers:');
    locked.forEach(r => console.log(`  - ${r.container}`));
    console.log('\nTo unlock specific containers:');
    locked.forEach(r => console.log(`  node examples/unlock-utilities.js --container ${r.container}`));
    console.log('\nTo unlock all locked containers:');
    console.log('  node examples/unlock-utilities.js --all');
  }
}

/**
 * Unlock multiple containers
 * @param {GitHubFunctions} github - GitHub functions instance
 * @param {Array<string>} containers - Container names to unlock
 * @param {boolean} force - Force unlock even if locks seem valid
 * @param {boolean} dryRun - Show what would be done without doing it
 * @returns {Promise<void>}
 */
async function unlockMultipleContainers(github, containers, force = false, dryRun = false) {
  console.log(`\n${SECTION_DIVIDER}`);
  console.log(`UNLOCK ${containers.length} CONTAINERS`);
  console.log(`${SECTION_DIVIDER}`);
  
  if (dryRun) {
    console.log(`${INFO_PREFIX} DRY RUN MODE - No actual changes will be made`);
  }
  
  if (!force && !dryRun) {
    console.log(`${WARNING_PREFIX} This will attempt to unlock the following containers:`);
    containers.forEach(name => console.log(`  - ${name}`));
    
    const confirm = await confirmAction('Do you want to proceed?');
    if (!confirm) {
      console.log('Operation cancelled by user');
      return;
    }
  }
  
  const results = [];
  
  for (const containerName of containers) {
    console.log(`\n🔓 Processing ${containerName}...`);
    const result = await unlockContainer(github, containerName, force, dryRun);
    results.push({ container: containerName, ...result });
    
    if (result.success) {
      if (result.action === 'unlocked') {
        console.log(`${SUCCESS_PREFIX} ${containerName}: UNLOCKED`);
      } else if (result.action === 'skip') {
        console.log(`${INFO_PREFIX} ${containerName}: ${result.message}`);
      } else if (result.action === 'dry-run') {
        console.log(`${INFO_PREFIX} ${containerName}: DRY RUN - Would unlock`);
      }
    } else {
      console.log(`${ERROR_PREFIX} ${containerName}: ${result.message}`);
    }
  }
  
  // Summary
  console.log(`\n${SECTION_DIVIDER}`);
  console.log('UNLOCK SUMMARY');
  console.log(`${SECTION_DIVIDER}`);
  
  const unlocked = results.filter(r => r.action === 'unlocked');
  const skipped = results.filter(r => r.action === 'skip');
  const failed = results.filter(r => !r.success);
  const dryRunCount = results.filter(r => r.action === 'dry-run');
  
  if (dryRun) {
    console.log(`${INFO_PREFIX} Dry run completed`);
    console.log(`${INFO_PREFIX} Containers that would be unlocked: ${dryRunCount.length}`);
  } else {
    console.log(`${SUCCESS_PREFIX} Successfully unlocked: ${unlocked.length}`);
    console.log(`${INFO_PREFIX} Skipped (already unlocked): ${skipped.length}`);
    console.log(`${ERROR_PREFIX} Failed to unlock: ${failed.length}`);
  }
  
  if (failed.length > 0) {
    console.log('\nFailed containers:');
    failed.forEach(r => console.log(`  - ${r.container}: ${r.message}`));
  }
}

/**
 * Parse command line arguments
 * @param {Array<string>} args - Command line arguments
 * @returns {Object} Parsed options
 */
function parseArguments(args) {
  const options = {
    container: null,
    all: false,
    status: false,
    force: false,
    dryRun: false,
    help: false
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
    case '--container':
      if (i + 1 < args.length) {
        options.container = args[i + 1];
        i++; // Skip next argument as it's the container name
      }
      break;
    case '--all':
      options.all = true;
      break;
    case '--status':
      options.status = true;
      break;
    case '--force':
      options.force = true;
      break;
    case '--dry-run':
      options.dryRun = true;
      break;
    case '--help':
    case '-h':
      options.help = true;
      break;
    default:
      console.log(`${WARNING_PREFIX} Unknown option: ${arg}`);
      break;
    }
  }
  
  return options;
}

/**
 * Validate arguments
 * @param {Object} options - Parsed options
 * @returns {Object} Validation result
 */
function validateArguments(options) {
  if (options.help) {
    return { valid: true, action: 'help' };
  }
  
  if (options.status) {
    return { valid: true, action: 'status' };
  }
  
  if (options.all) {
    return { valid: true, action: 'unlock-all' };
  }
  
  if (options.container) {
    if (!CONTAINER_TYPES.includes(options.container)) {
      return {
        valid: false,
        error: `Invalid container type: ${options.container}. Valid types: ${CONTAINER_TYPES.join(', ')}`
      };
    }
    return { valid: true, action: 'unlock-single' };
  }
  
  // No action specified, default to status
  return { valid: true, action: 'status' };
}

/**
 * Main function to run the unlock utilities
 */
async function main() {
  console.log(`${SECTION_DIVIDER}`);
  console.log('MEDIUMROAST API - UNLOCK UTILITIES');
  console.log(`${SECTION_DIVIDER}`);
  
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const options = parseArguments(args);
    const validation = validateArguments(options);
    
    if (!validation.valid) {
      console.error(`${ERROR_PREFIX} ${validation.error}`);
      console.log(`${INFO_PREFIX} Use --help for usage information`);
      process.exit(1);
    }
    
    if (validation.action === 'help') {
      displayHelp();
      process.exit(0);
    }
    
    // Load configuration
    const configFile = path.join(__dirname, 'config.ini');
    
    if (!fs.existsSync(configFile)) {
      console.error(`${ERROR_PREFIX} Configuration file not found: ${configFile}`);
      console.error('\nPlease create examples/config.ini with your GitHub token and organization:');
      console.error('[GitHub]');
      console.error('token = YOUR_GITHUB_TOKEN');
      console.error('org = YOUR_ORGANIZATION_NAME');
      process.exit(1);
    }
    
    // Read config
    const config = new ConfigParser();
    config.read(configFile);
    
    if (!config.hasSection('GitHub') || !config.hasKey('GitHub', 'token') || !config.hasKey('GitHub', 'org')) {
      console.error(`${ERROR_PREFIX} Missing required configuration in config.ini`);
      console.error('Please ensure your config.ini contains:');
      console.error('[GitHub]');
      console.error('token = YOUR_GITHUB_TOKEN');
      console.error('org = YOUR_ORGANIZATION_NAME');
      process.exit(1);
    }
    
    const token = config.get('GitHub', 'token');
    const org = config.get('GitHub', 'org');
    
    logger.info('Starting unlock utilities', { organization: org, action: validation.action });
    
    // Initialize GitHub functions
    const github = new GitHubFunctions(token, org, 'unlock-utilities');
    
    // Execute the requested action
    switch (validation.action) {
    case 'status':
      await showContainerStatus(github);
      break;
      
    case 'unlock-single': {
      console.log(`\n${INFO_PREFIX} Unlocking container: ${options.container}`);
      const singleResult = await unlockContainer(github, options.container, options.force, options.dryRun);
      if (singleResult.success) {
        console.log(`${SUCCESS_PREFIX} ${singleResult.message}`);
      } else {
        console.error(`${ERROR_PREFIX} ${singleResult.message}`);
      }
      break;
    }
      
    case 'unlock-all':
      await unlockMultipleContainers(github, CONTAINER_TYPES, options.force, options.dryRun);
      break;
      
    default:
      console.error(`${ERROR_PREFIX} Unknown action: ${validation.action}`);
      process.exit(1);
    }
    
    console.log(`\n${SECTION_DIVIDER}`);
    console.log(`${SUCCESS_PREFIX} UNLOCK UTILITIES COMPLETED`);
    console.log(`${SECTION_DIVIDER}`);
    
  } catch (error) {
    logger.error('Unhandled error in unlock utilities', {
      error: error.message,
      stack: error.stack
    });
    console.error(`${ERROR_PREFIX} Unhandled error:`, error);
    process.exit(1);
  }
}

// Run the utilities
main().catch(error => {
  logger.error('Unhandled error in unlock utilities', {
    error: error.message,
    stack: error.stack
  });
  console.error('Unhandled error:', error);
  process.exit(1);
});
