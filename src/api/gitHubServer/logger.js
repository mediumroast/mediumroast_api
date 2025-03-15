/**
 * Simple logger for GitHubServer
 */
export class Logger {
  constructor(options = {}) {
    this.options = {
      level: 'info', // debug, info, warn, error
      includeTimestamp: true,
      logToConsole: true,
      ...options
    };
        
    this.metrics = {
      operationCount: 0,
      errorCount: 0,
      transactionCount: 0,
      apiCallCount: 0,
      startTime: Date.now(),
      entityCounts: {}
    };
  }
    
  log(level, message, data = null) {
    if (this._shouldLog(level)) {
      const entry = this._formatLogEntry(level, message, data);
            
      if (this.options.logToConsole) {
        // eslint-disable-next-line no-console
        console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](entry);
      }
            
      return entry;
    }
  }
    
  debug(message, data = null) {
    return this.log('debug', message, data);
  }
    
  info(message, data = null) {
    return this.log('info', message, data);
  }
    
  warn(message, data = null) {
    return this.log('warn', message, data);
  }
    
  error(message, data = null) {
    this.metrics.errorCount++;
    return this.log('error', message, data);
  }
    
  trackOperation(entityType, operation) {
    this.metrics.operationCount++;
    this.metrics.entityCounts[entityType] = (this.metrics.entityCounts[entityType] || 0) + 1;
    this.debug(`Operation: ${operation} on ${entityType}`);
  }
    
  trackTransaction(name) {
    this.metrics.transactionCount++;
    this.info(`Transaction: ${name}`);
  }
    
  trackApiCall() {
    this.metrics.apiCallCount++;
  }
    
  getMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.startTime
    };
  }
    
  _shouldLog(level) {
    const levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
        
    return levels[level] >= levels[this.options.level];
  }
    
  _formatLogEntry(level, message, data) {
    let entry = '';
        
    if (this.options.includeTimestamp) {
      entry += `[${new Date().toISOString()}] `;
    }
        
    entry += `[${level.toUpperCase()}] ${message}`;
        
    if (data) {
      if (typeof data === 'string') {
        entry += ` - ${data}`;
      } else {
        try {
          entry += ` - ${JSON.stringify(data)}`;
        } catch (e) {
          entry += ' - [Complex Object]';
        }
      }
    }
        
    return entry;
  }
}

// Create singleton logger instance
export const logger = new Logger();