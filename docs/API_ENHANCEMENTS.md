# GitHub Actions API Enhancements

## Summary of Changes

This document outlines the functions that have been moved from the `github-actions.js` example file to the main API for broader developer use.

## ✅ Functions Moved to API

### 1. `Actions.getInstallationStatus(suppressConsole = false)`

**Previous Location**: `examples/github-actions.js` → `checkExistingActionsInstallation()`  
**New Location**: `src/api/gitHubServer/entities/actions.js`

**Purpose**: Provides programmatic access to Actions installation status without requiring console output.

**Usage**:
```javascript
import { Actions } from 'mediumroast_api/src/api/gitHubServer.js';

const actions = new Actions(token, org, 'my-process');

// Get installation status with console output
const status = await actions.getInstallationStatus();

// Get installation status without console output (for API use)
const status = await actions.getInstallationStatus(true);
```

**Returns**:
```javascript
{
  installed: boolean,
  version: string | null,
  workflows: Array<string>,
  error: string | null,
  versionFileExists: boolean,
  directories: {
    github: boolean,
    workflows: boolean,
    actions: boolean
  }
}
```

**Benefits**:
- Clean API method for checking installation status
- Suppresses console output for programmatic use
- Returns structured data for easy integration
- Maintains backward compatibility with logging

### 2. Formatting Utilities

**Previous Location**: `examples/github-actions.js` → `logResult()`  
**New Location**: `src/api/gitHubServer/utils/formatting.js`

**Purpose**: Standardized formatting functions for API responses and console output.

**Available Functions**:

#### `formatResult(operationName, result, options)`
```javascript
import { formatResult } from 'mediumroast_api/src/api/gitHubServer/utils/formatting.js';

const result = await actions.installActions();
formatResult('installActions()', result);

// With options
formatResult('installActions()', result, {
  showData: false,
  suppressConsole: true,
  maxDataLength: 500
});
```

#### `formatInstallationStatus(status, options)`
```javascript
import { formatInstallationStatus } from 'mediumroast_api/src/api/gitHubServer/utils/formatting.js';

const status = await actions.getInstallationStatus(true);
formatInstallationStatus(status);
```

#### `formatWorkflowStats(workflowRuns, options)`
```javascript
import { formatWorkflowStats } from 'mediumroast_api/src/api/gitHubServer/utils/formatting.js';

const workflowRuns = await actions.getAll();
if (workflowRuns[0]) {
  formatWorkflowStats(workflowRuns[2].workflow_runs);
}
```

#### `formatUpdateInfo(updateInfo, options)`
```javascript
import { formatUpdateInfo } from 'mediumroast_api/src/api/gitHubServer/utils/formatting.js';

const updateCheck = await actions.checkForUpdates();
if (updateCheck[0]) {
  formatUpdateInfo(updateCheck[2]);
}
```

#### `formatSectionHeader(title, options)`
```javascript
import { formatSectionHeader } from 'mediumroast_api/src/api/gitHubServer/utils/formatting.js';

formatSectionHeader('GITHUB ACTIONS OPERATIONS');
```

**Benefits**:
- Consistent formatting across all examples
- Reusable utility functions
- Configurable output options
- Backward compatibility with `logResult`

## 🔄 Migration Guide

### For Existing Code Using `github-actions.js` Functions

#### Old Way:
```javascript
// In your application
const status = await checkExistingActionsInstallation(actions);
logResult('myOperation', result);
```

#### New Way:
```javascript
import { Actions } from 'mediumroast_api/src/api/gitHubServer.js';
import { formatResult } from 'mediumroast_api/src/api/gitHubServer/utils/formatting.js';

// Get installation status
const status = await actions.getInstallationStatus();

// Format results
formatResult('myOperation', result);
```

### For API Integration

#### Client Applications:
```javascript
import { Actions } from 'mediumroast_api/src/api/gitHubServer.js';

class MyActionsManager {
  constructor(token, org) {
    this.actions = new Actions(token, org, 'my-app');
  }
  
  async checkStatus() {
    // Get status without console output
    const status = await this.actions.getInstallationStatus(true);
    
    return {
      hasActions: status.installed,
      version: status.version,
      workflows: status.workflows,
      isHealthy: status.installed && !status.error
    };
  }
}
```

#### Web Applications:
```javascript
import { Actions } from 'mediumroast_api/src/api/gitHubServer.js';
import { formatResult } from 'mediumroast_api/src/api/gitHubServer/utils/formatting.js';

// React component example
const ActionsManager = ({ token, org }) => {
  const [status, setStatus] = useState(null);
  
  useEffect(() => {
    const actions = new Actions(token, org, 'web-app');
    
    actions.getInstallationStatus(true).then(setStatus);
  }, [token, org]);
  
  return (
    <div>
      {status?.installed ? (
        <div>
          <h3>Actions Installed</h3>
          <p>Version: {status.version}</p>
          <p>Workflows: {status.workflows.join(', ')}</p>
        </div>
      ) : (
        <div>No Actions installed</div>
      )}
    </div>
  );
};
```

## 🚀 Benefits for Developers

### 1. **Cleaner API Access**
- Direct access to installation status without console clutter
- Structured return values for easy integration
- Consistent error handling

### 2. **Standardized Formatting**
- Reusable formatting functions across all examples
- Configurable output options
- Consistent visual presentation

### 3. **Better Integration**
- API methods suitable for both CLI and web applications
- Suppressed console output for programmatic use
- Structured data for easy parsing

### 4. **Backward Compatibility**
- Existing examples continue to work
- Legacy `logResult` function still available
- Gradual migration path

## 🔧 Implementation Notes

### Error Handling
All new API methods follow the existing ResponseFactory pattern:
- Return structured objects for status methods
- Maintain consistent error reporting
- Support both console and programmatic use

### Performance
- Installation status checking is cached appropriately
- Formatting functions are lightweight
- No breaking changes to existing API

### Testing
The moved functions have been tested with:
- ✅ Console output suppression
- ✅ Structured data return
- ✅ Error handling
- ✅ Backward compatibility
- ✅ Integration with existing examples

## 📝 Next Steps

1. **Update Documentation**: Update API documentation to include new methods
2. **Create Examples**: Create additional examples using the new API methods
3. **Testing**: Add unit tests for the new utility functions
4. **Performance**: Monitor performance impact of the new methods

## 🎯 Conclusion

These changes provide developers with:
- **Better API access** to Actions functionality
- **Standardized formatting** across all examples
- **Cleaner integration** for both CLI and web applications
- **Maintained backward compatibility** with existing code

The refactored code is more modular, reusable, and suitable for production applications while maintaining the robustness and safety features of the original example.
