# GitHub Write Operations Tutorial

## Introduction

This tutorial provides a comprehensive guide for client application developers to implement GitHub write operations using the Mediumroast API. You'll learn how to create repositories, set up containers, and manage GitHub Actions with robust pre-flight checks and user-friendly prompts. The workflow includes safety measures to prevent permission errors and accidental overwrites.

## Prerequisites

Before you begin, ensure you have:

1. **Node.js** (v16 or higher) installed
2. **Mediumroast for GitHub App** installed on your GitHub organization
   - The app provides the necessary permissions for repository management
   - Install it from: [GitHub Apps Marketplace](https://github.com/apps/mediumroast-for-github)
3. **Admin access** to the GitHub organization where you want to create repositories
4. **The Mediumroast API** package installed in your project

## Installation and Setup

### Install the Mediumroast API

```bash
npm install mediumroast_api
```

### Configuration Setup

Create a `config.ini` file in your project directory:

```ini
[GitHub]
# GitHub organization name
org = YOUR_ORGANIZATION_NAME

# Repository configuration
repoName = my-study-repo
repoDescription = A repository for conducting studies

# Container configuration  
containerName = my-study-container
containerDescription = Container for study artifacts

# Actions configuration
actionsRepo = mr4gh-automations
actionsOrg = mediumroast
```

> **Note**: No GitHub token is required in the configuration when using the Mediumroast for GitHub App, as authentication is handled through the app's installation.

## Understanding the Workflow

The Mediumroast API provides a safe, step-by-step workflow that includes:

1. **Pre-flight checks** to verify the GitHub App installation and permissions
2. **Existence detection** for repositories, containers, and actions
3. **User prompts** to confirm or skip operations when components already exist
4. **Robust error handling** with clear, actionable messages

## Basic Client Implementation

### Import Required Modules

```javascript
import { GitHubFunctions } from 'mediumroast_api/src/api/github.js';
import { EnvironmentManager } from 'mediumroast_api/src/api/environments.js';
import { readFileSync } from 'fs';
import inquirer from 'inquirer';
```

### Initialize the API Client

```javascript
// Load configuration
const env = new EnvironmentManager('./config.ini');

// Initialize GitHub functions
const github = new GitHubFunctions(
    env.getConfigValue('GitHub', 'org'),
    null, // No token required with GitHub App
    false // Production mode
);
```

## Pre-flight Checks and Safety Features

### GitHub App Installation Check

The workflow starts by verifying that the Mediumroast for GitHub App is properly installed:

```javascript
async function checkGitHubAppInstallation(github, orgName) {
    console.log(`🔍 Checking Mediumroast for GitHub App installation for organization: ${orgName}`);
    
    const result = await github.getInstallationsByOrg(orgName);
    
    if (!result[0]) {
        console.error('❌ Failed to check GitHub App installations');
        return false;
    }

    const installations = result[2]?.installations || [];
    const mediumroastApp = installations.find(
        install => install.app_slug === 'mediumroast-for-github'
    );

    if (!mediumroastApp) {
        console.error(`❌ Mediumroast for GitHub App is not installed on organization: ${orgName}`);
        console.log('\n📋 To proceed, please:');
        console.log('1. Install the app from: https://github.com/apps/mediumroast-for-github');
        console.log('2. Grant it access to your organization');
        console.log('3. Ensure it has permissions for repository management');
        return false;
    }

    console.log('✅ Mediumroast for GitHub App is properly installed');
    return true;
}
```

### Existing Resource Detection

Before creating any resources, the system checks for existing components:

```javascript
async function checkExistingInstallations(github, config) {
    const results = {
        repository: null,
        container: null,
        actions: null
    };

    // Check repository
    console.log('🔍 Checking for existing repository...');
    const repoResult = await github.repositoryManager.getByName(
        config.org, 
        config.repoName
    );
    
    if (repoResult[0] && repoResult[2]) {
        results.repository = repoResult[2];
        console.log(`✅ Repository "${config.repoName}" already exists`);
    } else {
        console.log(`📝 Repository "${config.repoName}" not found - will be created`);
    }

    // Check container
    console.log('🔍 Checking for existing container...');
    const containerResult = await github.containerManager.getByName(
        config.org, 
        config.containerName
    );
    
    if (containerResult[0] && containerResult[2]) {
        results.container = containerResult[2];
        console.log(`✅ Container "${config.containerName}" already exists`);
    } else {
        console.log(`📦 Container "${config.containerName}" not found - will be created`);
    }

    // Check actions installation
    if (results.repository) {
        console.log('🔍 Checking for existing GitHub Actions...');
        const actionsCheck = await github.actionsManager.getCurrentVersion();
        
        if (actionsCheck[0] && actionsCheck[2]?.installed) {
            results.actions = actionsCheck[2];
            console.log(`✅ GitHub Actions already installed (version: ${actionsCheck[2].version_file?.content?.version})`);
        } else {
            console.log('🚀 GitHub Actions not found - will be installed');
        }
    }

    return results;
}
```

### User Prompts for Safe Operations

When existing resources are detected, users are prompted to confirm their actions:

```javascript
async function promptForExistingInstallations(existingInstallations) {
    const operations = {
        createRepository: true,
        setupContainer: true,
        installActions: true
    };

    if (existingInstallations.repository) {
        const answer = await inquirer.prompt([{
            type: 'confirm',
            name: 'proceed',
            message: '⚠️  Repository already exists. Skip repository creation?',
            default: true
        }]);
        operations.createRepository = !answer.proceed;
    }

    if (existingInstallations.container) {
        const answer = await inquirer.prompt([{
            type: 'confirm',
            name: 'proceed',
            message: '⚠️  Container already exists. Skip container setup?',
            default: true
        }]);
        operations.setupContainer = !answer.proceed;
    }

    if (existingInstallations.actions) {
        const choices = [
            { name: 'Skip actions installation', value: 'skip' },
            { name: 'Update to latest version', value: 'update' },
            { name: 'Reinstall from scratch', value: 'reinstall' }
        ];

        const answer = await inquirer.prompt([{
            type: 'list',
            name: 'action',
            message: '⚠️  GitHub Actions already installed. What would you like to do?',
            choices: choices,
            default: 'skip'
        }]);

        operations.installActions = answer.action !== 'skip';
        operations.actionsOperation = answer.action;
    }

    return operations;
}
```

## Complete Client Application Example

Here's a complete example that demonstrates how to integrate all the safety features:

```javascript
import { GitHubFunctions } from 'mediumroast_api/src/api/github.js';
import { EnvironmentManager } from 'mediumroast_api/src/api/environments.js';
import inquirer from 'inquirer';

async function demonstrateRepositorySetup() {
    try {
        // Load configuration
        const env = new EnvironmentManager('./config.ini');
        const config = {
            org: env.getConfigValue('GitHub', 'org'),
            repoName: env.getConfigValue('GitHub', 'repoName'),
            repoDescription: env.getConfigValue('GitHub', 'repoDescription'),
            containerName: env.getConfigValue('GitHub', 'containerName'),
            containerDescription: env.getConfigValue('GitHub', 'containerDescription'),
            actionsRepo: env.getConfigValue('GitHub', 'actionsRepo'),
            actionsOrg: env.getConfigValue('GitHub', 'actionsOrg')
        };

        console.log('🚀 Starting GitHub repository setup...\n');

        // Initialize GitHub functions
        const github = new GitHubFunctions(config.org, null, false);

        // Step 1: Pre-flight check for GitHub App
        const appInstalled = await checkGitHubAppInstallation(github, config.org);
        if (!appInstalled) {
            console.log('\n❌ Cannot proceed without proper GitHub App installation');
            return;
        }

        // Step 2: Check for existing installations
        console.log('\n📋 Checking existing installations...');
        const existingInstallations = await checkExistingInstallations(github, config);

        // Step 3: Get user preferences for existing resources
        const operations = await promptForExistingInstallations(existingInstallations);

        console.log('\n🔧 Starting operations based on your preferences...\n');

        // Step 4: Repository creation
        if (operations.createRepository) {
            console.log('📝 Creating repository...');
            const repoResult = await github.repositoryManager.create(
                config.org,
                config.repoName,
                config.repoDescription,
                true // private repository
            );

            if (repoResult[0]) {
                console.log(`✅ Repository "${config.repoName}" created successfully`);
                console.log(`   📍 URL: ${repoResult[2].html_url}`);
            } else {
                console.error(`❌ Failed to create repository: ${repoResult[1]}`);
                return;
            }
        } else {
            console.log('⏭️  Skipping repository creation');
        }

        // Step 5: Container setup
        if (operations.setupContainer) {
            console.log('\n📦 Setting up container...');
            const containerResult = await github.containerManager.create(
                config.org,
                config.containerName,
                config.containerDescription
            );

            if (containerResult[0]) {
                console.log(`✅ Container "${config.containerName}" set up successfully`);
            } else {
                console.error(`❌ Failed to set up container: ${containerResult[1]}`);
            }
        } else {
            console.log('⏭️  Skipping container setup');
        }

        // Step 6: GitHub Actions management
        if (operations.installActions) {
            console.log('\n🚀 Managing GitHub Actions...');
            
            let actionsResult;
            if (operations.actionsOperation === 'update') {
                actionsResult = await github.actionsManager.updateActions(true);
                console.log('🔄 Updating GitHub Actions to latest version...');
            } else if (operations.actionsOperation === 'reinstall') {
                // Delete existing actions first
                await github.actionsManager.deleteActions();
                actionsResult = await github.actionsManager.installActions(true);
                console.log('🔄 Reinstalling GitHub Actions from scratch...');
            } else {
                actionsResult = await github.actionsManager.installActions(true);
                console.log('📥 Installing GitHub Actions...');
            }

            if (actionsResult[0]) {
                console.log('✅ GitHub Actions operation completed successfully');
                if (actionsResult[2]?.version) {
                    console.log(`   📋 Version: ${actionsResult[2].version}`);
                }
                if (actionsResult[2]?.workflows) {
                    console.log(`   📄 Workflows installed: ${actionsResult[2].workflows.length}`);
                }
            } else {
                console.error(`❌ Failed to manage GitHub Actions: ${actionsResult[1]}`);
            }
        } else {
            console.log('⏭️  Skipping GitHub Actions installation');
        }

        console.log('\n🎉 Repository setup completed successfully!');
        console.log('\n📋 Summary:');
        console.log(`   Organization: ${config.org}`);
        console.log(`   Repository: ${config.repoName}`);
        console.log(`   Container: ${config.containerName}`);
        console.log('   Setup is ready for your studies and data collection');

    } catch (error) {
        console.error('\n💥 An unexpected error occurred:', error.message);
        console.log('\n🔧 Troubleshooting tips:');
        console.log('   • Check your network connection');
        console.log('   • Verify the Mediumroast for GitHub App has proper permissions');
        console.log('   • Ensure the organization name in config.ini is correct');
        console.log('   • Try running the script again');
    }
}

// Helper functions (checkGitHubAppInstallation, checkExistingInstallations, promptForExistingInstallations)
// [Include the helper functions from the previous sections]

// Run the demonstration
demonstrateRepositorySetup();
```

## Individual Operation Examples

### Repository Management

#### Creating a New Repository

```javascript
async function createRepository(github, config) {
    console.log(`📝 Creating repository: ${config.repoName}`);
    
    const result = await github.repositoryManager.create(
        config.org,
        config.repoName,
        config.repoDescription,
        true // private repository
    );

    if (result[0]) {
        console.log('✅ Repository created successfully');
        console.log(`   📍 URL: ${result[2].html_url}`);
        console.log(`   🔒 Private: ${result[2].private}`);
        return result[2];
    } else {
        console.error(`❌ Failed to create repository: ${result[1]}`);
        throw new Error(result[1]);
    }
}
```

#### Checking Repository Status

```javascript
async function checkRepositoryStatus(github, org, repoName) {
    const result = await github.repositoryManager.getByName(org, repoName);
    
    if (result[0] && result[2]) {
        const repo = result[2];
        console.log(`📊 Repository Status:`);
        console.log(`   Name: ${repo.name}`);
        console.log(`   Description: ${repo.description}`);
        console.log(`   Private: ${repo.private}`);
        console.log(`   Created: ${new Date(repo.created_at).toLocaleString()}`);
        console.log(`   Last Updated: ${new Date(repo.updated_at).toLocaleString()}`);
        return repo;
    } else {
        console.log(`📝 Repository "${repoName}" not found`);
        return null;
    }
}
```

### Container Management

#### Setting Up a Container

```javascript
async function setupContainer(github, config) {
    console.log(`📦 Setting up container: ${config.containerName}`);
    
    const result = await github.containerManager.create(
        config.org,
        config.containerName,
        config.containerDescription
    );

    if (result[0]) {
        console.log('✅ Container set up successfully');
        console.log(`   📦 Name: ${config.containerName}`);
        console.log(`   📄 Description: ${config.containerDescription}`);
        return result[2];
    } else {
        console.error(`❌ Failed to set up container: ${result[1]}`);
        throw new Error(result[1]);
    }
}
```

#### Container Status Check

```javascript
async function checkContainerStatus(github, org, containerName) {
    const result = await github.containerManager.getByName(org, containerName);
    
    if (result[0] && result[2]) {
        const container = result[2];
        console.log(`📊 Container Status:`);
        console.log(`   Name: ${container.name}`);
        console.log(`   Description: ${container.description}`);
        console.log(`   Visibility: ${container.visibility}`);
        return container;
    } else {
        console.log(`📦 Container "${containerName}" not found`);
        return null;
    }
}
```

### GitHub Actions Management

#### Installing GitHub Actions

```javascript
async function installGitHubActions(github, debugMode = true) {
    console.log('🚀 Installing GitHub Actions...');
    
    const result = await github.actionsManager.installActions(debugMode);

    if (result[0]) {
        console.log('✅ GitHub Actions installed successfully');
        
        if (result[2]?.version) {
            console.log(`   📋 Version: ${result[2].version}`);
        }
        
        if (result[2]?.workflows) {
            console.log(`   📄 Workflows: ${result[2].workflows.length} installed`);
            result[2].workflows.forEach(workflow => {
                console.log(`      • ${workflow.name}`);
            });
        }
        
        return result[2];
    } else {
        console.error(`❌ Failed to install GitHub Actions: ${result[1]}`);
        throw new Error(result[1]);
    }
}
```

#### Checking Actions Status

```javascript
async function checkActionsStatus(github) {
    const result = await github.actionsManager.getCurrentVersion();
    
    if (result[0] && result[2]?.installed) {
        const versionInfo = result[2].version_file?.content;
        console.log(`📊 GitHub Actions Status:`);
        console.log(`   ✅ Installed: Yes`);
        console.log(`   📋 Version: ${versionInfo?.version || 'Unknown'}`);
        console.log(`   📅 Updated: ${versionInfo?.updated_at ? new Date(versionInfo.updated_at).toLocaleString() : 'Unknown'}`);
        
        if (result[2].files?.workflows) {
            console.log(`   📄 Workflows: ${result[2].files.workflows.length}`);
            result[2].files.workflows.forEach(workflow => {
                console.log(`      • ${workflow.name}`);
            });
        }
        
        return result[2];
    } else {
        console.log(`📊 GitHub Actions Status: Not installed`);
        return null;
    }
}
```

#### Updating GitHub Actions

```javascript
async function updateGitHubActions(github, debugMode = true) {
    console.log('🔄 Checking for GitHub Actions updates...');
    
    // First check if updates are available
    const updateCheck = await github.actionsManager.checkForUpdates();
    
    if (!updateCheck[0]) {
        console.error(`❌ Failed to check for updates: ${updateCheck[1]}`);
        throw new Error(updateCheck[1]);
    }
    
    if (!updateCheck[2].update_available) {
        console.log('✅ Already on the latest version');
        return updateCheck[2];
    }
    
    console.log(`📦 Update available: ${updateCheck[2].current_version} → ${updateCheck[2].latest_version}`);
    
    // Perform the update
    const result = await github.actionsManager.updateActions(debugMode);
    
    if (result[0]) {
        console.log('✅ GitHub Actions updated successfully');
        console.log(`   📋 New Version: ${updateCheck[2].latest_version}`);
        
        if (result[2]?.workflows_updated) {
            console.log(`   📄 Workflows Updated: ${result[2].workflows_updated.length}`);
        }
        
        return result[2];
    } else {
        console.error(`❌ Failed to update GitHub Actions: ${result[1]}`);
        throw new Error(result[1]);
    }
}
```

## Error Handling and Best Practices

### Comprehensive Error Handling

```javascript
async function safeOperation(operationName, operation) {
    try {
        console.log(`🔄 Starting: ${operationName}`);
        const result = await operation();
        console.log(`✅ Completed: ${operationName}`);
        return result;
    } catch (error) {
        console.error(`❌ Failed: ${operationName}`);
        console.error(`   Error: ${error.message}`);
        
        // Provide specific guidance based on error type
        if (error.message.includes('App not installed')) {
            console.log('\n🔧 Solution: Install the Mediumroast for GitHub App');
            console.log('   https://github.com/apps/mediumroast-for-github');
        } else if (error.message.includes('permission')) {
            console.log('\n🔧 Solution: Check app permissions and organization access');
        } else if (error.message.includes('already exists')) {
            console.log('\n🔧 Solution: Use the existence check and prompt features');
        }
        
        throw error;
    }
}

// Usage example
async function createRepositoryWithErrorHandling(github, config) {
    return await safeOperation('Repository Creation', async () => {
        return await createRepository(github, config);
    });
}
```

### Configuration Validation

```javascript
function validateConfiguration(config) {
    const required = ['org', 'repoName', 'containerName'];
    const missing = required.filter(key => !config[key]);
    
    if (missing.length > 0) {
        throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }
    
    // Validate naming conventions
    if (!/^[a-zA-Z0-9_-]+$/.test(config.repoName)) {
        throw new Error('Repository name contains invalid characters');
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(config.containerName)) {
        throw new Error('Container name contains invalid characters');
    }
    
    console.log('✅ Configuration validation passed');
    return true;
}
```

### Retry Logic for Network Operations

```javascript
async function withRetry(operation, maxRetries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            if (attempt === maxRetries) {
                throw error;
            }
            
            console.log(`⚠️  Attempt ${attempt} failed, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
        }
    }
}

// Usage example
const result = await withRetry(async () => {
    return await github.repositoryManager.create(org, repoName, description);
});
```

## Testing Your Integration

### Simple Test Script

Create a test script to verify your setup:

```javascript
// test-integration.js
import { GitHubFunctions } from 'mediumroast_api/src/api/github.js';
import { EnvironmentManager } from 'mediumroast_api/src/api/environments.js';

async function testIntegration() {
    try {
        // Load test configuration
        const env = new EnvironmentManager('./config.ini');
        const orgName = env.getConfigValue('GitHub', 'org');
        
        // Initialize GitHub functions
        const github = new GitHubFunctions(orgName, null, false);
        
        // Test 1: Check GitHub App installation
        console.log('🧪 Test 1: GitHub App Installation Check');
        const appResult = await github.getInstallationsByOrg(orgName);
        
        if (appResult[0]) {
            const installations = appResult[2]?.installations || [];
            const mediumroastApp = installations.find(
                install => install.app_slug === 'mediumroast-for-github'
            );
            
            if (mediumroastApp) {
                console.log('✅ GitHub App is installed');
            } else {
                console.log('❌ GitHub App not found');
                return;
            }
        } else {
            console.log('❌ Failed to check installations');
            return;
        }
        
        // Test 2: Check API permissions
        console.log('\n🧪 Test 2: API Permissions Check');
        const orgResult = await github.repositoryManager.getOrgInfo(orgName);
        
        if (orgResult[0]) {
            console.log('✅ Can access organization information');
        } else {
            console.log('❌ Cannot access organization');
            return;
        }
        
        // Test 3: List existing repositories
        console.log('\n🧪 Test 3: Repository Access Check');
        const reposResult = await github.repositoryManager.getAll();
        
        if (reposResult[0]) {
            console.log(`✅ Can list repositories (found ${reposResult[2]?.length || 0})`);
        } else {
            console.log('❌ Cannot list repositories');
        }
        
        console.log('\n🎉 Integration test completed successfully!');
        
    } catch (error) {
        console.error('\n💥 Integration test failed:', error.message);
        console.log('\n🔧 Check your configuration and app installation');
    }
}

testIntegration();
```

Run the test:

```bash
node test-integration.js
```

## Advanced Features

### Batch Operations

For organizations with multiple repositories, you can process them in batches:

```javascript
async function batchRepositorySetup(github, configs) {
    const results = [];
    
    for (const config of configs) {
        try {
            console.log(`\n🔄 Processing: ${config.repoName}`);
            
            // Check existing installations for this repo
            const existing = await checkExistingInstallations(github, config);
            
            // Skip if everything already exists
            if (existing.repository && existing.container && existing.actions) {
                console.log(`⏭️  All components exist for ${config.repoName}, skipping`);
                results.push({ config, status: 'skipped', reason: 'All components exist' });
                continue;
            }
            
            // Create missing components
            const result = await createRepositoryComponents(github, config, existing);
            results.push({ config, status: 'success', result });
            
        } catch (error) {
            console.error(`❌ Failed to process ${config.repoName}: ${error.message}`);
            results.push({ config, status: 'failed', error: error.message });
        }
    }
    
    // Summary report
    console.log('\n📊 Batch Operation Summary:');
    const successful = results.filter(r => r.status === 'success').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const failed = results.filter(r => r.status === 'failed').length;
    
    console.log(`   ✅ Successful: ${successful}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Failed: ${failed}`);
    
    return results;
}

async function createRepositoryComponents(github, config, existing) {
    const results = {};
    
    // Create repository if needed
    if (!existing.repository) {
        results.repository = await createRepository(github, config);
    }
    
    // Setup container if needed
    if (!existing.container) {
        results.container = await setupContainer(github, config);
    }
    
    // Install actions if needed
    if (!existing.actions) {
        results.actions = await installGitHubActions(github);
    }
    
    return results;
}
```

### Custom Workflow Integration

For advanced users who want to integrate custom workflows:

```javascript
async function deployCustomWorkflows(github, workflowsConfig) {
    console.log('🔧 Deploying custom workflows...');
    
    for (const workflow of workflowsConfig) {
        try {
            // Read workflow file
            const workflowContent = readFileSync(workflow.filePath, 'utf8');
            
            // Deploy to repository
            const result = await github.repositoryManager.createOrUpdateFile(
                workflow.org,
                workflow.repo,
                `.github/workflows/${workflow.name}`,
                workflowContent,
                `Deploy custom workflow: ${workflow.name}`,
                'main'
            );
            
            if (result[0]) {
                console.log(`✅ Deployed workflow: ${workflow.name}`);
            } else {
                console.error(`❌ Failed to deploy ${workflow.name}: ${result[1]}`);
            }
            
        } catch (error) {
            console.error(`❌ Error deploying ${workflow.name}: ${error.message}`);
        }
    }
}

// Usage example
const customWorkflows = [
    {
        name: 'custom-build.yml',
        filePath: './workflows/custom-build.yml',
        org: 'my-org',
        repo: 'my-repo'
    },
    {
        name: 'custom-deploy.yml',
        filePath: './workflows/custom-deploy.yml',
        org: 'my-org',
        repo: 'my-repo'
    }
];

await deployCustomWorkflows(github, customWorkflows);
```

### Monitoring and Logging

Implement comprehensive logging for production applications:

```javascript
class GitHubOperationsLogger {
    constructor(logLevel = 'info') {
        this.logLevel = logLevel;
        this.operations = [];
    }
    
    log(level, operation, message, data = null) {
        const timestamp = new Date().toISOString();
        const entry = {
            timestamp,
            level,
            operation,
            message,
            data
        };
        
        this.operations.push(entry);
        
        if (this.shouldLog(level)) {
            console.log(`[${timestamp}] ${level.toUpperCase()}: ${operation} - ${message}`);
            if (data && this.logLevel === 'debug') {
                console.log('Data:', JSON.stringify(data, null, 2));
            }
        }
    }
    
    shouldLog(level) {
        const levels = { error: 0, warn: 1, info: 2, debug: 3 };
        return levels[level] <= levels[this.logLevel];
    }
    
    info(operation, message, data) {
        this.log('info', operation, message, data);
    }
    
    error(operation, message, data) {
        this.log('error', operation, message, data);
    }
    
    debug(operation, message, data) {
        this.log('debug', operation, message, data);
    }
    
    getOperationSummary() {
        const summary = {
            total: this.operations.length,
            byLevel: {},
            byOperation: {}
        };
        
        this.operations.forEach(op => {
            summary.byLevel[op.level] = (summary.byLevel[op.level] || 0) + 1;
            summary.byOperation[op.operation] = (summary.byOperation[op.operation] || 0) + 1;
        });
        
        return summary;
    }
    
    exportLogs(filePath) {
        const logs = JSON.stringify(this.operations, null, 2);
        writeFileSync(filePath, logs);
        console.log(`📄 Logs exported to: ${filePath}`);
    }
}

// Usage in your application
const logger = new GitHubOperationsLogger('debug');

async function monitoredRepositorySetup(config) {
    try {
        logger.info('Setup', 'Starting repository setup', { org: config.org, repo: config.repoName });
        
        const github = new GitHubFunctions(config.org, null, false);
        
        // Pre-flight checks with logging
        logger.info('PreFlight', 'Checking GitHub App installation');
        const appInstalled = await checkGitHubAppInstallation(github, config.org);
        
        if (!appInstalled) {
            logger.error('PreFlight', 'GitHub App not installed');
            throw new Error('GitHub App not installed');
        }
        
        logger.info('PreFlight', 'GitHub App installation verified');
        
        // Continue with setup...
        const result = await demonstrateRepositorySetup();
        
        logger.info('Setup', 'Repository setup completed successfully', result);
        
        // Export logs for audit trail
        logger.exportLogs(`./logs/setup-${Date.now()}.json`);
        
        return result;
        
    } catch (error) {
        logger.error('Setup', 'Repository setup failed', { error: error.message });
        throw error;
    }
}
```

## Production Deployment Considerations

### Environment Configuration

For production applications, use environment-specific configurations:

```javascript
// config/production.ini
[GitHub]
org = production-org
repoName = prod-study-repo
containerName = prod-study-container
logLevel = info

// config/development.ini
[GitHub]
org = dev-org
repoName = dev-study-repo
containerName = dev-study-container
logLevel = debug

// config/staging.ini
[GitHub]
org = staging-org
repoName = staging-study-repo
containerName = staging-study-container
logLevel = info
```

```javascript
function loadEnvironmentConfig() {
    const environment = process.env.NODE_ENV || 'development';
    const configFile = `./config/${environment}.ini`;
    
    if (!existsSync(configFile)) {
        throw new Error(`Configuration file not found: ${configFile}`);
    }
    
    console.log(`📋 Loading configuration for environment: ${environment}`);
    return new EnvironmentManager(configFile);
}
```

### Health Checks and Monitoring

```javascript
async function performHealthCheck(github, config) {
    const healthStatus = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        checks: {}
    };
    
    try {
        // Check GitHub App installation
        healthStatus.checks.githubApp = await checkGitHubAppHealth(github, config.org);
        
        // Check repository access
        healthStatus.checks.repositoryAccess = await checkRepositoryAccess(github, config);
        
        // Check container access
        healthStatus.checks.containerAccess = await checkContainerAccess(github, config);
        
        // Check actions status
        healthStatus.checks.actionsStatus = await checkActionsHealth(github);
        
        // Overall health
        const allHealthy = Object.values(healthStatus.checks).every(check => check.healthy);
        healthStatus.overall = allHealthy ? 'healthy' : 'unhealthy';
        
        return healthStatus;
        
    } catch (error) {
        healthStatus.overall = 'error';
        healthStatus.error = error.message;
        return healthStatus;
    }
}

async function checkGitHubAppHealth(github, orgName) {
    try {
        const result = await github.getInstallationsByOrg(orgName);
        const hasApp = result[0] && result[2]?.installations?.some(
            install => install.app_slug === 'mediumroast-for-github'
        );
        
        return {
            healthy: hasApp,
            message: hasApp ? 'GitHub App installed and accessible' : 'GitHub App not found',
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return {
            healthy: false,
            message: `Failed to check GitHub App: ${error.message}`,
            timestamp: new Date().toISOString()
        };
    }
}
```

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. GitHub App Not Installed

**Symptoms:**
- Error: "Mediumroast for GitHub App is not installed"
- API calls fail with authentication errors

**Solutions:**
```javascript
// Check installation status
async function diagnoseAppInstallation(github, orgName) {
    console.log('🔍 Diagnosing GitHub App installation...');
    
    const result = await github.getInstallationsByOrg(orgName);
    
    if (!result[0]) {
        console.log('❌ Cannot access organization installations');
        console.log('   • Check organization name spelling');
        console.log('   • Verify organization exists and is accessible');
        return;
    }
    
    const installations = result[2]?.installations || [];
    console.log(`📊 Found ${installations.length} app installations`);
    
    installations.forEach(install => {
        console.log(`   • ${install.app_slug} (${install.target_type})`);
    });
    
    const mediumroastApp = installations.find(
        install => install.app_slug === 'mediumroast-for-github'
    );
    
    if (!mediumroastApp) {
        console.log('\n🔧 Solution: Install the Mediumroast for GitHub App');
        console.log('   1. Visit: https://github.com/apps/mediumroast-for-github');
        console.log('   2. Click "Install"');
        console.log('   3. Select your organization');
        console.log('   4. Grant required permissions');
    } else {
        console.log('✅ Mediumroast for GitHub App is installed');
    }
}
```

#### 2. Permission Errors

**Symptoms:**
- "Permission denied" errors
- Cannot create repositories or containers

**Solutions:**
```javascript
async function checkPermissions(github, config) {
    console.log('🔍 Checking permissions...');
    
    // Test repository permissions
    try {
        await github.repositoryManager.getOrgInfo(config.org);
        console.log('✅ Organization access: OK');
    } catch (error) {
        console.log('❌ Organization access: FAILED');
        console.log('   • Verify the GitHub App has organization access');
    }
    
    // Test repository creation permissions
    try {
        const testResult = await github.repositoryManager.getAll();
        if (testResult[0]) {
            console.log('✅ Repository read access: OK');
        }
    } catch (error) {
        console.log('❌ Repository read access: FAILED');
        console.log('   • Check app permissions for repository access');
    }
}
```

#### 3. Network and Connectivity Issues

```javascript
async function diagnoseConnectivity() {
    console.log('🔍 Diagnosing connectivity...');
    
    try {
        // Test GitHub API connectivity
        const response = await fetch('https://api.github.com');
        if (response.ok) {
            console.log('✅ GitHub API connectivity: OK');
        } else {
            console.log(`❌ GitHub API responded with status: ${response.status}`);
        }
    } catch (error) {
        console.log('❌ GitHub API connectivity: FAILED');
        console.log('   • Check internet connection');
        console.log('   • Verify firewall settings');
        console.log(`   • Error: ${error.message}`);
    }
}
```

## Conclusion

This tutorial provides a comprehensive guide for implementing GitHub write operations using the Mediumroast API in client applications. The key features include:

### ✅ **Safety First**
- Pre-flight checks for GitHub App installation
- Existence detection for all resources
- User prompts to prevent accidental overwrites
- Comprehensive error handling and recovery

### 🔧 **Developer-Friendly**
- Clear, step-by-step implementation guide
- Reusable code examples and patterns
- Extensive logging and debugging support
- Production-ready error handling

### 🚀 **Production-Ready**
- Environment-specific configurations
- Health checks and monitoring
- Batch operations for scale
- Audit trails and logging

### 📚 **Well-Documented**
- Complete API coverage
- Troubleshooting guides
- Best practices and patterns
- Testing strategies

By following this tutorial, you can build robust client applications that safely and efficiently manage GitHub repositories, containers, and actions through the Mediumroast API. The workflow ensures that your application provides a professional user experience while maintaining the integrity of existing resources.

For more information and advanced features, refer to the complete API documentation and explore the examples directory in the package repository.

---

**Quick Start Checklist:**

1. ✅ Install the Mediumroast for GitHub App on your organization
2. ✅ Create your `config.ini` file with organization details
3. ✅ Install the required dependencies (`mediumroast_api`, `inquirer`)
4. ✅ Run the test integration script to verify setup
5. ✅ Implement the complete workflow in your client application
6. ✅ Add error handling and logging for production use

**Need Help?**
- Check the troubleshooting guide above
- Review the complete example implementation
- Test individual operations before running the full workflow

