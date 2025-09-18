/**
 * Shared CORS middleware configuration for Sound Forge Alchemy backend services
 * 
 * @author Sound Forge Alchemy Team
 * @license MIT
 * @version 1.0.0
 */

const cors = require("cors");
const { createLogger } = require("../logger");

const logger = createLogger("cors-middleware");

/**
 * Default CORS options for development and production environments
 */
const defaultCorsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      "http://localhost:3000", // Frontend dev server
      "http://localhost:5173", // Vite dev server
      "https://localhost:3000",
      "https://localhost:5173",
      ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : [])
    ];

    if (process.env.NODE_ENV === "development") {
      // Allow all origins in development
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn("CORS blocked request from origin", { origin });
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With", 
    "Content-Type",
    "Accept",
    "Authorization",
    "Cache-Control",
    "X-Forwarded-For"
  ]
};

/**
 * Create CORS middleware with optional custom configuration
 * @param {Object} options - Optional CORS configuration overrides
 * @returns {Function} Express CORS middleware
 */
function createCorsMiddleware(options = {}) {
  const corsOptions = { ...defaultCorsOptions, ...options };
  
  logger.info("CORS middleware initialized", { 
    environment: process.env.NODE_ENV || "development",
    allowedOriginsCount: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",").length : 0
  });

  return cors(corsOptions);
}

// Export default CORS middleware
module.exports = createCorsMiddleware();
module.exports.createCorsMiddleware = createCorsMiddleware;