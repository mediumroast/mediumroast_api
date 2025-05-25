# GitHub Device Authentication Tutorial

This tutorial explains how to use the GitHub device flow authentication with the Mediumroast API.

## Overview

GitHub's device flow authentication is ideal for:
- CLI applications
- Environments without direct browser access
- Applications that need to interact with GitHub APIs

The Mediumroast API provides built-in support for this authentication method.

## Prerequisites

Before using this authentication method, you'll need:

1. A GitHub account
2. A GitHub OAuth App:
   - Create one at [GitHub Developer Settings](https://github.com/settings/developers)
   - Note your Client ID (no secret needed for device flow)
   - Set callback URL to `http://localhost` (required but not used in device flow)

## Authentication Process

The device flow follows these steps:

1. Your application requests a device code from GitHub
2. GitHub returns a user code and verification URL
3. Your application displays these to the user and opens a browser
4. User enters the code on GitHub's website
5. Meanwhile, your application polls GitHub until authentication completes
6. Upon success, GitHub provides an access token

## Implementation

The [github-device-auth.js](./github-device-auth.js) example demonstrates a complete implementation:

```javascript
// Create GitHub Auth instance
const github = new GitHubAuth(env, environ, configFile, configExists);

// Start device flow authentication
const tokenData = await github.getAccessTokenDeviceFlow();

// Save the token for future use
const config = environ.readConfig(userConfigFile);
let result = environ.updateConfigSetting(config, 'GitHub', 'token', tokenData.token);
await result[1].write(userConfigFile);
```

## Configuration Management

The example shows how to manage configuration:

1. Read from existing config or use defaults
2. Update configuration with new authentication data
3. Save token securely for future sessions

## Using the Token

After authentication, you can use the token with the Mediumroast API:

```javascript
import { Companies, Studies } from 'mediumroast_api';

// Use the saved token
const config = new ConfigParser();
config.read('./config.ini');
const token = config.get('GitHub', 'token');
const org = config.get('GitHub', 'org');

// Create API instances
const companies = new Companies(token, org, 'my-process');
const studies = new Studies(token, org, 'my-process');

// Make API calls
const allCompanies = await companies.getAll();
```

## Security Considerations

When implementing authentication:

- Never commit tokens to source control
- Consider environment variables for sensitive values
- Implement token refresh logic for long-running applications
- Revoke tokens when no longer needed

## Troubleshooting

Common issues:

- **Invalid Client ID**: Verify your GitHub OAuth App configuration
- **Authorization Timeout**: Users have limited time to complete authorization
- **Rate Limiting**: GitHub API has request limits that may affect authentication
- **Scope Issues**: Permission errors may indicate insufficient OAuth scopes

## Complete Example

For the full implementation, refer to the [github-device-auth.js](./github-device-auth.js) example in this directory.