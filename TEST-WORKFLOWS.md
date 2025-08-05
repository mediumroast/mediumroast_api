# Test Workflows Documentation

## Overview

This document describes the comprehensive test workflows available for the Mediumroast API. These workflows are designed to validate the complete functionality of the API through systematic testing of all major operations.

## Available Test Workflows

### 1. Full CRUR Workflow Test (`test-full-workflow-create-read-update-read.sh`)

**Primary Test Script** - Performs comprehensive Create → Read → Update → Read (CRUR) testing for all entity types.

#### Purpose
This script validates the complete lifecycle of API operations by performing:
- Repository infrastructure setup
- GitHub Actions installation
- Full CRUR workflows for Companies, Interactions, and Studies
- Comprehensive verification and reporting

#### Features
- ✅ **Comprehensive Coverage**: Tests all major entity types (Companies, Interactions, Studies)
- 🔄 **Full Lifecycle Testing**: Create → Read/Verify → Update → Read/Verify pattern
- 🛡️ **Robust Error Handling**: Exits on any failure with detailed error reporting
- 📊 **Progress Reporting**: Color-coded output with Unicode symbols for clear status
- ⏱️ **Performance Tracking**: Duration tracking and completion summaries
- 🔍 **Pre-flight Checks**: Validates configuration and environment before execution
- 📝 **Detailed Logging**: Comprehensive logging for debugging and verification
- 🤝 **Interactive Prompts**: Preserves user interaction - does NOT automate confirmations

#### Usage
```bash
# Run the complete CRUR workflow test
./test-full-workflow-create-read-update-read.sh
```

#### Prerequisites
- `examples/config.ini` file with GitHub token and organization
- Sample data files in `examples/sample_data/`:
  - `companies.json`
  - `interactions.json` 
  - `studies.json`
- Node.js environment properly configured
- All npm dependencies installed

#### Workflow Steps

1. **Configuration Verification**
   - Validates `config.ini` exists and is properly formatted
   - Checks for required sample data files
   - Verifies Node.js environment and dependencies

2. **Repository Setup** 🚀
   - Creates repository infrastructure
   - Sets up entity containers (Companies, Interactions, Studies)
   - Installs GitHub Actions workflows

3. **Companies CRUR Workflow** 🏢
   - **CREATE**: Creates companies from sample data
   - **READ**: Reads and verifies created companies
   - **UPDATE**: Updates companies with new information
   - **READ**: Re-reads and verifies updated companies

4. **Interactions CRUR Workflow** 🤝
   - **CREATE**: Creates interactions from sample data with file uploads
   - **READ**: Reads and verifies created interactions
   - **UPDATE**: Updates interactions with new information and file handling
   - **READ**: Re-reads and verifies updated interactions

5. **Studies CRUR Workflow** 🔬
   - **CREATE**: Creates studies from sample data
   - **READ**: Reads and verifies created studies
   - **UPDATE**: Updates studies with new information
   - **READ**: Re-reads and verifies updated studies
   - *Note: Gracefully skips if `github-studies.js` is empty*

6. **Summary Report** 📚
   - Completion status for all workflows
   - Execution time and performance metrics
   - Success/failure summary
   - Next steps and recommendations

#### Output Example
```
================================================================================================
🚀 MEDIUMROAST API - CRUR WORKFLOW TEST
================================================================================================
ℹ️ Starting comprehensive Create → Read → Update → Read workflow test
ℹ️ Script version: 3.0.0

----------------------------------------
Configuration Verification
----------------------------------------
✅ Configuration file found
✅ Sample data file companies.json found
✅ Sample data file interactions.json found
✅ Sample data file studies.json found

================================================================================================
🚀 REPOSITORY SETUP AND ACTIONS INSTALLATION
================================================================================================
⚙️ Running repository setup (repository + containers)...
✅ Repository infrastructure created successfully
⚙️ Installing GitHub Actions workflows...
✅ GitHub Actions workflows installed successfully

================================================================================================
🏢 COMPANIES CRUR WORKFLOW
================================================================================================
⚙️ Creating companies from sample data...
✅ Companies created successfully
⚙️ Reading and verifying created companies...
✅ Companies read/verification completed successfully
⚙️ Updating companies with new information...
✅ Companies updated successfully
⚙️ Reading and verifying updated companies...
✅ Companies post-update verification completed successfully
✅ Companies CRUR workflow completed successfully
```

#### Error Handling
- **Automatic Exit**: Script exits immediately on any error
- **Detailed Error Messages**: Provides line numbers, commands, and timestamps
- **Rollback Guidance**: Suggests recovery steps when possible
- **Prerequisite Validation**: Prevents execution with missing requirements

## Individual Example Scripts

The CRUR workflow leverages individual example scripts that can also be run independently:

### Repository Setup (`examples/github-repository.js`)
- Creates repository infrastructure
- Sets up entity containers
- Validates GitHub App installation

### Actions Management (`examples/github-actions.js`)
- Installs GitHub Actions workflows
- Manages workflow versions and updates
- Provides workflow usage statistics

### Companies Operations (`examples/github-companies.js`)
- Full CRUD operations for companies
- Company data management and linking
- Sample data loading and validation

### Interactions Operations (`examples/github-interactions.js`)
- Full CRUD operations for interactions
- File upload and management
- Company linking and metadata handling
- Fuzzy search demonstrations

### Studies Operations (`examples/github-studies.js`)
- Full CRUD operations for studies
- Research data management
- Analysis and reporting features

## Best Practices

### Before Running Tests
1. **Backup Important Data**: Ensure any existing repository data is backed up
2. **Review Configuration**: Verify `config.ini` has correct token and organization
3. **Check Permissions**: Ensure GitHub token has required repository permissions
4. **Install Dependencies**: Run `npm install` to ensure all dependencies are available

### During Testing
1. **Monitor Output**: Watch for warnings and error messages
2. **Respond to Prompts**: The script will ask for confirmations - respond appropriately
3. **Allow Completion**: Let scripts complete fully before interrupting
4. **Review Results**: Check the summary reports for any issues

### After Testing
1. **Verify Repository State**: Check GitHub repository for created entities
2. **Review Logs**: Examine any error logs for debugging
3. **Clean Up**: Remove test data if needed using delete operations

## Troubleshooting

### Common Issues

**Configuration File Not Found**
```bash
❌ Configuration file examples/config.ini not found
```
*Solution*: Create `examples/config.ini` with your GitHub token and organization.

**Sample Data Missing**
```bash
❌ Sample data file examples/sample_data/companies.json not found
```
*Solution*: Ensure all sample data files exist in the `examples/sample_data/` directory.

**Permission Errors**
```bash
❌ GitHub App installation failed
```
*Solution*: Verify GitHub token permissions and app installation status.

**Node.js Dependencies**
```bash
❌ Node.js is not installed or not in PATH
```
*Solution*: Install Node.js and run `npm install` in the project directory.

### Getting Help

1. **Check Logs**: Review console output for specific error messages
2. **Verify Prerequisites**: Ensure all requirements are met
3. **Test Individual Scripts**: Run example scripts independently to isolate issues
4. **Review Documentation**: Check API documentation for specific operations

## Advanced Usage

### Running Specific Workflows
You can run individual example scripts with specific operations:

```bash
# Run only create and read operations for companies
node examples/github-companies.js create read

# Run only fuzzy search demonstrations for interactions
node examples/github-interactions.js fuzzy

# Run only repository setup without containers
node examples/github-repository.js repository
```

### Custom Test Scenarios
The modular design allows for custom test scenarios by combining different operations across entity types.

### Continuous Integration
The CRUR workflow script is designed to be CI/CD friendly with:
- Exit codes for success/failure detection
- JSON output options for parsing
- Environment variable support
- Automated confirmation handling

## Version History

### v3.0.0 (Current)
- ✅ Complete CRUR workflow implementation
- ✅ Enhanced error handling and reporting
- ✅ Color-coded output with Unicode symbols
- ✅ Comprehensive prerequisite validation
- ✅ Graceful handling of missing studies implementation
- ✅ Detailed progress tracking and summaries
- ✅ Preserves interactive prompts (no automation of user confirmations)

### v2.x
- Basic workflow testing
- Individual script execution
- Manual confirmation requirements

### v1.x
- Initial implementation
- Basic CRUD operations
- Limited error handling

## Contributing

When adding new test workflows:

1. **Follow Naming Convention**: Use descriptive names with `test-` prefix
2. **Include Documentation**: Update this file with new workflow descriptions
3. **Add Error Handling**: Implement robust error handling and reporting
4. **Provide Examples**: Include usage examples and expected output
5. **Test Thoroughly**: Verify workflows work in different environments

## Support

For issues with test workflows:
- Check the troubleshooting section above
- Review individual example script documentation
- Examine log output for specific error details
- Verify GitHub repository state and permissions
