/**
 * Shared validation utilities for Sound Forge Alchemy backend services
 * 
 * @author Sound Forge Alchemy Team
 * @license MIT
 * @version 1.0.0
 */

const Joi = require("joi");
const { createLogger } = require("../logger");

const logger = createLogger("validation-utils");

/**
 * Common validation schemas
 */
const commonSchemas = {
  // UUID validation
  uuid: Joi.string().uuid({ version: ['uuidv4'] }),
  
  // Spotify URL validation
  spotifyUrl: Joi.string().pattern(/^https:\/\/open\.spotify\.com\/(playlist|album|track)\/[a-zA-Z0-9]+(\?.*)?$/),
  
  // Spotify ID validation
  spotifyId: Joi.string().pattern(/^[a-zA-Z0-9]{22}$/),
  
  // Track info object
  trackInfo: Joi.object({
    title: Joi.string().required(),
    artist: Joi.string().required(),
    album: Joi.string().optional(),
    duration: Joi.string().optional(),
    albumArt: Joi.string().uri().optional()
  }),

  // Pagination parameters
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).optional()
  }),

  // Audio processing parameters
  audioProcessing: Joi.object({
    format: Joi.string().valid("mp3", "wav", "flac", "m4a").default("mp3"),
    quality: Joi.string().valid("low", "medium", "high").default("medium"),
    bitrate: Joi.number().integer().min(64).max(320).optional(),
    sampleRate: Joi.number().integer().valid(44100, 48000, 96000).optional()
  }),

  // Redis key validation
  redisKey: Joi.string().pattern(/^[a-zA-Z0-9:_-]+$/),

  // Service health response
  healthResponse: Joi.object({
    status: Joi.string().valid("ok", "error").required(),
    timestamp: Joi.date().iso().optional(),
    services: Joi.object().optional(),
    version: Joi.string().optional()
  })
};

/**
 * Create validation middleware for request validation
 * @param {Object} schema - Joi schema object with optional body, params, query properties
 * @returns {Function} Express middleware function
 */
function createValidationMiddleware(schema) {
  return function validationMiddleware(req, res, next) {
    const errors = {};

    // Validate request body
    if (schema.body) {
      const { error, value } = schema.body.validate(req.body);
      if (error) {
        errors.body = error.details.map(detail => detail.message);
      } else {
        req.body = value;
      }
    }

    // Validate request parameters
    if (schema.params) {
      const { error, value } = schema.params.validate(req.params);
      if (error) {
        errors.params = error.details.map(detail => detail.message);
      } else {
        req.params = value;
      }
    }

    // Validate query parameters
    if (schema.query) {
      const { error, value } = schema.query.validate(req.query);
      if (error) {
        errors.query = error.details.map(detail => detail.message);
      } else {
        req.query = value;
      }
    }

    // If there are validation errors, return them
    if (Object.keys(errors).length > 0) {
      logger.warn("Validation failed", {
        path: req.path,
        method: req.method,
        errors
      });

      return res.status(400).json({
        error: {
          type: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: errors,
          timestamp: new Date().toISOString()
        }
      });
    }

    next();
  };
}

/**
 * Validate data against a schema without middleware
 * @param {any} data - Data to validate
 * @param {Joi.Schema} schema - Joi schema to validate against
 * @returns {Object} Validation result with error and value properties
 */
function validateData(data, schema) {
  const result = schema.validate(data);
  
  if (result.error) {
    logger.debug("Data validation failed", {
      error: result.error.details.map(detail => detail.message),
      data: typeof data === 'object' ? JSON.stringify(data) : data
    });
  }

  return result;
}

/**
 * Sanitize and validate Spotify URL
 * @param {string} url - Spotify URL to validate
 * @returns {Object} Validation result with type and id if valid
 */
function validateSpotifyUrl(url) {
  const { error } = commonSchemas.spotifyUrl.validate(url);
  
  if (error) {
    return { valid: false, error: error.message };
  }

  // Extract type and ID from URL
  const regex = /spotify\.com\/(playlist|album|track)\/([a-zA-Z0-9]+)/;
  const match = url.match(regex);
  
  if (match) {
    return {
      valid: true,
      type: match[1],
      id: match[2],
      cleanUrl: `https://open.spotify.com/${match[1]}/${match[2]}`
    };
  }

  return { valid: false, error: "Invalid Spotify URL format" };
}

module.exports = {
  commonSchemas,
  createValidationMiddleware,
  validateData,
  validateSpotifyUrl
};