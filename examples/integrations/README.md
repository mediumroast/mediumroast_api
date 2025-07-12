# GitHub Integration Examples

This directory contains complete implementation examples for integrating GitHub operations into your applications using the Mediumroast API.

## 📁 Files Overview

### GitHub Actions Integration

| File | Type | Description | Use Case |
|------|------|-------------|----------|
| `actions-manager-cli.js` | Node.js CLI | Complete interactive CLI for Actions management | Command-line automation, DevOps tools |
| `workflow-manager.jsx` | React Component | Full-featured web UI for workflow management | Web applications, dashboards |
| `workflow-manager.css` | CSS Styles | Responsive styling for the React component | Web UI styling |

### GitHub Repository Integration

| File | Type | Description | Use Case |
|------|------|-------------|----------|
| `repository-manager-cli.js` | Node.js CLI | Complete CLI for repository and container management | Repository setup, automation scripts |
| `repository-manager.jsx` | React Component | Web UI for repository and container operations | Web applications, admin dashboards |
| `repository-manager.css` | CSS Styles | Responsive styling for the repository component | Web UI styling |

### GitHub Companies Integration

| File | Type | Description | Use Case |
|------|------|-------------|----------|
| `companies-manager-cli.js` | Node.js CLI | Complete CLI for company data management | Data entry, company analysis, CLI automation |
| `company-manager.jsx` | React Component | Web UI for company CRUD operations and analytics | Web applications, data dashboards |
| `company-manager.css` | CSS Styles | Responsive styling for the company component | Web UI styling |

### Integration Patterns

Each example demonstrates different integration approaches:

- **CLI Applications**: Interactive command-line interfaces with menu-driven operations
- **React Components**: Modern web UI with real-time updates and responsive design
- **Web Dashboards**: Complete frontend solutions with installation checking and error handling

## 🚀 Quick Start

### Prerequisites

Before using these examples, ensure you have:

1. **Completed Setup**: Follow the [Getting Started Guide](../github-getting-started.md)
2. **API Installation**: Install the Mediumroast API package
3. **Dependencies**: Install the required dependencies for each example

### GitHub Actions CLI

```bash
# Install dependencies
npm install inquirer configparser

# Run the Actions CLI
node actions-manager-cli.js
```

### GitHub Repository CLI

```bash
# Install dependencies  
npm install commander configparser inquirer chalk

# Run the Repository CLI
node repository-manager-cli.js setup
node repository-manager-cli.js create --org your-org
node repository-manager-cli.js status --detailed
```

### GitHub Companies CLI

```bash
# Install dependencies
npm install inquirer configparser

# Run the Companies CLI
node companies-manager-cli.js
```

### React Components

```bash
# Install React dependencies
npm install react react-dom

# Actions Manager Component
import WorkflowManager from './integrations/workflow-manager.jsx';
import './integrations/workflow-manager.css';

<WorkflowManager token="your-token" org="your-org" repoName="your-repo" />

# Repository Manager Component
import RepositoryManager from './integrations/repository-manager.jsx';
import './integrations/repository-manager.css';

<RepositoryManager token="your-token" org="your-org" />

# Companies Manager Component
import CompanyManager from './integrations/company-manager.jsx';
import './integrations/company-manager.css';

<CompanyManager token="your-token" org="your-org" />
```

## 🎯 Features Comparison

### GitHub Actions Examples

| Feature | Actions CLI | Actions React Component |
|---------|-------------|-------------------------|
| **Interactive Menu** | ✅ | ✅ |
| **Workflow CRUD** | ✅ | ✅ |
| **Real-time Updates** | ❌ | ✅ |
| **Responsive Design** | N/A | ✅ |
| **Pre-flight Checks** | ✅ | ✅ |
| **Error Handling** | ✅ | ✅ |
| **Installation Verification** | ✅ | ✅ |
| **Workflow Triggering** | ✅ | ✅ |
| **Run Monitoring** | ✅ | ✅ |

### GitHub Repository Examples

| Feature | Repository CLI | Repository React Component |
|---------|----------------|----------------------------|
| **Repository Creation** | ✅ | ✅ |
| **Container Management** | ✅ | ✅ |
| **Status Checking** | ✅ | ✅ |
| **Setup Wizard** | ✅ | ❌ |
| **Real-time Updates** | ❌ | ✅ |
| **Responsive Design** | N/A | ✅ |
| **Pre-flight Checks** | ✅ | ✅ |
| **Configuration Management** | ✅ | ❌ |
| **Detailed Information** | ✅ | ✅ |

### GitHub Companies Examples

| Feature | Companies CLI | Companies React Component |
|---------|---------------|---------------------------|
| **Company CRUD Operations** | ✅ | ✅ |
| **Two-step Creation Process** | ✅ | ❌ |
| **Profile Generation** | ✅ | ✅ |
| **Analytics Visualization** | ✅ | ✅ |
| **Interaction Linking** | ✅ | ✅ |
| **Role-based Filtering** | ✅ | ✅ |
| **Real-time Updates** | ❌ | ✅ |
| **Responsive Design** | N/A | ✅ |
| **Safe Deletion** | ✅ | ✅ |
| **Comprehensive Testing** | ✅ | ❌ |

## 📖 Usage Examples

### GitHub Actions CLI

```javascript
// Basic usage
const manager = new GitHubActionsManager('./config.ini');
await manager.run();

// Custom configuration
const manager = new GitHubActionsManager();
manager.config.set('GitHub', 'org', 'my-org');
await manager.run();
```

### GitHub Companies CLI

```javascript
// Basic usage
const manager = new GitHubCompaniesManager('./config.ini');
await manager.run();

// Custom configuration
const manager = new GitHubCompaniesManager();
manager.config.set('GitHub', 'org', 'my-org');
await manager.run();
```
# Interactive setup wizard
node repository-manager-cli.js setup

# Create repository with options
node repository-manager-cli.js create --org my-org --token ghp_xxx

# Check detailed status
node repository-manager-cli.js status --detailed

# Get organization info
node repository-manager-cli.js info --org my-org
```

### React Components

```jsx
// Actions Manager Component
<WorkflowManager
  token="ghp_your_token"
  org="your-organization"
  repoName="your-repository"
/>

// Repository Manager Component
<RepositoryManager
  token="ghp_your_token"
  org="your-organization"
/>

// Companies Manager Component
<CompanyManager
  token="ghp_your_token"
  org="your-organization"
/>

// With error handling
const [token, setToken] = useState('');
const [org, setOrg] = useState('');

{token && org && (
  <div>
    <RepositoryManager token={token} org={org} />
    <CompanyManager token={token} org={org} />
    <WorkflowManager token={token} org={org} repoName="discovery" />
  </div>
)}
```

## 🛠️ Customization

### CLI Customization

The CLI application can be customized by:

- **Menu Options**: Modify the `showMainMenu()` method
- **Default Values**: Update the `getDefaultWorkflowContent()` method
- **Configuration**: Add custom configuration parameters
- **Actions**: Extend the `executeAction()` method with new operations

### React Component Customization

The React component can be customized by:

- **Styling**: Modify the CSS file or add custom classes
- **Layout**: Adjust the component structure and grid layout
- **Features**: Add new workflow operations or UI elements
- **Data Handling**: Customize API call patterns and state management

## 🔧 Configuration

### Environment Setup

Both CLI applications support multiple configuration methods:

```javascript
// Method 1: Configuration file (config.ini)
[GitHub]
org = your-organization
token = ghp_your_personal_access_token
discovery_repo = discovery

[DEFAULT]
env = production
log_level = info

// Method 2: Environment variables
export GITHUB_ORG=your-organization
export GITHUB_TOKEN=ghp_your_token
export GITHUB_DISCOVERY_REPO=discovery

// Method 3: Interactive prompts (when config missing)
node actions-manager-cli.js  # Will prompt for missing values
node repository-manager-cli.js setup  # Guided setup wizard
```

### React Configuration

```jsx
// Token management best practices
const useGitHubToken = () => {
  const [token, setToken] = useState(
    process.env.REACT_APP_GITHUB_TOKEN || ''
  );
  
  // For production, consider secure token storage
  const secureToken = useMemo(() => {
    return token.startsWith('ghp_') ? token : '';
  }, [token]);
  
  return { token: secureToken, setToken };
};

// Organization context
const GitHubProvider = ({ children }) => {
  const { token } = useGitHubToken();
  const [org, setOrg] = useState('mediumroast');
  
  return (
    <GitHubContext.Provider value={{ token, org, setOrg }}>
      {children}
    </GitHubContext.Provider>
  );
};
```

### Security Considerations

- **Never commit tokens**: Use environment variables or secure vaults
- **Scope permissions**: Use tokens with minimal required permissions
- **Rotate regularly**: Implement token rotation for production use
- **Monitor usage**: Track API calls and rate limiting

```javascript
// Token validation example
const validateToken = async (token) => {
  if (!token.startsWith('ghp_')) {
    throw new Error('Invalid token format');
  }
  
  // Test token with minimal API call
  const response = await fetch('https://api.github.com/user', {
    headers: { Authorization: `token ${token}` }
  });
  
  if (!response.ok) {
    throw new Error('Invalid or expired token');
  }
  
  return true;
};
```

## 🔐 Security Considerations

### Token Management

- **Never commit tokens** to version control
- **Use environment variables** for sensitive data
- **Implement token rotation** for production applications
- **Use GitHub Apps** instead of personal tokens when possible

### API Rate Limiting

- **Implement retry logic** for failed requests
- **Use exponential backoff** for rate limit handling
- **Monitor API usage** to stay within limits
- **Cache responses** when appropriate

## 📊 Performance Optimization

### CLI Performance

- **Lazy loading**: Load workflows only when needed
- **Pagination**: Handle large workflow lists efficiently
- **Caching**: Cache frequently accessed data
- **Batch operations**: Group multiple API calls

### React Performance

- **Memoization**: Use React.memo for expensive components
- **Virtualization**: Handle large lists with virtual scrolling
- **Debouncing**: Debounce API calls for search/filter operations
- **Optimistic updates**: Update UI before API confirmation

## 🧪 Testing

### CLI Testing

```bash
# Run with test configuration
node actions-manager-cli.js --config ./test-config.ini

# Test specific operations
node -e "
  const manager = require('./actions-manager-cli.js');
  manager.listWorkflows().then(console.log);
"
```

### React Testing

```jsx
// Test with mock data
import { render, screen } from '@testing-library/react';
import WorkflowManager from './workflow-manager.jsx';

const mockProps = {
  token: 'test-token',
  org: 'test-org',
  repoName: 'test-repo'
};

test('renders workflow manager', () => {
  render(<WorkflowManager {...mockProps} />);
  expect(screen.getByText('GitHub Actions Workflow Manager')).toBeInTheDocument();
});
```

## 🔗 Integration Patterns

### Express.js API

```javascript
// Create API endpoints
app.get('/api/workflows', async (req, res) => {
  const manager = new GitHubActionsManager();
  const workflows = await manager.listWorkflows();
  res.json(workflows);
});

app.post('/api/workflows/:id/trigger', async (req, res) => {
  const manager = new GitHubActionsManager();
  const result = await manager.triggerWorkflow(req.params.id);
  res.json(result);
});
```

### Next.js Integration

```javascript
// pages/api/workflows.js
import { GitHubActionsManager } from '../../../integrations/actions-manager-cli.js';

export default async function handler(req, res) {
  const manager = new GitHubActionsManager();
  
  if (req.method === 'GET') {
    const workflows = await manager.listWorkflows();
    res.status(200).json(workflows);
  } else if (req.method === 'POST') {
    const result = await manager.createWorkflow(req.body);
    res.status(201).json(result);
  }
}
```

## 📚 Related Resources

- **[GitHub Actions Tutorial](../github-actions.md)** - Complete tutorial with detailed explanations
- **[Getting Started Guide](../github-getting-started.md)** - Setup and configuration instructions
- **[Repository Tutorial](../github-repository.md)** - Repository management operations
- **[API Documentation](../../docs/)** - Complete API reference

## 🤝 Contributing

To contribute to these examples:

1. **Test thoroughly** with different configurations
2. **Add documentation** for new features
3. **Follow existing patterns** for consistency
4. **Include error handling** for robustness
5. **Update this README** with new examples

## 📄 License

These examples are provided under the same license as the Mediumroast API package.

---

**Need Help?**

- Check the main [GitHub Actions Tutorial](../github-actions.md) for detailed explanations
- Review the [Getting Started Guide](../github-getting-started.md) for setup instructions  
- Test individual components to isolate issues
- Use the built-in structured logging system (`LOG_LEVEL=debug`) for detailed diagnostics
- Enable error handling and retry logic patterns shown in the examples
