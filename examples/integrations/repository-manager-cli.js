#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * GitHub Repository Manager - CLI Application
 * 
 * A comprehensive command-line interface for managing GitHub repositories and containers
 * using the Mediumroast API. This CLI provides a professional interface for repository
 * management operations.
 * 
 * Features:
 * - Interactive repository creation and management
 * - Container setup and status checking
 * - Installation status verification
 * - Configuration file support
 * - Command-line arguments
 * - Colored output and user-friendly messages
 * - Setup wizard for guided configuration
 * 
 * Commands:
 *   create  - Create a new repository and containers
 *   status  - Check repository and container status
 *   setup   - Interactive setup wizard
 * 
 * Usage:
 *   node repository-manager-cli.js create --org my-org --token ghp_xxx
 *   node repository-manager-cli.js status
 *   node repository-manager-cli.js setup
 * 
 * Prerequisites:
 *   - Complete the setup in github-getting-started.md
 *   - Install dependencies: npm install commander configparser inquirer chalk
 */

import { Command } from 'commander';
import GitHubFunctions from 'mediumroast_api/src/api/github.js';
import ConfigParser from 'configparser';
import inquirer from 'inquirer';
import chalk from 'chalk';

const program = new Command();

program
  .name('repository-manager')
  .description('GitHub repository management CLI')
  .version('1.0.0');

program
  .command('create')
  .description('Create a new repository and containers')
  .option('-o, --org <org>', 'GitHub organization')
  .option('-t, --token <token>', 'GitHub token')
  .option('-c, --config <config>', 'Configuration file path', './config.ini')
  .option('--skip-checks', 'Skip pre-flight checks')
  .option('--containers-only', 'Only create containers (skip repository creation)')
  .action(async (options) => {
    await createRepositoryCommand(options);
  });

program
  .command('status')
  .description('Check repository and container status')
  .option('-o, --org <org>', 'GitHub organization')
  .option('-t, --token <token>', 'GitHub token')
  .option('-c, --config <config>', 'Configuration file path', './config.ini')
  .option('--detailed', 'Show detailed information')
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

program
  .command('info')
  .description('Show repository and organization information')
  .option('-o, --org <org>', 'GitHub organization')
  .option('-t, --token <token>', 'GitHub token')
  .option('-c, --config <config>', 'Configuration file path', './config.ini')
  .action(async (options) => {
    await infoCommand(options);
  });

async function createRepositoryCommand(options) {
  try {
    const config = loadConfig(options);
    const github = new GitHubFunctions(config.token, config.org, 'repository-cli');
        
    console.log(chalk.blue('🚀 Repository Creation Process Starting...'));
    console.log(chalk.gray(`Organization: ${config.org}`));
    console.log('');
        
    // Pre-flight checks unless skipped
    if (!options.skipChecks) {
      console.log(chalk.blue('🔍 Performing pre-flight checks...'));
            
      const appCheck = await github.checkGitHubAppInstallation();
      if (!appCheck[0]) {
        console.error(chalk.red('❌ GitHub App not properly installed'));
        console.log(chalk.yellow('💡 Install the app at: https://github.com/apps/mediumroast-for-github'));
        process.exit(1);
      }
      console.log(chalk.green('✅ GitHub App installation verified'));
            
      // Check for existing resources
      const existingStatus = await checkExistingInstallations(github);
      if (existingStatus.repository.exists && !options.containersOnly) {
        const proceed = await inquirer.prompt([{
          type: 'confirm',
          name: 'proceed',
          message: chalk.yellow('Repository already exists. Continue anyway?'),
          default: false
        }]);
                
        if (!proceed.proceed) {
          console.log(chalk.gray('Operation cancelled by user.'));
          process.exit(0);
        }
      }
    }
        
    // Repository creation
    if (!options.containersOnly) {
      console.log(chalk.blue('📁 Creating repository...'));
            
      const result = await github.createRepository();
      if (result[0]) {
        console.log(chalk.green('✅ Repository created successfully!'));
        console.log(chalk.gray(`   URL: ${result[2].html_url}`));
        console.log(chalk.gray(`   Name: ${result[2].name}`));
        console.log(chalk.gray(`   Private: ${result[2].private}`));
      } else {
        if (result[1].includes('already exists')) {
          console.log(chalk.yellow('⚠️  Repository already exists, continuing with container setup...'));
        } else {
          throw new Error(result[1]);
        }
      }
    }
        
    // Container creation
    console.log(chalk.blue('📂 Creating containers...'));
    const containerResult = await github.containerOps.createContainers();
        
    if (containerResult[0]) {
      console.log(chalk.green('✅ Containers created successfully!'));
      logContainerResults(containerResult[2]);
    } else {
      console.error(chalk.red(`❌ Failed to create containers: ${containerResult[1]}`));
      process.exit(1);
    }
        
    console.log(chalk.green('\n🎉 Repository setup completed successfully!'));
    console.log(chalk.blue('📋 Summary:'));
    console.log(chalk.gray(`   Organization: ${config.org}`));
    console.log(chalk.gray(`   Repository: ${config.org}_discovery`));
    console.log(chalk.gray('   Containers: Studies, Companies, Interactions'));
        
  } catch (error) {
    console.error(chalk.red(`❌ Error: ${error.message}`));
    console.log(chalk.yellow('💡 Check your configuration and GitHub App permissions'));
    process.exit(1);
  }
}

async function statusCommand(options) {
  try {
    const config = loadConfig(options);
    const github = new GitHubFunctions(config.token, config.org, 'repository-cli');
        
    console.log(chalk.blue('🔍 Checking repository status...'));
    console.log(chalk.gray(`Organization: ${config.org}`));
    console.log('');
        
    // GitHub App status
    console.log(chalk.blue('📱 GitHub App Status:'));
    const appCheck = await github.checkGitHubAppInstallation();
    if (appCheck[0]) {
      const appDetails = appCheck[2];
      console.log(chalk.green('   ✅ App properly installed'));
      console.log(chalk.gray(`   Repository Access: ${appDetails.repositorySelection === 'all' ? 'All repositories' : `${appDetails.repositoryAccess} repositories`}`));
      console.log(chalk.gray('   Permissions: Valid'));
    } else {
      console.log(chalk.red('   ❌ App not installed or configured'));
      console.log(chalk.yellow('   💡 Install at: https://github.com/apps/mediumroast-for-github'));
      return;
    }
        
    // Repository and container status
    const existingInstallations = await checkExistingInstallations(github);
        
    console.log(chalk.blue('\\n📊 Repository Status:'));
    if (existingInstallations.repository.exists) {
      console.log(chalk.green('   ✅ Repository exists'));
            
      if (options.detailed) {
        try {
          const sizeResult = await github.getRepoSize();
          if (sizeResult[0]) {
            console.log(chalk.gray(`   Size: ${sizeResult[2].size_mb} MB`));
            console.log(chalk.gray(`   Repository: ${sizeResult[2].repository}`));
          }
        } catch (err) {
          console.log(chalk.gray('   Size: Unable to fetch'));
        }
      }
    } else {
      console.log(chalk.red('   ❌ Repository not found'));
    }
        
    console.log(chalk.blue('\\n📂 Container Status:'));
    if (existingInstallations.containers.exists) {
      console.log(chalk.green(`   ✅ ${existingInstallations.containers.existing.length}/3 containers exist`));
      console.log(chalk.gray(`   Existing: ${existingInstallations.containers.existing.join(', ')}`));
      if (existingInstallations.containers.missing.length > 0) {
        console.log(chalk.yellow(`   Missing: ${existingInstallations.containers.missing.join(', ')}`));
      }
    } else {
      console.log(chalk.red('   ❌ No containers found'));
    }
        
    // Organization info if detailed
    if (options.detailed) {
      console.log(chalk.blue('\\n🏢 Organization Info:'));
      try {
        const orgResult = await github.getGitHubOrg();
        if (orgResult[0]) {
          const org = orgResult[2];
          console.log(chalk.gray(`   Name: ${org.name || org.login}`));
          console.log(chalk.gray(`   Description: ${org.description || 'No description'}`));
          console.log(chalk.gray(`   Public repos: ${org.public_repos}`));
          console.log(chalk.gray(`   Created: ${new Date(org.created_at).toLocaleDateString()}`));
        }
      } catch (err) {
        console.log(chalk.red('   ❌ Unable to fetch organization info'));
      }
    }
        
  } catch (error) {
    console.error(chalk.red(`❌ Error: ${error.message}`));
    process.exit(1);
  }
}

async function setupWizard(options) {
  console.log(chalk.blue('🧙 Repository Setup Wizard'));
  console.log(chalk.gray('This wizard will guide you through setting up GitHub repository management.'));
  console.log('');
    
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
      message: 'GitHub personal access token:',
      mask: '*',
      validate: (input) => input.length > 0 || 'Token is required'
    },
    {
      type: 'input',
      name: 'repoName',
      message: 'Repository name (without org prefix):',
      default: 'discovery',
      validate: (input) => /^[a-zA-Z0-9_-]+$/.test(input) || 'Invalid repository name'
    },
    {
      type: 'input',
      name: 'repoDescription',
      message: 'Repository description:',
      default: 'A repository for discovery and data collection'
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
      message: 'Create containers (Studies, Companies, Interactions)?',
      default: true,
      when: (answers) => answers.createRepo
    },
    {
      type: 'confirm',
      name: 'saveConfig',
      message: 'Save configuration to config.ini?',
      default: true
    }
  ]);
    
  try {
    const github = new GitHubFunctions(answers.token, answers.org, 'repository-wizard');
        
    console.log(chalk.blue('\\n🔍 Verifying GitHub App installation...'));
    const appCheck = await github.checkGitHubAppInstallation();
    if (!appCheck[0]) {
      console.log(chalk.red('❌ GitHub App not properly installed'));
      console.log(chalk.yellow('💡 Please install the app at: https://github.com/apps/mediumroast-for-github'));
      console.log(chalk.gray('   Then run this wizard again.'));
      return;
    }
    console.log(chalk.green('✅ GitHub App verified'));
        
    if (answers.createRepo) {
      console.log(chalk.blue('\\n📁 Creating repository...'));
      const result = await github.createRepository();
      if (result[0]) {
        console.log(chalk.green(`✅ Repository created: ${result[2].html_url}`));
                
        if (answers.createContainers) {
          console.log(chalk.blue('\\n📂 Creating containers...'));
          const containerResult = await github.containerOps.createContainers();
          if (containerResult[0]) {
            console.log(chalk.green('✅ Containers created successfully'));
            logContainerResults(containerResult[2]);
          } else {
            console.log(chalk.yellow('⚠️  Some containers may have failed to create'));
          }
        }
      } else {
        if (result[1].includes('already exists')) {
          console.log(chalk.yellow('⚠️  Repository already exists'));
        } else {
          throw new Error(result[1]);
        }
      }
    }
        
    if (answers.saveConfig) {
      console.log(chalk.blue('\\n💾 Saving configuration...'));
      saveConfigFile(answers, options.config);
      console.log(chalk.green('✅ Configuration saved to config.ini'));
    }
        
    console.log(chalk.green('\\n🎉 Setup completed successfully!'));
    console.log(chalk.blue('📋 Next steps:'));
    console.log(chalk.gray('   • Use "repository-manager status" to check your setup'));
    console.log(chalk.gray('   • Start adding data to your containers'));
    console.log(chalk.gray('   • Explore the Mediumroast API documentation'));
        
  } catch (error) {
    console.error(chalk.red(`❌ Error: ${error.message}`));
    process.exit(1);
  }
}

async function infoCommand(options) {
  try {
    const config = loadConfig(options);
    const github = new GitHubFunctions(config.token, config.org, 'repository-cli');
        
    console.log(chalk.blue('ℹ️  Repository Information'));
    console.log(chalk.gray(`Organization: ${config.org}`));
    console.log('');
        
    // Organization information
    console.log(chalk.blue('🏢 Organization Details:'));
    const orgResult = await github.getGitHubOrg();
    if (orgResult[0]) {
      const org = orgResult[2];
      console.log(chalk.gray(`   Name: ${org.name || org.login}`));
      console.log(chalk.gray(`   Description: ${org.description || 'No description'}`));
      console.log(chalk.gray(`   Type: ${org.type}`));
      console.log(chalk.gray(`   Public repositories: ${org.public_repos}`));
      console.log(chalk.gray(`   Location: ${org.location || 'Not specified'}`));
      console.log(chalk.gray(`   Website: ${org.blog || 'Not specified'}`));
      console.log(chalk.gray(`   Created: ${new Date(org.created_at).toLocaleDateString()}`));
      console.log(chalk.gray(`   Updated: ${new Date(org.updated_at).toLocaleDateString()}`));
    } else {
      console.log(chalk.red('   ❌ Unable to fetch organization information'));
    }
        
    // Repository information
    console.log(chalk.blue('\\n📁 Repository Details:'));
    try {
      const sizeResult = await github.getRepoSize();
      if (sizeResult[0]) {
        console.log(chalk.gray(`   Repository: ${sizeResult[2].repository}`));
        console.log(chalk.gray(`   Size: ${sizeResult[2].size_kb} KB (${sizeResult[2].size_mb} MB)`));
        console.log(chalk.gray(`   URL: https://github.com/${config.org}/${sizeResult[2].repository}`));
      } else {
        console.log(chalk.yellow('   ⚠️  Repository not found or not accessible'));
      }
    } catch (err) {
      console.log(chalk.red('   ❌ Unable to fetch repository information'));
    }
        
  } catch (error) {
    console.error(chalk.red(`❌ Error: ${error.message}`));
    process.exit(1);
  }
}

// Helper functions
async function checkExistingInstallations(github) {
  const status = {
    repository: { exists: false, error: null },
    containers: { exists: false, existing: [], missing: [] }
  };

  try {
    // Check if repository exists
    try {
      const repoResult = await github.getRepoSize();
      if (repoResult[0]) {
        status.repository.exists = true;
      }
    } catch (err) {
      status.repository.error = err.message;
    }

    // Check containers if repository exists
    if (status.repository.exists) {
      const containers = ['Studies', 'Companies', 'Interactions'];
            
      for (const container of containers) {
        try {
          const contentResult = await github.getContent(container);
          if (contentResult[0]) {
            status.containers.existing.push(container);
          } else {
            status.containers.missing.push(container);
          }
        } catch (err) {
          status.containers.missing.push(container);
        }
      }
            
      status.containers.exists = status.containers.existing.length > 0;
    }

  } catch (error) {
    // Handle any unexpected errors
  }

  return status;
}

function loadConfig(options) {
  const config = new ConfigParser();
    
  if (options.config && require('fs').existsSync(options.config)) {
    config.read(options.config);
  }
    
  return {
    token: options.token || config.get('GitHub', 'token'),
    org: options.org || config.get('GitHub', 'org')
  };
}

function saveConfigFile(answers, configPath = './config.ini') {
  const configContent = `[GitHub]
# GitHub organization name
org = ${answers.org}

# GitHub personal access token (for testing/development)
token = ${answers.token}

# Repository configuration
repoName = ${answers.repoName || 'discovery'}
repoDescription = ${answers.repoDescription || 'A repository for discovery and data collection'}

# Container configuration
containerTypes = Studies,Companies,Interactions
`;
    
  require('fs').writeFileSync(configPath, configContent);
}

function logContainerResults(containerData) {
  if (containerData && Array.isArray(containerData)) {
    console.log(chalk.blue('   📂 Container Results:'));
    containerData.forEach(result => {
      const status = result.success ? chalk.green('✅') : chalk.red('❌');
      const message = typeof result.message === 'object' && result.message.status_msg 
        ? result.message.status_msg 
        : result.message;
      console.log(`      ${status} ${result.container}: ${message}`);
    });
  }
}

// Global error handler
process.on('uncaughtException', (error) => {
  console.error(chalk.red(`❌ Unexpected error: ${error.message}`));
  console.log(chalk.yellow('💡 Please check your configuration and try again'));
  process.exit(1);
});

// eslint-disable-next-line no-unused-vars
process.on('unhandledRejection', (reason, _promise) => {
  console.error(chalk.red('❌ Unhandled promise rejection:'), reason);
  console.log(chalk.yellow('💡 Please check your configuration and try again'));
  process.exit(1);
});

program.parse();

export default program;
