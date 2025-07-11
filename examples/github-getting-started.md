# GitHub API Getting Started Guide

Welcome to the Mediumroast API GitHub integration! This guide covers the common setup and configuration steps needed for all GitHub-related tutorials and examples.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation and Setup](#installation-and-setup)
- [Configuration Setup](#configuration-setup)
- [GitHub App vs Personal Access Token](#github-app-vs-personal-access-token)
- [Basic API Usage](#basic-api-usage)
- [Safety Features](#safety-features)
- [Next Steps](#next-steps)

## Prerequisites

Before you begin with any GitHub API operations, ensure you have:

1. **Node.js** (v16 or higher) installed
2. **Mediumroast for GitHub App** installed on your GitHub organization
   - The app provides the necessary permissions for GitHub operations
   - Install it from: [GitHub Apps Marketplace](https://github.com/apps/mediumroast-for-github)
3. **Admin access** to the GitHub organization where you want to perform operations
4. **The Mediumroast API** package installed in your project

## Installation and Setup

### Install the Mediumroast API

```bash
npm install mediumroast_api
```

### Install Additional Dependencies

For the complete CLI examples, you'll also need:

```bash
npm install inquirer configparser
```

These dependencies provide:
- **inquirer**: Interactive command-line prompts
- **configparser**: Configuration file parsing (INI format)

## Configuration Setup

Create a `config.ini` file in your project directory:

```ini
[GitHub]
# GitHub organization name
org = YOUR_ORGANIZATION_NAME

# GitHub personal access token (for testing/development)
token = YOUR_GITHUB_TOKEN

# Repository configuration
repoName = my-github-repo
repoDescription = A repository for GitHub operations

# Container configuration (for repository management)
containerTypes = Studies,Companies,Interactions
```

### Configuration Parameters

| Parameter | Description | Required |
|-----------|-------------|----------|
| `org` | GitHub organization name | Yes |
| `token` | GitHub personal access token | Yes* |
| `repoName` | Default repository name | No |
| `repoDescription` | Default repository description | No |
| `containerTypes` | Container types for repository setup | No |

*Required for development. In production, use the GitHub App authentication.

## GitHub App vs Personal Access Token

### GitHub App (Recommended for Production)

The Mediumroast for GitHub App provides:
- **Better security**: Limited, scoped permissions
- **Organizational control**: Managed by organization admins
- **Rate limiting**: Higher rate limits than personal tokens
- **Audit trail**: Better tracking of operations

### Personal Access Token (Development/Testing)

Personal access tokens are useful for:
- **Development and testing**: Quick setup for local development
- **Prototyping**: Rapid experimentation
- **Limited scope operations**: When you don't need full app permissions

### Device Flow Authentication (Recommended for CLI Apps)

For CLI applications and headless environments, the Mediumroast API supports GitHub's device flow authentication:

- **OAuth compliant**: Secure, standards-based authentication
- **No client secret**: Eliminates secret management in client applications
- **User-friendly**: Browser-based authorization flow
- **Automatic token management**: Built-in token storage and refresh

**Quick Start with Device Flow**:
```bash
# Run the complete authentication example
node examples/github-device-auth.js
```

This will guide you through the complete authentication process and save your token for future use.

> **Important**: Never commit your personal access token to version control. Use environment variables or secure configuration management.

## Basic API Usage

### Import the API

```javascript
import { GitHubFunctions } from 'mediumroast_api'
```

### Initialize the Client

```javascript
// Using configuration file
const github = new GitHubFunctions()

// Or with direct parameters
const github = new GitHubFunctions({
  org: 'your-org',
  token: 'your-token'
})
```

### Pre-flight Check

Always perform a pre-flight check before operations:

```javascript
// Check installation status
const installationStatus = await github.getInstallationStatus()
console.log('Installation Status:', installationStatus)

// Verify organization access
const orgInfo = await github.getOrganization()
console.log('Organization:', orgInfo.name)
```

## Safety Features

The Mediumroast API includes several safety features:

### 1. Pre-flight Checks
- Validates GitHub App installation
- Verifies organization access
- Checks required permissions

### 2. Confirmation Prompts
- Interactive confirmation for destructive operations
- Clear operation summaries before execution
- Ability to cancel operations

### 3. Error Handling
- Comprehensive error messages
- Graceful failure handling
- Detailed logging for troubleshooting

### 4. Rate Limiting
- Automatic rate limit handling
- Retry mechanisms for failed requests
- Respectful API usage patterns

## Next Steps

Once you've completed the setup, you can proceed to specific tutorials:

- **[Authentication Tutorial](./github-auth-tutorial.md)**: Complete guide to GitHub authentication methods including device flow
- **[Repository Management](./github-repository.md)**: Learn to create and manage repositories
- **[GitHub Actions](./github-actions.md)**: Manage GitHub Actions workflows
- **[Read Operations](./github-read-operations-tutorial.md)**: Learn read-only operations
- **[Write Operations](./github-write-operations-tutorial.md)**: Learn write operations

### 🚀 Quick Start Options

**For CLI Development:**
```bash
# Start with device flow authentication
node examples/github-device-auth.js
```

**For Production Applications:**
```bash
# Use GitHub App with repository management
node examples/integrations/repository-manager-cli.js setup
```

**For Web Applications:**
```bash
# Explore React component examples
open examples/integrations/repository-manager.jsx
```

## Common Troubleshooting

### GitHub App Not Installed
```
Error: GitHub App is not installed for this organization
```
**Solution**: Install the Mediumroast for GitHub App from the GitHub Apps Marketplace.

### Permission Denied
```
Error: Resource not accessible by integration
```
**Solution**: Ensure the GitHub App has the necessary permissions for the operation.

### Rate Limit Exceeded
```
Error: API rate limit exceeded
```
**Solution**: Wait for the rate limit to reset or implement retry logic with exponential backoff.

### Invalid Token
```
Error: Bad credentials
```
**Solution**: Verify your GitHub personal access token is valid and has the required scopes.

## Additional Resources

- [GitHub API Documentation](https://docs.github.com/en/rest)
- [GitHub Apps Documentation](https://docs.github.com/en/developers/apps)
- [Mediumroast API Documentation](../docs/)

---

**Next**: Choose a specific tutorial to continue your GitHub API journey!
