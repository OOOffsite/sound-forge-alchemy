/**
 * Sound Forge Alchemy Shared Backend Module
 * 
 * This module provides common functionality, middleware, and utilities
 * that can be shared across all backend services to eliminate code duplication
 * and ensure consistent behavior throughout the application.
 * 
 * @author Sound Forge Alchemy Team
 * @license MIT
 * @version 1.0.0
 */

const logger = require("./logger");
const redis = require("./redis");
const middleware = require("./middleware");
const utils = require("./utils");

// Log module initialization
logger.info("Sound Forge Alchemy shared module loaded", {
  version: "1.0.0",
  modules: ["logger", "redis", "middleware", "utils"]
});

module.exports = {
  // Core modules
  logger,
  redis,
  middleware,
  utils,
  
  // Individual exports for convenience
  createLogger: logger.createLogger,
  
  // Redis utilities
  createRedisClient: redis.createRedisClient,
  createRedisPublisher: redis.createRedisPublisher,
  createRedisSubscriber: redis.createRedisSubscriber,
  closeRedisClients: redis.closeRedisClients,
  
  // Middleware
  cors: middleware.cors,
  createCorsMiddleware: middleware.createCorsMiddleware,
  createErrorHandler: middleware.createErrorHandler,
  asyncErrorHandler: middleware.asyncErrorHandler,
  createNotFoundHandler: middleware.createNotFoundHandler,
  createRequestLogger: middleware.createRequestLogger,
  createDetailedRequestLogger: middleware.createDetailedRequestLogger,
  
  // Utilities
  commonSchemas: utils.commonSchemas,
  createValidationMiddleware: utils.createValidationMiddleware,
  validateData: utils.validateData,
  validateSpotifyUrl: utils.validateSpotifyUrl,
  msToMinSec: utils.msToMinSec,
  minSecToMs: utils.minSecToMs,
  generateJobId: utils.generateJobId,
  sleep: utils.sleep,
  retryWithBackoff: utils.retryWithBackoff,
  sanitizeFilename: utils.sanitizeFilename,
  deepClone: utils.deepClone,
  isEmpty: utils.isEmpty,
  parseEnvInt: utils.parseEnvInt,
  parseEnvBool: utils.parseEnvBool,
  createApiResponse: utils.createApiResponse
};