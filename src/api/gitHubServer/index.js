/**
 * Central export point for the GitHubServer API
 * @author Michael Hay <michael.hay@mediumroast.io>
 * @file index.js
 * @copyright 2024 Mediumroast, Inc. All rights reserved.
 * @license Apache-2.0
 * @version 3.0.0
 */

// Import all entity classes
import { Studies } from './entities/studies.js';
import { Companies } from './entities/companies.js';
import { Interactions } from './entities/interactions.js';
import { Users } from './entities/users.js';
import { Storage } from './entities/storage.js';
import { Actions } from './entities/actions.js';

// Re-export all entities
export { 
  Studies, 
  Companies, 
  Interactions, 
  Users, 
  Storage, 
  Actions 
};

// Export version information
export const VERSION = '3.0.0';

// Also export some utility classes if needed by external code
export { logger } from './logger.js';
export { CacheManager } from './cache.js';
export { validator } from './schema.js';