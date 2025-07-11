# GitHub Repository Management Tutorial

## Navigation

- **[⬅️ Getting Started](./github-getting-started.md)** - Prerequisites, installation, and basic setup
- **[📋 All Tutorials](./README.md)** - Complete tutorial directory
- **[⚡ Actions Tutorial](./github-actions.md)** - GitHub Actions workflow management

## Introduction

This tutorial provides a comprehensive guide for client application developers to implement GitHub repository management operations using the Mediumroast API. You'll learn how to create repositories, set up container directories, and manage repository configurations with robust pre-flight checks and user-friendly prompts. The workflow includes safety measures to prevent permission errors and accidental overwrites.

> **Prerequisites**: Before starting this tutorial, complete the [Getting Started Guide](./github-getting-started.md) to set up your development environment, install dependencies, and configure your GitHub integration.

## Repository-Specific Configuration

For repository management operations, add these specific settings to your `config.ini`:

```ini
[GitHub]
# ... (basic configuration from getting started guide)

# Repository configuration
repoName = my-discovery-repo
repoDescription = A repository for discovery and data collection

# Container configuration
containerTypes = Studies,Companies,Interactions
```

## Understanding the Repository Management Workflow

The Mediumroast API provides a safe, step-by-step workflow that includes:

1. **Pre-flight checks** to verify the GitHub App installation and permissions
2. **Repository existence detection** to avoid conflicts
3. **Container directory management** for organizing different data types
4. **User prompts** to confirm or skip operations when components already exist
5. **Robust error handling** with clear, actionable messages

## Basic Client Implementation

### Import Required Modules

```javascript
import GitHubFunctions from 'mediumroast_api/src/api/github.js';
import ConfigParser from 'configparser';
import { readFileSync } from 'fs';
import inquirer from 'inquirer';
```

### Initialize the API Client

```javascript
// Load configuration
const config = new ConfigParser();
config.read('./config.ini');

// Get credentials
const token = config.get('GitHub', 'token');
const org = config.get('GitHub', 'org');

// Initialize GitHub functions
const github = new GitHubFunctions(token, org, 'repository-manager');
```

## Pre-flight Checks and Safety Features

### GitHub App Installation Check

The workflow starts by verifying that the Mediumroast for GitHub App is properly installed:

```javascript
async function checkGitHubAppInstallation(github) {
    console.log('🔍 Checking GitHub App installation...');
    
    const appCheckResult = await github.checkGitHubAppInstallation();
    
    if (!appCheckResult[0]) {
        const appCheck = appCheckResult[2];
        console.error('❌ GitHub App Installation Issue:', appCheck.error);
        
        if (!appCheck.canAccessOrg) {
            console.error('❌ Cannot access organization');
            console.log('Please ensure:');
            console.log('1. The organization name is correct');
            console.log('2. Your token has access to the organization');
            return false;
        }
        
        console.log('❌ Mediumroast for GitHub App is not properly installed');
        console.log('\nTo fix this:');
        console.log('1. Go to https://github.com/apps/mediumroast-for-github');
        console.log('2. Click "Install" or "Configure"');
        console.log('3. Select your organization');
        console.log('4. Grant repository permissions');
        return false;
    }
    
    const appCheck = appCheckResult[2];
    console.log('✅ GitHub App Installation Check:');
    console.log(`   App Status: Properly installed`);
    console.log(`   Repository Access: ${appCheck.repositorySelection === 'all' ? 'All repositories' : `${appCheck.repositoryAccess} repositories`}`);
    console.log('   Permissions: Valid');
    
    return true;
}
```

### Repository Existence Detection

Before creating resources, the system checks for existing repositories and containers:

```javascript
async function checkExistingInstallations(github) {
    const status = {
        repository: { exists: false, error: null },
        containers: { exists: false, existing: [], missing: [] }
    };

    try {
        // Check if repository exists
        console.log('🔍 Checking if repository exists...');
        try {
            const repoResult = await github.getRepoSize();
            if (repoResult[0]) {
                status.repository.exists = true;
                console.log('✅ Repository exists');
            }
        } catch (err) {
            status.repository.error = err.message;
            console.log('❌ Repository does not exist');
        }

        // Check containers if repository exists
        if (status.repository.exists) {
            console.log('🔍 Checking container directories...');
            const containers = ['Studies', 'Companies', 'Interactions'];
            
            for (const container of containers) {
                try {
                    const contentResult = await github.getContent(container);
                    if (contentResult[0]) {
                        status.containers.existing.push(container);
                        console.log(`✅ ${container} directory exists`);
                    } else {
                        status.containers.missing.push(container);
                        console.log(`❌ ${container} directory missing`);
                    }
                } catch (err) {
                    status.containers.missing.push(container);
                    console.log(`❌ ${container} directory missing`);
                }
            }
            
            status.containers.exists = status.containers.existing.length > 0;
        }

    } catch (error) {
        console.error('Error during installation check:', error.message);
    }

    return status;
}
```

### User Prompts for Safe Operations

When existing resources are detected, users are prompted to confirm their actions:

```javascript
async function promptForExistingInstallations(installationStatus) {
    const decisions = {
        proceedWithRepository: true,
        proceedWithContainers: true,
        skipAll: false
    };

    console.log('⚠️ EXISTING INSTALLATION DETECTED');
    console.log('The following components are already installed:');

    // Repository status
    if (installationStatus.repository.exists) {
        console.log('  📁 Repository: ✅ EXISTS');
        const proceed = await inquirer.prompt([{
            type: 'confirm',
            name: 'proceed',
            message: 'Repository already exists. Do you want to proceed anyway? (This will skip repository creation)',
            default: false
        }]);
        decisions.proceedWithRepository = proceed.proceed;
        if (!proceed.proceed) {
            console.log('Repository operations will be skipped.');
        }
    } else {
        console.log('  📁 Repository: ❌ NOT FOUND (will be created)');
    }

    // Containers status
    if (installationStatus.containers.exists) {
        console.log(`  📂 Containers: ✅ ${installationStatus.containers.existing.length}/3 EXIST`);
        if (installationStatus.containers.existing.length > 0) {
            console.log(`     Existing: ${installationStatus.containers.existing.join(', ')}`);
        }
        if (installationStatus.containers.missing.length > 0) {
            console.log(`     Missing: ${installationStatus.containers.missing.join(', ')}`);
        }
        
        const proceed = await inquirer.prompt([{
            type: 'confirm',
            name: 'proceed',
            message: 'Some containers already exist. Do you want to proceed? (Existing containers will be left unchanged)',
            default: true
        }]);
        decisions.proceedWithContainers = proceed.proceed;
        if (!proceed.proceed) {
            console.log('Container operations will be skipped.');
        }
    } else if (installationStatus.repository.exists) {
        console.log('  📂 Containers: ❌ NOT FOUND (will be created)');
    }

    // Final confirmation if any components exist
    const hasExistingComponents = installationStatus.repository.exists || 
                                 installationStatus.containers.exists;

    if (hasExistingComponents) {
        const finalConfirm = await inquirer.prompt([{
            type: 'confirm',
            name: 'proceed',
            message: 'Do you want to proceed with the selected operations?',
            default: true
        }]);
        if (!finalConfirm.proceed) {
            decisions.skipAll = true;
        }
    }

    return decisions;
}
```

## Complete Client Application Example

Here's a complete example that demonstrates repository management with all safety features:

```javascript
import GitHubFunctions from 'mediumroast_api/src/api/github.js';
import ConfigParser from 'configparser';
import inquirer from 'inquirer';
import fs from 'fs';

async function demonstrateRepositoryManagement() {
    try {
        // Load configuration
        const config = new ConfigParser();
        config.read('./config.ini');
        
        const token = config.get('GitHub', 'token');
        const org = config.get('GitHub', 'org');
        
        console.log('🚀 Starting GitHub repository management...\n');
        
        // Initialize GitHub functions
        const github = new GitHubFunctions(token, org, 'repository-manager');
        
        // Step 1: Pre-flight check for GitHub App
        const appInstalled = await checkGitHubAppInstallation(github);
        if (!appInstalled) {
            console.log('\n❌ Cannot proceed without proper GitHub App installation');
            return;
        }
        
        // Step 2: Check for existing installations
        console.log('\n📋 Checking existing installations...');
        const existingInstallations = await checkExistingInstallations(github);
        
        // Step 3: Get user preferences for existing resources
        const userDecisions = await promptForExistingInstallations(existingInstallations);
        
        if (userDecisions.skipAll) {
            console.log('\n🚫 All operations cancelled by user.');
            return;
        }
        
        console.log('\n🔧 Starting operations based on your preferences...\n');
        
        // Step 4: Repository creation
        if (userDecisions.proceedWithRepository) {
            console.log('📁 Creating repository...');
            const repoResult = await createRepository(github, org);
            if (repoResult) {
                console.log(`✅ Repository created successfully: ${repoResult.html_url}`);
            }
        } else {
            console.log('⏭️ Skipping repository creation');
        }
        
        // Step 5: Container setup
        if (userDecisions.proceedWithContainers) {
            console.log('\n📂 Setting up containers...');
            const containerResult = await setupContainers(github);
            if (containerResult) {
                console.log('✅ Containers set up successfully');
                logContainerResults(containerResult);
            }
        } else {
            console.log('⏭️ Skipping container setup');
        }
        
        // Step 6: Repository information
        await displayRepositoryInfo(github, org);
        
        console.log('\n🎉 Repository management completed successfully!');
        console.log('\n📋 Summary:');
        console.log(`   Organization: ${org}`);
        console.log(`   Repository: ${org}_discovery`);
        console.log('   Containers: Studies, Companies, Interactions');
        console.log('   Setup is ready for data collection and analysis');
        
    } catch (error) {
        console.error('\n💥 An unexpected error occurred:', error.message);
        console.log('\n🔧 Troubleshooting tips:');
        console.log('   • Check your network connection');
        console.log('   • Verify the GitHub App has proper permissions');
        console.log('   • Ensure the organization name in config.ini is correct');
        console.log('   • Try running the script again');
    }
}

// Helper functions (include the functions from previous sections)
// [Include checkGitHubAppInstallation, checkExistingInstallations, promptForExistingInstallations]

// Run the demonstration
demonstrateRepositoryManagement();
```

## Individual Operation Examples

### Repository Management

#### Creating a Discovery Repository

```javascript
async function createRepository(github, org) {
    console.log(`📁 Creating discovery repository: ${org}_discovery`);
    
    const result = await github.createRepository();
    
    if (result[0]) {
        console.log('✅ Repository created successfully');
        console.log(`   📍 URL: ${result[2].html_url}`);
        console.log(`   🔒 Private: ${result[2].private}`);
        console.log(`   📄 Description: ${result[2].description}`);
        return result[2];
    } else {
        console.error(`❌ Failed to create repository: ${result[1]}`);
        throw new Error(result[1]);
    }
}
```

#### Getting Repository Information

```javascript
async function getRepositoryInfo(github, org) {
    console.log('📊 Fetching repository information...');
    
    // Get repository size
    const sizeResult = await github.getRepoSize();
    if (sizeResult[0]) {
        const sizeData = sizeResult[2];
        console.log(`📏 Repository Size:`);
        console.log(`   Repository: ${sizeData.repository}`);
        console.log(`   Size: ${sizeData.size_kb} KB (${sizeData.size_mb} MB)`);
    }
    
    // Get organization info
    const orgResult = await github.getGitHubOrg();
    if (orgResult[0]) {
        const orgData = orgResult[2];
        console.log(`🏢 Organization Details:`);
        console.log(`   Name: ${orgData.name || orgData.login}`);
        console.log(`   Description: ${orgData.description || 'No description'}`);
        console.log(`   Public repos: ${orgData.public_repos}`);
        console.log(`   Created: ${new Date(orgData.created_at).toLocaleDateString()}`);
    }
}
```

### Container Management

#### Setting Up Container Directories

```javascript
async function setupContainers(github) {
    console.log('📂 Setting up container directories...');
    
    const result = await github.containerOps.createContainers();
    
    if (result[0]) {
        console.log('✅ Containers created successfully');
        return result[2];
    } else {
        console.error(`❌ Failed to create containers: ${result[1]}`);
        throw new Error(result[1]);
    }
}

function logContainerResults(containerData) {
    if (containerData && Array.isArray(containerData)) {
        console.log('\n📂 Container creation results:');
        containerData.forEach(result => {
            const status = result.success ? '✅' : '❌';
            const message = typeof result.message === 'object' && result.message.status_msg 
                ? result.message.status_msg 
                : result.message;
            console.log(`   ${status} ${result.container}: ${message}`);
        });
        
        console.log('\n📝 JSON files are automatically created as part of container creation.');
        console.log('   No additional JSON file creation needed - containers are ready to use!');
    }
}
```

#### Checking Container Status

```javascript
async function checkContainerStatus(github, containerName) {
    console.log(`🔍 Checking container: ${containerName}`);
    
    try {
        const contentResult = await github.getContent(containerName);
        if (contentResult[0]) {
            const content = contentResult[2];
            console.log(`✅ Container "${containerName}" exists`);
            console.log(`   Type: ${content.type}`);
            console.log(`   Size: ${content.size} bytes`);
            return content;
        } else {
            console.log(`❌ Container "${containerName}" not found`);
            return null;
        }
    } catch (error) {
        console.log(`❌ Error checking container "${containerName}": ${error.message}`);
        return null;
    }
}
```

## Web Application Integration

### React Component Example

```javascript
import React, { useState, useEffect } from 'react';
import GitHubFunctions from 'mediumroast_api/src/api/github.js';

const RepositoryManager = ({ token, org }) => {
    const [github, setGithub] = useState(null);
    const [status, setStatus] = useState('idle');
    const [repositories, setRepositories] = useState([]);
    const [containers, setContainers] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (token && org) {
            const githubInstance = new GitHubFunctions(token, org, 'web-app');
            setGithub(githubInstance);
        }
    }, [token, org]);

    const handleCreateRepository = async () => {
        if (!github) return;
        
        setStatus('creating');
        setError(null);
        
        try {
            // Pre-flight check
            const appCheck = await github.checkGitHubAppInstallation();
            if (!appCheck[0]) {
                throw new Error('GitHub App not properly installed');
            }
            
            // Create repository
            const result = await github.createRepository();
            if (result[0]) {
                setRepositories(prev => [...prev, result[2]]);
                setStatus('success');
            } else {
                throw new Error(result[1]);
            }
        } catch (err) {
            setError(err.message);
            setStatus('error');
        }
    };

    const handleCreateContainers = async () => {
        if (!github) return;
        
        setStatus('creating-containers');
        setError(null);
        
        try {
            const result = await github.containerOps.createContainers();
            if (result[0]) {
                setContainers(result[2]);
                setStatus('success');
            } else {
                throw new Error(result[1]);
            }
        } catch (err) {
            setError(err.message);
            setStatus('error');
        }
    };

    const handleCheckStatus = async () => {
        if (!github) return;
        
        setStatus('checking');
        try {
            const existingInstallations = await checkExistingInstallations(github);
            // Update UI with status
            setStatus('checked');
        } catch (err) {
            setError(err.message);
            setStatus('error');
        }
    };

    return (
        <div className="repository-manager">
            <h2>Repository Manager</h2>
            
            <div className="actions">
                <button 
                    onClick={handleCheckStatus}
                    disabled={status === 'checking'}
                    className="btn btn-secondary"
                >
                    {status === 'checking' ? 'Checking...' : 'Check Status'}
                </button>
                
                <button 
                    onClick={handleCreateRepository}
                    disabled={status === 'creating'}
                    className="btn btn-primary"
                >
                    {status === 'creating' ? 'Creating...' : 'Create Repository'}
                </button>
                
                <button 
                    onClick={handleCreateContainers}
                    disabled={status === 'creating-containers'}
                    className="btn btn-success"
                >
                    {status === 'creating-containers' ? 'Creating...' : 'Setup Containers'}
                </button>
            </div>

            {error && (
                <div className="alert alert-danger">
                    <strong>Error:</strong> {error}
                </div>
            )}

            {repositories.length > 0 && (
                <div className="repositories">
                    <h3>Repositories</h3>
                    {repositories.map(repo => (
                        <div key={repo.id} className="repository-card">
                            <h4>{repo.name}</h4>
                            <p>{repo.description}</p>
                            <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
                                View on GitHub
                            </a>
                        </div>
                    ))}
                </div>
            )}

            {containers.length > 0 && (
                <div className="containers">
                    <h3>Containers</h3>
                    {containers.map(container => (
                        <div key={container.container} className="container-card">
                            <h4>{container.container}</h4>
                            <span className={`status ${container.success ? 'success' : 'error'}`}>
                                {container.success ? '✅' : '❌'}
                            </span>
                            <p>{container.message}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RepositoryManager;
```

### CSS Styles for React Component

```css
.repository-manager {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
}

.actions {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
}

.btn {
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 14px;
}

.btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.btn-primary {
    background-color: #007bff;
    color: white;
}

.btn-secondary {
    background-color: #6c757d;
    color: white;
}

.btn-success {
    background-color: #28a745;
    color: white;
}

.alert {
    padding: 10px;
    border-radius: 5px;
    margin-bottom: 20px;
}

.alert-danger {
    background-color: #f8d7da;
    border: 1px solid #f5c6cb;
    color: #721c24;
}

.repository-card, .container-card {
    border: 1px solid #ddd;
    border-radius: 5px;
    padding: 15px;
    margin-bottom: 10px;
}

.status.success {
    color: #28a745;
}

.status.error {
    color: #dc3545;
}
```

## CLI Application Integration

### Command-Line Interface Example

```javascript
#!/usr/bin/env node

import { Command } from 'commander';
import GitHubFunctions from 'mediumroast_api/src/api/github.js';
import ConfigParser from 'configparser';
import inquirer from 'inquirer';
import chalk from 'chalk';

const program = new Command();

program
    .name('repo-manager')
    .description('GitHub repository management CLI')
    .version('1.0.0');

program
    .command('create')
    .description('Create a new repository and containers')
    .option('-o, --org <org>', 'GitHub organization')
    .option('-t, --token <token>', 'GitHub token')
    .option('-c, --config <config>', 'Configuration file path', './config.ini')
    .option('--skip-checks', 'Skip pre-flight checks')
    .action(async (options) => {
        await createRepositoryCommand(options);
    });

program
    .command('status')
    .description('Check repository and container status')
    .option('-o, --org <org>', 'GitHub organization')
    .option('-t, --token <token>', 'GitHub token')
    .option('-c, --config <config>', 'Configuration file path', './config.ini')
    .action(async (options) => {
        await statusCommand(options);
    });

program
    .command('setup')
    .description('Interactive setup wizard')
    .option('-c, --config <config>', 'Configuration file path', './config.ini')
    .action(async (options) => {
        await setupWizard(options);
    });

async function createRepositoryCommand(options) {
    try {
        const config = loadConfig(options);
        const github = new GitHubFunctions(config.token, config.org, 'cli-tool');
        
        console.log(chalk.blue('🚀 Creating repository...'));
        
        if (!options.skipChecks) {
            const appCheck = await github.checkGitHubAppInstallation();
            if (!appCheck[0]) {
                console.error(chalk.red('❌ GitHub App not properly installed'));
                process.exit(1);
            }
        }
        
        const result = await github.createRepository();
        if (result[0]) {
            console.log(chalk.green(`✅ Repository created: ${result[2].html_url}`));
            
            // Create containers
            const containerResult = await github.containerOps.createContainers();
            if (containerResult[0]) {
                console.log(chalk.green('✅ Containers created successfully'));
                logContainerResults(containerResult[2]);
            }
        } else {
            console.error(chalk.red(`❌ Failed to create repository: ${result[1]}`));
            process.exit(1);
        }
        
    } catch (error) {
        console.error(chalk.red(`❌ Error: ${error.message}`));
        process.exit(1);
    }
}

async function statusCommand(options) {
    try {
        const config = loadConfig(options);
        const github = new GitHubFunctions(config.token, config.org, 'cli-tool');
        
        console.log(chalk.blue('🔍 Checking repository status...'));
        
        const existingInstallations = await checkExistingInstallations(github);
        
        console.log(chalk.blue('\n📊 Repository Status:'));
        console.log(`   Repository: ${existingInstallations.repository.exists ? chalk.green('✅ EXISTS') : chalk.red('❌ NOT FOUND')}`);
        
        if (existingInstallations.containers.exists) {
            console.log(`   Containers: ${chalk.green(`✅ ${existingInstallations.containers.existing.length}/3 EXIST`)}`);
            console.log(`   Existing: ${existingInstallations.containers.existing.join(', ')}`);
            if (existingInstallations.containers.missing.length > 0) {
                console.log(`   Missing: ${existingInstallations.containers.missing.join(', ')}`);
            }
        } else {
            console.log(`   Containers: ${chalk.red('❌ NOT FOUND')}`);
        }
        
    } catch (error) {
        console.error(chalk.red(`❌ Error: ${error.message}`));
        process.exit(1);
    }
}

async function setupWizard(options) {
    console.log(chalk.blue('🧙 Repository Setup Wizard'));
    
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'org',
            message: 'GitHub organization name:',
            validate: (input) => input.length > 0 || 'Organization name is required'
        },
        {
            type: 'password',
            name: 'token',
            message: 'GitHub token:',
            mask: '*',
            validate: (input) => input.length > 0 || 'Token is required'
        },
        {
            type: 'confirm',
            name: 'createRepo',
            message: 'Create repository?',
            default: true
        },
        {
            type: 'confirm',
            name: 'createContainers',
            message: 'Create containers?',
            default: true,
            when: (answers) => answers.createRepo
        }
    ]);
    
    try {
        const github = new GitHubFunctions(answers.token, answers.org, 'cli-wizard');
        
        if (answers.createRepo) {
            console.log(chalk.blue('\n📁 Creating repository...'));
            const result = await github.createRepository();
            if (result[0]) {
                console.log(chalk.green(`✅ Repository created: ${result[2].html_url}`));
                
                if (answers.createContainers) {
                    console.log(chalk.blue('\n📂 Creating containers...'));
                    const containerResult = await github.containerOps.createContainers();
                    if (containerResult[0]) {
                        console.log(chalk.green('✅ Containers created successfully'));
                    }
                }
            }
        }
        
        console.log(chalk.green('\n🎉 Setup completed successfully!'));
        
    } catch (error) {
        console.error(chalk.red(`❌ Error: ${error.message}`));
        process.exit(1);
    }
}

function loadConfig(options) {
    const config = new ConfigParser();
    
    if (options.config) {
        config.read(options.config);
    }
    
    return {
        token: options.token || config.get('GitHub', 'token'),
        org: options.org || config.get('GitHub', 'org')
    };
}

function logContainerResults(containerData) {
    if (containerData && Array.isArray(containerData)) {
        console.log(chalk.blue('\n📂 Container Results:'));
        containerData.forEach(result => {
            const status = result.success ? chalk.green('✅') : chalk.red('❌');
            const message = typeof result.message === 'object' && result.message.status_msg 
                ? result.message.status_msg 
                : result.message;
            console.log(`   ${status} ${result.container}: ${message}`);
        });
    }
}

program.parse();
```

## Error Handling and Best Practices

### Comprehensive Error Handling

```javascript
class RepositoryError extends Error {
    constructor(message, code, details = null) {
        super(message);
        this.name = 'RepositoryError';
        this.code = code;
        this.details = details;
    }
}

async function safeRepositoryOperation(operationName, operation) {
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
        } else if (error.message.includes('API rate limit')) {
            console.log('\n🔧 Solution: Wait for rate limit reset or use GitHub App authentication');
        }
        
        throw new RepositoryError(error.message, 'OPERATION_FAILED', { operation: operationName });
    }
}
```

### Configuration Validation

```javascript
function validateConfiguration(config) {
    const errors = [];
    
    // Required fields
    if (!config.token) {
        errors.push('GitHub token is required');
    }
    
    if (!config.org) {
        errors.push('GitHub organization is required');
    }
    
    // Validate token format
    if (config.token && !config.token.startsWith('ghp_') && !config.token.startsWith('gho_')) {
        errors.push('Invalid GitHub token format');
    }
    
    // Validate organization name
    if (config.org && !/^[a-zA-Z0-9_-]+$/.test(config.org)) {
        errors.push('Invalid organization name format');
    }
    
    if (errors.length > 0) {
        throw new Error(`Configuration validation failed:\n${errors.map(e => `  • ${e}`).join('\n')}`);
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
            
            console.log(`⏳ Retry ${attempt}/${maxRetries} in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
        }
    }
}

// Usage example
const result = await withRetry(async () => {
    return await github.createRepository();
}, 3, 1000);
```

## Testing Your Integration

### Unit Tests with Jest

```javascript
// tests/repository-manager.test.js
import GitHubFunctions from '../src/api/github.js';
import { jest } from '@jest/globals';

describe('Repository Manager', () => {
    let github;
    let mockToken;
    let mockOrg;

    beforeEach(() => {
        mockToken = 'ghp_test_token';
        mockOrg = 'test-org';
        github = new GitHubFunctions(mockToken, mockOrg, 'test');
    });

    describe('Repository Creation', () => {
        test('should create repository successfully', async () => {
            // Mock the GitHub API response
            const mockResponse = [true, 'Success', {
                id: 12345,
                name: 'test-org_discovery',
                html_url: 'https://github.com/test-org/test-org_discovery',
                private: true
            }];
            
            jest.spyOn(github, 'createRepository').mockResolvedValue(mockResponse);
            
            const result = await github.createRepository();
            
            expect(result[0]).toBe(true);
            expect(result[2].name).toBe('test-org_discovery');
            expect(result[2].html_url).toContain('test-org');
        });

        test('should handle repository creation failure', async () => {
            const mockResponse = [false, 'Repository already exists', null];
            
            jest.spyOn(github, 'createRepository').mockResolvedValue(mockResponse);
            
            const result = await github.createRepository();
            
            expect(result[0]).toBe(false);
            expect(result[1]).toContain('already exists');
        });
    });

    describe('Container Operations', () => {
        test('should create containers successfully', async () => {
            const mockResponse = [true, 'Success', [
                { container: 'Studies', success: true, message: 'Created successfully' },
                { container: 'Companies', success: true, message: 'Created successfully' },
                { container: 'Interactions', success: true, message: 'Created successfully' }
            ]];
            
            jest.spyOn(github.containerOps, 'createContainers').mockResolvedValue(mockResponse);
            
            const result = await github.containerOps.createContainers();
            
            expect(result[0]).toBe(true);
            expect(result[2]).toHaveLength(3);
            expect(result[2][0].container).toBe('Studies');
        });
    });

    describe('Status Checks', () => {
        test('should check GitHub App installation', async () => {
            const mockResponse = [true, 'Success', {
                canAccessOrg: true,
                repositorySelection: 'all',
                repositoryAccess: 'all'
            }];
            
            jest.spyOn(github, 'checkGitHubAppInstallation').mockResolvedValue(mockResponse);
            
            const result = await github.checkGitHubAppInstallation();
            
            expect(result[0]).toBe(true);
            expect(result[2].canAccessOrg).toBe(true);
        });
    });
});
```

### Integration Test Script

```javascript
// test-integration.js
import GitHubFunctions from '../src/api/github.js';
import ConfigParser from 'configparser';

async function testIntegration() {
    try {
        // Load test configuration
        const config = new ConfigParser();
        config.read('./test-config.ini');
        
        const token = config.get('GitHub', 'token');
        const org = config.get('GitHub', 'org');
        
        console.log('🧪 Starting integration tests...');
        
        // Initialize GitHub functions
        const github = new GitHubFunctions(token, org, 'integration-test');
        
        // Test 1: GitHub App Installation Check
        console.log('\n🧪 Test 1: GitHub App Installation Check');
        const appResult = await github.checkGitHubAppInstallation();
        
        if (appResult[0]) {
            console.log('✅ GitHub App check passed');
        } else {
            console.log('❌ GitHub App check failed');
            return;
        }
        
        // Test 2: Repository Size Check (safe read operation)
        console.log('\n🧪 Test 2: Repository Access Check');
        try {
            const sizeResult = await github.getRepoSize();
            console.log('✅ Repository access check passed');
        } catch (error) {
            console.log('ℹ️ Repository not found (expected for new setups)');
        }
        
        // Test 3: Organization Access
        console.log('\n🧪 Test 3: Organization Access Check');
        const orgResult = await github.getGitHubOrg();
        
        if (orgResult[0]) {
            console.log('✅ Organization access check passed');
            console.log(`   Organization: ${orgResult[2].name || orgResult[2].login}`);
        } else {
            console.log('❌ Organization access check failed');
            return;
        }
        
        console.log('\n🎉 All integration tests passed!');
        console.log('   Your setup is ready for repository management operations.');
        
    } catch (error) {
        console.error('\n💥 Integration test failed:', error.message);
        console.log('\n🔧 Check your configuration and permissions');
    }
}

testIntegration();
```

## Production Deployment Considerations

### Environment Configuration

```javascript
// config/environments.js
export const environments = {
    development: {
        logLevel: 'debug',
        retryAttempts: 3,
        rateLimitBuffer: 0.8,
        enableDetailedLogging: true
    },
    staging: {
        logLevel: 'info',
        retryAttempts: 5,
        rateLimitBuffer: 0.9,
        enableDetailedLogging: false
    },
    production: {
        logLevel: 'error',
        retryAttempts: 5,
        rateLimitBuffer: 0.95,
        enableDetailedLogging: false
    }
};

export function getEnvironmentConfig() {
    const env = process.env.NODE_ENV || 'development';
    return environments[env];
}
```

### Monitoring and Logging

```javascript
class RepositoryOperationsLogger {
    constructor(logLevel = 'info') {
        this.logLevel = logLevel;
        this.operations = [];
        this.metrics = {
            repositories_created: 0,
            containers_created: 0,
            errors: 0,
            api_calls: 0
        };
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
            const prefix = this.getLogPrefix(level);
            console.log(`[${timestamp}] ${prefix} ${operation}: ${message}`);
            
            if (data && level === 'debug') {
                console.log('   Data:', JSON.stringify(data, null, 2));
            }
        }
    }
    
    shouldLog(level) {
        const levels = { error: 0, warn: 1, info: 2, debug: 3 };
        return levels[level] <= levels[this.logLevel];
    }
    
    getLogPrefix(level) {
        const prefixes = {
            error: '❌',
            warn: '⚠️',
            info: 'ℹ️',
            debug: '🔍'
        };
        return prefixes[level] || 'ℹ️';
    }
    
    incrementMetric(metric) {
        if (metric in this.metrics) {
            this.metrics[metric]++;
        }
    }
    
    getMetrics() {
        return {
            ...this.metrics,
            operations_total: this.operations.length,
            uptime: process.uptime()
        };
    }
    
    exportLogs(format = 'json') {
        if (format === 'json') {
            return JSON.stringify({
                operations: this.operations,
                metrics: this.metrics,
                exported_at: new Date().toISOString()
            }, null, 2);
        }
        
        // CSV format
        const headers = ['timestamp', 'level', 'operation', 'message'];
        const rows = this.operations.map(op => [
            op.timestamp,
            op.level,
            op.operation,
            op.message
        ]);
        
        return [headers, ...rows]
            .map(row => row.join(','))
            .join('\n');
    }
}

// Usage in your application
const logger = new RepositoryOperationsLogger('info');

async function monitoredRepositoryOperation(operation) {
    try {
        logger.log('info', 'Repository Operation', 'Starting operation', { operation });
        const result = await operation();
        logger.log('info', 'Repository Operation', 'Operation completed successfully');
        logger.incrementMetric('repositories_created');
        return result;
    } catch (error) {
        logger.log('error', 'Repository Operation', 'Operation failed', { error: error.message });
        logger.incrementMetric('errors');
        throw error;
    }
}
```

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. GitHub App Installation Issues

**Symptoms:**
- Error: "App not installed"
- Permission denied errors
- Cannot access organization

**Diagnostic Steps:**
```javascript
async function diagnoseGitHubApp(github, org) {
    console.log('🔍 Diagnosing GitHub App installation...');
    
    try {
        const appResult = await github.checkGitHubAppInstallation();
        
        if (!appResult[0]) {
            const details = appResult[2];
            console.log('❌ GitHub App Issues Found:');
            console.log(`   Can Access Org: ${details.canAccessOrg}`);
            console.log(`   Error: ${details.error}`);
            
            if (!details.canAccessOrg) {
                console.log('\n🔧 Solutions:');
                console.log('   1. Check organization name spelling');
                console.log('   2. Verify token has organization access');
                console.log('   3. Check if organization is private');
            }
        } else {
            console.log('✅ GitHub App is properly installed');
        }
        
    } catch (error) {
        console.error('❌ Failed to diagnose GitHub App:', error.message);
    }
}
```

#### 2. Repository Creation Failures

**Symptoms:**
- "Repository already exists" error
- Permission denied when creating repository
- Invalid repository name error

**Solutions:**
```javascript
async function diagnoseRepositoryIssues(github, org) {
    console.log('🔍 Diagnosing repository issues...');
    
    try {
        // Check if repository exists
        const sizeResult = await github.getRepoSize();
        if (sizeResult[0]) {
            console.log('ℹ️ Repository already exists');
            console.log('   Consider using the existence check before creation');
        }
        
        // Check organization permissions
        const orgResult = await github.getGitHubOrg();
        if (orgResult[0]) {
            console.log('✅ Organization access is working');
        } else {
            console.log('❌ Cannot access organization');
            console.log('   Check permissions and organization name');
        }
        
    } catch (error) {
        console.error('❌ Repository diagnostic failed:', error.message);
    }
}
```

#### 3. Container Creation Issues

**Symptoms:**
- Containers not created
- Partial container creation
- JSON file creation errors

**Solutions:**
```javascript
async function diagnoseContainerIssues(github) {
    console.log('🔍 Diagnosing container issues...');
    
    const containers = ['Studies', 'Companies', 'Interactions'];
    
    for (const container of containers) {
        try {
            const contentResult = await github.getContent(container);
            if (contentResult[0]) {
                console.log(`✅ ${container}: EXISTS`);
            } else {
                console.log(`❌ ${container}: MISSING`);
            }
        } catch (error) {
            console.log(`❌ ${container}: ERROR - ${error.message}`);
        }
    }
}
```

### Health Check Endpoint

```javascript
// For web applications
app.get('/health/repository', async (req, res) => {
    try {
        const github = new GitHubFunctions(token, org, 'health-check');
        
        const health = {
            timestamp: new Date().toISOString(),
            status: 'healthy',
            checks: {
                github_app: 'unknown',
                repository_access: 'unknown',
                organization_access: 'unknown'
            }
        };
        
        // Check GitHub App
        try {
            const appResult = await github.checkGitHubAppInstallation();
            health.checks.github_app = appResult[0] ? 'healthy' : 'unhealthy';
        } catch (error) {
            health.checks.github_app = 'error';
        }
        
        // Check repository access
        try {
            const sizeResult = await github.getRepoSize();
            health.checks.repository_access = sizeResult[0] ? 'healthy' : 'not_found';
        } catch (error) {
            health.checks.repository_access = 'error';
        }
        
        // Check organization access
        try {
            const orgResult = await github.getGitHubOrg();
            health.checks.organization_access = orgResult[0] ? 'healthy' : 'unhealthy';
        } catch (error) {
            health.checks.organization_access = 'error';
        }
        
        // Determine overall status
        const hasErrors = Object.values(health.checks).some(status => 
            status === 'error' || status === 'unhealthy'
        );
        
        health.status = hasErrors ? 'unhealthy' : 'healthy';
        
        res.status(hasErrors ? 503 : 200).json(health);
        
    } catch (error) {
        res.status(500).json({
            timestamp: new Date().toISOString(),
            status: 'error',
            error: error.message
        });
    }
});
```

## Advanced Usage Patterns

### Batch Repository Operations

```javascript
async function batchRepositorySetup(configs) {
    const results = [];
    
    for (const config of configs) {
        try {
            const github = new GitHubFunctions(config.token, config.org, 'batch-setup');
            
            // Pre-flight check
            const appCheck = await github.checkGitHubAppInstallation();
            if (!appCheck[0]) {
                results.push({
                    org: config.org,
                    status: 'failed',
                    error: 'GitHub App not installed'
                });
                continue;
            }
            
            // Create repository
            const repoResult = await github.createRepository();
            if (!repoResult[0]) {
                results.push({
                    org: config.org,
                    status: 'failed',
                    error: repoResult[1]
                });
                continue;
            }
            
            // Create containers
            const containerResult = await github.containerOps.createContainers();
            
            results.push({
                org: config.org,
                status: 'success',
                repository: repoResult[2],
                containers: containerResult[2]
            });
            
        } catch (error) {
            results.push({
                org: config.org,
                status: 'failed',
                error: error.message
            });
        }
    }
    
    // Summary report
    const summary = {
        total: results.length,
        successful: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'failed').length,
        results: results
    };
    
    return summary;
}
```

### Repository Template System

```javascript
class RepositoryTemplate {
    constructor(name, description, containers, files = []) {
        this.name = name;
        this.description = description;
        this.containers = containers;
        this.files = files;
    }
    
    async apply(github) {
        const results = {
            repository: null,
            containers: [],
            files: []
        };
        
        // Create repository
        const repoResult = await github.createRepository();
        if (repoResult[0]) {
            results.repository = repoResult[2];
        }
        
        // Create custom containers
        for (const container of this.containers) {
            try {
                const containerResult = await github.containerOps.createContainer(container);
                results.containers.push({
                    name: container,
                    success: containerResult[0],
                    result: containerResult[2]
                });
            } catch (error) {
                results.containers.push({
                    name: container,
                    success: false,
                    error: error.message
                });
            }
        }
        
        // Create template files
        for (const file of this.files) {
            try {
                const fileResult = await github.createFile(file.path, file.content);
                results.files.push({
                    path: file.path,
                    success: fileResult[0],
                    result: fileResult[2]
                });
            } catch (error) {
                results.files.push({
                    path: file.path,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return results;
    }
}

// Usage
const dataAnalysisTemplate = new RepositoryTemplate(
    'Data Analysis Project',
    'Template for data analysis projects',
    ['DataSets', 'Analysis', 'Reports', 'Scripts'],
    [
        {
            path: 'README.md',
            content: '# Data Analysis Project\n\nThis repository contains data analysis assets.'
        },
        {
            path: '.gitignore',
            content: '*.log\n*.tmp\nnode_modules/\n'
        }
    ]
);

const github = new GitHubFunctions(token, org, 'template-manager');
const results = await dataAnalysisTemplate.apply(github);
```

## Conclusion

This tutorial provides a comprehensive guide for implementing GitHub repository management using the Mediumroast API in client applications. The key features include:

### ✅ **Safety and Reliability**
- Pre-flight checks for GitHub App installation
- Repository and container existence detection
- User confirmation prompts for destructive operations
- Comprehensive error handling and recovery

### 🔧 **Developer Experience**
- Clear, step-by-step implementation guide
- Reusable code patterns for web and CLI applications
- Extensive logging and debugging support
- Production-ready error handling

### 🚀 **Scalability**
- Batch operations for multiple repositories
- Template system for consistent setups
- Environment-specific configurations
- Health monitoring and metrics

### 📚 **Integration Ready**
- React component examples
- CLI tool implementation
- Jest testing patterns
- Production deployment considerations

By following this tutorial, you can build robust client applications that safely and efficiently manage GitHub repositories and container directories through the Mediumroast API. The workflow ensures that your application provides a professional user experience while maintaining the integrity of existing resources.

### Key Use Cases Covered:
1. **Discovery Repository Setup** - Create the main repository for data collection
2. **Container Management** - Organize data with Studies, Companies, and Interactions directories
3. **Status Monitoring** - Check repository and container status
4. **Batch Operations** - Handle multiple repositories efficiently
5. **Template System** - Apply consistent repository structures

For more information and advanced features, refer to the complete API documentation and explore the examples directory in the package repository.

---

**Quick Start Checklist:**

1. ✅ Install the Mediumroast for GitHub App on your organization
2. ✅ Create your `config.ini` file with organization details
3. ✅ Install required dependencies (`mediumroast_api`, `inquirer`, `configparser`)
4. ✅ Run the test integration script to verify setup
5. ✅ Choose your implementation approach (web app, CLI, or both)
6. ✅ Implement the repository management workflow
7. ✅ Add error handling and logging for production use
8. ✅ Set up monitoring and health checks

**Need Help?**
- Check the troubleshooting guide above
- Review the complete example implementations
- Test individual operations before running the full workflow
- Use the provided diagnostic tools to identify issues

---

## Navigation

- **[⬅️ Getting Started](./github-getting-started.md)** - Prerequisites, installation, and basic setup
- **[📋 All Tutorials](./README.md)** - Complete tutorial directory
- **[⚡ Actions Tutorial](./github-actions.md)** - GitHub Actions workflow management

## Related Resources

- [GitHub API Documentation](https://docs.github.com/en/rest)
- [Mediumroast API Documentation](../docs/)
- [GitHub Apps Documentation](https://docs.github.com/en/developers/apps)
