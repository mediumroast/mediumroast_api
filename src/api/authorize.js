/**
 * @fileoverview This file contains the code to authorize the user to the GitHub API
 * @license Apache-2.0
 * @version 3.0.0
 * 
 * @author Michael Hay <michael.hay@mediumroast.io>
 * @file authorize.js
 * @copyright 2025 Mediumroast, Inc. All rights reserved.
 * 
 * @class GitHubAuth
 * @classdesc This class is used to authorize the user to the GitHub API
 * 
 * @requires open
 * @requires octoDevAuth
 * @requires chalk
 * @requires cli-table3
 * 
 * @exports GitHubAuth
 * 
 * @example
 * import {GitHubAuth} from './api/authorize.js'
 * const github = new GitHubAuth(env, environ, configFile)
 * const githubToken = github.verifyAccessToken()
 * 
 */ 

import open from 'open';
import * as octoDevAuth from '@octokit/auth-oauth-device';
import chalk from 'chalk';
import Table from 'cli-table3';

class GitHubAuth {
  /**
     * @constructor
     * @param {Object} env - The environment object
     * @param {Object} environ - The environmentals object
     * @param {String} configFile - The configuration file path
     * @param {Boolean} configExists - Whether the configuration file exists
     */
  constructor(env, environ, configFile, configExists) {
    this.env = env;
    this.clientType = 'github-app';
    this.configFile = configFile;
    this.configExists = configExists;
    this.environ = environ;
    this.config = configExists ? environ.readConfig(configFile) : null;
  }

  /**
     * Verifies if the GitHub section exists in the configuration
     * @returns {Boolean} True if the GitHub section exists, otherwise false
     */
  verifyGitHubSection() {
    if (!this.config) {
      return false;
    }
    return this.config.hasSection('GitHub');
  }

  /**
     * Gets a value from the configuration file
     * @private
     * @param {String} section - The section name in the config file
     * @param {String} option - The option name in the section
     * @returns {String|null} The value or null if not found
     */
  getFromConfig(section, option) {
    if (!this.config) return null;
    return this.config.hasKey(section, option) ? 
      this.config.get(section, option) : null;
  }

  /**
     * Gets the access token from the configuration file
     * @returns {String|null} The access token or null if not found
     */
  getAccessTokenFromConfig() {
    return this.getFromConfig('GitHub', 'token');
  }

  /**
     * Gets the authentication type from the configuration file
     * @returns {String|null} The authentication type or null if not found
     */
  getAuthTypeFromConfig() {
    return this.getFromConfig('GitHub', 'authType');
  }

  /**
     * Checks if a GitHub token is valid and not expired
     * @async
     * @param {String} token - The GitHub token to check
     * @returns {Array} [isValid, statusObject, userData]
     */
  async checkTokenExpiration(token) {
    try {
      const response = await fetch('https://api.github.com/user', {
        method: 'GET',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
        
      if (!response.ok) {
        return [false, {status_code: response.status, status_msg: response.statusText}, null];
      }
        
      const data = await response.json();
      return [true, {status_code: 200, status_msg: response.statusText}, data];
    } catch (error) {
      return [false, {status_code: 500, status_msg: error.message}, null];
    }
  } 

  /**
     * Gets an access token using the GitHub device flow
     * @async
     * @returns {Object} The access token object
     */
  async getAccessTokenDeviceFlow() {
    // Set the clientId depending on if the config file exists
    const clientId = this.configExists ? this.env.clientId : this.env.GitHub.clientId;
    let deviceCode;

    const deviceauth = octoDevAuth.createOAuthDeviceAuth({
      clientType: this.clientType,
      clientId: clientId,
      onVerification(verifier) {
        deviceCode = verifier.device_code;
                
        // eslint-disable-next-line no-console
        console.log(
          chalk.blue.bold('If supported opening your browser to the Authorization website.\nIf your browser doesn\'t open, please copy and paste the Authorization website URL into your browser\'s address bar.\n')
        );
                
        const authWebsitePrefix = 'Authorization website:';
        const authCodePrefix = 'Authorization code:';
        const authWebsite = chalk.bold.red(verifier.verification_uri);
        const authCode = chalk.bold.red(verifier.user_code);
                
        const table = new Table({
          rows: [
            [authWebsitePrefix, authWebsite],
            [authCodePrefix, authCode]
          ]
        });
                
        // Use table if available, fallback to plain text
        const tableString = table.toString();
        if (tableString !== '') {
          // eslint-disable-next-line no-console
          console.log(tableString);
        } else {
          // eslint-disable-next-line no-console
          console.log(`\t${authWebsitePrefix} ${authWebsite}`);
          // eslint-disable-next-line no-console
          console.log(`\t${authCodePrefix} ${authCode}`);
        }
                
        // eslint-disable-next-line no-console
        console.log('\nCopy and paste the Authorization code into correct field on the Authorization website. Once authorized setup will continue.\n');
        open(verifier.verification_uri);
      }
    });

    // Call GitHub to obtain the token
    const accessToken = await deviceauth({type: 'oauth'});
    accessToken.deviceCode = deviceCode;
    return accessToken;
  }

  /**
     * Verifies if the access token is valid and gets a new one if needed
     * @async
     * @param {Boolean} saveToConfig - Whether to save to the configuration file, default is true
     * @returns {Array} [success, statusObject, tokenData]
     */
  async verifyAccessToken(saveToConfig = true) {
    // Check if config exists and has GitHub section
    if (this.configExists && !this.verifyGitHubSection()) {
      return [
        false, 
        {status_code: 500, status_msg: 'The GitHub section is not available in the configuration file'}, 
        null
      ];
    }

    // Get authorization details
    let accessToken;
    let authType = 'deviceFlow'; // Default
        
    if (this.configExists) {
      accessToken = this.getAccessTokenFromConfig();
      authType = this.getAuthTypeFromConfig() || authType;
    }
        
    // Check token validity
    const validToken = this.configExists ? 
      await this.checkTokenExpiration(accessToken) : 
      [false, {status_code: 500, status_msg: 'The configuration file isn\'t present'}, null];
            
    // If token is valid, return it
    if (validToken[0] && this.configExists) {
      return [
        true, 
        {status_code: 200, status_msg: validToken[1].status_msg},
        {token: accessToken, authType: authType}
      ];
    } 
        
    // Token is invalid or missing, handle based on auth type
    if (authType === 'pat') {
      // PAT is invalid, caller must handle
      return [
        false, 
        {
          status_code: 500, 
          status_msg: `The Personal Access Token appears to be invalid and was rejected with an error message [${validToken[1].status_msg}].\n\tPlease obtain a new PAT and update the GitHub token setting in the configuration file [${this.configFile}].`
        }, 
        null
      ];
    } else if (authType === 'deviceFlow') {
      // Get new token via device flow
      const tokenData = await this.getAccessTokenDeviceFlow();
            
      // Update config if it exists and saveToConfig is true
      if (this.configExists && this.config && saveToConfig) {
        let tmpConfig = this.environ.updateConfigSetting(this.config, 'GitHub', 'token', tokenData.token);
        tmpConfig = this.environ.updateConfigSetting(tmpConfig[1], 'GitHub', 'authType', authType);
        tmpConfig = this.environ.updateConfigSetting(tmpConfig[1], 'GitHub', 'deviceCode', tokenData.deviceCode);
                
        // Save updates
        this.config = tmpConfig[1];
        if (saveToConfig) {
          await this.config.write(this.configFile);
        }
      }

      return [
        true, 
        {
          status_code: 200, 
          status_msg: `The access token has been successfully updated and saved to the configuration file [${this.configFile}]`
        },
        {token: tokenData.token, authType: authType, deviceCode: tokenData.deviceCode}
      ];
    }
        
    // Fallback for unexpected auth type
    return [
      false, 
      {status_code: 500, status_msg: `Unsupported authentication type: ${authType}`}, 
      null
    ];
  }
}

export {GitHubAuth};