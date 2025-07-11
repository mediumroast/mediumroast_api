# Mediumroast API GitHub Examples & Tutorials

Welcome to the comprehensive collection of GitHub integration examples and tutorials for the Mediumroast API. This directory contains everything you need to start building powerful GitHub integrations.

## 🚀 Quick Start

**New to the Mediumroast API?** Start here:

1. **[Getting Started Guide](./github-getting-started.md)** - Essential setup and configuration
2. Choose your integration path:
   - **[Repository Management](./github-repository.md)** - Create and manage repositories
   - **[GitHub Actions](./github-actions.md)** - Workflow automation and management

## 📚 Tutorial Directory

### Core Tutorials

| Tutorial | Description | Level | What You'll Learn |
|----------|-------------|-------|------------------|
| **[Getting Started](./github-getting-started.md)** | Prerequisites, installation, and basic setup | Beginner | Environment setup, authentication, basic API usage |
| **[Repository Management](./github-repository.md)** | Complete repository lifecycle management | Intermediate | Create repos, manage containers, batch operations |
| **[GitHub Actions](./github-actions.md)** | Workflow automation and management | Advanced | CRUD operations, workflow triggers, monitoring |

### Specialized Tutorials

| Tutorial | Description | Level | What You'll Learn |
|----------|-------------|-------|------------------|
| **[Authentication](./github-auth-tutorial.md)** | Deep dive into GitHub authentication methods | Intermediate | OAuth, GitHub Apps, token management |
| **[Read Operations](./github-read-operations-tutorial.md)** | Safe, read-only GitHub operations | Beginner | Data retrieval, organization info, repository exploration |
| **[Write Operations](./github-write-operations-tutorial.md)** | Secure write operations with safety checks | Advanced | File management, branch operations, content creation |

## 🎯 Choose Your Path

### 👨‍💻 For Developers

**Building your first integration?**
1. Start with [Getting Started](./github-getting-started.md)
2. Follow [Repository Management](./github-repository.md) for basic operations
3. Explore [GitHub Actions](./github-actions.md) for automation

**Need specific functionality?**
- **Repository Operations** → [Repository Tutorial](./github-repository.md)
- **Workflow Automation** → [Actions Tutorial](./github-actions.md)
- **Authentication Setup** → [Auth Tutorial](./github-auth-tutorial.md)

### 🏢 For Organizations

**Setting up GitHub integration for your team?**
1. Complete [Getting Started](./github-getting-started.md) for environment setup
2. Review [Authentication](./github-auth-tutorial.md) for security best practices
3. Implement [Repository Management](./github-repository.md) for team workflows

## 🛠️ Example Applications

### Working Examples

| File | Description | Use Case |
|------|-------------|----------|
| `github-actions.js` | Complete CLI for GitHub Actions management | Workflow automation, CI/CD management |
| `github-companies.js` | Company data integration example | Data collection, organization management |
| `github-device-auth.js` | Device authentication flow | Secure authentication for desktop apps |

### 🔧 Integration Examples

**➡️ [Complete Integration Examples](./integrations/)**

Production-ready implementations you can use directly or customize:

| File | Type | Description | Features |
|------|------|-------------|----------|
| `github-actions-manager.js` | Node.js CLI | Interactive Actions management | Menu-driven, pre-flight checks, CRUD operations |
| `workflow-manager.jsx` | React Component | Web UI for workflow management | Real-time updates, responsive design, GitHub-style UI |
| `workflow-manager.css` | CSS Styles | Component styling | Mobile-friendly, modern design patterns |

**Key Benefits:**
- **Production Ready** - Comprehensive error handling and safety checks
- **Customizable** - Easy to adapt for specific use cases
- **Well Documented** - Complete setup and usage instructions
- **Multiple Patterns** - CLI, web, and programmatic integration examples

### Configuration Examples

| File | Description | Purpose |
|------|-------------|---------|
| `config.ini` | Sample configuration file | Environment setup template |

## 🔧 Development Setup

### Prerequisites

- Node.js (v16 or higher)
- Mediumroast for GitHub App installed
- GitHub organization admin access

### Quick Setup

```bash
# Install the API
npm install mediumroast_api

# Install CLI dependencies
npm install inquirer configparser

# Copy and configure
cp examples/config.ini ./config.ini
# Edit config.ini with your organization details
```

## 📖 Tutorial Features

### What's Included

- **✅ Complete Examples** - Full, working code implementations
- **✅ Safety Features** - Pre-flight checks and error handling
- **✅ Best Practices** - Production-ready patterns and security
- **✅ Troubleshooting** - Common issues and solutions
- **✅ CLI Integration** - Interactive command-line interfaces

### Learning Path

1. **Foundation** - Basic setup and configuration
2. **Core Operations** - Essential GitHub API operations
3. **Advanced Features** - Complex workflows and automation
4. **Production Ready** - Error handling, monitoring, and maintenance

## 🎨 Tutorial Style

Our tutorials follow consistent patterns:

- **Interactive Examples** - Copy, paste, and run immediately
- **Step-by-Step Guides** - Clear progression from basic to advanced
- **Safety First** - All destructive operations require confirmation
- **Real-World Focus** - Practical examples you can use in production

## 🔗 Navigation

Each tutorial includes:
- **Navigation Links** - Easy movement between related topics
- **Quick Reference** - Essential code snippets
- **Related Resources** - Links to relevant documentation

## 📝 Contributing

Found an issue or want to improve a tutorial?

1. Check the troubleshooting sections first
2. Review the complete example implementations
3. Test individual operations to isolate issues
4. Submit improvements via pull requests

## 🆘 Getting Help

### Troubleshooting Steps

1. **Check Prerequisites** - Verify Node.js version and GitHub App installation
2. **Validate Configuration** - Ensure config.ini has correct organization details
3. **Test Authentication** - Run basic API calls to verify access
4. **Review Permissions** - Confirm GitHub App has necessary permissions

### Common Issues

- **GitHub App Not Installed** - Install from GitHub Apps Marketplace
- **Permission Denied** - Check GitHub App permissions
- **Rate Limit Exceeded** - Implement retry logic or wait
- **Invalid Token** - Verify personal access token is valid

## 📚 Additional Resources

- [GitHub API Documentation](https://docs.github.com/en/rest)
- [GitHub Apps Documentation](https://docs.github.com/en/developers/apps)
- [Mediumroast API Documentation](../docs/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

**Ready to start?** Begin with the [Getting Started Guide](./github-getting-started.md) and build your first GitHub integration today!

## 🏗️ Project Structure

```
examples/
├── README.md                           # This file - tutorial directory
├── github-getting-started.md          # Essential setup guide
├── github-repository.md               # Repository management tutorial
├── github-actions.md                  # GitHub Actions tutorial
├── github-auth-tutorial.md            # Authentication deep-dive
├── github-read-operations-tutorial.md # Read-only operations
├── github-write-operations-tutorial.md # Write operations
├── config.ini                         # Configuration template
├── github-actions.js                  # Actions CLI example
├── github-companies.js                # Company data example
├── github-device-auth.js              # Device auth example
└── integrations/                       # 🆕 Production-ready examples
    ├── README.md                       # Integration guide
    ├── github-actions-manager.js       # Complete CLI application
    ├── workflow-manager.jsx            # React component
    └── workflow-manager.css            # Component styles
```

Each tutorial is self-contained but builds upon concepts from the getting started guide. Choose the path that matches your needs and experience level.
