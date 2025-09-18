/**
 * Shared request logging middleware for Sound Forge Alchemy backend services
 * 
 * @author Sound Forge Alchemy Team
 * @license MIT
 * @version 1.0.0
 */

const morgan = require("morgan");
const { createLogger } = require("../logger");

/**
 * Create request logging middleware with service-specific configuration
 * @param {string} serviceName - Name of the service using this middleware
 * @param {Object} options - Optional morgan configuration overrides
 * @returns {Function} Express request logging middleware
 */
function createRequestLogger(serviceName = "unknown-service", options = {}) {
  const logger = createLogger(`${serviceName}-request-logger`);

  // Custom morgan format that includes service name
  const customFormat = `:remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - [${serviceName}] :response-time ms`;

  // Custom morgan stream that uses our winston logger
  const stream = {
    write: function(message) {
      // Remove trailing newline and log as info
      logger.info(message.trim());
    }
  };

  const defaultOptions = {
    stream,
    // Skip logging for health check endpoints to reduce noise
    skip: function (req, res) { 
      return req.path === "/health" && process.env.NODE_ENV !== "development";
    }
  };

  const morganOptions = { ...defaultOptions, ...options };

  return morgan(customFormat, morganOptions);
}

/**
 * Create detailed request logger for debugging (includes request/response bodies)
 * @param {string} serviceName - Name of the service using this middleware
 * @returns {Function} Express detailed request logging middleware
 */
function createDetailedRequestLogger(serviceName = "unknown-service") {
  const logger = createLogger(`${serviceName}-detailed-request-logger`);

  return function detailedRequestLogger(req, res, next) {
    const start = Date.now();
    const originalSend = res.send;

    // Log request details
    logger.debug("Incoming request", {
      service: serviceName,
      method: req.method,
      path: req.path,
      query: req.query,
      headers: req.headers,
      body: req.body,
      ip: req.ip || req.connection.remoteAddress
    });

    // Intercept response to log response details
    res.send = function(body) {
      const duration = Date.now() - start;
      
      logger.debug("Outgoing response", {
        service: serviceName,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        responseBody: body,
        responseHeaders: res.getHeaders()
      });

      return originalSend.call(this, body);
    };

    next();
  };
}

module.exports = {
  createRequestLogger,
  createDetailedRequestLogger
};