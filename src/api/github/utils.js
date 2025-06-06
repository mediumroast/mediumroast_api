/* eslint-disable no-console */
/**
 * @fileoverview Utility functions for GitHub operations
 * @license Apache-2.0
 * @version 3.0.0
 * @author Michael Hay <michael.hay@mediumroast.io>
 * @copyright 2025 Mediumroast, Inc. All rights reserved.
 */

import AdmZip from 'adm-zip';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { logger } from '../gitHubServer/logger.js';

/**
 * Encodes content for GitHub API
 * @param {String|Object} content - Content to encode
 * @returns {String} Base64 encoded content
 */
const encodeContent = (content) => {
  if (typeof content === 'object') {
    return Buffer.from(JSON.stringify(content)).toString('base64');
  }
  return Buffer.from(content || '').toString('base64');
};

/**
 * Decodes content from GitHub API
 * @param {String} content - Base64 encoded content
 * @returns {String} Decoded content
 */
const decodeContent = (content) => {
  return Buffer.from(content, 'base64').toString('utf-8');
};

/**
 * Safely decodes and parses JSON content
 * @param {String} content - Base64 encoded JSON content
 * @returns {Object} Parsed JSON object
 */
const decodeJsonContent = (content) => {
  try {
    return JSON.parse(decodeContent(content));
  } catch (err) {
    return null;
  }
};

/**
 * Custom URL encoding for special characters
 * @param {String} str - String to encode
 * @returns {String} Encoded string
 */
const customEncodeURIComponent = (str) => {
  return str.split('').map(char => {
    return encodeURIComponent(char).replace(/[!'()*]/g, (c) => {
      return '%' + c.charCodeAt(0).toString(16).toUpperCase();
    });
  }).join('');
};

/**
 * Main extraction function for normal operation - extracts content directly from ZIP buffer
 * @param {Buffer} zipBuffer - ZIP file content as a buffer
 * @param {Object} options - Extraction options
 * @param {Boolean} options.debug - Whether to log debug information
 * @param {String} options.tempDir - Optional path to save extracted files for debugging
 * @returns {Object} Object with extracted workflows and actions
 */
const extractWorkflowsFromZip = async (zipBuffer, options = {}) => {
  const { debug = false, tempDir = null } = options;
  // Replace custom log function with logger.debug
  const log = debug ? msg => logger.debug(msg) : () => {};
  
  try {
    // Validate zipBuffer
    if (!zipBuffer || !(zipBuffer instanceof Buffer)) {
      return {
        workflows: [],
        actions: [],
        error: 'Invalid ZIP buffer provided'
      };
    }
    
    log(`Processing ZIP buffer of ${zipBuffer.length} bytes`);
    
    // Create a temporary directory for extraction if not provided
    const extractDir = tempDir || fs.mkdtempSync(path.join(
      fs.realpathSync(os.tmpdir()), 'mr4gh-extract-'
    ));
    log(`Using extraction directory: ${extractDir}`);
    
    // Save the zip file
    const zipPath = path.join(extractDir, 'repository.zip');
    fs.writeFileSync(zipPath, zipBuffer);
    log(`Saved ZIP file to ${zipPath}`);
    
    if (debug) {
      log(`ZIP file will be extracted to: ${tempDir}`);
      log('ZIP file content will be analyzed for workflow and action files');
    }
    
    // Extract the entire ZIP file
    const zipPackage = new AdmZip(zipPath);
    zipPackage.extractAllTo(extractDir, true, false);
    log('ZIP file extracted successfully');
    
    // Find the root directory (GitHub zipballs have a single root directory)
    const rootEntries = fs.readdirSync(extractDir).filter(
      item => fs.statSync(path.join(extractDir, item)).isDirectory() && 
              item !== 'repository.zip'
    );
    
    if (rootEntries.length === 0) {
      log('No root directory found in extracted ZIP');
      return {
        workflows: [],
        actions: [],
        error: 'No root directory found in extracted ZIP'
      };
    }
    
    const rootDir = rootEntries[0];
    log(`Found root directory: "${rootDir}"`);

    // List all items in the root directory to debug
    const rootPath = path.join(extractDir, rootDir);
    const rootItems = fs.readdirSync(rootPath);
    log(`Items in root directory: ${rootItems.join(', ')}`);

    // Check if .github exists directly
    const githubExists = rootItems.includes('.github');
    log(`.github directory exists in root: ${githubExists}`);

    // Direct paths to GitHub directories within the extracted structure
    // Don't redeclare rootPath - use the existing variable
    let githubPath = path.join(rootPath, '.github');
    let workflowsPath = path.join(githubPath, 'workflows');
    let actionsPath = path.join(githubPath, 'actions');
    
    log(`Looking for workflow files in: ${workflowsPath}`);
    log(`Looking for action files in: ${actionsPath}`);
    
    const workflows = [];
    const actions = [];
    
    // Check if the standard paths don't exist, try root-level directories
    if (!fs.existsSync(workflowsPath) || !fs.statSync(workflowsPath).isDirectory()) {
      const rootWorkflowsPath = path.join(rootPath, 'workflows');
      if (fs.existsSync(rootWorkflowsPath) && fs.statSync(rootWorkflowsPath).isDirectory()) {
        log('No .github/workflows directory found, using root-level workflows directory');
        workflowsPath = rootWorkflowsPath;
      }
    }

    if (!fs.existsSync(actionsPath) || !fs.statSync(actionsPath).isDirectory()) {
      const rootActionsPath = path.join(rootPath, 'actions');
      if (fs.existsSync(rootActionsPath) && fs.statSync(rootActionsPath).isDirectory()) {
        log('No .github/actions directory found, using root-level actions directory');
        actionsPath = rootActionsPath;
      }
    }

    // Add logging to show what directories we're checking
    log(`Checking workflow files in: ${workflowsPath}`);
    log(`Checking action files in: ${actionsPath}`);
    
    // Also check if those directories exist and log their contents
    if (fs.existsSync(workflowsPath) && fs.statSync(workflowsPath).isDirectory()) {
      const workflowFiles = fs.readdirSync(workflowsPath);
      log(`Found ${workflowFiles.length} items in workflows directory: ${workflowFiles.join(', ')}`);
    }
    
    if (fs.existsSync(actionsPath) && fs.statSync(actionsPath).isDirectory()) {
      const actionFiles = fs.readdirSync(actionsPath);
      log(`Found ${actionFiles.length} items in actions directory: ${actionFiles.join(', ')}`);
    }
    
    // Process workflow files from the correct path
    if (fs.existsSync(workflowsPath) && fs.statSync(workflowsPath).isDirectory()) {
      const workflowFiles = fs.readdirSync(workflowsPath).filter(
        file => file.endsWith('.yml') || file.endsWith('.yaml')
      );
      
      log(`Processing ${workflowFiles.length} workflow files from ${workflowsPath}`);
      
      for (const file of workflowFiles) {
        const filePath = path.join(workflowsPath, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        workflows.push({
          name: file,
          content,
          size: content.length
        });
      }
    }
    
    // Process action files from the correct path
    if (fs.existsSync(actionsPath) && fs.statSync(actionsPath).isDirectory()) {
      log(`Processing action files from ${actionsPath}`);
      
      // Function to recursively collect files from a directory
      const collectFilesRecursively = (dir, basePath = '') => {
        const collected = [];
        
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const itemPath = path.join(dir, item);
          const relativePath = basePath ? path.join(basePath, item) : item;
          
          if (fs.statSync(itemPath).isDirectory()) {
            collected.push(...collectFilesRecursively(itemPath, relativePath));
          } else {
            const content = fs.readFileSync(itemPath, 'utf8');
            collected.push({
              name: relativePath,
              path: `.github/actions/${relativePath}`,
              content,
              size: content.length
            });
          }
        }
        
        return collected;
      };
      
      const actionFiles = collectFilesRecursively(actionsPath);
      log(`Found ${actionFiles.length} action files`);
      actions.push(...actionFiles);
    }
    
    // Cleanup extraction directory if we created it temporarily
    if (!tempDir) {
      try {
        fs.rmSync(extractDir, { recursive: true, force: true });
        log(`Removed temporary extraction directory: ${extractDir}`);
      } catch (cleanupErr) {
        log(`Warning: Failed to clean up extraction directory: ${cleanupErr.message}`);
      }
    }
    
    return {
      workflows,
      actions,
      rootDirectory: rootDir
    };
  } catch (err) {
    // Replace console.error with logger.error
    logger.error('Error extracting files from ZIP:', err);
    return {
      workflows: [],
      actions: [],
      error: err.message
    };
  }
};

export {
  encodeContent,
  decodeContent,
  decodeJsonContent,
  customEncodeURIComponent,
  extractWorkflowsFromZip
};