# GitHub Actions Integration Examples

This directory contains complete implementation examples for integrating GitHub Actions management into your applications using the Mediumroast API.

## 📁 Files Overview

### Core Integration Examples

| File | Type | Description | Use Case |
|------|------|-------------|----------|
| `github-actions-manager.js` | Node.js CLI | Complete interactive CLI for Actions management | Command-line automation, DevOps tools |
| `workflow-manager.jsx` | React Component | Full-featured web UI for workflow management | Web applications, dashboards |
| `workflow-manager.css` | CSS Styles | Responsive styling for the React component | Web UI styling |

### Integration Patterns

Each example demonstrates different integration approaches:

- **CLI Application**: Interactive command-line interface with menu-driven operations
- **React Component**: Modern web UI with real-time updates and responsive design
- **Web Dashboard**: Complete frontend solution with installation checking and error handling

## 🚀 Quick Start

### Prerequisites

Before using these examples, ensure you have:

1. **Completed Setup**: Follow the [Getting Started Guide](../github-getting-started.md)
2. **API Installation**: Install the Mediumroast API package
3. **Dependencies**: Install the required dependencies for each example

### Node.js CLI Example

```bash
# Install dependencies
npm install inquirer configparser

# Run the CLI
node github-actions-manager.js
```

### React Component Example

```bash
# Install React dependencies
npm install react react-dom

# Import in your React app
import WorkflowManager from './integrations/workflow-manager.jsx';
import './integrations/workflow-manager.css';

// Use in your component
<WorkflowManager token="your-token" org="your-org" repoName="your-repo" />
```

## 🎯 Features Comparison

| Feature | CLI | React Component |
|---------|-----|-----------------|
| **Interactive Menu** | ✅ | ✅ |
| **Workflow CRUD** | ✅ | ✅ |
| **Real-time Updates** | ❌ | ✅ |
| **Responsive Design** | N/A | ✅ |
| **Pre-flight Checks** | ✅ | ✅ |
| **Error Handling** | ✅ | ✅ |
| **Installation Verification** | ✅ | ✅ |
| **Workflow Triggering** | ✅ | ✅ |
| **Run Monitoring** | ✅ | ✅ |

## 📖 Usage Examples

### CLI Application

```javascript
// Basic usage
const manager = new GitHubActionsManager('./config.ini');
await manager.run();

// Custom configuration
const manager = new GitHubActionsManager();
manager.config.set('GitHub', 'org', 'my-org');
await manager.run();
```

### React Component

```jsx
// Basic usage
<WorkflowManager
  token="ghp_your_token"
  org="your-organization"
  repoName="your-repository"
/>

// With error handling
const [token, setToken] = useState('');
const [org, setOrg] = useState('');
const [repo, setRepo] = useState('');

{token && org && repo && (
  <WorkflowManager
    token={token}
    org={org}
    repoName={repo}
  />
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

### Environment Variables

Both examples support environment-based configuration:

```bash
# Set environment variables
export GITHUB_TOKEN="your-token"
export GITHUB_ORG="your-org"
export GITHUB_REPO="your-repo"
```

### Configuration Files

Use `config.ini` files for persistent configuration:

```ini
[GitHub]
# Basic configuration
org = your-organization
token = your-github-token
repoName = your-repository

# Actions-specific settings
workflowName = main-workflow
workflowDescription = Main CI/CD workflow
workflowFile = .github/workflows/main.yml
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
node github-actions-manager.js --config ./test-config.ini

# Test specific operations
node -e "
  const manager = require('./github-actions-manager.js');
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
import { GitHubActionsManager } from '../../../integrations/github-actions-manager.js';

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
- Use the built-in error handling and logging for debugging
