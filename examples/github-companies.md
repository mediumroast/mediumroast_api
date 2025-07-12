# GitHub Companies Management Tutorial

## Navigation

- **[⬅️ Getting Started](./github-getting-started.md)** - Prerequisites, installation, and basic setup
- **[📋 All Tutorials](./README.md)** - Complete tutorial directory
- **[📁 Repository Tutorial](./github-repository.md)** - Repository management operations
- **[🔄 Actions Tutorial](./github-actions.md)** - GitHub Actions workflow management

## Introduction

This tutorial provides a comprehensive guide for client application developers to implement GitHub Companies management operations using the Mediumroast API. You'll learn how to create, read, update, and delete company data with robust validation, user-friendly prompts, and detailed operational feedback. The workflow includes safety measures, comprehensive testing patterns, and extensive error handling for reliable data management.

> **Prerequisites**: Before starting this tutorial, complete the [Getting Started Guide](./github-getting-started.md) to set up your development environment, install dependencies, and configure your GitHub integration.

## Companies-Specific Configuration

For GitHub Companies management operations, add these specific settings to your `config.ini`:

```ini
[GitHub]
# ... (basic configuration from getting started guide)

# Companies data configuration
sampleDataPath = sample_data/companies.json
defaultCompanyRole = Competitor
defaultCompanyRegion = AMER
defaultCompanyIndustry = Software

# Profile generation settings
enableProfiles = true
includeAnalytics = true
maxInteractionSummary = 10
```

### Environment Variables for Logging Control

Control the logging behavior of the main example files:

```bash
# Set log level (debug, info, warn, error) - default: info
export LOG_LEVEL=debug

# Run the example with debug logging
LOG_LEVEL=debug node examples/github-companies.js

# Run with minimal logging
LOG_LEVEL=error node examples/github-companies.js
```

### Additional Prerequisites for Companies

- **Repository with Companies container** configured (use `github-repository.js` to set up)
- **Sample company data** available in `sample_data/companies.json`
- **Write permissions** for company data management

## Understanding the GitHub Companies Management Workflow

The Mediumroast API provides a comprehensive, safe workflow that includes:

1. **Prerequisite validation** to verify repository and container availability
2. **Two-step creation process** for controlled data entry (test companies first, then remaining)
3. **Comprehensive CRUD operations** with transaction safety patterns
4. **Advanced update testing** with whitelist validation and security controls
5. **Company profile generation** with analytics and interaction linking
6. **Safe deletion operations** with verification and cascade planning
7. **Interactive confirmations** for all destructive operations
8. **Detailed logging and monitoring** for operational visibility

## Logging and Output Patterns

This tutorial demonstrates **production-ready logging patterns** using the structured logger module for operational visibility and debugging. Different components use appropriate logging approaches:

### 📊 **Main Example Files** (`github-companies.js`)
- **Structured Logging**: Uses `logger.info()`, `logger.error()`, `logger.debug()` for production environments
- **Transaction Tracking**: Tracks operations with timing and context data for companies operations
- **Environment Aware**: Respects `LOG_LEVEL` environment variable (debug, info, warn, error)
- **Operational Data**: Includes organization, company count, and operation details in log entries

### 🖥️ **CLI Integration Examples** (`companies-manager-cli.js`)
- **Console Output**: Uses `console.log()` for direct user interaction and feedback
- **Interactive Experience**: Provides immediate visual feedback for company operations
- **Menu Systems**: Clear, formatted output for navigation and company status

### 🌐 **React Web Components** (`company-manager.jsx`)
- **UI State Management**: Uses React state and error boundaries for company data
- **User Notifications**: Visual feedback through UI components for company operations
- **Development Logging**: `console.log()` for development debugging only

**Choose the right pattern**: Use structured logging in backend services and APIs, console output for user-facing CLI tools, and UI state management for web applications.

## Basic Client Implementation

### Import Required Modules

```javascript
import { Companies } from 'mediumroast_api/src/api/gitHubServer.js';
import GitHubFunctions from 'mediumroast_api/src/api/github.js';
import ConfigParser from 'configparser';
import { readFileSync } from 'fs';
import inquirer from 'inquirer';
import { formatResult } from 'mediumroast_api/src/api/gitHubServer/utils/formatting.js';
import { logger } from 'mediumroast_api/src/api/gitHubServer/logger.js';
```

> **Note on Logging Patterns**: The main example files (`github-companies.js`, `github-repository.js`) use structured logging via the `logger` module for production-ready patterns with environment-aware log levels and transaction tracking. The CLI and React integration examples appropriately use `console.log` for direct user-facing output and interactive feedback.

### Initialize the API Client

```javascript
// Load configuration
const config = new ConfigParser();
config.read('./config.ini');

// Get credentials
const token = config.get('GitHub', 'token');
const org = config.get('GitHub', 'org');

// Initialize Companies entity class
const companies = new Companies(token, org, 'company-operations-example');
```

## Pre-flight Checks and Safety Features

### Repository and Container Check

The workflow starts by verifying that the repository and Companies container exist:

```javascript
async function checkPrerequisites(token, org) {
    const tracker = logger.trackOperation('checkPrerequisites', 'companies-example');
    
    try {
        const github = new GitHubFunctions(token, org, 'companies-prerequisite-check');
        
        // Check repository exists
        const repoResult = await github.getRepoSize();
        if (!repoResult[0]) {
            console.error('❌ Repository does not exist or is not accessible');
            return false;
        }
        
        // Check Companies container exists
        const containerResult = await github.getContent('Companies');
        if (!containerResult[0]) {
            console.error('❌ Companies container does not exist');
            return false;
        }
        
        return true;
    } finally {
        tracker.end();
    }
}
```

### Sample Data Validation

Before operations, verify that sample company data is available:

```javascript
async function validateSampleData(sampleDataPath) {
    if (!fs.existsSync(sampleDataPath)) {
        console.error(`❌ Sample data file not found at: ${sampleDataPath}`);
        return false;
    }
    
    const sampleCompanies = JSON.parse(fs.readFileSync(sampleDataPath, 'utf8'));
    console.log(`✅ Loaded ${sampleCompanies.length} sample companies`);
    return sampleCompanies;
}
```

### User Prompts for Safe Operations

The system includes interactive prompts to confirm potentially destructive operations:

```javascript
async function confirmAction(message) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    return new Promise((resolve) => {
        rl.question(`⚠️  ${message} (y/N): `, (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'y');
        });
    });
}

// Usage examples
async function safeDeleteCompany(companies, companyName) {
    const confirmed = await confirmAction(`Are you absolutely sure you want to delete "${companyName}"?`);
    if (confirmed) {
        return await companies.deleteObj(companyName);
    }
    return [false, 'Operation cancelled by user', null];
}
```

## Company CRUD Operations

### CREATE Operations - Two-Step Process

The API implements a two-step creation process for better control:

```javascript
async function demonstrateCompaniesCreateOperations(companies, sampleCompanies) {
    // Step 1: Create first 2 test companies
    const testCompanies = sampleCompanies.slice(0, 2);
    if (testCompanies.length > 0) {
        const testConfirmed = await confirmAction(`Create ${testCompanies.length} test companies?`);
        if (testConfirmed) {
            await createCompaniesWithContainer(companies, testCompanies, 'test companies');
        }
    }
    
    // Step 2: Create remaining companies
    const remainingCompanies = sampleCompanies.slice(2);
    if (remainingCompanies.length > 0) {
        const remainingConfirmed = await confirmAction(`Create ${remainingCompanies.length} remaining companies?`);
        if (remainingConfirmed) {
            await createCompaniesWithContainer(companies, remainingCompanies, 'remaining companies');
        }
    }
}

async function createCompaniesWithContainer(companies, companiesToCreate, operationDescription) {
    console.log(`Starting ${operationDescription} creation using catch/write/release pattern...`);
    
    // Use the createObj method which handles the full catch/write/release workflow
    const createResult = await companies.createObj(companiesToCreate);
    
    if (createResult[0]) {
        console.log(`✅ ${operationDescription} creation completed successfully!`);
        console.log(`✅ Created ${companiesToCreate.length} companies`);
    } else {
        console.error(`❌ ${operationDescription} creation failed`);
        console.error(`Error: ${createResult[1]?.status_msg || createResult[1]}`);
    }
}
```

### READ Operations - Multiple Access Patterns

The API provides several ways to read company data:

```javascript
async function demonstrateCompaniesReadOperations(companies) {
    // Get all companies - basic read operation
    const allCompaniesResult = await companies.getAll();
    if (allCompaniesResult[0]) {
        const allCompanies = allCompaniesResult[2].mrJson;
        console.log(`Total companies: ${allCompanies.length}`);
        
        // Group by role for analysis
        const roleGroups = {};
        allCompanies.forEach(company => {
            const role = company.role || 'No role';
            if (!roleGroups[role]) roleGroups[role] = [];
            roleGroups[role].push(company);
        });
    }
    
    // Find by name operation
    const sampleName = allCompanies[0].name;
    const companyByName = await companies.findByName(sampleName);
    if (companyByName[0]) {
        const foundCompany = companyByName[2][0];
        console.log(`Found: ${foundCompany.name} (${foundCompany.role})`);
    }
    
    // Generate company profile - company-specific read feature
    const profileResult = await companies.generateCompanyProfile(sampleName);
    if (profileResult[0]) {
        const profile = profileResult[2];
        console.log(`Profile generated for: ${profile.name}`);
        if (profile.analytics) {
            console.log(`Linked interactions: ${profile.analytics.interactionCount}`);
        }
    }
}
```

### UPDATE Operations - Comprehensive Testing

The UPDATE operations include comprehensive testing of whitelist validation:

```javascript
async function demonstrateCompaniesUpdateOperations(companies) {
    // Randomly select a company for testing
    const allCompaniesResult = await companies.getAll();
    const allCompanies = allCompaniesResult[2].mrJson;
    const randomIndex = Math.floor(Math.random() * allCompanies.length);
    const targetCompany = allCompanies[randomIndex];
    const targetCompanyName = targetCompany.name;
    
    console.log(`🎯 Randomly selected company for testing: "${targetCompanyName}"`);
    
    // Test 1: Update a whitelisted field (description) - should succeed
    const timestamp = new Date().toISOString();
    const newDescription = `UPDATED on ${timestamp} - This description was automatically updated...`;
    
    const updateResult = await companies.updateObj({
        name: targetCompanyName,
        key: 'description',
        value: newDescription
    });
    
    if (updateResult[0]) {
        console.log('✅ Description update successful');
        
        // Verify the update
        const verifyResult = await companies.findByName(targetCompanyName);
        if (verifyResult[0]) {
            const updatedCompany = verifyResult[2][0];
            const descriptionMatches = updatedCompany.description === newDescription;
            console.log(`Description updated: ${descriptionMatches ? '✅ YES' : '❌ NO'}`);
        }
    }
    
    // Test 2: Attempt to update a non-whitelisted field (name) - should fail
    const invalidUpdateResult = await companies.updateObj({
        name: targetCompanyName,
        key: 'name',
        value: `${targetCompanyName}_MODIFIED`
    });
    
    if (!invalidUpdateResult[0]) {
        console.log('✅ Expected behavior: Update correctly failed for non-whitelisted field.');
    }
    
    // Test 3: Update another whitelisted field (status) - should succeed
    const statusUpdateResult = await companies.updateObj({
        name: targetCompanyName,
        key: 'status',
        value: `active_updated_${Date.now()}`
    });
    
    // Test 4: Demonstrate interaction linking (company-specific update feature)
    const mockInteractions = [
        { 
            name: `Demo Interaction 1 for ${targetCompanyName}`, 
            content_type: 'document',
            description: 'Mock interaction for demonstration purposes'
        }
    ];
    
    const linkResult = await companies.linkInteractions(targetCompanyName, mockInteractions);
    console.log('Interaction linking result:', linkResult[0] ? 'SUCCESS' : 'FAILED');
}
```

### DELETE Operations - Safe with Verification

The DELETE operations follow the catch/write/release pattern with comprehensive verification:

```javascript
async function demonstrateCompaniesDeleteOperations(companies) {
    const allCompaniesResult = await companies.getAll();
    const allCompanies = allCompaniesResult[2].mrJson;
    const initialCount = allCompanies.length;
    
    // Randomly select a company for deletion
    const randomIndex = Math.floor(Math.random() * allCompanies.length);
    const targetCompany = allCompanies[randomIndex];
    const targetCompanyName = targetCompany.name;
    
    console.log(`🎯 Randomly selected company for deletion: "${targetCompanyName}"`);
    
    // Show company details and linked interactions
    if (targetCompany.linked_interactions && Object.keys(targetCompany.linked_interactions).length > 0) {
        const linkedCount = Object.keys(targetCompany.linked_interactions).length;
        console.log(`Note: This deletion will only remove the company. ${linkedCount} linked interactions will remain.`);
    }
    
    // Double confirmation for safety
    const confirmed = await confirmAction(`Are you absolutely sure you want to delete "${targetCompanyName}"?`);
    
    if (confirmed) {
        console.log('Using catch/write/release pattern for safe deletion...');
        console.log('Pattern: Catch containers → Delete object → Update references → Write containers → Release');
        
        const deleteResult = await companies.deleteObj(targetCompanyName);
        
        if (deleteResult[0]) {
            console.log(`✅ Company "${targetCompanyName}" has been deleted successfully.`);
            
            // Verify the deletion by checking the updated company list
            const updatedResult = await companies.getAll();
            if (updatedResult[0]) {
                const updatedCompanies = updatedResult[2].mrJson;
                const finalCount = updatedCompanies.length;
                const stillExists = updatedCompanies.some(company => company.name === targetCompanyName);
                
                console.log(`Initial company count: ${initialCount}`);
                console.log(`Final company count: ${finalCount}`);
                console.log(`Target company still exists: ${stillExists ? '❌ YES (ERROR!)' : '✅ NO (SUCCESS)'}`);
                
                if (finalCount === initialCount - 1 && !stillExists) {
                    console.log('✅ Deletion verified successfully!');
                }
            }
            
            // Try to find the deleted company (should fail)
            const findDeletedResult = await companies.findByName(targetCompanyName);
            if (!findDeletedResult[0] || findDeletedResult[2].length === 0) {
                console.log('✅ Confirmed: Deleted company cannot be found (expected behavior)');
            }
        }
    }
}
```

## Complete Client Application Example

For a comprehensive implementation that demonstrates the full company management lifecycle, see our complete integration examples:

**➡️ [GitHub Companies Manager CLI](./integrations/companies-manager-cli.js)**
- Complete interactive CLI application for company management
- Menu-driven interface for all CRUD operations
- Two-step creation process with confirmation prompts
- Comprehensive update testing with whitelist validation
- Safe deletion with verification
- **User-facing console output** for immediate feedback
- Usage: `node integrations/companies-manager-cli.js`

**➡️ [Company Manager React Component](./integrations/company-manager.jsx)**
- Full web-based UI for company management
- Real-time company data monitoring and updates
- Interactive forms for company creation and editing
- Profile generation with analytics visualization
- **UI state management** for user notifications
- Usage: `<CompanyManager token="..." org="..." />`

**➡️ [Company Data Dashboard](./integrations/company-dashboard.jsx)**
- Advanced dashboard for company data analysis
- Role-based company grouping and filtering
- Interaction linking visualization
- Analytics and reporting features
- Responsive design with mobile support
- Usage: `<CompanyDashboard token="..." org="..." />`

## Advanced Features

### Company Profile Generation

Generate comprehensive company profiles with analytics:

```javascript
async function generateCompanyProfile(companies, companyName) {
    const profileResult = await companies.generateCompanyProfile(companyName);
    
    if (profileResult[0]) {
        const profile = profileResult[2];
        console.log(`Profile for: ${profile.name}`);
        console.log(`Description: ${profile.description}`);
        
        if (profile.analytics) {
            console.log(`Linked interactions: ${profile.analytics.interactionCount}`);
            console.log(`Total file size: ${profile.analytics.totalFileSize} bytes`);
            console.log(`Total word count: ${profile.analytics.totalWordCount}`);
            console.log(`Average reading time: ${profile.analytics.avgReadingTime} minutes`);
            
            if (profile.analytics.contentTypes) {
                console.log('Content types:');
                Object.entries(profile.analytics.contentTypes).forEach(([type, count]) => {
                    console.log(`  ${type}: ${count} interactions`);
                });
            }
        }
        
        if (profile.interactionSummary && profile.interactionSummary.length > 0) {
            console.log('Linked interactions summary:');
            profile.interactionSummary.forEach((interaction, index) => {
                console.log(`  ${index + 1}. ${interaction.name} (${interaction.content_type})`);
            });
        }
    }
}
```

### Interaction Linking

Link interactions to companies for enhanced data relationships:

```javascript
async function linkInteractionsToCompany(companies, companyName, interactions) {
    const linkResult = await companies.linkInteractions(companyName, interactions);
    
    if (linkResult[0]) {
        console.log(`✅ Successfully linked ${interactions.length} interactions to ${companyName}`);
        
        // Verify the linking
        const companyResult = await companies.findByName(companyName);
        if (companyResult[0] && companyResult[2][0].linked_interactions) {
            const linkedCount = Object.keys(companyResult[2][0].linked_interactions).length;
            console.log(`Company now has ${linkedCount} linked interactions`);
        }
    } else {
        console.error('❌ Failed to link interactions:', linkResult[1]);
    }
}
```

### Batch Operations

Perform batch operations for multiple companies:

```javascript
async function batchUpdateCompanies(companies, updates) {
    console.log(`Starting batch update for ${updates.length} companies...`);
    
    const results = [];
    for (const update of updates) {
        const result = await companies.updateObj(update);
        results.push({
            company: update.name,
            success: result[0],
            message: result[1]
        });
    }
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    console.log(`Batch update completed: ${successCount} successful, ${failureCount} failed`);
    return results;
}
```

## Transaction Safety and Error Handling

### Catch/Write/Release Pattern

All write operations use the catch/write/release pattern for transaction safety:

```javascript
// The pattern is automatically handled by the API:
// 1. Catch containers - Lock and create working branch
// 2. Perform operations - Modify data in isolated environment
// 3. Write containers - Save changes to working branch
// 4. Release containers - Merge branch and unlock

// Example: CREATE operations
const createResult = await companies.createObj(companiesToCreate);
// Internally handles: catch → merge objects → write → release

// Example: UPDATE operations  
const updateResult = await companies.updateObj({
    name: companyName,
    key: 'description',
    value: newDescription
});
// Internally handles: catch → update object → write → release

// Example: DELETE operations
const deleteResult = await companies.deleteObj(companyName);
// Internally handles: catch → delete object → update references → write → release
```

### Error Recovery

Implement proper error recovery for failed operations:

```javascript
async function safeCompanyOperation(companies, operation, ...args) {
    const maxRetries = 3;
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Attempt ${attempt}/${maxRetries}: ${operation}`);
            
            const result = await companies[operation](...args);
            
            if (result[0]) {
                console.log(`✅ ${operation} successful on attempt ${attempt}`);
                return result;
            } else {
                lastError = result[1];
                console.log(`❌ ${operation} failed on attempt ${attempt}: ${lastError}`);
            }
        } catch (error) {
            lastError = error.message;
            console.log(`❌ ${operation} error on attempt ${attempt}: ${lastError}`);
        }
        
        if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
            console.log(`Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    console.error(`❌ ${operation} failed after ${maxRetries} attempts. Last error: ${lastError}`);
    return [false, lastError, null];
}
```

## Future Enhancements

### Cascade Deletion (TODO)

Future enhancement for comprehensive deletion operations:

```javascript
// TODO: Implement cascade deletion feature
// This would require:
// 1. Finding all interactions linked to the company
// 2. Prompting user to confirm cascade deletion
// 3. Deleting linked interactions first (using Interactions.deleteObj())
// 4. Then deleting the company
// 5. Verifying all deletions completed successfully

async function cascadeDeleteCompany(companies, interactions, companyName) {
    // Not yet implemented - planned enhancement
    console.log('🚧 Cascade deletion not yet implemented');
    console.log('Benefits: Complete cleanup of related data');
    console.log('Risks: More destructive operation, requires careful confirmation');
    console.log('Implementation priority: Medium (after core CRUD operations are stable)');
}
```

### Advanced Analytics

Future enhancement for detailed company analytics:

```javascript
// TODO: Enhanced analytics features
// - Market segment analysis
// - Competitive landscape mapping
// - Interaction trend analysis
// - Automated insights generation
```

## Running the Complete Example

```bash
# Run all operations (requires user confirmation)
node examples/github-companies.js

# Run specific operations
node examples/github-companies.js create read update delete

# Run with debug logging
LOG_LEVEL=debug node examples/github-companies.js

# Run only safe read operations
node examples/github-companies.js read
```

## Sample Data Format

The `sample_data/companies.json` file should contain:

```json
[
    {
        "name": "Example Corp",
        "role": "Competitor",
        "description": "Example company description",
        "region": "AMER",
        "industry": "Software",
        "url": "https://example.com",
        "country": "USA",
        "city": "San Francisco",
        "state_province": "CA"
    }
]
```

## Best Practices

### Data Validation

Always validate company data before operations:

```javascript
function validateCompanyData(company) {
    const required = ['name', 'role'];
    const missing = required.filter(field => !company[field]);
    
    if (missing.length > 0) {
        throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
    
    if (company.role && !['Competitor', 'Partner', 'Customer', 'Owner'].includes(company.role)) {
        console.warn(`⚠️ Unusual company role: ${company.role}`);
    }
    
    return true;
}
```

### Performance Optimization

For large datasets, implement pagination and filtering:

```javascript
async function getCompaniesPaginated(companies, filters = {}, limit = 50, offset = 0) {
    const allCompaniesResult = await companies.getAll();
    
    if (allCompaniesResult[0]) {
        let filteredCompanies = allCompaniesResult[2].mrJson;
        
        // Apply filters
        if (filters.role) {
            filteredCompanies = filteredCompanies.filter(c => c.role === filters.role);
        }
        if (filters.region) {
            filteredCompanies = filteredCompanies.filter(c => c.region === filters.region);
        }
        
        // Apply pagination
        const paginatedCompanies = filteredCompanies.slice(offset, offset + limit);
        
        return {
            companies: paginatedCompanies,
            total: filteredCompanies.length,
            hasMore: offset + limit < filteredCompanies.length
        };
    }
    
    return { companies: [], total: 0, hasMore: false };
}
```

---

**Next Steps**: 
- Try the [Companies Manager CLI](./integrations/companies-manager-cli.js) for hands-on experience
- Explore the [Company Manager React Component](./integrations/company-manager.jsx) for web integration
- Review the [Repository Tutorial](./github-repository.md) for container management
- Check out the [Actions Tutorial](./github-actions.md) for workflow automation
