/**
 * @fileoverview Utility functions for GitHub operations
 * @license Apache-2.0
 * @version 3.0.0
 */

/**
 * Encodes content for GitHub API
 * @param {String|Object} content - Content to encode
 * @returns {String} Base64 encoded content
 */
const encodeContent = (content) => {
  if (typeof content === 'object') {
    return Buffer.from(JSON.stringify(content)).toString('base64');
  }
  return Buffer.from(content || '').toString('base64');
};

/**
 * Decodes content from GitHub API
 * @param {String} content - Base64 encoded content
 * @returns {String} Decoded content
 */
const decodeContent = (content) => {
  return Buffer.from(content, 'base64').toString('utf-8');
};

/**
 * Safely decodes and parses JSON content
 * @param {String} content - Base64 encoded JSON content
 * @returns {Object} Parsed JSON object
 */
const decodeJsonContent = (content) => {
  try {
    return JSON.parse(decodeContent(content));
  } catch (err) {
    return null;
  }
};

/**
 * Custom URL encoding for special characters
 * @param {String} str - String to encode
 * @returns {String} Encoded string
 */
const customEncodeURIComponent = (str) => {
  return str.split('').map(char => {
    return encodeURIComponent(char).replace(/[!'()*]/g, (c) => {
      return '%' + c.charCodeAt(0).toString(16).toUpperCase();
    });
  }).join('');
};

export {
  encodeContent,
  decodeContent,
  decodeJsonContent,
  customEncodeURIComponent
};