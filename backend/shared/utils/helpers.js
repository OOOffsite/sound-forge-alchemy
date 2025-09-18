/**
 * Shared helper utilities for Sound Forge Alchemy backend services
 * 
 * @author Sound Forge Alchemy Team
 * @license MIT
 * @version 1.0.0
 */

const { v4: uuidv4 } = require("uuid");
const { createLogger } = require("../logger");

const logger = createLogger("helper-utils");

/**
 * Convert milliseconds to MM:SS format
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration string (MM:SS)
 */
function msToMinSec(ms) {
  if (typeof ms !== 'number' || ms < 0) {
    return "0:00";
  }
  
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}

/**
 * Convert MM:SS format to milliseconds
 * @param {string} timeString - Duration string in MM:SS format
 * @returns {number} Duration in milliseconds
 */
function minSecToMs(timeString) {
  if (typeof timeString !== 'string') {
    return 0;
  }
  
  const parts = timeString.split(':');
  if (parts.length !== 2) {
    return 0;
  }
  
  const minutes = parseInt(parts[0], 10) || 0;
  const seconds = parseInt(parts[1], 10) || 0;
  
  return (minutes * 60 + seconds) * 1000;
}

/**
 * Generate a unique job ID
 * @param {string} prefix - Optional prefix for the job ID
 * @returns {string} Unique job identifier
 */
function generateJobId(prefix = "job") {
  return `${prefix}_${uuidv4()}`;
}

/**
 * Sleep for a specified duration
 * @param {number} ms - Duration to sleep in milliseconds
 * @returns {Promise} Promise that resolves after the specified duration
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.initialDelay - Initial delay in milliseconds (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in milliseconds (default: 10000)
 * @param {Function} options.shouldRetry - Function to determine if error should trigger retry
 * @returns {Promise} Promise that resolves with the function result or rejects with the last error
 */
async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    shouldRetry = () => true
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries || !shouldRetry(error)) {
        break;
      }

      logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delay}ms`, {
        error: error.message,
        attempt: attempt + 1,
        delay
      });

      await sleep(delay);
      delay = Math.min(delay * 2, maxDelay); // Exponential backoff with cap
    }
  }

  throw lastError;
}

/**
 * Sanitize filename for file system safety
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
function sanitizeFilename(filename) {
  if (typeof filename !== 'string') {
    return 'untitled';
  }

  return filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '') // Remove invalid characters
    .replace(/^\.+/, '') // Remove leading dots
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 255) // Limit length
    .toLowerCase();
}

/**
 * Deep clone an object (simple implementation for basic objects)
 * @param {any} obj - Object to clone
 * @returns {any} Cloned object
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item));
  }
  
  if (typeof obj === 'object') {
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  
  return obj;
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 * @param {any} value - Value to check
 * @returns {boolean} True if value is empty
 */
function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Parse environment variable as integer with default value
 * @param {string} envVar - Environment variable name
 * @param {number} defaultValue - Default value if env var is not set or invalid
 * @returns {number} Parsed integer value
 */
function parseEnvInt(envVar, defaultValue) {
  const value = process.env[envVar];
  if (!value) return defaultValue;
  
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse environment variable as boolean with default value
 * @param {string} envVar - Environment variable name
 * @param {boolean} defaultValue - Default value if env var is not set
 * @returns {boolean} Parsed boolean value
 */
function parseEnvBool(envVar, defaultValue) {
  const value = process.env[envVar];
  if (!value) return defaultValue;
  
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Create a standardized API response object
 * @param {boolean} success - Whether the operation was successful
 * @param {any} data - Response data
 * @param {string} message - Response message
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Standardized response object
 */
function createApiResponse(success, data = null, message = null, metadata = {}) {
  const response = {
    success,
    timestamp: new Date().toISOString(),
    ...metadata
  };

  if (data !== null) {
    response.data = data;
  }

  if (message) {
    response.message = message;
  }

  return response;
}

module.exports = {
  msToMinSec,
  minSecToMs,
  generateJobId,
  sleep,
  retryWithBackoff,
  sanitizeFilename,
  deepClone,
  isEmpty,
  parseEnvInt,
  parseEnvBool,
  createApiResponse
};