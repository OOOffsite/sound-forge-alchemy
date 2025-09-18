/**
 * Shared Redis client configuration for Sound Forge Alchemy backend services
 * 
 * This module provides a centralized Redis connection management that all services can use
 * to maintain consistent Redis behavior and connection pooling across the application.
 * 
 * @author Sound Forge Alchemy Team
 * @license MIT
 * @version 1.0.0
 */

const Redis = require("ioredis");
const { createLogger } = require("./logger");

// Create logger for Redis operations
const logger = createLogger("redis");

/**
 * Default Redis configuration options
 */
const defaultRedisOptions = {
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  connectTimeout: 10000,
  commandTimeout: 5000,
  // Connection pool settings
  family: 4, // IPv4
  keepAlive: true,
  // Reconnection settings
  retryDelayOnClusterDown: 300,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
};

/**
 * Create a Redis client instance
 * @param {Object} options - Optional Redis configuration overrides
 * @returns {Redis} Configured Redis client instance
 */
function createRedisClient(options = {}) {
  const redisUrl = options.url || process.env.REDIS_URL || "redis://localhost:6379";
  const clientOptions = { ...defaultRedisOptions, ...options };
  
  const client = new Redis(redisUrl, clientOptions);

  // Add event listeners for connection monitoring
  client.on("connect", () => {
    logger.info("Redis client connected", { url: redisUrl });
  });

  client.on("ready", () => {
    logger.info("Redis client ready", { url: redisUrl });
  });

  client.on("error", (error) => {
    logger.error("Redis client error", { 
      error: error.message, 
      url: redisUrl,
      stack: error.stack 
    });
  });

  client.on("close", () => {
    logger.info("Redis client connection closed", { url: redisUrl });
  });

  client.on("reconnecting", () => {
    logger.info("Redis client reconnecting", { url: redisUrl });
  });

  client.on("end", () => {
    logger.info("Redis client connection ended", { url: redisUrl });
  });

  return client;
}

/**
 * Create a Redis publisher client
 * @param {Object} options - Optional Redis configuration overrides
 * @returns {Redis} Configured Redis publisher client
 */
function createRedisPublisher(options = {}) {
  const publisher = createRedisClient(options);
  
  // Add publisher-specific event logging
  publisher.on("ready", () => {
    logger.info("Redis publisher ready");
  });

  return publisher;
}

/**
 * Create a Redis subscriber client
 * @param {Object} options - Optional Redis configuration overrides
 * @returns {Redis} Configured Redis subscriber client
 */
function createRedisSubscriber(options = {}) {
  const subscriber = createRedisClient(options);
  
  // Add subscriber-specific event logging
  subscriber.on("ready", () => {
    logger.info("Redis subscriber ready");
  });

  subscriber.on("message", (channel, message) => {
    logger.debug("Redis message received", { channel, message });
  });

  return subscriber;
}

/**
 * Gracefully close Redis client connections
 * @param {Redis|Redis[]} clients - Single client or array of clients to close
 */
async function closeRedisClients(clients) {
  const clientArray = Array.isArray(clients) ? clients : [clients];
  
  try {
    await Promise.all(clientArray.map(client => client.quit()));
    logger.info("Redis clients closed gracefully", { count: clientArray.length });
  } catch (error) {
    logger.error("Error closing Redis clients", { error: error.message });
    // Force disconnect if graceful close fails
    clientArray.forEach(client => client.disconnect());
  }
}

// Default Redis client instance for backward compatibility
const defaultClient = createRedisClient();

// Export the default client and utility functions
module.exports = defaultClient;
module.exports.createRedisClient = createRedisClient;
module.exports.createRedisPublisher = createRedisPublisher;
module.exports.createRedisSubscriber = createRedisSubscriber;
module.exports.closeRedisClients = closeRedisClients;