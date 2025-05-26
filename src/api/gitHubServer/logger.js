/**
 * Logger module for the GitHubServer API
 * @file logger.js
 * @version 3.0.0
 * @author Michael Hay <michael.hay@mediumroast.io>
 * @copyright 2025 Mediumroast, Inc. All rights reserved.
 */

/* eslint-disable no-console */

// Create a logger with sensible defaults
export const logger = {
  debug: (...args) => console.debug(`[${new Date().toISOString()}] [DEBUG]`, ...args),
  info: (...args) => console.info(`[${new Date().toISOString()}] [INFO]`, ...args),
  warn: (...args) => console.warn(`[${new Date().toISOString()}] [WARN]`, ...args),
  error: (...args) => console.error(`[${new Date().toISOString()}] [ERROR]`, ...args),
  
  // Always return a tracker object with an end method
  trackOperation: (objType, operation) => {
    const startTime = Date.now();
    // Only log in debug mode to avoid cluttering the console
    if (process.env.DEBUG) {
      console.debug(`[${new Date().toISOString()}] Starting operation: ${objType}.${operation}`);
    }
    
    return {
      end: () => {
        if (process.env.DEBUG) {
          const duration = Date.now() - startTime;
          console.debug(`[${new Date().toISOString()}] Completed operation: ${objType}.${operation} (${duration}ms)`);
        }
      }
    };
  },
  
  // Similar for transaction tracking
  trackTransaction: (transactionName) => {
    const startTime = Date.now();
    if (process.env.DEBUG) {
      console.debug(`[${new Date().toISOString()}] Starting transaction: ${transactionName}`);
    }
    
    return {
      end: () => {
        if (process.env.DEBUG) {
          const duration = Date.now() - startTime;
          console.debug(`[${new Date().toISOString()}] Completed transaction: ${transactionName} (${duration}ms)`);
        }
      }
    };
  }
};