# GitHub Write Operations Tutorial

## Introduction

This tutorial covers write operations for the Mediumroast API's GitHub integration. These operations allow you to manage GitHub Actions workflows, including installation, updates, and deletion. The API provides a robust set of functions to automate GitHub Actions management across your repositories.

## Prerequisites

Before you begin, make sure you have:

1. Node.js (v16 or higher) installed
2. A GitHub Personal Access Token with appropriate permissions:
   - `repo` (full control of private repositories)
   - `workflow` (permission to manage GitHub Actions)
3. Admin access to the GitHub organization or repository you want to manage
4. The Mediumroast API package installed

## Configuration Setup

Create a `config.ini` file in your project directory with your GitHub token and organization:

```ini
[GitHub]
token = YOUR_GITHUB_TOKEN
org = YOUR_ORGANIZATION_NAME
```

## Basic Usage

### Import the necessary modules

```javascript
import { Actions } from 'mediumroast_api/src/api/gitHubServer.js';
```

### Initialize the Actions client

```javascript
const token = 'your-github-token';
const orgName = 'your-org-name';
const actions = new Actions(token, orgName);
```

## GitHb Actions Management

### Installing GitHub Actions

The installActions() method downloads and installs workflow and action files from the `mr4gh-automations` repository to your repository's .github directory.

```javascript
// Enable debug mode for detailed logging
const debugMode = true;
const result = await actions.installActions(debugMode);

if (result[0]) {
  console.log('Installation successful!');
  console.log(`Installed version: ${result[2].version}`);
} else {
  console.error('Installation failed:', result[1]);
}
```

The installation process:

1. Downloads the latest release of the mr4gh-automations repository
2. Extracts workflow files (placed in workflows)
3. Extracts action files (placed in .github/actions/)
4. Creates a version file (.github/.mr4gh_version.json) to track the installation

### Checking the Current Installation

To check if GitHub Actions are installed and get details about the current version:

```javascript
const versionResult = await actions.getCurrentVersion();

if (versionResult[0] && versionResult[2].installed) {
  const versionInfo = versionResult[2].version_file.content;
  console.log(`Installed version: ${versionInfo.version}`);
  console.log(`Installation date: ${versionInfo.updated_at}`);
  
  // List installed workflows
  console.log('\nInstalled workflows:');
  versionResult[2].files.workflows.forEach(workflow => {
    console.log(`- ${workflow.name}`);
  });
} else {
  console.log('No GitHub Actions installation detected');
}
```

### Checking for Updates

The API can check if there are newer versions available:

```javascript
const updateCheckResult = await actions.checkForUpdates();

if (updateCheckResult[0]) {
  if (updateCheckResult[2].update_available) {
    console.log('Update available!');
    console.log(`Current version: ${updateCheckResult[2].current_version}`);
    console.log(`Latest version: ${updateCheckResult[2].latest_version}`);
    
    // Get release details
    const releaseInfo = updateCheckResult[2].latest_release;
    console.log(`Release date: ${new Date(releaseInfo.published_at).toLocaleString()}`);
    console.log(`Release notes: ${releaseInfo.body}`);
  } else {
    console.log('Already on the latest version');
  }
} else {
  console.error('Failed to check for updates:', updateCheckResult[1]);
}
```

### Updating GitHub Actions

When a new version is available, you can update your installation:

```javascript
const updateResult = await actions.updateActions(true); // true enables debug mode

if (updateResult[0]) {
  console.log('Update successful!');
  
  // Get details about updated files
  const updatedWorkflows = updateResult[2].workflows_updated;
  console.log(`Updated ${updatedWorkflows.length} workflow files`);
  
  const updatedActions = updateResult[2].actions_updated;
  console.log(`Updated ${updatedActions.length} action files`);
} else {
  console.error('Update failed:', updateResult[1]);
}
```

### Deleting GitHub Actions

To remove installed workflows and actions:

```javascript
// To delete all workflows
const deleteAllResult = await actions.deleteActions();

// To delete specific workflows only
const specificWorkflows = ['workflow1.yml', 'workflow2.yml'];
const deleteSpecificResult = await actions.deleteActions(specificWorkflows);

// To delete workflows and all action files
const deleteWithActionsResult = await actions.deleteActions(null, true);
```

## Complete Example

Here's a complete example of checking for and applying updates:

```javascript
import { Actions } from 'mediumroast_api/src/api/gitHubServer.js';
import fs from 'fs';
import path from 'path';

async function updateGitHubActions() {
  const token = 'your-github-token';
  const orgName = 'your-org-name';
  
  try {
    const actions = new Actions(token, orgName);
    
    // Check current installation
    console.log('Checking current installation...');
    const versionResult = await actions.getCurrentVersion();
    
    if (!versionResult[0] || !versionResult[2].installed) {
      console.log('No installation detected. Installing...');
      const installResult = await actions.installActions(true);
      
      if (installResult[0]) {
        console.log('Installation successful!');
      } else {
        console.error('Installation failed:', installResult[1]);
        return;
      }
    } else {
      console.log(`Current version: ${versionResult[2].version_file.content.version}`);
      
      // Check for updates
      console.log('Checking for updates...');
      const updateCheckResult = await actions.checkForUpdates();
      
      if (updateCheckResult[0] && updateCheckResult[2].update_available) {
        console.log(`Update available: ${updateCheckResult[2].latest_version}`);
        
        // Update to latest version
        console.log('Updating to latest version...');
        const updateResult = await actions.updateActions(true);
        
        if (updateResult[0]) {
          console.log('Update successful!');
        } else {
          console.error('Update failed:', updateResult[1]);
        }
      } else {
        console.log('Already on the latest version. No update needed.');
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

updateGitHubActions();
```

## Error Handling

The API uses a consistent response pattern:

- Each method returns an array: [success, message, data]
- success is a boolean indicating if the operation succeeded
- message contains error or success information
- data contains the operation result data

Example error handling:

```javascript
try {
  const result = await actions.installActions(true);
  
  if (!result[0]) {
    // Handle failure
    console.error('Operation failed:', result[1]);
    
    if (result[2] && result[2].error) {
      console.error('Error details:', result[2].error);
    }
  }
} catch (error) {
  // Handle unexpected errors
  console.error('Exception occurred:', error.message);
}
```

## Working with Temporary Files

For debugging purposes, the API creates temporary files during operations. You can control where these files are stored:

```javascript
// Set environment variable to specify temp directory
process.env.MR4GH_TMP_DIR = '/path/to/tmp/directory';

// Or use the default system temp directory
const result = await actions.installActions(true);
```

The temp directory will contain:

- Downloaded ZIP files
- Extracted workflow and action files
- Error logs
- API response details

## Best Practices
1. Always check current installation before updating
2. Enable debug mode during initial setup for better diagnostics
3. Use version control for your repository before making changes
4. Test in a non-production repository first
5. Review workflow files before installation to understand what will be added
6. Consider branch protection rules that might affect write operations

## Advanced Usage

### Custom Version Management

If you need to install a specific version rather than the latest:

```javascript
// Get a list of available releases
const releasesResult = await actions.serverCtl.repositoryManager.getReleases(
  'mediumroast',
  'mr4gh-automations'
);

// Find a specific release by tag
const specificVersion = releasesResult[2].find(r => r.tag_name === 'V2.0.0');

// Use the release ID for installation
// Note: You would need to modify the installActions method to accept a specific release
```

### Workflow Run Statistics

After installing workflows, you can monitor their execution:

```javascript
// Get all workflow runs
const runsResult = await actions.getAll();

if (runsResult[0] && runsResult[2].workflow_runs) {
  const runs = runsResult[2].workflow_runs;
  
  // Group by workflow name
  const stats = {};
  runs.forEach(run => {
    const name = run.name;
    if (!stats[name]) {
      stats[name] = { total: 0, success: 0, failure: 0 };
    }
    
    stats[name].total++;
    if (run.conclusion === 'success') {
      stats[name].success++;
    } else if (run.conclusion === 'failure') {
      stats[name].failure++;
    }
  });
  
  // Display statistics
  Object.entries(stats).forEach(([name, data]) => {
    console.log(`${name}: ${data.success}/${data.total} successful runs`);
  });
}
```

## Troubleshooting

### Common Issues

1. Authentication Errors
    - Ensure your GitHub token has repo and workflow permissions
    - Check if the token has expired
2. Permission Denied
    - Verify you have admin access to the organization/repository
    - Check branch protection rules that might prevent direct pushes
3. No Workflows Found
    - Ensure the source repository (mr4gh-automations) is accessible
    - Check if the specific release contains workflow files
4. Installation Succeeds But Workflows Don't Run
    - Check if workflows require specific secrets or environment variables
    - Verify that required dependencies are available in the repository

### Logging

Enable verbose logging for better diagnostics:

```javascript
// Set environment variable for detailed logging
process.env.LOG_LEVEL = 'debug';

// Create a log file
const logStream = fs.createWriteStream('github-operations.log');
console.log = (...args) => {
  const message = args.join(' ');
  logStream.write(message + '\n');
  process.stdout.write(message + '\n');
};

// Now run your operations
const result = await actions.installActions(true);
```

## Conclusion
The GitHub write operations in the Mediumroast API provide a robust way to manage GitHub Actions across your repositories. By following this tutorial, you can automate the installation, updating, and management of your workflow files, saving time and ensuring consistency across your GitHub organizations.

For more information, refer to the full API documentation or explore the examples directory in the package repository.

