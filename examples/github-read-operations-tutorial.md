# Mediumroast API Read Operations

This tutorial demonstrates how to use the read operations in the Mediumroast API to fetch and interact with different types of data stored in GitHub repositories.

## Overview

The Mediumroast API provides access to several entity types stored in GitHub repositories:

- **Studies**: Research and analysis documents
- **Companies**: Organization profiles
- **Interactions**: Communication and engagement records
- **Users**: User account information

This tutorial shows how to retrieve and work with these entities using the API's read operations.

## Prerequisites

Before using the read operations, you'll need:

1. A GitHub access token with appropriate permissions
2. The name of your GitHub organization
3. A process name (typically the name of your project)

## Configuration Setup

Create a `config.ini` file with your GitHub credentials:

```ini
[GitHub]
token = your_github_token
org = your_organization_name
```

## Basic Usage Pattern

All entity types follow the same usage pattern:

```javascript
import { Studies, Companies, Interactions, Users } from 'mediumroast_api';

// Initialize with your credentials
const studies = new Studies(token, org, 'your-process-name');
const companies = new Companies(token, org, 'your-process-name');

// Fetch all items
const [success, message, data] = await studies.getAll();

// Find specific items
const study = await studies.findByName('Study Name');
```

## Working with Studies

Studies represent research documents or analysis projects:

```javascript
const studies = new Studies(token, org, 'your-process-name');

// Get all studies
const allStudies = await studies.getAll();
if (allStudies[0]) {
  console.log(`Found ${allStudies[2].mrJson.length} studies`);
  
  // Access individual studies
  const firstStudy = allStudies[2].mrJson[0];
  console.log(`First study: ${firstStudy.name}`);
}

// Find a specific study
const studyByName = await studies.findByName('Market Analysis 2024');
if (studyByName[0]) {
  const study = studyByName[2];
  console.log(`Found study: ${study.name}`);
}
```

## Working with Companies

Companies represent organization profiles:

```javascript
const companies = new Companies(token, org, 'your-process-name');

// Get all companies
const allCompanies = await companies.getAll();
if (allCompanies[0]) {
  console.log(`Found ${allCompanies[2].mrJson.length} companies`);
}

// Find a company by name
const companyByName = await companies.findByName('Acme Corp');
```

## Working with Interactions

Interactions track communications and engagements:

```javascript
const interactions = new Interactions(token, org, 'your-process-name');

// Get all interactions
const allInteractions = await interactions.getAll();

// Find an interaction by name
const interactionByName = await interactions.findByName('Q1 Customer Meeting');
```

## Working with Users

The Users module lets you access user information:

```javascript
const users = new Users(token, org, 'your-process-name');

// Get all users
const allUsers = await users.getAll();

// Get current authenticated user
const currentUser = await users.getAuthenticatedUser();
console.log(`Logged in as: ${currentUser[2].login}`);
```

## Repository Change Detection

A powerful feature of the API is the ability to detect changes in the underlying repositories:

```javascript
const studies = new Studies(token, org, 'your-process-name');

// Get current branch status
const branchStatus = await studies.getBranchStatus('main', `${org}_discovery`);
const currentSha = branchStatus[2].sha;

// Check if updates are needed
const updateCheck = await studies.checkForUpdates(
  localStorage.getItem('lastKnownSha'), 
  'main', 
  `${org}_discovery`
);

if (updateCheck[2].updateNeeded) {
  console.log('Updates available - fetching new data');
  // Fetch new data and update local storage
  localStorage.setItem('lastKnownSha', updateCheck[2].currentCommitSha);
} else {
  console.log('No updates needed - using cached data');
}
```

## Client-Side Implementation

Here's a practical example of how you might implement data synchronization in a client application:

```javascript
async function synchronizeData(clientSha = null) {
  // Get cached SHA or use provided one
  let commitSha = clientSha || localStorage.getItem('lastCommitSha');
  
  // Check if updates are needed
  const updateCheck = await api.checkForUpdates(
    commitSha, 
    'main', 
    `${org}_discovery`
  );
  
  if (updateCheck[2].updateNeeded) {
    console.log('Repository has changed, downloading latest data...');
    
    // Fetch the latest data
    const latestData = await api.getAll();
    
    // Save the new data and SHA
    localStorage.setItem('lastCommitSha', updateCheck[2].currentCommitSha);
    localStorage.setItem('cachedData', JSON.stringify(latestData[2]));
    
    return latestData[2];
  } else {
    console.log('Using cached data - no updates needed');
    return JSON.parse(localStorage.getItem('cachedData'));
  }
}
```

## Response Format

All API methods return responses in a standardized format:

```javascript
[
  success,  // Boolean indicating success or failure
  message,  // String message describing the result
  data      // The requested data or null on failure
]
```

This consistent format makes error handling straightforward:

```javascript
const [success, message, data] = await studies.getAll();
if (success) {
  // Process data
  console.log(`Found ${data.mrJson.length} studies`);
} else {
  // Handle error
  console.error(`Error: ${message}`);
}
```

## Complete Example

For a complete working implementation with all entity types, refer to the [github-read-operations.js](./github-read-operations.js) example in this directory.