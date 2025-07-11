/**
 * Clean up all JSON files to test the complete flow
 * @author Michael Hay <michael.hay@mediumroast.io>
 * @file cleanup-json-files.js
 * @license Apache-2.0
 * @version 3.0.0
 * @copyright 2025 Mediumroast, Inc. All rights reserved.
 */

/* eslint-disable no-console */

import GitHubFunctions from './src/api/github.js';
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

/**
 * Clean up JSON files for testing
 */
async function cleanupJsonFiles() {
  console.log('================================================================================');
  console.log('CLEANING UP JSON FILES FOR TESTING');
  console.log('================================================================================');
  
  try {
    // Load configuration
    const configFile = path.join(__dirname, 'examples', 'config.ini');
    
    const config = new ConfigParser();
    config.read(configFile);
    
    const token = config.get('GitHub', 'token');
    const org = config.get('GitHub', 'org');
    
    console.log(`Using organization: ${org}`);
    
    // Initialize GitHub client
    const github = new GitHubFunctions(token, org, 'cleanup-json-files');
    
    // Clean up JSON files
    const jsonFiles = {
      Companies: 'Companies.json',
      Studies: 'Studies.json'
    };
    
    for (const [container, fileName] of Object.entries(jsonFiles)) {
      console.log(`\n🧹 Removing ${fileName} from ${container}...`);
      
      try {
        const fileResult = await github.getContent(`${container}/${fileName}`);
        if (fileResult[0]) {
          const sha = fileResult[2].sha;
          const deleteResult = await github.deleteBlob(container, fileName, 'main', sha);
          if (deleteResult[0]) {
            console.log(`  ${SUCCESS_PREFIX} Removed ${fileName}`);
          } else {
            console.log(`  ${ERROR_PREFIX} Failed to remove ${fileName}: ${deleteResult[1]}`);
          }
        } else {
          console.log(`  ℹ️  ${fileName} doesn't exist`);
        }
      } catch (error) {
        console.log(`  ${ERROR_PREFIX} Error removing ${fileName}: ${error.message}`);
      }
    }
    
    console.log('\n================================================================================');
    console.log('CLEANUP COMPLETED');
    console.log('================================================================================');
    
  } catch (error) {
    console.error(`${ERROR_PREFIX} Error during cleanup:`, error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the cleanup
cleanupJsonFiles().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
