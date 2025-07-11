/**
 * Utility functions for formatting API responses and console output
 * @file formatting.js
 * @license Apache-2.0
 * @author Michael Hay <michael.hay@mediumroast.io>
 * @copyright 2025 Mediumroast, Inc. All rights reserved.
 */

/* eslint-disable no-console */

// Formatting constants
export const SUCCESS_PREFIX = '✅ ';
export const ERROR_PREFIX = '❌ ';
export const WARNING_PREFIX = '⚠️ ';
export const INFO_PREFIX = '📋 ';
export const SECTION_DIVIDER = '='.repeat(80);

/**
 * Formats and logs API operation results
 * @param {string} operationName - Name of the operation
 * @param {Array} result - Result array [success, message, data]
 * @param {Object} options - Formatting options
 * @param {boolean} [options.showData=true] - Whether to display full data object
 * @param {boolean} [options.suppressConsole=false] - Suppress console output
 * @param {number} [options.maxDataLength=1000] - Maximum length for data display
 * @returns {string} Formatted result string
 */
export function formatResult(operationName, result, options = {}) {
  const {
    showData = true,
    suppressConsole = false,
    maxDataLength = 1000
  } = options;

  const [success, message, data] = result;
  const prefix = success ? SUCCESS_PREFIX : ERROR_PREFIX;
  
  const lines = [
    `${prefix} ${operationName}:`,
    `Status: ${success ? 'Success' : 'Failed'}`,
    `Message: ${message?.status_msg || message}`
  ];
  
  if (data && showData) {
    const dataStr = JSON.stringify(data, null, 2);
    if (dataStr.length > maxDataLength) {
      lines.push(`Data: ${dataStr.substring(0, maxDataLength)}... (truncated)`);
    } else {
      lines.push(`Data: ${dataStr}`);
    }
  }
  
  const formattedResult = lines.join('\n');
  
  if (!suppressConsole) {
    console.log('\n' + formattedResult);
  }
  
  return formattedResult;
}

/**
 * Formats installation status for display
 * @param {Object} status - Installation status object
 * @param {Object} options - Formatting options
 * @param {boolean} [options.suppressConsole=false] - Suppress console output
 * @returns {string} Formatted status string
 */
export function formatInstallationStatus(status, options = {}) {
  const { suppressConsole = false } = options;
  
  const lines = [];
  
  if (status.installed) {
    lines.push(`${SUCCESS_PREFIX} Actions installation found:`);
    lines.push(`  Version: ${status.version}`);
    lines.push(`  Workflows: ${status.workflows.join(', ')}`);
    lines.push(`  Version file exists: ${status.versionFileExists ? 'Yes' : 'No'}`);
    lines.push('  Directories:');
    lines.push(`    .github: ${status.directories.github ? 'Yes' : 'No'}`);
    lines.push(`    .github/workflows: ${status.directories.workflows ? 'Yes' : 'No'}`);
    lines.push(`    .github/actions: ${status.directories.actions ? 'Yes' : 'No'}`);
  } else {
    lines.push(`${INFO_PREFIX} No Actions installation found.`);
    if (status.error) {
      lines.push(`${ERROR_PREFIX} Error: ${status.error}`);
    }
  }
  
  const formattedStatus = lines.join('\n');
  
  if (!suppressConsole) {
    console.log('\n' + formattedStatus);
  }
  
  return formattedStatus;
}

/**
 * Formats workflow statistics for display
 * @param {Array} workflowRuns - Array of workflow run objects
 * @param {Object} options - Formatting options
 * @param {boolean} [options.suppressConsole=false] - Suppress console output
 * @returns {string} Formatted statistics string
 */
export function formatWorkflowStats(workflowRuns, options = {}) {
  const { suppressConsole = false } = options;
  
  if (!workflowRuns || workflowRuns.length === 0) {
    const message = `${WARNING_PREFIX} No workflow runs found.`;
    if (!suppressConsole) {
      console.log('\n' + message);
    }
    return message;
  }
  
  const lines = [`${SUCCESS_PREFIX} Found ${workflowRuns.length} workflow runs`];
  
  // Group runs by workflow
  const workflowStats = {};
  workflowRuns.forEach(run => {
    const name = run.name || 'Unknown';
    if (!workflowStats[name]) {
      workflowStats[name] = { total: 0, success: 0, failure: 0, other: 0 };
    }
    workflowStats[name].total++;
    if (run.conclusion === 'success') {
      workflowStats[name].success++;
    } else if (run.conclusion === 'failure') {
      workflowStats[name].failure++;
    } else {
      workflowStats[name].other++;
    }
  });
  
  // Format stats
  lines.push('\n📈 Workflow run statistics:');
  Object.entries(workflowStats).forEach(([name, stats]) => {
    lines.push(`  ${name}:`);
    lines.push(`    Total runs: ${stats.total}`);
    lines.push(`    Success: ${stats.success} (${((stats.success / stats.total) * 100).toFixed(1)}%)`);
    lines.push(`    Failure: ${stats.failure} (${((stats.failure / stats.total) * 100).toFixed(1)}%)`);
    lines.push(`    Other: ${stats.other} (${((stats.other / stats.total) * 100).toFixed(1)}%)`);
  });
  
  const formattedStats = lines.join('\n');
  
  if (!suppressConsole) {
    console.log('\n' + formattedStats);
  }
  
  return formattedStats;
}

/**
 * Formats section headers for CLI output
 * @param {string} title - Section title
 * @param {Object} options - Formatting options
 * @param {boolean} [options.suppressConsole=false] - Suppress console output
 * @returns {string} Formatted section header
 */
export function formatSectionHeader(title, options = {}) {
  const { suppressConsole = false } = options;
  
  const lines = [
    SECTION_DIVIDER,
    title,
    SECTION_DIVIDER
  ];
  
  const formattedHeader = lines.join('\n');
  
  if (!suppressConsole) {
    console.log('\n' + formattedHeader);
  }
  
  return formattedHeader;
}

/**
 * Formats update information for display
 * @param {Object} updateInfo - Update information object
 * @param {Object} options - Formatting options
 * @param {boolean} [options.suppressConsole=false] - Suppress console output
 * @returns {string} Formatted update information
 */
export function formatUpdateInfo(updateInfo, options = {}) {
  const { suppressConsole = false } = options;
  
  const lines = [];
  
  if (updateInfo.update_available) {
    lines.push(`${WARNING_PREFIX} Update available!`);
    lines.push(`Current version: ${updateInfo.current_version}`);
    lines.push(`Latest version: ${updateInfo.latest_version}`);
  } else {
    lines.push(`${SUCCESS_PREFIX} You are running the latest version: ${updateInfo.current_version}`);
  }
  
  const formattedInfo = lines.join('\n');
  
  if (!suppressConsole) {
    console.log('\n' + formattedInfo);
  }
  
  return formattedInfo;
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use formatResult instead
 */
export function logResult(operationName, result, showData = true) {
  return formatResult(operationName, result, { showData });
}
