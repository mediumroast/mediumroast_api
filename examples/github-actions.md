# GitHub Actions Management Tutorial

## Navigation

- **[⬅️ Getting Started](./github-getting-started.md)** - Prerequisites, installation, and basic setup
- **[📋 All Tutorials](./README.md)** - Complete tutorial directory
- **[📁 Repository Tutorial](./github-repository.md)** - Repository management operations

## Introduction

This tutorial provides a comprehensive guide for client application developers to implement GitHub Actions workflow management operations using the Mediumroast API. You'll learn how to create, read, update, and delete GitHub Actions workflows with robust pre-flight checks, user-friendly prompts, and detailed operational feedback. The workflow includes safety measures to prevent permission errors and provides extensive error handling for reliable automation.

> **Prerequisites**: Before starting this tutorial, complete the [Getting Started Guide](./github-getting-started.md) to set up your development environment, install dependencies, and configure your GitHub integration.

## Actions-Specific Configuration

For GitHub Actions management operations, add these specific settings to your `config.ini`:

```ini
[GitHub]
# ... (basic configuration from getting started guide)

# Actions workflow configuration
workflowName = main-workflow
workflowDescription = Main CI/CD workflow for the repository
workflowFile = .github/workflows/main.yml
```

### Additional Prerequisites for Actions

- **GitHub Actions enabled** on your repository (enabled by default on public repos)
- **Workflows permissions** configured appropriately for your use case

## Understanding the GitHub Actions Management Workflow

The Mediumroast API provides a safe, step-by-step workflow that includes:

1. **Pre-flight checks** to verify the GitHub App installation and Actions permissions
2. **Repository existence detection** to ensure the target repository is available
3. **Workflow file management** with proper YAML structure validation
4. **CRUD operations** for comprehensive workflow lifecycle management
5. **User prompts** to confirm destructive operations
6. **Robust error handling** with clear, actionable messages
7. **Detailed status reporting** for workflow execution and management

## Basic Client Implementation

### Import Required Modules

```javascript
import GitHubFunctions from 'mediumroast_api/src/api/github.js';
import ConfigParser from 'configparser';
import { readFileSync } from 'fs';
import inquirer from 'inquirer';
import { formatResult } from 'mediumroast_api/src/api/gitHubServer/utils/formatting.js';
```

### Initialize the API Client

```javascript
// Load configuration
const config = new ConfigParser();
config.read('./config.ini');

// Get credentials
const token = config.get('GitHub', 'token');
const org = config.get('GitHub', 'org');
const repoName = config.get('GitHub', 'repoName');

// Initialize GitHub functions
const github = new GitHubFunctions(token, org, 'actions-manager');
```

## Pre-flight Checks and Safety Features

### GitHub App Installation Check

The workflow starts by verifying that the Mediumroast for GitHub App is properly installed with Actions permissions:

```javascript
async function checkGitHubAppInstallation(github) {
    console.log('🔍 Checking GitHub App installation...');
    
    // Use the new API method for installation status
    const appCheckResult = await github.actions.getInstallationStatus();
    
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
        console.log('\\nTo fix this:');
        console.log('1. Go to https://github.com/apps/mediumroast-for-github');
        console.log('2. Click "Install" or "Configure"');
        console.log('3. Select your organization');
        console.log('4. Grant repository and Actions permissions');
        return false;
    }
    
    const appCheck = appCheckResult[2];
    console.log('✅ GitHub App Installation Check:');
    console.log(`   App Status: Properly installed`);
    console.log(`   Repository Access: ${appCheck.repositorySelection === 'all' ? 'All repositories' : `${appCheck.repositoryAccess} repositories`}`);
    console.log('   Actions Permissions: Valid');
    
    return true;
}
```

### Repository and Actions Availability Check

Before managing workflows, verify that the repository exists and Actions are enabled:

```javascript
async function checkRepositoryAndActions(github, repoName) {
    console.log('🔍 Checking repository and Actions availability...');
    
    const status = {
        repository: { exists: false, error: null },
        actions: { enabled: false, error: null }
    };

    try {
        // Check if repository exists
        const repoResult = await github.getRepoSize();
        if (repoResult[0]) {
            status.repository.exists = true;
            console.log('✅ Repository exists');
            
            // Check if Actions are enabled
            try {
                const actionsResult = await github.actions.getWorkflows();
                if (actionsResult[0]) {
                    status.actions.enabled = true;
                    console.log('✅ GitHub Actions are enabled');
                } else {
                    console.log('⚠️  GitHub Actions may be disabled or no workflows exist');
                }
            } catch (actionsError) {
                status.actions.error = actionsError.message;
                console.log('❌ Cannot access Actions - may be disabled');
            }
        } else {
            status.repository.error = 'Repository not found';
            console.log('❌ Repository does not exist');
        }
    } catch (repoError) {
        status.repository.error = repoError.message;
        console.log('❌ Cannot access repository');
    }
    
    return status;
}
```

### User Prompts for Safe Operations

The system includes interactive prompts to confirm potentially destructive operations:

```javascript
async function confirmDestructiveOperation(operation, details) {
    const { confirm } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: `⚠️  Are you sure you want to ${operation}?\\n   ${details}`,
            default: false
        }
    ]);
    
    return confirm;
}

// Usage examples
async function safeDeleteWorkflow(github, workflowId) {
    const confirmed = await confirmDestructiveOperation(
        'delete this workflow',
        `This will permanently delete workflow ID: ${workflowId}`
    );
    
    if (!confirmed) {
        console.log('❌ Operation cancelled by user');
        return [false, 'Operation cancelled', null];
    }
    
    return await github.actions.deleteWorkflow(workflowId);
}
```

## Complete Client Application Example

For a comprehensive implementation that demonstrates the full workflow management lifecycle, see our complete integration examples:

**➡️ [GitHub Actions Manager CLI](./integrations/actions-manager-cli.js)**
- Complete interactive CLI application
- Menu-driven interface for all CRUD operations
- Pre-flight checks and error handling
- Configuration file support
- Usage: `node integrations/actions-manager-cli.js`

This example provides a full-featured command-line interface for managing GitHub Actions workflows with the following features:

### Key Features
- **Interactive Menu System**: Easy-to-use menu for selecting operations
- **Pre-flight Checks**: Automatic GitHub App installation verification
- **Full CRUD Operations**: Create, read, update, and delete workflows
- **Workflow Execution**: Trigger workflow runs with custom parameters
- **Run Monitoring**: View workflow execution history and status
- **Safe Operations**: Confirmation prompts for destructive actions
- **Error Handling**: Comprehensive error handling with user-friendly messages

### Quick Start
```bash
# Install dependencies
npm install inquirer configparser

# Run the CLI
node integrations/actions-manager-cli.js
```

The CLI will guide you through all available operations with interactive prompts and provide detailed feedback on each action.

## Individual Operation Examples

### Workflow Management

#### Creating a GitHub Actions Workflow

```javascript
import GitHubFunctions from 'mediumroast_api/src/api/github.js';
import { formatResult } from 'mediumroast_api/src/api/gitHubServer/utils/formatting.js';

async function createWorkflow() {
    const github = new GitHubFunctions(token, org, 'workflow-creator');
    
    const workflowContent = `name: CI Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
`;
    
    const result = await github.actions.createWorkflow(
        '.github/workflows/ci.yml',
        workflowContent,
        'Add CI workflow'
    );
    
    console.log(formatResult(result, 'Workflow created successfully'));
    
    if (result[0]) {
        console.log('✅ Workflow file created at:', result[2].path);
        console.log('🔗 View at:', result[2].html_url);
    }
}
```

#### Getting Workflow Information

```javascript
async function getWorkflowInfo() {
    const github = new GitHubFunctions(token, org, 'workflow-reader');
    
    // Get all workflows
    const workflowsResult = await github.actions.getWorkflows();
    console.log(formatResult(workflowsResult, 'Workflows retrieved successfully'));
    
    if (workflowsResult[0] && workflowsResult[2].workflows) {
        const workflows = workflowsResult[2].workflows;
        
        console.log(`\\n📊 Found ${workflows.length} workflow(s):`);
        
        for (const workflow of workflows) {
            console.log(`\\n📋 Workflow: ${workflow.name}`);
            console.log(`   ID: ${workflow.id}`);
            console.log(`   Path: ${workflow.path}`);
            console.log(`   State: ${workflow.state}`);
            console.log(`   Created: ${new Date(workflow.created_at).toLocaleString()}`);
            console.log(`   Updated: ${new Date(workflow.updated_at).toLocaleString()}`);
            
            // Get detailed workflow information
            const detailResult = await github.actions.getWorkflow(workflow.id);
            if (detailResult[0]) {
                const detail = detailResult[2];
                console.log(`   Badge URL: ${detail.badge_url}`);
                console.log(`   HTML URL: ${detail.html_url}`);
            }
        }
    }
}
```

#### Updating an Existing Workflow

```javascript
async function updateWorkflow(workflowPath) {
    const github = new GitHubFunctions(token, org, 'workflow-updater');
    
    // Get current workflow content
    const currentResult = await github.getFile(workflowPath);
    if (!currentResult[0]) {
        console.error('❌ Could not retrieve current workflow');
        return;
    }
    
    const currentContent = currentResult[2].content;
    console.log('📄 Current workflow content retrieved');
    
    // Update the content (example: add a new job)
    const updatedContent = currentContent + `
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Deploy to production
      run: |
        echo "Deploying to production..."
        # Add your deployment commands here
`;
    
    const result = await github.actions.updateWorkflow(
        workflowPath,
        updatedContent,
        'Add deployment job to workflow'
    );
    
    console.log(formatResult(result, 'Workflow updated successfully'));
    
    if (result[0]) {
        console.log('✅ Workflow updated at:', result[2].path);
        console.log('🔗 View changes at:', result[2].html_url);
    }
}
```

#### Deleting a Workflow

```javascript
async function deleteWorkflow(workflowPath) {
    const github = new GitHubFunctions(token, org, 'workflow-deleter');
    
    // Safety check - confirm the workflow exists
    const workflowsResult = await github.actions.getWorkflows();
    if (!workflowsResult[0]) {
        console.error('❌ Could not retrieve workflows');
        return;
    }
    
    const workflows = workflowsResult[2].workflows;
    const targetWorkflow = workflows.find(w => w.path === workflowPath);
    
    if (!targetWorkflow) {
        console.error(`❌ Workflow not found: ${workflowPath}`);
        return;
    }
    
    console.log(`⚠️  About to delete workflow: ${targetWorkflow.name}`);
    console.log(`   Path: ${workflowPath}`);
    console.log(`   Created: ${new Date(targetWorkflow.created_at).toLocaleString()}`);
    
    // In a real application, you would add a confirmation prompt here
    const result = await github.actions.deleteWorkflow(workflowPath);
    
    console.log(formatResult(result, 'Workflow deleted successfully'));
    
    if (result[0]) {
        console.log('✅ Workflow deleted successfully');
    }
}
```

### Workflow Execution Management

#### Triggering a Workflow Run

```javascript
async function triggerWorkflowRun(workflowId, ref = 'main', inputs = {}) {
    const github = new GitHubFunctions(token, org, 'workflow-trigger');
    
    console.log(`🔄 Triggering workflow ${workflowId} on ${ref}...`);
    
    const result = await github.actions.triggerWorkflow(workflowId, ref, inputs);
    console.log(formatResult(result, 'Workflow triggered successfully'));
    
    if (result[0]) {
        console.log('✅ Workflow run triggered');
        console.log('ℹ️  Check the Actions tab in your repository to see the run');
    }
}

// Example with custom inputs
async function triggerWorkflowWithInputs() {
    const github = new GitHubFunctions(token, org, 'workflow-trigger');
    
    const workflowInputs = {
        environment: 'production',
        version: '1.2.3',
        deploy_type: 'full'
    };
    
    const result = await github.actions.triggerWorkflow(
        'deploy.yml',  // Can use workflow ID or filename
        'main',
        workflowInputs
    );
    
    console.log(formatResult(result, 'Deployment workflow triggered'));
}
```

#### Monitoring Workflow Runs

```javascript
async function monitorWorkflowRuns(workflowId = null) {
    const github = new GitHubFunctions(token, org, 'workflow-monitor');
    
    console.log('📊 Retrieving workflow runs...');
    
    const result = workflowId 
        ? await github.actions.getWorkflowRuns(workflowId)
        : await github.actions.getWorkflowRuns();
    
    console.log(formatResult(result, 'Workflow runs retrieved successfully'));
    
    if (result[0] && result[2].workflow_runs) {
        const runs = result[2].workflow_runs;
        
        console.log(`\\n📈 Found ${runs.length} workflow run(s):`);
        
        // Show recent runs
        const recentRuns = runs.slice(0, 10);
        
        for (const run of recentRuns) {
            console.log(`\\n🏃 Run #${run.run_number}: ${run.name || 'Unnamed'}`);
            console.log(`   Status: ${getStatusEmoji(run.status)} ${run.status}`);
            console.log(`   Conclusion: ${getConclusionEmoji(run.conclusion)} ${run.conclusion || 'N/A'}`);
            console.log(`   Branch: ${run.head_branch}`);
            console.log(`   Commit: ${run.head_sha.substring(0, 7)}`);
            console.log(`   Started: ${new Date(run.created_at).toLocaleString()}`);
            console.log(`   Duration: ${calculateDuration(run.created_at, run.updated_at)}`);
            console.log(`   URL: ${run.html_url}`);
        }
        
        // Show summary statistics
        const summary = analyzeWorkflowRuns(runs);
        console.log(`\\n📊 Summary Statistics:`);
        console.log(`   Total runs: ${summary.total}`);
        console.log(`   Successful: ${summary.successful} (${summary.successRate}%)`);
        console.log(`   Failed: ${summary.failed}`);
        console.log(`   In progress: ${summary.inProgress}`);
        console.log(`   Average duration: ${summary.averageDuration}`);
    }
}

function getStatusEmoji(status) {
    const statusEmojis = {
        'completed': '✅',
        'in_progress': '🔄',
        'queued': '⏳',
        'requested': '📋',
        'waiting': '⏸️'
    };
    return statusEmojis[status] || '❓';
}

function getConclusionEmoji(conclusion) {
    const conclusionEmojis = {
        'success': '🎉',
        'failure': '❌',
        'cancelled': '⏹️',
        'skipped': '⏭️',
        'timed_out': '⏰',
        'neutral': '⚪'
    };
    return conclusionEmojis[conclusion] || '❓';
}

function calculateDuration(start, end) {
    const startTime = new Date(start);
    const endTime = new Date(end);
    const duration = endTime - startTime;
    
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    
    return `${minutes}m ${seconds}s`;
}

function analyzeWorkflowRuns(runs) {
    const total = runs.length;
    const successful = runs.filter(r => r.conclusion === 'success').length;
    const failed = runs.filter(r => r.conclusion === 'failure').length;
    const inProgress = runs.filter(r => r.status === 'in_progress').length;
    
    const completedRuns = runs.filter(r => r.status === 'completed');
    let totalDuration = 0;
    let durationCount = 0;
    
    completedRuns.forEach(run => {
        const duration = new Date(run.updated_at) - new Date(run.created_at);
        if (duration > 0) {
            totalDuration += duration;
            durationCount++;
        }
    });
    
    const averageDuration = durationCount > 0 
        ? Math.floor(totalDuration / durationCount / 60000) + 'm'
        : 'N/A';
    
    return {
        total,
        successful,
        failed,
        inProgress,
        successRate: total > 0 ? Math.round((successful / total) * 100) : 0,
        averageDuration
    };
}
```

### Advanced Workflow Operations

#### Batch Workflow Management

```javascript
async function batchCreateWorkflows(workflowDefinitions) {
    const github = new GitHubFunctions(token, org, 'batch-workflow-creator');
    const results = [];
    
    console.log(`🔄 Creating ${workflowDefinitions.length} workflows...`);
    
    for (const [index, definition] of workflowDefinitions.entries()) {
        try {
            console.log(`\\n📝 Creating workflow ${index + 1}/${workflowDefinitions.length}: ${definition.name}`);
            
            const result = await github.actions.createWorkflow(
                definition.path,
                definition.content,
                definition.commitMessage || `Add ${definition.name} workflow`
            );
            
            results.push({
                name: definition.name,
                path: definition.path,
                success: result[0],
                result: result[2],
                error: result[0] ? null : result[1]
            });
            
            if (result[0]) {
                console.log(chalk.green(`✅ Workflow created: ${definition.path}`));
            } else {
                console.log(chalk.red(`❌ Failed to create ${definition.path}: ${result[1]}`));
            }
        } catch (error) {
            console.log(chalk.red(`❌ Error creating workflow ${definition.name}: ${error.message}`));
        }
    }
    
    console.log('\\nBatch workflow creation complete');
    console.log('Results:', results);
}
```

## Complete Integration Examples

For production-ready implementations, we provide comprehensive examples that you can use directly or customize for your needs:

### 🖥️ Command-Line Interface

**➡️ [GitHub Actions Manager CLI](./integrations/actions-manager-cli.js)**

A complete interactive CLI application for GitHub Actions management:

- **Interactive Menu System** - Easy-to-use menu for selecting operations
- **Full CRUD Operations** - Create, read, update, and delete workflows
- **Pre-flight Checks** - Automatic GitHub App installation verification
- **Workflow Execution** - Trigger workflow runs with custom parameters
- **Run Monitoring** - View workflow execution history and status
- **Safe Operations** - Confirmation prompts for destructive actions
- **Configuration Support** - Uses `config.ini` for settings

```bash
# Install dependencies
npm install inquirer configparser

# Run the CLI
node integrations/actions-manager-cli.js
```

### 🌐 Web Application Interface

**➡️ [React Workflow Manager](./integrations/workflow-manager.jsx)**  
**➡️ [Component Styles](./integrations/workflow-manager.css)**

A comprehensive React component for web-based workflow management:

- **Real-time Updates** - Live workflow status and run monitoring
- **Responsive Design** - Mobile-friendly interface with modern styling
- **GitHub-inspired UI** - Familiar design patterns for GitHub users
- **Installation Checking** - Automatic GitHub App verification
- **Error Handling** - User-friendly error messages and recovery suggestions
- **Workflow Triggering** - Execute workflows with custom parameters
- **Run History** - View and analyze workflow execution history

```jsx
// Install React dependencies
npm install react react-dom

// Import and use
import WorkflowManager from './integrations/workflow-manager.jsx';
import './integrations/workflow-manager.css';

<WorkflowManager 
  token="your-token" 
  org="your-org" 
  repoName="your-repo" 
/>
```

### 📚 Integration Documentation

**➡️ [Complete Integration Guide](./integrations/README.md)**

The integration directory includes:
- **Setup Instructions** - Step-by-step implementation guides
- **Customization Examples** - How to adapt the examples for your use case
- **Performance Tips** - Optimization strategies for production use
- **Testing Patterns** - Unit and integration testing approaches
- **Deployment Guides** - Production deployment considerations


## Error Handling and Best Practices

### Comprehensive Error Handling

```javascript
class GitHubActionsErrorHandler {
    static async handleAPIResult(result, operation) {
        if (!result[0]) {
            const error = result[1];
            const context = result[2];
            
            // Log the error with context
            console.error(`❌ ${operation} failed:`, error);
            
            // Provide specific guidance based on error type
            if (error.includes('Not Found') || error.includes('404')) {
                console.log('💡 Suggestions:');
                console.log('   - Check if the workflow/repository exists');
                console.log('   - Verify you have access to the resource');
                console.log('   - Ensure the workflow ID or path is correct');
            } else if (error.includes('Forbidden') || error.includes('403')) {
                console.log('💡 Suggestions:');
                console.log('   - Check if the GitHub App has proper permissions');
                console.log('   - Verify the app is installed on the repository');
                console.log('   - Ensure Actions are enabled on the repository');
            } else if (error.includes('Unauthorized') || error.includes('401')) {
                console.log('💡 Suggestions:');
                console.log('   - Check if your GitHub token is valid');
                console.log('   - Verify the token has the required scopes');
                console.log('   - Ensure the token is not expired');
            } else if (error.includes('Rate limit') || error.includes('429')) {
                console.log('💡 Suggestions:');
                console.log('   - Wait before retrying the operation');
                console.log('   - Consider using GitHub App authentication for higher limits');
                console.log('   - Implement exponential backoff for retries');
            } else if (error.includes('Bad Request') || error.includes('400')) {
                console.log('💡 Suggestions:');
                console.log('   - Check the request parameters');
                console.log('   - Verify the workflow YAML syntax');
                console.log('   - Ensure required fields are provided');
            }
            
            return false;
        }
        
        return true;
    }
    
    static async withRetry(operation, maxRetries = 3, baseDelay = 1000) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await operation();
                
                if (result[0]) {
                    return result;
                }
                
                // If it's a rate limit error, wait longer
                if (result[1].includes('Rate limit')) {
                    const delay = baseDelay * Math.pow(2, attempt - 1);
                    console.log(`⏳ Rate limited, waiting ${delay}ms before retry ${attempt}/${maxRetries}`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                
                // For other errors, don't retry
                return result;
                
            } catch (error) {
                if (attempt === maxRetries) {
                    return [false, error.message, null];
                }
                
                const delay = baseDelay * attempt;
                console.log(`⏳ Attempt ${attempt} failed, retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
}

// Usage example
async function safeCreateWorkflow(github, path, content, commitMessage) {
    const operation = () => github.actions.createWorkflow(path, content, commitMessage);
    const result = await GitHubActionsErrorHandler.withRetry(operation);
    
    if (await GitHubActionsErrorHandler.handleAPIResult(result, 'Create workflow')) {
        console.log('✅ Workflow created successfully');
        return result[2];
    }
    
    return null;
}
```

### Configuration Validation

```javascript
class ConfigValidator {
    static validateConfig(config) {
        const errors = [];
        
        try {
            // Check required GitHub settings
            const requiredSettings = ['token', 'org'];
            for (const setting of requiredSettings) {
                if (!config.has('GitHub', setting)) {
                    errors.push(`Missing required GitHub setting: ${setting}`);
                }
            }
            
            // Validate token format
            const token = config.get('GitHub', 'token');
            if (token && !token.startsWith('ghp_') && !token.startsWith('gho_')) {
                errors.push('GitHub token format appears invalid (should start with ghp_ or gho_)');
            }
            
            // Validate organization name
            const org = config.get('GitHub', 'org');
            if (org && (org.includes(' ') || org.includes('/'))) {
                errors.push('Organization name should not contain spaces or slashes');
            }
            
            // Check optional settings
            const optionalSettings = ['repoName', 'workflowName', 'workflowFile'];
            for (const setting of optionalSettings) {
                if (config.has('GitHub', setting)) {
                    const value = config.get('GitHub', setting);
                    if (!value.trim()) {
                        errors.push(`Empty value for setting: ${setting}`);
                    }
                }
            }
            
        } catch (error) {
            errors.push(`Configuration parsing error: ${error.message}`);
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
    
    static async validateConnection(github) {
        const checks = {
            tokenValid: false,
            orgAccessible: false,
            appInstalled: false,
            actionsEnabled: false
        };
        
        try {
            // Check if we can access the organization
            const orgResult = await github.getGitHubOrg();
            checks.orgAccessible = orgResult[0];
            
            if (checks.orgAccessible) {
                checks.tokenValid = true;
                
                // Check GitHub App installation
                const appResult = await github.actions.getInstallationStatus();
                checks.appInstalled = appResult[0];
                
                if (checks.appInstalled) {
                    // Check if Actions are accessible
                    const actionsResult = await github.actions.getWorkflows();
                    checks.actionsEnabled = actionsResult[0];
                }
            }
        } catch (error) {
            // Connection checks failed
        }
        
        return checks;
    }
}

// Usage
function validateSetup(configPath) {
    const config = new ConfigParser();
    config.read(configPath);
    
    const validation = ConfigValidator.validateConfig(config);
    
    if (!validation.valid) {
        console.error('❌ Configuration validation failed:');
        validation.errors.forEach(error => {
            console.error(`   - ${error}`);
        });
        return false;
    }
    
    console.log('✅ Configuration validation passed');
    return true;
}
```

### Retry Logic for Network Operations

```javascript
class NetworkRetryManager {
    static async executeWithRetry(operation, options = {}) {
        const {
            maxRetries = 3,
            baseDelay = 1000,
            maxDelay = 10000,
            retryOnStatus = [429, 500, 502, 503, 504],
            backoffFactor = 2
        } = options;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await operation();
                
                // If operation succeeded, return result
                if (result[0]) {
                    return result;
                }
                
                // Check if error is retryable
                const error = result[1];
                const shouldRetry = this.shouldRetryError(error, retryOnStatus);
                
                if (!shouldRetry || attempt === maxRetries) {
                    return result;
                }
                
                // Calculate delay with exponential backoff
                const delay = Math.min(
                    baseDelay * Math.pow(backoffFactor, attempt - 1),
                    maxDelay
                );
                
                console.log(`⏳ Attempt ${attempt} failed, waiting ${delay}ms before retrying...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                
            } catch (error) {
                if (attempt === maxRetries) {
                    throw error;
                }
                
                const delay = Math.min(
                    baseDelay * Math.pow(backoffFactor, attempt - 1),
                    maxDelay
                );
                
                console.log(`⏳ Network error on attempt ${attempt}, retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    static shouldRetryError(error, retryOnStatus) {
        const errorString = error.toLowerCase();
        
        // Retry on rate limits
        if (errorString.includes('rate limit') || errorString.includes('429')) {
            return true;
        }
        
        // Retry on server errors
        if (errorString.includes('internal server error') || 
            errorString.includes('bad gateway') ||
            errorString.includes('service unavailable') ||
            errorString.includes('gateway timeout')) {
            return true;
        }
        
        // Retry on network timeouts
        if (errorString.includes('timeout') || errorString.includes('econnreset')) {
            return true;
        }
        
        // Don't retry on client errors (4xx except 429)
        if (errorString.includes('unauthorized') ||
            errorString.includes('forbidden') ||
            errorString.includes('not found') ||
            errorString.includes('bad request')) {
            return false;
        }
        
        return false;
    }
}

// Enhanced API wrapper with retry logic
class RobustGitHubActions {
    constructor(github, retryOptions = {}) {
        this.github = github;
        this.retryOptions = retryOptions;
    }
    
    async getWorkflows() {
        return await NetworkRetryManager.executeWithRetry(
            () => this.github.actions.getWorkflows(),
            this.retryOptions
        );
    }
    
    async getWorkflow(workflowId) {
        return await NetworkRetryManager.executeWithRetry(
            () => this.github.actions.getWorkflow(workflowId),
            this.retryOptions
        );
    }
    
    async createWorkflow(path, content, commitMessage) {
        return await NetworkRetryManager.executeWithRetry(
            () => this.github.actions.createWorkflow(path, content, commitMessage),
            this.retryOptions
        );
    }
    
    async updateWorkflow(path, content, commitMessage) {
        return await NetworkRetryManager.executeWithRetry(
            () => this.github.actions.updateWorkflow(path, content, commitMessage),
            this.retryOptions
        );
    }
    
    async deleteWorkflow(path) {
        return await NetworkRetryManager.executeWithRetry(
            () => this.github.actions.deleteWorkflow(path),
            this.retryOptions
        );
    }
    
    async triggerWorkflow(workflowId, ref, inputs) {
        return await NetworkRetryManager.executeWithRetry(
            () => this.github.actions.triggerWorkflow(workflowId, ref, inputs),
            this.retryOptions
        );
    }
    
    async getWorkflowRuns(workflowId) {
        return await NetworkRetryManager.executeWithRetry(
            () => this.github.actions.getWorkflowRuns(workflowId),
            this.retryOptions
        );
    }
}

// Health check endpoint
class HealthChecker {
    constructor(github) {
        this.github = github;
        this.lastHealthCheck = null;
        this.healthStatus = 'unknown';
    }
    
    async checkHealth() {
        try {
            const start = Date.now();
            
            // Check GitHub App installation
            const installResult = await this.github.actions.getInstallationStatus();
            const appHealthy = installResult[0];
            
            // Check API accessibility
            const workflowsResult = await this.github.actions.getWorkflows();
            const apiHealthy = workflowsResult[0];
            
            const responseTime = Date.now() - start;
            
            this.healthStatus = appHealthy && apiHealthy ? 'healthy' : 'unhealthy';
            this.lastHealthCheck = new Date().toISOString();
            
            const health = {
                status: this.healthStatus,
                timestamp: this.lastHealthCheck,
                responseTime,
                checks: {
                    github_app: appHealthy ? 'healthy' : 'unhealthy',
                    api_access: apiHealthy ? 'healthy' : 'unhealthy'
                }
            };
            
            logger.info('Health check completed', health);
            
            return health;
            
        } catch (error) {
            this.healthStatus = 'unhealthy';
            this.lastHealthCheck = new Date().toISOString();
            
            const health = {
                status: 'unhealthy',
                timestamp: this.lastHealthCheck,
                error: error.message
            };
            
            logger.error('Health check failed', health);
            
            return health;
        }
    }
    
    startPeriodicHealthCheck(interval = 60000) {
        setInterval(async () => {
            await this.checkHealth();
        }, interval);
    }
}

// Usage in production
const github = new GitHubFunctions(
    process.env.GITHUB_TOKEN,
    process.env.GITHUB_ORG,
    'production-actions-manager'
);

const monitoredActions = new MonitoredGitHubActions(github);
const healthChecker = new HealthChecker(github);

// Start health monitoring
healthChecker.startPeriodicHealthCheck();

// Export metrics endpoint
export function getMetrics() {
    return register.metrics();
}

// Export health check endpoint
export async function getHealth() {
    return await healthChecker.checkHealth();
}

export { monitoredActions, logger };
```

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. GitHub App Installation Issues

**Problem:** `❌ GitHub App not properly installed`

**Symptoms:**
- Installation status check fails
- Cannot access Actions workflows
- 403 Forbidden errors

**Solutions:**
1. **Verify App Installation:**
   ```bash
   # Check if the app is installed on your organization
   curl -H "Authorization: token YOUR_TOKEN" \
        https://api.github.com/orgs/YOUR_ORG/installations
   ```

2. **Check App Permissions:**
   - Go to GitHub Settings → Applications → Installed GitHub Apps
   - Ensure the Mediumroast app has:
     - Repository access (All repositories or specific ones)
     - Actions permissions (Read & Write)
     - Contents permissions (Read & Write)

3. **Reinstall if Necessary:**
   ```bash
   # Remove and reinstall the app
   # Visit: https://github.com/apps/mediumroast-for-github
   # Click "Install" and select your organization
   ```

**Prevention:**
- Regular permission audits
- Monitor app installation status
- Use the `getInstallationStatus()` method in your pre-flight checks

#### 2. Authentication and Permission Errors

**Problem:** `❌ 401 Unauthorized` or `❌ 403 Forbidden`

**Symptoms:**
- Cannot access repositories
- Token validation fails
- Permission denied errors

**Solutions:**
1. **Check Token Validity:**
   ```javascript
   async function validateToken(token) {
       const response = await fetch('https://api.github.com/user', {
           headers: {
               'Authorization': `token ${token}`,
               'Accept': 'application/vnd.github.v3+json'
           }
       });
       
       if (response.ok) {
           const user = await response.json();
           console.log('✅ Token valid for user:', user.login);
           return true;
       } else {
           console.log('❌ Token invalid:', response.status);
           return false;
       }
   }
   ```

2. **Verify Token Scopes:**
   ```javascript
   async function checkTokenScopes(token) {
       const response = await fetch('https://api.github.com/user', {
           headers: {
               'Authorization': `token ${token}`,
               'Accept': 'application/vnd.github.v3+json'
           }
       });
       
       const scopes = response.headers.get('X-OAuth-Scopes');
       console.log('Token scopes:', scopes);
       
       // Required scopes for Actions management
       const required = ['repo', 'workflow'];
       const hasRequired = required.every(scope => scopes.includes(scope));
       
       if (!hasRequired) {
           console.log('❌ Token missing required scopes:', required);
           return false;
       }
       
       return true;
   }
   ```

3. **Organization Access:**
   ```javascript
   async function checkOrgAccess(github, orgName) {
       try {
           const orgResult = await github.getGitHubOrg();
           if (orgResult[0]) {
               console.log('✅ Organization access confirmed');
               return true;
           } else {
               console.log('❌ Cannot access organization:', orgResult[1]);
               return false;
           }
       } catch (error) {
           console.log('❌ Organization access error:', error.message);
           return false;
       }
   }
   ```

#### 3. Workflow Creation and Update Failures

**Problem:** `❌ Workflow creation/update failed`

**Symptoms:**
- YAML syntax errors
- Path conflicts
- File encoding issues

**Solutions:**
1. **YAML Validation:**
   ```javascript
   import yaml from 'js-yaml';
   
   function validateWorkflowYAML(content) {
       try {
           const parsed = yaml.load(content);
           
           // Check required fields
           if (!parsed.name) {
               throw new Error('Workflow name is required');
           }
           
           if (!parsed.on) {
               throw new Error('Workflow trigger (on) is required');
           }
           
           if (!parsed.jobs) {
               throw new Error('Workflow jobs are required');
           }
           
           console.log('✅ YAML validation passed');
           return true;
           
       } catch (error) {
           console.log('❌ YAML validation failed:', error.message);
           return false;
       }
   }
   ```

2. **Path Validation:**
   ```javascript
   function validateWorkflowPath(path) {
       const errors = [];
       
       if (!path.startsWith('.github/workflows/')) {
           errors.push('Workflow path must start with .github/workflows/');
       }
       
       if (!path.endsWith('.yml') && !path.endsWith('.yaml')) {
           errors.push('Workflow file must have .yml or .yaml extension');
       }
       
       if (path.includes('..')) {
           errors.push('Workflow path cannot contain parent directory references');
       }
       
       if (errors.length > 0) {
           console.log('❌ Path validation failed:', errors);
           return false;
       }
       
       return true;
   }
   ```

3. **Content Encoding:**
   ```javascript
   function ensureUTF8(content) {
       // Ensure content is properly encoded
       return Buffer.from(content, 'utf8').toString('utf8');
   }
   ```

#### 4. Rate Limiting Issues

**Problem:** `❌ Rate limit exceeded`

**Symptoms:**
- 429 Too Many Requests errors
- Delayed responses
- Temporary API unavailability

**Solutions:**
1. **Implement Rate Limiting:**
   ```javascript
   class RateLimiter {
       constructor(maxRequests = 5000, windowMs = 3600000) {
           this.maxRequests = maxRequests;
           this.windowMs = windowMs;
           this.requests = [];
       }
       
       async waitIfNeeded() {
           const now = Date.now();
           
           // Remove old requests outside the window
           this.requests = this.requests.filter(time => now - time < this.windowMs);
           
           if (this.requests.length >= this.maxRequests) {
               const oldestRequest = Math.min(...this.requests);
               const waitTime = this.windowMs - (now - oldestRequest);
               
               console.log(`⏳ Rate limit reached, waiting ${waitTime}ms`);
               await new Promise(resolve => setTimeout(resolve, waitTime));
           }
           
           this.requests.push(now);
       }
   }
   ```

2. **Use Exponential Backoff:**
   ```javascript
   async function executeWithBackoff(operation, maxRetries = 5) {
       for (let attempt = 1; attempt <= maxRetries; attempt++) {
           try {
               const result = await operation();
               
               if (result[0]) {
                   return result;
               }
               
               if (result[1].includes('rate limit')) {
                   const backoffTime = Math.pow(2, attempt) * 1000;
                   console.log(`⏳ Rate limited, backing off ${backoffTime}ms`);
                   await new Promise(resolve => setTimeout(resolve, backoffTime));
                   continue;
               }
               
               return result;
               
           } catch (error) {
               if (attempt === maxRetries) {
                   throw error;
               }
               
               const backoffTime = Math.pow(2, attempt) * 1000;
               await new Promise(resolve => setTimeout(resolve, backoffTime));
           }
       }
   }
   ```

#### 5. Network and Connectivity Issues

**Problem:** Network timeouts or connection errors

**Symptoms:**
- Connection timeout errors
- DNS resolution failures
- Intermittent failures

**Solutions:**
1. **Connection Testing:**
   ```javascript
   async function testGitHubConnectivity() {
       const endpoints = [
           'https://api.github.com',
           'https://github.com',
           'https://raw.githubusercontent.com'
       ];
       
       const results = await Promise.all(
           endpoints.map(async (endpoint) => {
               try {
                   const response = await fetch(endpoint, {
                       method: 'HEAD',
                       timeout: 5000
                   });
                   
                   return {
                       endpoint,
                       status: response.ok ? 'healthy' : 'unhealthy',
                       statusCode: response.status
                   };
               } catch (error) {
                   return {
                       endpoint,
                       status: 'error',
                       error: error.message
                   };
               }
           })
       );
       
       console.log('GitHub connectivity test results:', results);
       return results;
   }
   ```

2. **Timeout Configuration:**
   ```javascript
   const fetchWithTimeout = (url, options = {}) => {
       const { timeout = 30000 } = options;
       
       return Promise.race([
           fetch(url, options),
           new Promise((_, reject) =>
               setTimeout(() => reject(new Error('Request timeout')), timeout)
           )
       ]);
   };
   ```

### Diagnostic Tools

#### 1. Health Check Script

```javascript
// diagnostic/health-check.js
import GitHubFunctions from 'mediumroast_api/src/api/github.js';
import ConfigParser from 'configparser';

class HealthChecker {
    constructor(configPath = './config.ini') {
        this.config = new ConfigParser();
        this.config.read(configPath);
    }
    
    async runDiagnostics() {
        console.log('🔍 Running GitHub Actions Health Check');
        console.log('=' .repeat(50));
        
        const results = {
            config: await this.checkConfig(),
            connectivity: await this.checkConnectivity(),
            authentication: await this.checkAuthentication(),
            permissions: await this.checkPermissions(),
            actions: await this.checkActions()
        };
        
        this.printResults(results);
        return results;
    }
    
    async checkConfig() {
        try {
            const required = ['token', 'org'];
            const missing = required.filter(key => !this.config.has('GitHub', key));
            
            return {
                status: missing.length === 0 ? 'healthy' : 'unhealthy',
                missing: missing,
                details: missing.length === 0 ? 'All required config present' : `Missing: ${missing.join(', ')}`
            };
        } catch (error) {
            return {
                status: 'error',
                error: error.message
            };
        }
    }
    
    async checkConnectivity() {
        try {
            const response = await fetch('https://api.github.com/zen', {
                timeout: 10000
            });
            
            return {
                status: response.ok ? 'healthy' : 'unhealthy',
                statusCode: response.status,
                details: response.ok ? 'GitHub API accessible' : 'GitHub API not accessible'
            };
        } catch (error) {
            return {
                status: 'error',
                error: error.message
            };
        }
    }
    
    async checkAuthentication() {
        try {
            const token = this.config.get('GitHub', 'token');
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (response.ok) {
                const user = await response.json();
                return {
                    status: 'healthy',
                    user: user.login,
                    details: `Authenticated as ${user.login}`
                };
            } else {
                return {
                    status: 'unhealthy',
                    statusCode: response.status,
                    details: 'Authentication failed'
                };
            }
        } catch (error) {
            return {
                status: 'error',
                error: error.message
            };
        }
    }
    
    async checkPermissions() {
        try {
            const token = this.config.get('GitHub', 'token');
            const org = this.config.get('GitHub', 'org');
            
            const github = new GitHubFunctions(token, org, 'health-check');
            const installResult = await github.actions.getInstallationStatus();
            
            return {
                status: installResult[0] ? 'healthy' : 'unhealthy',
                details: installResult[0] ? 'GitHub App properly installed' : installResult[1],
                appStatus: installResult[2]
            };
        } catch (error) {
            return {
                status: 'error',
                error: error.message
            };
        }
    }
    
    async checkActions() {
        try {
            const token = this.config.get('GitHub', 'token');
            const org = this.config.get('GitHub', 'org');
            
            const github = new GitHubFunctions(token, org, 'health-check');
            const workflowsResult = await github.actions.getWorkflows();
            
            if (workflowsResult[0]) {
                const workflows = workflowsResult[2].workflows || [];
                return {
                    status: 'healthy',
                    workflowCount: workflows.length,
                    details: `${workflows.length} workflows accessible`
                };
            } else {
                return {
                    status: 'unhealthy',
                    details: `Cannot access workflows: ${workflowsResult[1]}`
                };
            }
        } catch (error) {
            return {
                status: 'error',
                error: error.message
            };
        }
    }
    
    printResults(results) {
        console.log('\\n📊 Health Check Results:');
        console.log('-' .repeat(30));
        
        Object.entries(results).forEach(([check, result]) => {
            const status = result.status === 'healthy' ? '✅' : 
                          result.status === 'unhealthy' ? '❌' : '⚠️';
            
            console.log(`${status} ${check.toUpperCase()}: ${result.details || result.error || 'Unknown'}`);
        });
        
        const overallHealthy = Object.values(results).every(r => r.status === 'healthy');
        console.log(`\\n🎯 Overall Status: ${overallHealthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);
    }
}

// Usage
const healthChecker = new HealthChecker();
healthChecker.runDiagnostics();
```

#### 2. Debug Logger

```javascript
// diagnostic/debug-logger.js
class DebugLogger {
    constructor(level = 'info') {
        this.level = level;
        this.levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };
    }
    
    log(level, message, data = null) {
        if (this.levels[level] >= this.levels[this.level]) {
            const timestamp = new Date().toISOString();
            const logEntry = {
                timestamp,
                level: level.toUpperCase(),
                message,
                data
            };
            
            console.log(JSON.stringify(logEntry, null, 2));
        }
    }
    
    debug(message, data) {
        this.log('debug', message, data);
    }
    
    info(message, data) {
        this.log('info', message, data);
    }
    
    warn(message, data) {
        this.log('warn', message, data);
    }
    
    error(message, data) {
        this.log('error', message, data);
    }
    
    logAPICall(method, url, params, response) {
        this.debug('API Call', {
            method,
            url,
            params,
            response: {
                status: response[0] ? 'success' : 'failure',
                message: response[1],
                data: response[2] ? 'present' : 'null'
            }
        });
    }
}

export default DebugLogger;
```

## Advanced Usage Patterns

### Workflow Automation Pipeline

```javascript
class WorkflowAutomationPipeline {
    constructor(github, config) {
        this.github = github;
        this.config = config;
        this.pipeline = [];
    }
    
    addStage(name, handler) {
        this.pipeline.push({ name, handler });
        return this;
    }
    
    async execute() {
        console.log('🚀 Starting workflow automation pipeline');
        
        const results = [];
        
        for (const stage of this.pipeline) {
            console.log(`\\n📋 Executing stage: ${stage.name}`);
            
            try {
                const result = await stage.handler();
                results.push({
                    stage: stage.name,
                    success: true,
                    result
                });
                console.log(`✅ Stage ${stage.name} completed successfully`);
            } catch (error) {
                results.push({
                    stage: stage.name,
                    success: false,
                    error: error.message
                });
                console.error(`❌ Stage ${stage.name} failed:`, error.message);
                
                // Stop pipeline on error
                break;
            }
        }
        
        return results;
    }
}

// Usage example
async function setupCICDPipeline() {
    const github = new GitHubFunctions(token, org, 'cicd-setup');
    const pipeline = new WorkflowAutomationPipeline(github, config);
    
    pipeline
        .addStage('Verify Installation', async () => {
            const result = await github.actions.getInstallationStatus();
            if (!result[0]) {
                throw new Error('GitHub App not installed');
            }
            return result[2];
        })
        .addStage('Create CI Workflow', async () => {
            const ciContent = generateCIWorkflow();
            const result = await github.actions.createWorkflow(
                '.github/workflows/ci.yml',
                ciContent,
                'Add CI workflow'
            );
            if (!result[0]) {
                throw new Error(`CI workflow creation failed: ${result[1]}`);
            }
            return result[2];
        })
        .addStage('Create CD Workflow', async () => {
            const cdContent = generateCDWorkflow();
            const result = await github.actions.createWorkflow(
                '.github/workflows/cd.yml',
                cdContent,
                'Add CD workflow'
            );
            if (!result[0]) {
                throw new Error(`CD workflow creation failed: ${result[1]}`);
            }
            return result[2];
        })
        .addStage('Validate Workflows', async () => {
            const workflowsResult = await github.actions.getWorkflows();
            if (!workflowsResult[0]) {
                throw new Error('Cannot validate workflows');
            }
            
            const workflows = workflowsResult[2].workflows || [];
            const requiredWorkflows = ['CI', 'CD'];
            const foundWorkflows = workflows.filter(w => 
                requiredWorkflows.some(req => w.name.includes(req))
            );
            
            if (foundWorkflows.length !== requiredWorkflows.length) {
                throw new Error('Not all required workflows found');
            }
            
            return foundWorkflows;
        });
    
    return await pipeline.execute();
}
```

## Quick Start Options

**🚀 Ready to jump right in?** Choose your preferred approach:

- **[Interactive CLI](./integrations/actions-manager-cli.js)** - Complete command-line application with menu-driven interface
- **[React Component](./integrations/workflow-manager.jsx)** - Drop-in web component for workflow management
- **[Integration Guide](./integrations/README.md)** - Complete setup and customization instructions

**📚 Learning Path:** Continue with this tutorial for step-by-step explanations and API details.

## Conclusion

This comprehensive tutorial provides everything you need to implement robust GitHub Actions workflow management using the Mediumroast API. The guide covers:

### ✅ **Core Functionality**
- **Complete CRUD Operations** - Create, read, update, and delete workflows
- **Workflow Execution Management** - Trigger runs and monitor execution
- **Installation Verification** - Pre-flight checks for GitHub App status
- **Error Handling** - Comprehensive error detection and recovery

### 🔧 **Developer Experience**
- **Multiple Integration Patterns** - CLI, web applications, and programmatic use
- **Interactive CLI Tool** - Professional command-line interface with rich output
- **React Components** - Ready-to-use UI components for web applications
- **TypeScript Support** - Full type safety and IntelliSense support

### 🛡️ **Production Ready**
- **Robust Error Handling** - Comprehensive error detection and user guidance
- **Rate Limiting** - Built-in protection against API limits
- **Retry Logic** - Automatic retries with exponential backoff
- **Monitoring & Logging** - Production-grade observability

### 📊 **Quality Assurance**
- **Comprehensive Testing** - Unit tests, integration tests, and health checks
- **Configuration Validation** - Automatic validation of setup requirements
- **Diagnostic Tools** - Health check scripts and debug logging
- **Best Practices** - Following GitHub's recommended patterns

### 🚀 **Advanced Features**
- **Workflow Templates** - Reusable workflow generation system
- **Batch Operations** - Efficient handling of multiple workflows
- **Automation Pipelines** - Streamlined workflow setup processes
- **Custom Formatting** - Consistent, professional output formatting

### Key Use Cases Covered:

1. **CI/CD Pipeline Management** - Complete lifecycle management of build and deployment workflows
2. **Workflow Monitoring** - Real-time tracking of workflow execution and health
3. **Template-based Creation** - Standardized workflow generation from templates
4. **Bulk Operations** - Efficient management of multiple workflows across repositories
5. **Integration Development** - Building workflows into larger automation systems

### Implementation Checklist:

1. ✅ Install the Mediumroast for GitHub App with proper permissions
2. ✅ Configure your environment with organization and repository details
3. ✅ Install required dependencies (`mediumroast_api`, `inquirer`, `configparser`)
4. ✅ Run health checks to verify setup and connectivity
5. ✅ Choose your implementation approach (CLI, web app, or programmatic)
6. ✅ Implement error handling and retry logic for production use
7. ✅ Add monitoring and logging for operational visibility
8. ✅ Create tests to validate your integration
9. ✅ Set up automated health checks and alerting

### Next Steps:

- **Explore the API Documentation** - Review the complete API reference for advanced features
- **Run the Example Code** - Test the provided examples in your environment
- **Customize for Your Needs** - Adapt the patterns to your specific use cases
- **Contribute Back** - Share improvements and extensions with the community

### Getting Help:

- **Review the Troubleshooting Guide** - Common issues and solutions are documented above
- **Use the Diagnostic Tools** - Run health checks to identify configuration issues
- **Check the API Status** - Verify GitHub API availability and your app installation
- **Test Individual Operations** - Isolate issues by testing components separately

This tutorial provides the foundation for building sophisticated GitHub Actions management systems that are reliable, maintainable, and production-ready. By following these patterns and best practices, you can create workflows that enhance your development process and provide excellent user experiences.

---

**Quick Reference:**

```javascript
// Basic setup
import GitHubFunctions from 'mediumroast_api/src/api/github.js';
const github = new GitHubFunctions(token, org, 'my-app');

// Essential operations
const status = await github.actions.getInstallationStatus();
const workflows = await github.actions.getWorkflows();
const workflow = await github.actions.getWorkflow(workflowId);
const created = await github.actions.createWorkflow(path, content, message);
const updated = await github.actions.updateWorkflow(path, content, message);
const deleted = await github.actions.deleteWorkflow(path);
const triggered = await github.actions.triggerWorkflow(id, ref, inputs);
const runs = await github.actions.getWorkflowRuns(workflowId);
```

**Remember:** Always check the first element of the returned array to determine success (`result[0]`), handle errors gracefully, and use the formatting utilities for consistent output presentation.

---

## Navigation

- **[⬅️ Getting Started](./github-getting-started.md)** - Prerequisites, installation, and basic setup
- **[📋 All Tutorials](./README.md)** - Complete tutorial directory
- **[📁 Repository Tutorial](./github-repository.md)** - Repository management operations

## Related Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub API Documentation](https://docs.github.com/en/rest)
- [Mediumroast API Documentation](../docs/)
- [GitHub Apps Documentation](https://docs.github.com/en/developers/apps)
