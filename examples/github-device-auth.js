/**
 * Example demonstrating GitHub device flow authentication
 * @author Michael Hay <michael.hay@mediumroast.io>
 * @file github-device-auth.js
 * @license Apache-2.0
 * @version 3.0.0
 * @copyright 2025 Mediumroast, Inc. All rights reserved.
 * 
 * 
 * Prerequisites:
 * 1. Create a GitHub OAuth App (https://github.com/settings/developers)
 * 2. Note your Client ID (no secret needed for device flow)
 * 3. Set callback URL to http://localhost (required but not used for device flow)
 * 
 * Running the example:
 * 1. Make sure you've installed all dependencies:
 *    npm install configparser
 * 
 * 2. Run this example:
 *    node examples/github-device-auth.js
 * 
 * 3. The script will:
 *    - Open your browser to GitHub's authorization page
 *    - Display a user code to enter on that page
 *    - Wait for you to authorize the application
 *    - Once authorized, fetch and save an access token
 *    - Verify the token works by making a test API call
 * 
 * 4. The token will be saved to examples/config.ini for future use
 * 
 * Note: The sample configuration at examples/config/sample-config.ini 
 * contains placeholder values. It's recommended to create your own 
 * GitHub OAuth app and update the clientId appropriately.
 * 
 * 
 * @requires configparser
 * @requires fs
 * @requires path
 * @requires url
 * @requires ../src/api/authorize.js
 */

/* eslint-disable no-console */

import { GitHubAuth } from '../src/api/authorize.js';
import fs from 'fs';
import path from 'path';
// Fix for ConfigParser import
import ConfigParser from 'configparser';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Helper to get current directory with ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Environment setup helper class
class Environ {
  /**
   * Read a configuration file
   * @param {string} filePath - Path to the configuration file
   * @returns {ConfigParser} - The configuration object
   */
  readConfig(filePath) {
    const config = new ConfigParser();
    if (fs.existsSync(filePath)) {
      config.read(filePath);
    }
    return config;
  }

  /**
   * Update a configuration setting
   * @param {ConfigParser} config - The configuration object
   * @param {string} section - The section name
   * @param {string} option - The option name
   * @param {string} value - The value to set
   * @returns {array} - [success, updatedConfig]
   */
  updateConfigSetting(config, section, option, value) {
    try {
      if (!config.hasSection(section)) {
        config.addSection(section);
      }
      config.set(section, option, value);
      return [true, config];
    } catch (error) {
      console.error(`Error updating config: ${error.message}`);
      return [false, config];
    }
  }
}

/**
 * Main function to demonstrate GitHub device flow authentication
 */
async function main() {
  // Define config files - sample and user config
  const sampleConfigFile = path.join(__dirname, 'config', 'sample-config.ini');
  const userConfigFile = path.join(__dirname, 'config.ini');
  
  // Check if either config exists
  const sampleExists = fs.existsSync(sampleConfigFile);
  const userExists = fs.existsSync(userConfigFile);
  
  // Choose which config to use (prefer user config if it exists)
  const configFile = userExists ? userConfigFile : (sampleExists ? sampleConfigFile : userConfigFile);
  const configExists = userExists || sampleExists;
  
  console.log('GitHub Device Flow Authentication Example');
  console.log('=======================================\n');
  
  // Create environ helper
  const environ = new Environ();
  
  // Create environment object - use sample values as fallback
  let env = {
    // Default GitHub client ID if no config exists
    GitHub: {
      clientId: 'YOUR_GITHUB_CLIENT_ID' // Will be replaced if config exists
    }
  };
  
  // If config exists, read GitHub client ID from it
  if (configExists) {
    console.log(`Using configuration from: ${configFile}`);
    const config = environ.readConfig(configFile);
    
    if (config.hasSection('GitHub') && config.hasKey('GitHub', 'clientId')) {
      env.clientId = config.get('GitHub', 'clientId');
      console.log(`Using Client ID: ${env.clientId}`);
    }
  } else {
    console.log('No configuration file found. Using default values.');
    console.log('You will need to provide a valid GitHub client ID in the script or use a config file.');
  }
  
  console.log('Setting up GitHub authentication...');
  
  try {
    // Create GitHub Auth instance
    const github = new GitHubAuth(env, environ, configFile, configExists);
    
    console.log('Starting device flow authentication...');
    console.log('You will see instructions for browser authentication shortly.\n');
    
    // This will trigger the browser to open and show device code
    const tokenData = await github.getAccessTokenDeviceFlow();
    
    console.log('\nAuthentication successful!');
    console.log(`Token received: ${tokenData.token.substring(0, 6)}...`);
    
    // Create or update config file
    console.log(`Saving token to: ${userConfigFile}`);
    const config = environ.readConfig(userConfigFile);
    
    // Save the token to config
    let result = environ.updateConfigSetting(config, 'GitHub', 'token', tokenData.token);
    result = environ.updateConfigSetting(result[1], 'GitHub', 'authType', 'deviceFlow');
    result = environ.updateConfigSetting(result[1], 'GitHub', 'deviceCode', tokenData.deviceCode);
    
    // If we're using the sample config, copy other values
    if (configFile === sampleConfigFile && !userExists) {
      const sampleConfig = environ.readConfig(sampleConfigFile);
      if (sampleConfig.hasKey('GitHub', 'clientId')) {
        result = environ.updateConfigSetting(result[1], 'GitHub', 'clientId', 
          sampleConfig.get('GitHub', 'clientId'));
      }
      if (sampleConfig.hasKey('GitHub', 'appId')) {
        result = environ.updateConfigSetting(result[1], 'GitHub', 'appId', 
          sampleConfig.get('GitHub', 'appId'));
      }
      if (sampleConfig.hasKey('GitHub', 'org')) {
        result = environ.updateConfigSetting(result[1], 'GitHub', 'org', 
          sampleConfig.get('GitHub', 'org'));
      }
    }
    
    // Write to user config file
    await result[1].write(userConfigFile);
    console.log('Token saved to configuration file.');
    
    // Make a test API call to verify the token works
    console.log('\nTesting token with a simple API call...');
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${tokenData.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (response.ok) {
      const userData = await response.json();
      console.log('Authentication validated! User details:');
      console.log(`- Username: ${userData.login}`);
      console.log(`- Name: ${userData.name || 'Not provided'}`);
      console.log(`- Email: ${userData.email || 'Not provided'}`);
    } else {
      console.error('Token validation failed:', response.statusText);
    }
    
  } catch (error) {
    console.error('Error during authentication:', error.message);
  }
}

// Run the example
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});