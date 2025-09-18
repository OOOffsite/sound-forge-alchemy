// Simple console-based logging for API Gateway
const logger = {
  info: (...args) => console.log('[API-GATEWAY INFO]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[API-GATEWAY ERROR]', new Date().toISOString(), ...args),
  warn: (...args) => console.warn('[API-GATEWAY WARN]', new Date().toISOString(), ...args),
  debug: (...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[API-GATEWAY DEBUG]', new Date().toISOString(), ...args);
    }
  }
};

module.exports = logger;