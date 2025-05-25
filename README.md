# mediumroast_api

## Overview
The `mediumroast_api` is a standalone API/SDK that provides an interface to interact with the Mediumroast. It is designed to simplify the process of integrating with Mediumroast in your applications.  

## Status
The present version of the module is in development and is not yet ready for production use. It is being actively developed and tested to ensure that it meets the requirements of the Mediumroast platform. The initial implementation was constructed in node package `mediumroast_js` and this version is extracted from that package to be used in a standalone manner.  At present the module has been tested for Read operations only.  The Create, Update and Delete operations are implemented but not yet tested.  The module is being tested in a separate project to ensure that Read operations are working as expected. After that the it should be ready for production of Read only use cases.  A second step will be to replace the API implementation in `mediumroast_js` with this module.  The final step will be to test the Create, Update and Delete operations in the standalone module and then in `mediumroast_js`.  After that the module will be ready for production use.

## Installation
To install the module, use npm: 

`npm install mediumroast_api`.

## Usage
To use the functionalities provided by the `mediumroast_api`, you can import the module in your JavaScript files:

```javascript
import { Companies, Interactions, Studies, Users } from 'mediumroast_api';
import ConfigParser from 'configparser';

// Read configuration
const config = new ConfigParser();
config.read('./config.ini');
const token = config.get('GitHub', 'token');
const org = config.get('GitHub', 'org');

// Create instances
const studies = new Studies(token, org, 'my-process');
const companies = new Companies(token, org, 'my-process');

// Get all studies
const allStudies = await studies.getAll();
if (allStudies[0]) {
  console.log(`Found ${allStudies[2].length} studies`);
}

// Find a specific company
const company = await companies.findByName('Acme Corp');

// Check if repository has been updated
const branchStatus = await studies.getBranchStatus();
console.log(`Latest commit: ${branchStatus[2].sha}`);

// Determine if client needs to update data
const lastKnownSha = localStorage.getItem('lastKnownSha');
const updateCheck = await studies.checkForUpdates(lastKnownSha);
if (updateCheck[2].updateNeeded) {
  console.log('Repository has been updated, fetching new data...');
  // Update client data here
}
```
## Key Features

### Repository Change Detection
The module provides a method to check if the repository has been updated since the last known commit. This can be used to determine if the client needs to update its data.

```javascript
const lastKnownSha = localStorage.getItem('lastKnownSha');
const updateCheck = await studies.checkForUpdates(lastKnownSha);
if (updateCheck[2].updateNeeded) {
  console.log('Repository has been updated, fetching new data...');
  // Update client data here
}
```

### Caching System
The module provides a caching system that can be used to store data locally. This can be used to reduce the number of API calls made by the client and improve performance.
 - Default cache time is 5 minutes
 - 1 minute cache time for branch status
 - Cache time can be set in the constructor
 - Cache is automatically invalidated when needed

```javascript
// Get all studies
const allStudies = await studies.getAll();
if (allStudies[0]) {
  console.log(`Found ${allStudies[2].length} studies`);
}   
```

### Standardized Response Format
The module provides a standardized response format that includes a status code, message, and data. This can be used to easily determine the outcome of an API call and handle errors.

```javascript
[
  success,         // Boolean indicating success or failure
  messageOrError,  // Success message or error details
  data             // The requested data or null on failure
]
```

## API Reference

### Base Operations
 - `getAll()`: Get all items
 - `findByName(name)`: Find an item by name
 - `findByX(attribute, value)`: Find objects by arbitrary attribute
 - `search(filters, options)`: Search for items using filters and sorting options
 - `getBranchStatus()`: Get the latest commit for a branch
 - `checkForUpdates(lastKnownSha)`: Check if the repository has been updated since the last known commit

### Entities
 - `Companies`: Manage company-related data and operations
     - `generateCompanyProfile(company)`: Generate a company profile with analytics
 - `Interactions`: Handle and manage both metadata and content for interactions
     - `findByHash(hash)`: Find an interaction by hash
 - `Studies`: Manage study-related data and operations
 - `Users`: Manage user-related data and operations
     - `getAuthenticatedUser()`: Get the current user information
     - `findByLogin(login)`: Find a user by login
     - `findByRole(role)`: Find users by role
 - `Workflows`: Manage workflow-related data and operations
 - `Authorization`: Functions related to authorization processes for the API

## Documentation

The API documentation is available in two formats:

- **[API Reference (GitHub Pages)](https://mediumroast.github.io/mediumroast_api/)**: Complete documentation hosted on GitHub Pages
- **[API Reference (Markdown)](api-docs.md)**: Documentation in Markdown format for in-repository viewing

## Testing
This project uses Vitest as its testing framework, to run the tests for the module, use: 

`npm run test`

## Development Setup
To set up the development environment for the module, you can clone the repository and install the dependencies:

```bash
git clone https://github.com/mediumroast/mediumroast_api.git
cd mediumroast_api
npm install # install dependencies
```

### Run the examples
To run the examples provided in the `examples` directory, you can use the following command:

```bash
# Run the device flow authentication example 1st to create a token
node examples/github-device-auth.js

# Run read operations to see if the token is working
node examples/github-read-operations.js
```

These examples are provided to demonstrate how to use the module to interact with the Mediumroast API and are focused on read operations and authentication initially.  The first example must be run first to prompt you for authentication and create a token which will be stored in `examples/config.ini`.  After that the second example can be run to demonstrate read operations for major entities.  **Note:** The examples assume access to a GitHub organization called `MegaRoast` which can be used for the purposes of testing of read operations. The examples will be updated as the module is developed to include Create, Update and Delete operations.

## Contribution
Contributions are welcome! Please fork the repository and submit a pull request with your changes. Ensure that your code adheres to the project's coding standards and includes appropriate tests.

## License
This project is licensed under the Apache-2.0 License. See the LICENSE file for more details.