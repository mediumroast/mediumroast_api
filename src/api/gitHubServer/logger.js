/**
 * Logger module for the GitHubServer API
 * @file logger.js
 * @version 3.0.0
 * @author Michael Hay <michael.hay@mediumroast.io>
 * @copyright 2025 Mediumroast, Inc. All rights reserved.
 */

/* eslint-disable no-console */

// Define log levels and their priorities
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

// Get current log level from environment variable or default to 'info'
const getCurrentLogLevel = () => {
  const envLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
  return LOG_LEVELS[envLevel] !== undefined ? LOG_LEVELS[envLevel] : LOG_LEVELS.info;
};

// Create a logger with level-aware methods
export const logger = {
  debug: (...args) => {
    if (getCurrentLogLevel() <= LOG_LEVELS.debug) {
      console.debug(`[${new Date().toISOString()}] [DEBUG]`, ...args);
    }
  },
  
  info: (...args) => {
    if (getCurrentLogLevel() <= LOG_LEVELS.info) {
      console.info(`[${new Date().toISOString()}] [INFO]`, ...args);
    }
  },
  
  warn: (...args) => {
    if (getCurrentLogLevel() <= LOG_LEVELS.warn) {
      console.warn(`[${new Date().toISOString()}] [WARN]`, ...args);
    }
  },
  
  error: (...args) => {
    if (getCurrentLogLevel() <= LOG_LEVELS.error) {
      console.error(`[${new Date().toISOString()}] [ERROR]`, ...args);
    }
  },
  
  // Always return a tracker object with an end method
  trackOperation: (objType, operation) => {
    const startTime = Date.now();
    // Only log in debug mode
    logger.debug(`Starting operation: ${objType}.${operation}`);
    
    return {
      end: () => {
        const duration = Date.now() - startTime;
        logger.debug(`Completed operation: ${objType}.${operation} (${duration}ms)`);
      }
    };
  },
  
  // Similar for transaction tracking
  trackTransaction: (transactionName) => {
    const startTime = Date.now();
    logger.debug(`Starting transaction: ${transactionName}`);
    
    return {
      end: () => {
        const duration = Date.now() - startTime;
        logger.debug(`Completed transaction: ${transactionName} (${duration}ms)`);
      }
    };
  }
};