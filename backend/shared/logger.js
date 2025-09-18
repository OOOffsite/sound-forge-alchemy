/**
 * Shared logger configuration for Sound Forge Alchemy backend services
 * 
 * This module provides a centralized logging configuration that all services can use
 * to maintain consistent logging format and behavior across the application.
 * 
 * @author Sound Forge Alchemy Team
 * @license MIT
 * @version 1.0.0
 */

const winston = require("winston");
const { format } = require("winston");

/**
 * Create logger instance with standardized configuration
 * @param {string} serviceName - Name of the service using the logger
 * @param {Object} options - Optional configuration overrides
 * @returns {winston.Logger} Configured winston logger instance
 */
function createLogger(serviceName = "unknown-service", options = {}) {
  const defaultLevel = process.env.LOG_LEVEL || "debug";
  
  const logger = winston.createLogger({
    level: options.level || defaultLevel,
    format: format.combine(
      format.timestamp({ format: "YYYY-MM-DDTHH:mm:ss.SSSZ" }),
      format.printf(({ timestamp, level, message, service, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : "";
        // Syslog format with service name: <LEVEL> TIMESTAMP [SERVICE] MESSAGE [meta]
        return `<${level.toUpperCase()}> ${timestamp} [${service || serviceName}] ${message} ${metaStr}`;
      })
    ),
    defaultMeta: { service: serviceName },
    transports: [
      new winston.transports.Console({
        level: options.level || defaultLevel,
        stderrLevels: ["error"],
        consoleWarnLevels: ["warn"],
      }),
    ],
  });

  // Add file transport if specified
  if (options.logFile) {
    logger.add(new winston.transports.File({
      filename: options.logFile,
      level: options.fileLevel || defaultLevel,
    }));
  }

  // Add error file transport if specified
  if (options.errorLogFile) {
    logger.add(new winston.transports.File({
      filename: options.errorLogFile,
      level: "error",
    }));
  }

  return logger;
}

/**
 * Default logger instance for backward compatibility
 * This maintains the same interface as the original config/logging.js
 */
const defaultLogger = createLogger("shared");

// Export both the default logger and the factory function
module.exports = defaultLogger;
module.exports.createLogger = createLogger;