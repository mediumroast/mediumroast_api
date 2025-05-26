## Modules

<dl>
<dt><a href="#module_GitHubAuth">GitHubAuth</a></dt>
<dd><p>authorize.js</p>
</dd>
<dt><a href="#module_GitHubFunctions">GitHubFunctions</a></dt>
<dd><p>github.js</p>
</dd>
<dt><a href="#api/gitHubServer.module_js">api/gitHubServer.js</a></dt>
<dd><p>gitHubServer.js</p>
</dd>
</dl>

<a name="module_GitHubAuth"></a>

## GitHubAuth
authorize.js

**Requires**: <code>module:open</code>, <code>module:octoDevAuth</code>, <code>module:chalk</code>, <code>module:cli-table3</code>  
**Version**: 3.0.0  
**Author**: Michael Hay <michael.hay@mediumroast.io>  
**License**: Apache-2.0  
**Copyright**: 2025 Mediumroast, Inc. All rights reserved.  
**Example**  
```js
import {GitHubAuth} from './api/authorize.js'
const github = new GitHubAuth(env, environ, configFile)
const githubToken = github.verifyAccessToken()
```

* [GitHubAuth](#module_GitHubAuth)
    * [~GitHubAuth](#module_GitHubAuth..GitHubAuth)
        * [new GitHubAuth(env, environ, configFile, configExists)](#new_module_GitHubAuth..GitHubAuth_new)
        * [.verifyGitHubSection()](#module_GitHubAuth..GitHubAuth+verifyGitHubSection) ⇒ <code>Boolean</code>
        * [.getAccessTokenFromConfig()](#module_GitHubAuth..GitHubAuth+getAccessTokenFromConfig) ⇒ <code>String</code> \| <code>null</code>
        * [.getAuthTypeFromConfig()](#module_GitHubAuth..GitHubAuth+getAuthTypeFromConfig) ⇒ <code>String</code> \| <code>null</code>
        * [.checkTokenExpiration(token)](#module_GitHubAuth..GitHubAuth+checkTokenExpiration) ⇒ <code>Array</code>
        * [.getAccessTokenDeviceFlow()](#module_GitHubAuth..GitHubAuth+getAccessTokenDeviceFlow) ⇒ <code>Object</code>
        * [.verifyAccessToken(saveToConfig)](#module_GitHubAuth..GitHubAuth+verifyAccessToken) ⇒ <code>Array</code>

<a name="module_GitHubAuth..GitHubAuth"></a>

### GitHubAuth~GitHubAuth
**Kind**: inner class of [<code>GitHubAuth</code>](#module_GitHubAuth)  

* [~GitHubAuth](#module_GitHubAuth..GitHubAuth)
    * [new GitHubAuth(env, environ, configFile, configExists)](#new_module_GitHubAuth..GitHubAuth_new)
    * [.verifyGitHubSection()](#module_GitHubAuth..GitHubAuth+verifyGitHubSection) ⇒ <code>Boolean</code>
    * [.getAccessTokenFromConfig()](#module_GitHubAuth..GitHubAuth+getAccessTokenFromConfig) ⇒ <code>String</code> \| <code>null</code>
    * [.getAuthTypeFromConfig()](#module_GitHubAuth..GitHubAuth+getAuthTypeFromConfig) ⇒ <code>String</code> \| <code>null</code>
    * [.checkTokenExpiration(token)](#module_GitHubAuth..GitHubAuth+checkTokenExpiration) ⇒ <code>Array</code>
    * [.getAccessTokenDeviceFlow()](#module_GitHubAuth..GitHubAuth+getAccessTokenDeviceFlow) ⇒ <code>Object</code>
    * [.verifyAccessToken(saveToConfig)](#module_GitHubAuth..GitHubAuth+verifyAccessToken) ⇒ <code>Array</code>

<a name="new_module_GitHubAuth..GitHubAuth_new"></a>

#### new GitHubAuth(env, environ, configFile, configExists)

| Param | Type | Description |
| --- | --- | --- |
| env | <code>Object</code> | The environment object |
| environ | <code>Object</code> | The environmentals object |
| configFile | <code>String</code> | The configuration file path |
| configExists | <code>Boolean</code> | Whether the configuration file exists |

<a name="module_GitHubAuth..GitHubAuth+verifyGitHubSection"></a>

#### gitHubAuth.verifyGitHubSection() ⇒ <code>Boolean</code>
Verifies if the GitHub section exists in the configuration

**Kind**: instance method of [<code>GitHubAuth</code>](#module_GitHubAuth..GitHubAuth)  
**Returns**: <code>Boolean</code> - True if the GitHub section exists, otherwise false  
<a name="module_GitHubAuth..GitHubAuth+getAccessTokenFromConfig"></a>

#### gitHubAuth.getAccessTokenFromConfig() ⇒ <code>String</code> \| <code>null</code>
Gets the access token from the configuration file

**Kind**: instance method of [<code>GitHubAuth</code>](#module_GitHubAuth..GitHubAuth)  
**Returns**: <code>String</code> \| <code>null</code> - The access token or null if not found  
<a name="module_GitHubAuth..GitHubAuth+getAuthTypeFromConfig"></a>

#### gitHubAuth.getAuthTypeFromConfig() ⇒ <code>String</code> \| <code>null</code>
Gets the authentication type from the configuration file

**Kind**: instance method of [<code>GitHubAuth</code>](#module_GitHubAuth..GitHubAuth)  
**Returns**: <code>String</code> \| <code>null</code> - The authentication type or null if not found  
<a name="module_GitHubAuth..GitHubAuth+checkTokenExpiration"></a>

#### gitHubAuth.checkTokenExpiration(token) ⇒ <code>Array</code>
Checks if a GitHub token is valid and not expired

**Kind**: instance method of [<code>GitHubAuth</code>](#module_GitHubAuth..GitHubAuth)  
**Returns**: <code>Array</code> - [isValid, statusObject, userData]  

| Param | Type | Description |
| --- | --- | --- |
| token | <code>String</code> | The GitHub token to check |

<a name="module_GitHubAuth..GitHubAuth+getAccessTokenDeviceFlow"></a>

#### gitHubAuth.getAccessTokenDeviceFlow() ⇒ <code>Object</code>
Gets an access token using the GitHub device flow

**Kind**: instance method of [<code>GitHubAuth</code>](#module_GitHubAuth..GitHubAuth)  
**Returns**: <code>Object</code> - The access token object  
<a name="module_GitHubAuth..GitHubAuth+verifyAccessToken"></a>

#### gitHubAuth.verifyAccessToken(saveToConfig) ⇒ <code>Array</code>
Verifies if the access token is valid and gets a new one if needed

**Kind**: instance method of [<code>GitHubAuth</code>](#module_GitHubAuth..GitHubAuth)  
**Returns**: <code>Array</code> - [success, statusObject, tokenData]  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| saveToConfig | <code>Boolean</code> | <code>true</code> | Whether to save to the configuration file, default is true |

<a name="module_GitHubFunctions"></a>

## GitHubFunctions
github.js

**Requires**: <code>module:octokit</code>  
**Version**: 3.0.0  
**Author**: Michael Hay <michael.hay@mediumroast.io>  
**License**: Apache-2.0  
**Copyright**: 2025 Mediumroast, Inc. All rights reserved.  
**Example**  
```js
const gitHubCtl = new GitHubFunctions(accessToken, myOrgName, 'mr-cli-setup')
const createRepoResp = await gitHubCtl.createRepository()
```

* [GitHubFunctions](#module_GitHubFunctions)
    * [~getUser()](#module_GitHubFunctions..getUser) ⇒ <code>Array</code>
    * [~getAllUsers()](#module_GitHubFunctions..getAllUsers) ⇒ <code>Array</code>
    * [~getActionsBillings()](#module_GitHubFunctions..getActionsBillings) ⇒ <code>Array</code>
    * [~getStorageBillings()](#module_GitHubFunctions..getStorageBillings) ⇒ <code>Array</code>
    * [~createRepository()](#module_GitHubFunctions..createRepository) ⇒ <code>Array</code>
    * [~getGitHubOrg()](#module_GitHubFunctions..getGitHubOrg) ⇒ <code>Array</code>
    * [~getWorkflowRuns()](#module_GitHubFunctions..getWorkflowRuns) ⇒ <code>Array</code>
    * [~getRepoSize()](#module_GitHubFunctions..getRepoSize) ⇒ <code>Array</code>
    * [~createContainers()](#module_GitHubFunctions..createContainers) ⇒ <code>Array</code>
    * [~createBranchFromMain()](#module_GitHubFunctions..createBranchFromMain) ⇒ <code>Promise.&lt;Array&gt;</code>
    * [~mergeBranchToMain(branchName, mySha, [commitDescription])](#module_GitHubFunctions..mergeBranchToMain) ⇒ <code>Promise.&lt;Array&gt;</code>
    * [~checkForLock(containerName)](#module_GitHubFunctions..checkForLock) ⇒ <code>Promise.&lt;Array&gt;</code>
    * [~lockContainer(containerName)](#module_GitHubFunctions..lockContainer) ⇒ <code>Promise.&lt;Array&gt;</code>
    * [~unlockContainer(containerName, commitSha, branchName)](#module_GitHubFunctions..unlockContainer) ⇒ <code>Promise.&lt;Array&gt;</code>
    * [~writeObject(containerName, obj, ref, mySha)](#module_GitHubFunctions..writeObject) ⇒ <code>Promise.&lt;Array&gt;</code>
    * [~readObjects(containerName)](#module_GitHubFunctions..readObjects) ⇒ <code>Promise.&lt;Array&gt;</code>
    * [~updateObject(containerName, objName, key, value, [dontWrite], [system], [whiteList])](#module_GitHubFunctions..updateObject) ⇒ <code>Promise.&lt;Array&gt;</code>
    * [~deleteObject(objName, source, repoMetadata, catchIt)](#module_GitHubFunctions..deleteObject) ⇒ <code>Promise.&lt;Array&gt;</code>
    * [~catchContainer(repoMetadata)](#module_GitHubFunctions..catchContainer) ⇒ <code>Promise.&lt;Array&gt;</code>
    * [~releaseContainer(repoMetadata)](#module_GitHubFunctions..releaseContainer) ⇒ <code>Promise.&lt;Array&gt;</code>

<a name="module_GitHubFunctions..getUser"></a>

### GitHubFunctions~getUser() ⇒ <code>Array</code>
Gets the authenticated user from the GitHub API

**Kind**: inner method of [<code>GitHubFunctions</code>](#module_GitHubFunctions)  
**Returns**: <code>Array</code> - An array with position 0 being boolean to signify success/failure and position 1 being the user info or error message.  
<a name="module_GitHubFunctions..getAllUsers"></a>

### GitHubFunctions~getAllUsers() ⇒ <code>Array</code>
Gets all of the users from the GitHub API

**Kind**: inner method of [<code>GitHubFunctions</code>](#module_GitHubFunctions)  
**Returns**: <code>Array</code> - An array with position 0 being boolean to signify success/failure and position 1 being the user info or error message.  
<a name="module_GitHubFunctions..getActionsBillings"></a>

### GitHubFunctions~getActionsBillings() ⇒ <code>Array</code>
Gets the complete billing status for actions from the GitHub API

**Kind**: inner method of [<code>GitHubFunctions</code>](#module_GitHubFunctions)  
**Returns**: <code>Array</code> - An array with position 0 being boolean to signify success/failure and position 1 being the user info or error message.  
<a name="module_GitHubFunctions..getStorageBillings"></a>

### GitHubFunctions~getStorageBillings() ⇒ <code>Array</code>
Gets the complete billing status for actions from the GitHub API

**Kind**: inner method of [<code>GitHubFunctions</code>](#module_GitHubFunctions)  
**Returns**: <code>Array</code> - An array with position 0 being boolean to signify success/failure and position 1 being the user info or error message.  
<a name="module_GitHubFunctions..createRepository"></a>

### GitHubFunctions~createRepository() ⇒ <code>Array</code>
Creates a repository, at the organization level, for keeping track of all mediumroast.io assets

**Kind**: inner method of [<code>GitHubFunctions</code>](#module_GitHubFunctions)  
**Returns**: <code>Array</code> - An array with position 0 being boolean to signify success/failure and position 1 being the created repo or error message.  
<a name="module_GitHubFunctions..getGitHubOrg"></a>

### GitHubFunctions~getGitHubOrg() ⇒ <code>Array</code>
If the GitHub organization exists retrieves the detail about it and returns to the caller

**Kind**: inner method of [<code>GitHubFunctions</code>](#module_GitHubFunctions)  
**Returns**: <code>Array</code> - An array with position 0 being boolean to signify success/failure and position 1 being the org or error message.  
<a name="module_GitHubFunctions..getWorkflowRuns"></a>

### GitHubFunctions~getWorkflowRuns() ⇒ <code>Array</code>
Gets all of the workflow runs for the repository

**Kind**: inner method of [<code>GitHubFunctions</code>](#module_GitHubFunctions)  
**Returns**: <code>Array</code> - An array with position 0 being boolean to signify success/failure and position 1 being the response or error message.  
<a name="module_GitHubFunctions..getRepoSize"></a>

### GitHubFunctions~getRepoSize() ⇒ <code>Array</code>
Gets the size of the repository in MB

**Kind**: inner method of [<code>GitHubFunctions</code>](#module_GitHubFunctions)  
**Returns**: <code>Array</code> - An array with position 0 being boolean to signify success/failure and position 1 being the response or error message.  
<a name="module_GitHubFunctions..createContainers"></a>

### GitHubFunctions~createContainers() ⇒ <code>Array</code>
Creates the top level Study, Company and Interaction containers for all mediumroast.io assets

**Kind**: inner method of [<code>GitHubFunctions</code>](#module_GitHubFunctions)  
**Returns**: <code>Array</code> - An array with position 0 being boolean to signify success/failure and position 1 being the responses or error messages.  
<a name="module_GitHubFunctions..createBranchFromMain"></a>

### GitHubFunctions~createBranchFromMain() ⇒ <code>Promise.&lt;Array&gt;</code>
Creates a new branch from the main branch.

**Kind**: inner method of [<code>GitHubFunctions</code>](#module_GitHubFunctions)  
**Returns**: <code>Promise.&lt;Array&gt;</code> - A promise that resolves to an array containing a boolean indicating success, a message, and the response.  
<a name="module_GitHubFunctions..mergeBranchToMain"></a>

### GitHubFunctions~mergeBranchToMain(branchName, mySha, [commitDescription]) ⇒ <code>Promise.&lt;Array&gt;</code>
Merges a specified branch into the main branch by creating a pull request.

**Kind**: inner method of [<code>GitHubFunctions</code>](#module_GitHubFunctions)  
**Returns**: <code>Promise.&lt;Array&gt;</code> - A promise that resolves to an array containing success status, message, and response.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| branchName | <code>string</code> |  | The name of the branch to merge into main. |
| mySha | <code>string</code> |  | The SHA of the commit to use as the head of the pull request. |
| [commitDescription] | <code>string</code> | <code>&quot;&#x27;Performed CRUD operation on objects.&#x27;&quot;</code> | The description of the commit. |

<a name="module_GitHubFunctions..checkForLock"></a>

### GitHubFunctions~checkForLock(containerName) ⇒ <code>Promise.&lt;Array&gt;</code>
Checks to see if a container is locked.

**Kind**: inner method of [<code>GitHubFunctions</code>](#module_GitHubFunctions)  
**Returns**: <code>Promise.&lt;Array&gt;</code> - A promise that resolves to an array containing status and message.  

| Param | Type | Description |
| --- | --- | --- |
| containerName | <code>string</code> | The name of the container to check for a lock. |

<a name="module_GitHubFunctions..lockContainer"></a>

### GitHubFunctions~lockContainer(containerName) ⇒ <code>Promise.&lt;Array&gt;</code>
Locks a container by creating a lock file in the container.

**Kind**: inner method of [<code>GitHubFunctions</code>](#module_GitHubFunctions)  
**Returns**: <code>Promise.&lt;Array&gt;</code> - A promise that resolves to an array containing status and message.  

| Param | Type | Description |
| --- | --- | --- |
| containerName | <code>string</code> | The name of the container to lock. |

<a name="module_GitHubFunctions..unlockContainer"></a>

### GitHubFunctions~unlockContainer(containerName, commitSha, branchName) ⇒ <code>Promise.&lt;Array&gt;</code>
Unlocks a container by deleting the lock file in the container.

**Kind**: inner method of [<code>GitHubFunctions</code>](#module_GitHubFunctions)  
**Returns**: <code>Promise.&lt;Array&gt;</code> - A promise that resolves to an array containing status and message.  

| Param | Type | Description |
| --- | --- | --- |
| containerName | <code>string</code> | The name of the container to unlock. |
| commitSha | <code>string</code> | The SHA of the commit to use as the head of the pull request. |
| branchName | <code>string</code> | The name of the branch to unlock the container on. |

<a name="module_GitHubFunctions..writeObject"></a>

### GitHubFunctions~writeObject(containerName, obj, ref, mySha) ⇒ <code>Promise.&lt;Array&gt;</code>
Writes an object to a specified container using the GitHub API.

**Kind**: inner method of [<code>GitHubFunctions</code>](#module_GitHubFunctions)  
**Returns**: <code>Promise.&lt;Array&gt;</code> - Status, message, and response  

| Param | Type | Description |
| --- | --- | --- |
| containerName | <code>string</code> | The name of the container to write the object to. |
| obj | <code>object</code> | The object to write to the container. |
| ref | <code>string</code> | The reference to use when writing the object. |
| mySha | <code>string</code> | The SHA of the current file if updating. |

<a name="module_GitHubFunctions..readObjects"></a>

### GitHubFunctions~readObjects(containerName) ⇒ <code>Promise.&lt;Array&gt;</code>
Reads objects from a specified container using the GitHub API.

**Kind**: inner method of [<code>GitHubFunctions</code>](#module_GitHubFunctions)  
**Returns**: <code>Promise.&lt;Array&gt;</code> - Status, message, and contents  

| Param | Type | Description |
| --- | --- | --- |
| containerName | <code>string</code> | The name of the container to read objects from. |

<a name="module_GitHubFunctions..updateObject"></a>

### GitHubFunctions~updateObject(containerName, objName, key, value, [dontWrite], [system], [whiteList]) ⇒ <code>Promise.&lt;Array&gt;</code>
Updates an object in a specified container

**Kind**: inner method of [<code>GitHubFunctions</code>](#module_GitHubFunctions)  
**Returns**: <code>Promise.&lt;Array&gt;</code> - Status, message, and response  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| containerName | <code>string</code> |  | The name of the container containing the object |
| objName | <code>string</code> |  | The name of the object to update |
| key | <code>string</code> |  | The key of the object to update |
| value | <code>string</code> |  | The value to update the key with |
| [dontWrite] | <code>boolean</code> | <code>false</code> | A flag to indicate if the object should be written back |
| [system] | <code>boolean</code> | <code>false</code> | A flag to indicate if the update is a system call |
| [whiteList] | <code>Array</code> | <code>[]</code> | A list of keys that are allowed to be updated |

<a name="module_GitHubFunctions..deleteObject"></a>

### GitHubFunctions~deleteObject(objName, source, repoMetadata, catchIt) ⇒ <code>Promise.&lt;Array&gt;</code>
Deletes an object from a specified container

**Kind**: inner method of [<code>GitHubFunctions</code>](#module_GitHubFunctions)  
**Returns**: <code>Promise.&lt;Array&gt;</code> - Status, message, and response  

| Param | Type | Description |
| --- | --- | --- |
| objName | <code>string</code> | The name of the object to delete |
| source | <code>object</code> | The source object that contains the from and to containers |
| repoMetadata | <code>object</code> | The repository metadata |
| catchIt | <code>boolean</code> | Whether to catch the container |

<a name="module_GitHubFunctions..catchContainer"></a>

### GitHubFunctions~catchContainer(repoMetadata) ⇒ <code>Promise.&lt;Array&gt;</code>
Catches a container by locking it, creating a new branch, reading the objects

**Kind**: inner method of [<code>GitHubFunctions</code>](#module_GitHubFunctions)  
**Returns**: <code>Promise.&lt;Array&gt;</code> - Status, message, and metadata  

| Param | Type | Description |
| --- | --- | --- |
| repoMetadata | <code>Object</code> | The metadata object |

<a name="module_GitHubFunctions..releaseContainer"></a>

### GitHubFunctions~releaseContainer(repoMetadata) ⇒ <code>Promise.&lt;Array&gt;</code>
Releases a container by unlocking it and merging the branch

**Kind**: inner method of [<code>GitHubFunctions</code>](#module_GitHubFunctions)  
**Returns**: <code>Promise.&lt;Array&gt;</code> - Status, message, and response  

| Param | Type | Description |
| --- | --- | --- |
| repoMetadata | <code>Object</code> | The metadata object |

<a name="api/gitHubServer.module_js"></a>

## api/gitHubServer.js
gitHubServer.js

**Version**: 3.0.0  
**Author**: Michael Hay <michael.hay@mediumroast.io>  
**License**: Apache-2.0  
**Copyright**: 2025 Mediumroast, Inc. All rights reserved.  
