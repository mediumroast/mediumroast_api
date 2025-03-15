/**
 * @fileoverview Factory for creating standardized API responses
 * @license Apache-2.0
 * @version 3.0.0
 */

/**
 * Creates standardized API responses for GitHub operations
 */
class ResponseFactory {
  /**
   * Creates a success response
   * @param {String} message - Success message
   * @param {*} data - Response data
   * @param {Number} code - HTTP status code
   * @returns {Array} [true, {status_code, status_msg}, data]
   */
  static success(message, data = null, code = 200) {
    return [true, { status_code: code, status_msg: message }, data];
  }

  /**
   * Creates an error response
   * @param {String} message - Error message
   * @param {*} error - Error object or message
   * @param {Number} code - HTTP status code
   * @returns {Array} [false, {status_code, status_msg}, error]
   */
  static error(message, error = null, code = 500) {
    return [false, { status_code: code, status_msg: message }, error];
  }
}

export default ResponseFactory;