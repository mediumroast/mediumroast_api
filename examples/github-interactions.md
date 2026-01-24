# GitHub Interactions Example

This example demonstrates how to use the `Interactions` entity class to perform read operations against a GitHub organization, including the new fuzzy search functionality.

## Features Demonstrated

### 1. Basic Read Operations
- `getAll()` - Fetch all interactions
- `findByName()` - Find interactions by exact name match
- `findByX()` - Find interactions by any attribute

### 2. Fuzzy Search Operations
- Partial string matching with `findByName(name, true)`
- Fuzzy search with `findByX(attribute, value, null, true)`
- Comparison between exact and fuzzy search results
- Multi-attribute fuzzy searching

### 3. Analysis Operations
- Content type analysis
- File size statistics
- Reading time analysis
- Organization grouping
- Filtering by criteria (long-form content, recent interactions, linked companies)

### 4. Metadata Exploration
- Core metadata (content type, file size, reading time, word count)
- Geographic metadata (country, region, city, coordinates)
- Interaction type details
- Tags and topics analysis
- Linked entities (companies, studies)
- Temporal metadata (creation/modification dates)
- Access and permissions

### 5. Branch Status Operations
- Get branch status with `getBranchStatus()`
- Check for updates with `checkForUpdates()`
- Practical synchronization patterns

## Setup

1. Create a `config.ini` file in the examples directory:
   ```ini
   [GitHub]
   token = YOUR_GITHUB_TOKEN
   org = YOUR_ORGANIZATION_NAME
   ```

2. Ensure prerequisites are met:
   - Repository exists
   - Interactions container exists
   - Data is present in Interactions.json

## Usage

Run all operations:
```bash
node examples/github-interactions.js
```

Run specific operations:
```bash
node examples/github-interactions.js basic fuzzy analysis metadata branch
```

### Available Operations

- **basic** - Basic read operations (getAll, findByName)
- **fuzzy** - Fuzzy search demonstrations
- **analysis** - Interaction analysis and filtering
- **metadata** - Content type and metadata exploration
- **branch** - Branch status operations

## Example Output

The example will show:

1. **Prerequisite checks** - Verifies repository, container, and data exist
2. **Basic operations** - Demonstrates standard read operations
3. **Fuzzy search** - Shows fuzzy vs exact search comparisons
4. **Analysis** - Provides statistics and filtering examples
5. **Metadata** - Explores rich metadata structure
6. **Branch operations** - Shows synchronization patterns

## Fuzzy Search Examples

The example demonstrates several fuzzy search scenarios:

```javascript
// Find interactions containing "Confluence" in the name
const confluenceResults = await interactions.findByName('Confluence', true);

// Find interactions with "team" in the description
const teamResults = await interactions.findByX('description', 'team', null, true);

// Compare exact vs fuzzy search
const exactResults = await interactions.findByName('Product', false);
const fuzzyResults = await interactions.findByName('Product', true);
```

## Error Handling

The example includes comprehensive error handling and will:
- Check prerequisites before running operations
- Provide clear error messages
- Log issues for debugging
- Gracefully handle missing data

## Prerequisites

Before running this example, ensure:

1. **Repository exists** - Run `github-repository.js` first if needed
2. **Interactions container exists** - The container must be created
3. **Data is present** - The Interactions.json file must contain interaction data
4. **Valid credentials** - Your GitHub token must have proper permissions

The script automatically checks these prerequisites and provides guidance if any are missing.
