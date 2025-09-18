/**
 * Shared middleware exports for Sound Forge Alchemy backend services
 * 
 * @author Sound Forge Alchemy Team
 * @license MIT
 * @version 1.0.0
 */

const corsMiddleware = require("./cors");
const { createErrorHandler, asyncErrorHandler, createNotFoundHandler } = require("./errorHandler");
const { createRequestLogger, createDetailedRequestLogger } = require("./requestLogger");

module.exports = {
  // CORS middleware
  cors: corsMiddleware,
  createCorsMiddleware: corsMiddleware.createCorsMiddleware,
  
  // Error handling middleware
  createErrorHandler,
  asyncErrorHandler,
  createNotFoundHandler,
  
  // Request logging middleware
  createRequestLogger,
  createDetailedRequestLogger
};