#!/usr/bin/env node

/**
 * @fileoverview Example script demonstrating .gitkeep cleanup functionality
 * @license Apache-2.0
 * @author Michael Hay <michael.hay@mediumroast.io>
 * @copyright 2025 Mediumroast, Inc. All rights reserved.
 */

import { Actions } from '../src/api/gitHubServer/entities/actions.js';
import { logger } from '../src/api/gitHubServer/logger.js';

// Example: Clean up stale .gitkeep files
async function demonstrateGitkeepCleanup() {
  try {
    logger.info('='.repeat(60));
    logger.info('GitHub Actions .gitkeep Cleanup Demonstration');
    logger.info('='.repeat(60));
    
    // Configuration from environment variables
    const token = process.env.GITHUB_TOKEN;
    const org = process.env.GITHUB_ORG || 'your-org';
    const processName = process.env.PROCESS_NAME || 'gitkeep-cleanup-demo';
    
    if (!token) {
      logger.error('GITHUB_TOKEN environment variable is required');
      process.exit(1);
    }
    
    logger.info(`Organization: ${org}`);
    logger.info(`Process Name: ${processName}`);
    
    // Initialize Actions instance
    const actions = new Actions(token, org, processName);
    
    // Method 1: Basic .gitkeep cleanup
    logger.info('\n--- Method 1: Basic .gitkeep Cleanup ---');
    const basicCleanup = await actions.cleanupStaleGitkeepFiles('.github/actions', true);
    
    if (basicCleanup[0]) {
      const { removed, skipped, details } = basicCleanup[2];
      logger.info(`✓ Basic cleanup: ${removed} files removed, ${skipped} skipped`);
      
      if (details && details.length > 0) {
        logger.info('Cleanup details:');
        details.forEach(detail => {
          const status = detail.success ? '✓' : '✗';
          logger.info(`  ${status} ${detail.action}: ${detail.path}`);
        });
      }
    } else {
      logger.error(`✗ Basic cleanup failed: ${basicCleanup[1]}`);
    }
    
    // Method 2: Comprehensive maintenance cleanup
    logger.info('\n--- Method 2: Comprehensive Maintenance Cleanup ---');
    const maintenanceCleanup = await actions.performMaintenanceCleanup();
    
    if (maintenanceCleanup[0]) {
      const results = maintenanceCleanup[2];
      logger.info('✓ Maintenance cleanup completed');
      logger.info(`  - .gitkeep files removed: ${results.summary.gitkeep_files_removed}`);
      logger.info(`  - .gitkeep files skipped: ${results.summary.gitkeep_files_skipped}`);
      logger.info(`  - Directories analyzed: ${results.summary.directories_analyzed}`);
      
      if (results.summary.issues_found.length > 0) {
        logger.warn('Issues found:');
        results.summary.issues_found.forEach(issue => {
          logger.warn(`  - ${issue}`);
        });
      }
    } else {
      logger.error(`✗ Maintenance cleanup failed: ${maintenanceCleanup[1]}`);
    }
    
    // Method 3: Demonstrate smart directory creation and cleanup
    logger.info('\n--- Method 3: Smart Directory Management ---');
    
    // Get the repository manager instance
    const repoManager = actions.serverCtl.repositoryManager;
    
    // Example: Create a directory structure and then clean it up
    const testDir = '.github/actions/test-cleanup';
    
    // Create directory with .gitkeep
    logger.info(`Creating test directory: ${testDir}`);
    const createResult = await repoManager.ensureDirectory(testDir, 'main', true);
    
    if (createResult[0]) {
      logger.info(`✓ Directory created: ${createResult[1]}`);
      
      // Now add a file to the directory (this should trigger .gitkeep cleanup)
      logger.info('Adding test file to trigger .gitkeep cleanup...');
      const fileResult = await repoManager.createOrUpdateFileWithCleanup(
        `${testDir}/test-action.yml`,
        'name: Test Action\nruns:\n  using: composite\n  steps: []',
        'Add test action file (should cleanup .gitkeep)',
        'main',
        null,
        true  // Enable .gitkeep cleanup
      );
      
      if (fileResult[0]) {
        logger.info(`✓ File created with cleanup: ${fileResult[1]}`);
        if (fileResult[2] && fileResult[2].gitkeepRemoved) {
          logger.info('  ✓ .gitkeep file was automatically removed');
        }
      } else {
        logger.error(`✗ Failed to create file: ${fileResult[1]}`);
      }
    } else {
      logger.error(`✗ Failed to create directory: ${createResult[1]}`);
    }
    
    logger.info('\n' + '='.repeat(60));
    logger.info('Cleanup demonstration completed!');
    logger.info('='.repeat(60));
    
  } catch (error) {
    logger.error('Demonstration failed:', error);
    process.exit(1);
  }
}

// Usage information
function showUsage() {
  /* eslint-disable no-console */
  console.log(`
GitHub Actions .gitkeep Cleanup Demonstration

This script demonstrates the new .gitkeep cleanup functionality in the mediumroast_api.

Environment Variables Required:
  GITHUB_TOKEN    - GitHub personal access token with repo permissions
  GITHUB_ORG      - GitHub organization name (optional, defaults to 'your-org')
  PROCESS_NAME    - Process name for locking (optional, defaults to 'gitkeep-cleanup-demo')

Usage:
  node examples/gitkeep-cleanup-demo.js

Features Demonstrated:
  1. Basic .gitkeep cleanup in specific directories
  2. Comprehensive maintenance cleanup with analysis
  3. Smart directory creation with automatic .gitkeep management
  4. File creation with automatic .gitkeep cleanup

The script will:
  - Clean up stale .gitkeep files from directories that have actual content
  - Analyze the repository structure for potential issues
  - Demonstrate smart directory creation that avoids .gitkeep conflicts
  - Show automatic .gitkeep removal when files are added to directories

Safety Features:
  - Only removes .gitkeep files from directories that have other content
  - Preserves .gitkeep files in empty directories
  - Provides detailed logging of all operations
  - Reports any issues or failures clearly
`);
}

// Run the demonstration
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showUsage();
} else {
  demonstrateGitkeepCleanup().catch(error => {
    logger.error('Fatal error:', error);
    process.exit(1);
  });
}
