/**
 * A class for authenticating and talking to the mediumroast.io backend 
 * @author Michael Hay <michael.hay@mediumroast.io>
 * @copyright 2024 Mediumroast, Inc. All rights reserved.
 * @license Apache-2.0
 * @version 3.0.0
 * 
 * @exports {Studies, Companies, Interactions, Users, Storage, Actions}
 */

// Import entity classes
import { Studies } from './entities/studies.js';
import { Companies } from './entities/companies.js';
import { Interactions } from './entities/interactions.js';
import { Users } from './entities/users.js';
import { Storage } from './entities/storage.js';
import { Actions } from './entities/actions.js';

// Export classes for consumers
export { Studies, Companies, Interactions, Users, Storage, Actions };