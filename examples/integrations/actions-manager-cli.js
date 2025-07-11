/* eslint-disable no-console */
/**
 * GitHub Actions Manager - Complete CLI Implementation
 * 
 * This is a comprehensive CLI application for managing GitHub Actions workflows
 * using the Mediumroast API. It provides a full interactive interface for
 * creating, reading, updating, and deleting workflows.
 * 
 * Features:
 * - Interactive menu-driven interface
 * - Pre-flight checks for GitHub App installation
 * - Repository and Actions availability verification
 * - Full CRUD operations for workflows
 * - Workflow execution triggering and monitoring
 * - Safe deletion with confirmation prompts
 * - Detailed error handling and user feedback
 * 
 * Usage:
 *   node actions-manager-cli.js
 * 
 * Prerequisites:
 *   - Complete the setup in github-getting-started.md
 *   - Configure your config.ini file
 *   - Install dependencies: npm install inquirer configparser
 */

import GitHubFunctions from 'mediumroast_api/src/api/github.js';
import ConfigParser from 'configparser';
import inquirer from 'inquirer';
import { formatResult } from 'mediumroast_api/src/api/gitHubServer/utils/formatting.js';

class GitHubActionsManager {
  constructor(configPath = './config.ini') {
    this.config = new ConfigParser();
    this.config.read(configPath);
        
    this.token = this.config.get('GitHub', 'token');
    this.org = this.config.get('GitHub', 'org');
    this.repoName = this.config.get('GitHub', 'repoName');
        
    this.github = new GitHubFunctions(this.token, this.org, 'actions-manager');
  }

  async initialize() {
    console.log('🚀 GitHub Actions Manager Starting...');
        
    // Perform pre-flight checks
    const appInstalled = await this.checkGitHubAppInstallation();
    if (!appInstalled) {
      return false;
    }
        
    const repoStatus = await this.checkRepositoryAndActions();
    if (!repoStatus.repository.exists) {
      console.error('❌ Repository not accessible - cannot manage Actions');
      return false;
    }
        
    console.log('✅ Initialization complete');
    return true;
  }

  async checkGitHubAppInstallation() {
    console.log('🔍 Checking GitHub App installation...');
        
    const appCheckResult = await this.github.actions.getInstallationStatus();
        
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
      console.log('4. Grant repository and Actions permissions');
      return false;
    }
        
    const appCheck = appCheckResult[2];
    console.log('✅ GitHub App Installation Check:');
    console.log('   App Status: Properly installed');
    console.log(`   Repository Access: ${appCheck.repositorySelection === 'all' ? 'All repositories' : `${appCheck.repositoryAccess} repositories`}`);
    console.log('   Actions Permissions: Valid');
        
    return true;
  }

  async checkRepositoryAndActions() {
    console.log('🔍 Checking repository and Actions availability...');
        
    const status = {
      repository: { exists: false, error: null },
      actions: { enabled: false, error: null }
    };

    try {
      // Check if repository exists
      const repoResult = await this.github.getRepoSize();
      if (repoResult[0]) {
        status.repository.exists = true;
        console.log('✅ Repository exists');
                
        // Check if Actions are enabled
        try {
          const actionsResult = await this.github.actions.getWorkflows();
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

  async showMainMenu() {
    const choices = [
      { name: '📋 List all workflows', value: 'list' },
      { name: '👀 View workflow details', value: 'view' },
      { name: '➕ Create new workflow', value: 'create' },
      { name: '✏️  Update existing workflow', value: 'update' },
      { name: '🗑️  Delete workflow', value: 'delete' },
      { name: '🔄 Trigger workflow run', value: 'trigger' },
      { name: '📊 View workflow runs', value: 'runs' },
      { name: '🚪 Exit', value: 'exit' }
    ];

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: choices
      }
    ]);

    return action;
  }

  async executeAction(action) {
    switch (action) {
    case 'list':
      await this.listWorkflows();
      break;
    case 'view':
      await this.viewWorkflow();
      break;
    case 'create':
      await this.createWorkflow();
      break;
    case 'update':
      await this.updateWorkflow();
      break;
    case 'delete':
      await this.deleteWorkflow();
      break;
    case 'trigger':
      await this.triggerWorkflow();
      break;
    case 'runs':
      await this.viewWorkflowRuns();
      break;
    case 'exit':
      console.log('👋 Goodbye!');
      return false;
    default:
      console.log('❌ Invalid action');
    }
    return true;
  }

  async listWorkflows() {
    console.log('\n📋 Listing all workflows...');
        
    const result = await this.github.actions.getWorkflows();
    console.log(formatResult(result, 'Workflows retrieved successfully'));
        
    if (result[0] && result[2] && result[2].workflows) {
      const workflows = result[2].workflows;
      if (workflows.length === 0) {
        console.log('ℹ️  No workflows found in this repository');
      } else {
        console.log(`\n📊 Found ${workflows.length} workflow(s):`);
        workflows.forEach((workflow, index) => {
          console.log(`\n${index + 1}. ${workflow.name}`);
          console.log(`   ID: ${workflow.id}`);
          console.log(`   State: ${workflow.state}`);
          console.log(`   Path: ${workflow.path}`);
          console.log(`   Created: ${new Date(workflow.created_at).toLocaleString()}`);
        });
      }
    }
  }

  async viewWorkflow() {
    console.log('\n👀 View workflow details...');
        
    // First, get the list of workflows to choose from
    const workflowsResult = await this.github.actions.getWorkflows();
    if (!workflowsResult[0] || !workflowsResult[2]?.workflows?.length) {
      console.log('❌ No workflows found to view');
      return;
    }
        
    const workflows = workflowsResult[2].workflows;
    const choices = workflows.map(workflow => ({
      name: `${workflow.name} (${workflow.path})`,
      value: workflow.id
    }));
        
    const { workflowId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'workflowId',
        message: 'Select a workflow to view:',
        choices: choices
      }
    ]);
        
    const result = await this.github.actions.getWorkflow(workflowId);
    console.log(formatResult(result, 'Workflow details retrieved successfully'));
  }

  async createWorkflow() {
    console.log('\n➕ Create new workflow...');
        
    const workflowData = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Workflow name:',
        default: this.config.get('GitHub', 'workflowName') || 'main-workflow'
      },
      {
        type: 'input',
        name: 'description',
        message: 'Workflow description:',
        default: this.config.get('GitHub', 'workflowDescription') || 'Main CI/CD workflow'
      },
      {
        type: 'input',
        name: 'path',
        message: 'Workflow file path:',
        default: this.config.get('GitHub', 'workflowFile') || '.github/workflows/main.yml'
      },
      {
        type: 'editor',
        name: 'content',
        message: 'Workflow YAML content (will open in editor):',
        default: this.getDefaultWorkflowContent()
      }
    ]);
        
    const result = await this.github.actions.createWorkflow(
      workflowData.path,
      workflowData.content,
      `Create ${workflowData.name} workflow`
    );
        
    console.log(formatResult(result, 'Workflow created successfully'));
  }

  async updateWorkflow() {
    console.log('\n✏️  Update existing workflow...');
        
    // Get workflows to choose from
    const workflowsResult = await this.github.actions.getWorkflows();
    if (!workflowsResult[0] || !workflowsResult[2]?.workflows?.length) {
      console.log('❌ No workflows found to update');
      return;
    }
        
    const workflows = workflowsResult[2].workflows;
    const choices = workflows.map(workflow => ({
      name: `${workflow.name} (${workflow.path})`,
      value: { id: workflow.id, path: workflow.path }
    }));
        
    const { selectedWorkflow } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedWorkflow',
        message: 'Select a workflow to update:',
        choices: choices
      }
    ]);
        
    // Get current workflow content
    const currentResult = await this.github.actions.getWorkflow(selectedWorkflow.id);
    let currentContent = '';
        
    if (currentResult[0] && currentResult[2]) {
      // Try to get the file content
      try {
        const fileResult = await this.github.getFile(selectedWorkflow.path);
        if (fileResult[0]) {
          currentContent = fileResult[2].content;
        }
      } catch (error) {
        console.log('⚠️  Could not retrieve current content');
      }
    }
        
    const { content, commitMessage } = await inquirer.prompt([
      {
        type: 'editor',
        name: 'content',
        message: 'Update workflow YAML content:',
        default: currentContent
      },
      {
        type: 'input',
        name: 'commitMessage',
        message: 'Commit message:',
        default: `Update workflow ${selectedWorkflow.path}`
      }
    ]);
        
    const result = await this.github.actions.updateWorkflow(
      selectedWorkflow.path,
      content,
      commitMessage
    );
        
    console.log(formatResult(result, 'Workflow updated successfully'));
  }

  async deleteWorkflow() {
    console.log('\n🗑️  Delete workflow...');
        
    // Get workflows to choose from
    const workflowsResult = await this.github.actions.getWorkflows();
    if (!workflowsResult[0] || !workflowsResult[2]?.workflows?.length) {
      console.log('❌ No workflows found to delete');
      return;
    }
        
    const workflows = workflowsResult[2].workflows;
    const choices = workflows.map(workflow => ({
      name: `${workflow.name} (${workflow.path})`,
      value: { id: workflow.id, path: workflow.path, name: workflow.name }
    }));
        
    const { selectedWorkflow } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedWorkflow',
        message: 'Select a workflow to delete:',
        choices: choices
      }
    ]);
        
    // Confirm deletion
    const confirmed = await this.confirmDestructiveOperation(
      'delete this workflow',
      `This will permanently delete workflow "${selectedWorkflow.name}" (${selectedWorkflow.path})`
    );
        
    if (!confirmed) {
      console.log('❌ Operation cancelled by user');
      return;
    }
        
    const result = await this.github.actions.deleteWorkflow(selectedWorkflow.path);
    console.log(formatResult(result, 'Workflow deleted successfully'));
  }

  async triggerWorkflow() {
    console.log('\n🔄 Trigger workflow run...');
        
    // Get workflows to choose from
    const workflowsResult = await this.github.actions.getWorkflows();
    if (!workflowsResult[0] || !workflowsResult[2]?.workflows?.length) {
      console.log('❌ No workflows found to trigger');
      return;
    }
        
    const workflows = workflowsResult[2].workflows;
    const choices = workflows.map(workflow => ({
      name: `${workflow.name} (${workflow.path})`,
      value: workflow.id
    }));
        
    const { workflowId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'workflowId',
        message: 'Select a workflow to trigger:',
        choices: choices
      }
    ]);
        
    const { ref, inputs } = await inquirer.prompt([
      {
        type: 'input',
        name: 'ref',
        message: 'Branch/tag to run on:',
        default: 'main'
      },
      {
        type: 'input',
        name: 'inputs',
        message: 'Workflow inputs (JSON format, optional):',
        default: '{}'
      }
    ]);
        
    let parsedInputs = {};
    try {
      parsedInputs = JSON.parse(inputs);
    } catch (error) {
      console.log('⚠️  Invalid JSON for inputs, using empty object');
    }
        
    const result = await this.github.actions.triggerWorkflow(workflowId, ref, parsedInputs);
    console.log(formatResult(result, 'Workflow triggered successfully'));
  }

  async viewWorkflowRuns() {
    console.log('\n📊 View workflow runs...');
        
    // Get workflows to choose from
    const workflowsResult = await this.github.actions.getWorkflows();
    if (!workflowsResult[0] || !workflowsResult[2]?.workflows?.length) {
      console.log('❌ No workflows found');
      return;
    }
        
    const workflows = workflowsResult[2].workflows;
    const choices = [
      { name: 'All workflows', value: 'all' },
      ...workflows.map(workflow => ({
        name: `${workflow.name} (${workflow.path})`,
        value: workflow.id
      }))
    ];
        
    const { workflowId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'workflowId',
        message: 'Select workflow to view runs:',
        choices: choices
      }
    ]);
        
    const result = workflowId === 'all' 
      ? await this.github.actions.getWorkflowRuns()
      : await this.github.actions.getWorkflowRuns(workflowId);
            
    console.log(formatResult(result, 'Workflow runs retrieved successfully'));
        
    if (result[0] && result[2] && result[2].workflow_runs) {
      const runs = result[2].workflow_runs;
      if (runs.length === 0) {
        console.log('ℹ️  No workflow runs found');
      } else {
        console.log(`\n📊 Found ${runs.length} workflow run(s):`);
        runs.slice(0, 10).forEach((run, index) => {
          console.log(`\n${index + 1}. ${run.name || 'Unnamed run'}`);
          console.log(`   Status: ${run.status}`);
          console.log(`   Conclusion: ${run.conclusion || 'N/A'}`);
          console.log(`   Branch: ${run.head_branch}`);
          console.log(`   Started: ${new Date(run.created_at).toLocaleString()}`);
          console.log(`   Updated: ${new Date(run.updated_at).toLocaleString()}`);
        });
                
        if (runs.length > 10) {
          console.log(`\n... and ${runs.length - 10} more runs`);
        }
      }
    }
  }

  async confirmDestructiveOperation(operation, details) {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `⚠️  Are you sure you want to ${operation}?\n   ${details}`,
        default: false
      }
    ]);
        
    return confirm;
  }

  getDefaultWorkflowContent() {
    return `name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
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
    
    - name: Run linting
      run: npm run lint
      
  build:
    needs: test
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
    
    - name: Build project
      run: npm run build
`;
  }

  async run() {
    const initialized = await this.initialize();
    if (!initialized) {
      return;
    }
        
    let continueRunning = true;
    while (continueRunning) {
      try {
        const action = await this.showMainMenu();
        continueRunning = await this.executeAction(action);
                
        if (continueRunning) {
          console.log('\n' + '='.repeat(50));
        }
      } catch (error) {
        console.error('❌ An error occurred:', error.message);
        console.log('\n' + '='.repeat(50));
      }
    }
  }
}

// Usage
async function main() {
  const manager = new GitHubActionsManager();
  await manager.run();
}

// Run the application
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default GitHubActionsManager;
