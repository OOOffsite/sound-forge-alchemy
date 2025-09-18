/**
 * Shared error handling middleware for Sound Forge Alchemy backend services
 * 
 * @author Sound Forge Alchemy Team
 * @license MIT
 * @version 1.0.0
 */

const { createLogger } = require("../logger");

/**
 * Create error handling middleware with service-specific logging
 * @param {string} serviceName - Name of the service using this middleware
 * @returns {Function} Express error handling middleware
 */
function createErrorHandler(serviceName = "unknown-service") {
  const logger = createLogger(`${serviceName}-error-handler`);

  return function errorHandler(error, req, res, next) {
    // Log the error with context
    const errorContext = {
      service: serviceName,
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.body,
      headers: {
        "user-agent": req.get("user-agent"),
        "content-type": req.get("content-type"),
        "origin": req.get("origin")
      },
      stack: error.stack
    };

    // Determine error type and status code
    let statusCode = 500;
    let errorType = "INTERNAL_SERVER_ERROR";
    let message = "Internal server error";
    let shouldLogStack = true;

    if (error.status || error.statusCode) {
      statusCode = error.status || error.statusCode;
    }

    if (statusCode >= 400 && statusCode < 500) {
      // Client errors - less verbose logging
      errorType = "CLIENT_ERROR";
      message = error.message || "Bad request";
      shouldLogStack = false;
      
      logger.warn("Client error occurred", {
        ...errorContext,
        statusCode,
        error: message
      });
    } else {
      // Server errors - full logging
      errorType = "SERVER_ERROR";
      message = process.env.NODE_ENV === "production" 
        ? "Internal server error" 
        : error.message || "Internal server error";
      
      logger.error("Server error occurred", {
        ...errorContext,
        statusCode,
        error: error.message,
        ...(shouldLogStack && { stack: error.stack })
      });
    }

    // Prepare response
    const errorResponse = {
      error: {
        type: errorType,
        message,
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
      }
    };

    // Include additional error details in development
    if (process.env.NODE_ENV === "development") {
      errorResponse.error.details = {
        originalMessage: error.message,
        stack: error.stack,
        ...error
      };
    }

    // Send error response
    res.status(statusCode).json(errorResponse);
  };
}

/**
 * Async error wrapper for route handlers
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped route handler that catches async errors
 */
function asyncErrorHandler(fn) {
  return function(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 Not Found handler
 * @param {string} serviceName - Name of the service using this middleware
 * @returns {Function} Express middleware for handling 404 errors
 */
function createNotFoundHandler(serviceName = "unknown-service") {
  const logger = createLogger(`${serviceName}-404-handler`);
  
  return function notFoundHandler(req, res, next) {
    logger.warn("Route not found", {
      service: serviceName,
      method: req.method,
      path: req.path,
      query: req.query,
      userAgent: req.get("user-agent")
    });

    res.status(404).json({
      error: {
        type: "NOT_FOUND",
        message: `Route ${req.method} ${req.path} not found`,
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
      }
    });
  };
}

module.exports = {
  createErrorHandler,
  asyncErrorHandler,
  createNotFoundHandler
};