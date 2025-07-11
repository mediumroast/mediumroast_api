# GitHub Authentication Tutorial

## Navigation

- **[⬅️ Getting Started](./github-getting-started.md)** - Prerequisites, installation, and basic setup
- **[📋 All Tutorials](./README.md)** - Complete tutorial directory
- **[⚡ Repository Management](./github-repository.md)** - Repository operations tutorial
- **[🔧 GitHub Actions](./github-actions.md)** - Actions workflow management

## Introduction

This tutorial provides a comprehensive guide for implementing GitHub authentication using the Mediumroast API. You'll learn about the different authentication methods available, with a focus on the device flow authentication pattern that's ideal for CLI applications and environments without direct browser access.

> **Prerequisites**: Before starting this tutorial, complete the [Getting Started Guide](./github-getting-started.md) to set up your development environment and understand the basic configuration patterns.

## Authentication Methods Overview

The Mediumroast API supports multiple authentication approaches through the `GitHubAuth` class:

### 1. Device Flow Authentication (Recommended)
- **Best for**: CLI applications, headless environments, desktop applications
- **Benefits**: No client secret required, user-friendly browser-based flow
- **Security**: OAuth-compliant, limited scope permissions

### 2. Personal Access Token (PAT)
- **Best for**: Development, testing, personal scripts
- **Benefits**: Simple setup, immediate use
- **Security**: Full account access, requires manual management

### 3. GitHub App Authentication
- **Best for**: Production applications, organizational integrations
- **Benefits**: Fine-grained permissions, organizational control
- **Security**: Limited scope, audit trail, managed by organization admins

## Device Flow Authentication Implementation

### Understanding the Device Flow Process

The device flow follows these secure steps:

1. **Device Code Request**: Your application requests a device code from GitHub
2. **User Code Display**: GitHub returns a user code and verification URL
3. **Browser Authorization**: User visits the URL and enters the code
4. **Polling**: Your application polls GitHub until authorization completes
5. **Token Receipt**: Upon success, GitHub provides an access token

### Complete Example Implementation

The Mediumroast API includes a complete device flow authentication example in **[github-device-auth.js](./github-device-auth.js)**:

```bash
# Run the complete authentication example
node examples/github-device-auth.js
```

This example demonstrates:
- **Interactive Setup**: Browser-based user authorization
- **Configuration Management**: Automatic token storage and retrieval
- **Token Validation**: Verification with test API calls
- **Error Handling**: Comprehensive error management patterns

### Basic Authentication Workflow

```javascript
import { GitHubAuth } from 'mediumroast_api/src/api/authorize.js';

// Initialize authentication
const github = new GitHubAuth(env, environ, configFile, configExists);

// Verify or obtain access token
const tokenResult = await github.verifyAccessToken();

if (tokenResult[0]) {
    console.log('✅ Authentication successful');
    const token = tokenResult[2].token;
    // Use token for API operations
} else {
    console.error(`❌ Authentication failed: ${tokenResult[1].status_msg}`);
}
```

### Configuration Requirements

For device flow authentication, set up your configuration:

```ini
[GitHub]
# GitHub OAuth App Client ID
clientId = your-oauth-app-client-id

# Organization name  
org = your-organization

# Authentication type (deviceFlow or pat)
authType = deviceFlow
```

## Authentication Class Methods

### Core Authentication Methods

```javascript
// Check if access token is valid
const isValid = await github.checkTokenExpiration(token);

// Get new token via device flow
const tokenData = await github.getAccessTokenDeviceFlow();

// Verify and refresh token if needed
const result = await github.verifyAccessToken(saveToConfig = true);
```

### Configuration Management

```javascript
// Check if GitHub section exists in config
const hasGitHubSection = github.verifyGitHubSection();

// Get token from configuration
const token = github.getAccessTokenFromConfig();

// Get authentication type
const authType = github.getAuthTypeFromConfig();
```

## Production-Ready Authentication Pattern

### Robust Authentication Handler

```javascript
class AuthenticationManager {
    constructor(configFile = './config.ini') {
        this.configFile = configFile;
        this.configExists = fs.existsSync(configFile);
        this.environ = new Environ();
        this.github = new GitHubAuth(env, this.environ, configFile, this.configExists);
    }

    async ensureAuthentication() {
        try {
            const result = await this.github.verifyAccessToken();
            
            if (result[0]) {
                console.log('✅ Authentication verified');
                return result[2].token;
            } else {
                throw new Error(result[1].status_msg);
            }
        } catch (error) {
            console.error(`❌ Authentication failed: ${error.message}`);
            throw error;
        }
    }

    async refreshToken() {
        try {
            console.log('🔄 Refreshing authentication...');
            const tokenData = await this.github.getAccessTokenDeviceFlow();
            console.log('✅ Token refreshed successfully');
            return tokenData.token;
        } catch (error) {
            console.error(`❌ Token refresh failed: ${error.message}`);
            throw error;
        }
    }
}

// Usage
const authManager = new AuthenticationManager();
const token = await authManager.ensureAuthentication();
```

### Environment Configuration Helper

```javascript
class Environ {
    readConfig(filePath) {
        const config = new ConfigParser();
        if (fs.existsSync(filePath)) {
            config.read(filePath);
        }
        return config;
    }

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

}

## OAuth App Setup Guide

### Creating a GitHub OAuth App

1. **Navigate to GitHub Developer Settings**:
   - Go to [GitHub Developer Settings](https://github.com/settings/developers)
   - Click "New OAuth App"

2. **Configure Your Application**:
   ```
   Application Name: Your App Name
   Homepage URL: https://your-domain.com (or http://localhost for development)
   Application Description: Description of your application
   Authorization callback URL: http://localhost
   ```

3. **Save Your Client ID**:
   - After creation, note your Client ID
   - **Important**: No client secret is needed for device flow

4. **Update Configuration**:
   ```ini
   [GitHub]
   clientId = your-oauth-app-client-id
   org = your-organization
   authType = deviceFlow
   ```

## Authentication Security Best Practices

### Token Management

```javascript
class SecureTokenManager {
    constructor(configFile) {
        this.configFile = configFile;
        this.github = new GitHubAuth(env, environ, configFile, true);
    }

    async validateToken(token) {
        const result = await this.github.checkTokenExpiration(token);
        
        if (!result[0]) {
            console.warn('⚠️ Token validation failed:', result[1].status_msg);
            return false;
        }
        
        console.log('✅ Token is valid');
        return true;
    }

    async rotateToken() {
        console.log('🔄 Rotating authentication token...');
        const newToken = await this.github.getAccessTokenDeviceFlow();
        
        // Revoke old token if possible
        await this.revokeOldToken();
        
        return newToken;
    }

    async revokeOldToken() {
        // Implementation for token revocation
        console.log('🗑️ Revoking old token...');
    }
}
```

### Environment Variables Alternative

For enhanced security, use environment variables:

```javascript
// Load from environment instead of config file
const env = {
    clientId: process.env.GITHUB_CLIENT_ID,
    GitHub: {
        clientId: process.env.GITHUB_CLIENT_ID
    }
};

// Skip config file for sensitive environments
const github = new GitHubAuth(env, environ, null, false);
```

## Error Handling and Troubleshooting

### Common Authentication Issues

#### Invalid Client ID
```javascript
// Error: Bad request - invalid client_id
// Solution: Verify OAuth App configuration
```

#### Authorization Timeout
```javascript
// Error: Device flow authorization expired
// Solution: Restart authentication flow
async function handleTimeout() {
    console.log('⏰ Authorization timeout - restarting flow...');
    const newToken = await github.getAccessTokenDeviceFlow();
    return newToken;
}
```

#### Rate Limiting
```javascript
// Error: API rate limit exceeded
// Solution: Implement retry with backoff
async function retryWithBackoff(operation, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error) {
            if (error.message.includes('rate limit')) {
                const delay = Math.pow(2, i) * 1000;
                console.log(`⏳ Rate limited, waiting ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw error;
        }
    }
    throw new Error('Max retries exceeded');
}
```

### Comprehensive Error Handler

```javascript
async function safeAuthentication(github) {
    try {
        const result = await github.verifyAccessToken();
        
        if (!result[0]) {
            const error = result[1];
            
            switch (error.status_code) {
                case 401:
                    console.log('🔄 Token expired, refreshing...');
                    return await github.getAccessTokenDeviceFlow();
                    
                case 403:
                    console.error('❌ Insufficient permissions');
                    throw new Error('Check OAuth app scopes');
                    
                case 500:
                    console.error('❌ Configuration error:', error.status_msg);
                    throw new Error(error.status_msg);
                    
                default:
                    console.error('❌ Unknown error:', error.status_msg);
                    throw new Error(error.status_msg);
            }
        }
        
        return result[2];
    } catch (error) {
        console.error('❌ Authentication failed:', error.message);
        throw error;
    }
}
```

## Integration with Mediumroast API

### Using Authentication with API Classes

```javascript
import { GitHubFunctions } from 'mediumroast_api';

async function createAuthenticatedClient() {
    const authManager = new AuthenticationManager();
    const token = await authManager.ensureAuthentication();
    
    // Initialize GitHub API client
    const github = new GitHubFunctions(token, 'your-org', 'your-app');
    
    // Verify connection
    const status = await github.checkGitHubAppInstallation();
    if (status[0]) {
        console.log('✅ GitHub API client ready');
        return github;
    } else {
        throw new Error('GitHub App not properly configured');
    }
}

// Usage
const github = await createAuthenticatedClient();
const repositories = await github.getRepositories();
```

### CLI Application Integration

```javascript
#!/usr/bin/env node

import { GitHubAuth } from 'mediumroast_api/src/api/authorize.js';

async function main() {
    console.log('🔐 Initializing authentication...');
    
    try {
        const auth = new GitHubAuth(env, environ, './config.ini', true);
        const result = await auth.verifyAccessToken();
        
        if (result[0]) {
            console.log('✅ Authentication successful');
            await runApplication(result[2].token);
        } else {
            console.error('❌ Authentication failed');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

async function runApplication(token) {
    // Your application logic here
    console.log('🚀 Running authenticated application...');
}

main();
```

## Complete Working Example

The **[github-device-auth.js](./github-device-auth.js)** example provides a full implementation that you can run immediately:

```bash
# Install dependencies
npm install configparser

# Run the authentication example
node examples/github-device-auth.js
```

### What the Example Demonstrates

1. **Interactive Authentication**: Opens browser for user authorization
2. **Configuration Management**: Automatically saves tokens to config file
3. **Token Validation**: Tests the token with a GitHub API call
4. **Error Handling**: Comprehensive error management
5. **User Experience**: Clear prompts and status messages

### Example Output

```
GitHub Device Flow Authentication Example
=======================================

Using configuration from: examples/config.ini
Using Client ID: your-client-id
Setting up GitHub authentication...
Starting device flow authentication...

┌─────────────────────┬─────────────────────────────────────┐
│ Authorization website: │ https://github.com/login/device      │
├─────────────────────┼─────────────────────────────────────┤
│ Authorization code:    │ ABCD-1234                           │
└─────────────────────┴─────────────────────────────────────┘

Authentication successful!
Token received: ghp_xx...
Token saved to configuration file.

Testing token with a simple API call...
Authentication validated! User details:
- Username: your-username
- Name: Your Name
- Email: your-email@example.com
```

## Next Steps

After completing authentication setup:

1. **[Repository Management](./github-repository.md)** - Create and manage repositories
2. **[GitHub Actions](./github-actions.md)** - Workflow automation and management
3. **[Read Operations](./github-read-operations-tutorial.md)** - Safe data retrieval patterns
4. **[Write Operations](./github-write-operations-tutorial.md)** - Secure write operation patterns

---

## Navigation

- **[⬅️ Getting Started](./github-getting-started.md)** - Prerequisites, installation, and basic setup
- **[📋 All Tutorials](./README.md)** - Complete tutorial directory
- **[⚡ Repository Management](./github-repository.md)** - Repository operations tutorial
- **[🔧 GitHub Actions](./github-actions.md)** - Actions workflow management

## Related Resources

- [GitHub OAuth Apps Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [GitHub Device Flow Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps/authorizing-oauth-apps#device-flow)
- [Mediumroast API Documentation](../docs/)
- [GitHub API Authentication](https://docs.github.com/en/rest/guides/basics-of-authentication)