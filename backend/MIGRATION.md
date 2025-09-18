# Migration Guide: Moving to Shared Backend Module

This guide shows how to migrate existing services to use the new shared backend module.

## Example: Spotify Service Migration

### Before (Original Implementation)

```javascript
// spotify/index.js - BEFORE migration
const express = require("express");
const cors = require("cors");
const SpotifyWebApi = require("spotify-web-api-node");
const Redis = require("ioredis");
const { exec } = require("child_process");
const logger = require("./config/logging");

// Initialize Redis client
const redis = new Redis(process.env.REDIS_URL);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).send({ status: "ok" });
});

// Error handling
app.use((error, req, res, next) => {
  logger.error("Server error", { error: error.message });
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  logger.info(`Spotify service listening on port ${PORT}`);
});
```

### After (Using Shared Module)

```javascript
// spotify/index.js - AFTER migration
const express = require("express");
const SpotifyWebApi = require("spotify-web-api-node");
const { exec } = require("child_process");

// Import from shared module
const {
  createLogger,
  createRedisClient,
  cors,
  createErrorHandler,
  createRequestLogger,
  createApiResponse,
  validateSpotifyUrl,
  msToMinSec
} = require("@sound-forge-alchemy/shared");

// Create service-specific instances
const logger = createLogger("spotify-service");
const redis = createRedisClient();

const app = express();
const PORT = process.env.PORT || 3001;

// Use shared middleware
app.use(cors);
app.use(express.json());
app.use(createRequestLogger("spotify-service"));

// Health check with standardized response
app.get("/health", (req, res) => {
  res.json(createApiResponse(true, { 
    status: "ok",
    redis: redis.status === "ready" ? "connected" : "disconnected"
  }));
});

// Use shared error handler (must be last)
app.use(createErrorHandler("spotify-service"));

app.listen(PORT, () => {
  logger.info("Spotify service started", { port: PORT });
});
```

## Step-by-Step Migration Process

### 1. Update package.json

**Before:**
```json
{
  "dependencies": {
    "axios": "^1.6.7",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.18.2",
    "ioredis": "^5.3.2",
    "winston": "^3.12.0",
    "spotify-web-api-node": "^5.0.2"
  }
}
```

**After:**
```json
{
  "dependencies": {
    "@sound-forge-alchemy/shared": "file:../shared",
    "spotify-web-api-node": "^5.0.2"
  },
  "scripts": {
    "install-deps": "cd ../shared && npm install && cd ../spotify && npm install"
  }
}
```

### 2. Update Imports

**Before:**
```javascript
const cors = require("cors");
const Redis = require("ioredis");
const winston = require("winston");
const logger = require("./config/logging");

const redis = new Redis(process.env.REDIS_URL);
```

**After:**
```javascript
const { 
  createLogger, 
  createRedisClient, 
  cors 
} = require("@sound-forge-alchemy/shared");

const logger = createLogger("spotify-service");
const redis = createRedisClient();
```

### 3. Update Middleware

**Before:**
```javascript
app.use(cors());

// Custom error handler
app.use((error, req, res, next) => {
  logger.error("Error occurred", { error: error.message });
  res.status(500).json({ error: "Internal server error" });
});
```

**After:**
```javascript
app.use(cors);
app.use(createRequestLogger("spotify-service"));
app.use(createErrorHandler("spotify-service"));
```

### 4. Update Validation

**Before:**
```javascript
app.post("/fetch", (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }
  
  // Manual Spotify URL validation
  const regex = /spotify\.com\/(playlist|album|track)\/([a-zA-Z0-9]+)/;
  if (!regex.test(url)) {
    return res.status(400).json({ error: "Invalid Spotify URL" });
  }
  
  // ... rest of handler
});
```

**After:**
```javascript
const { createValidationMiddleware, validateSpotifyUrl } = require("@sound-forge-alchemy/shared");

app.post("/fetch", 
  createValidationMiddleware({
    body: Joi.object({
      url: Joi.string().required()
    })
  }),
  (req, res) => {
    const { url } = req.body;
    
    const validation = validateSpotifyUrl(url);
    if (!validation.valid) {
      return res.status(400).json(createApiResponse(false, null, validation.error));
    }
    
    // ... rest of handler using validation.type and validation.id
  }
);
```

### 5. Update Utility Functions

**Before:**
```javascript
// Helper function in service
function msToMinSec(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}

// Usage
const duration = msToMinSec(track.duration_ms);
```

**After:**
```javascript
const { msToMinSec } = require("@sound-forge-alchemy/shared");

// Usage (same)
const duration = msToMinSec(track.duration_ms);
```

### 6. Update Response Format

**Before:**
```javascript
res.json({
  type: spotifyItem.type,
  id: spotifyItem.id,
  name: results.body.name,
  tracks: tracks
});
```

**After:**
```javascript
const { createApiResponse } = require("@sound-forge-alchemy/shared");

res.json(createApiResponse(true, {
  type: spotifyItem.type,
  id: spotifyItem.id,
  name: results.body.name,
  tracks: tracks
}));
```

## Service-Specific Considerations

### API Gateway
- Keep `http-proxy-middleware`, `morgan`, `@supabase/supabase-js`
- Use shared Redis client for consistency
- Use shared error handler for proxy errors

### Download/Processing/Analysis Services  
- Keep `child_process` for system commands
- Use shared job ID generation
- Use shared retry utilities for failed operations
- Use shared filename sanitization

### WebSocket Service
- Keep `socket.io`
- Use shared Redis for pub/sub
- Use shared logger for socket events
- Use shared error handling for socket errors

## Testing Migration

### 1. Unit Tests
```javascript
// Before
const service = require('../src/index');

// After  
const { createLogger } = require('@sound-forge-alchemy/shared');
const service = require('../src/index');

// Mock shared dependencies
jest.mock('@sound-forge-alchemy/shared', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn()
  })),
  createRedisClient: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn()
  }))
}));
```

### 2. Integration Tests
```javascript
// Test shared middleware
const request = require('supertest');
const app = require('../src/app');

describe('Shared middleware integration', () => {
  test('CORS headers are set', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);
    
    expect(response.headers['access-control-allow-origin']).toBeDefined();
  });

  test('Error handler formats errors correctly', async () => {
    const response = await request(app)
      .get('/nonexistent')
      .expect(404);
    
    expect(response.body.error).toHaveProperty('type', 'NOT_FOUND');
    expect(response.body.error).toHaveProperty('timestamp');
  });
});
```

## Rollback Strategy

If issues occur during migration:

### 1. Quick Rollback
```bash
# Restore original package.json
git checkout HEAD~1 -- package.json

# Restore original dependencies
npm install

# Restore original imports
git checkout HEAD~1 -- src/
```

### 2. Gradual Migration
- Migrate one service at a time
- Keep both old and new implementations running
- Use feature flags to switch between implementations
- Monitor error rates and performance

## Common Issues & Solutions

### 1. Module Resolution Issues
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm run install-deps
```

### 2. Import Errors
```javascript
// Wrong - importing non-existent function
const { nonExistentFunction } = require('@sound-forge-alchemy/shared');

// Right - check what's available
const shared = require('@sound-forge-alchemy/shared');
console.log(Object.keys(shared)); // See available exports
```

### 3. Logger Context Issues
```javascript
// Wrong - generic logger
const logger = require('@sound-forge-alchemy/shared').logger;

// Right - service-specific logger  
const { createLogger } = require('@sound-forge-alchemy/shared');
const logger = createLogger('my-service');
```

### 4. Redis Connection Issues
```javascript
// Wrong - using default client everywhere
const redis = require('@sound-forge-alchemy/shared').redis;

// Right - create service-specific client
const { createRedisClient } = require('@sound-forge-alchemy/shared');
const redis = createRedisClient();
```

## Performance Considerations

### Bundle Size Impact
- Shared module adds ~50MB of common dependencies
- Each service reduces by ~45MB of duplicate dependencies
- Net savings: ~40MB per service after 2+ services

### Memory Usage
- Shared Redis connections reduce memory overhead
- Shared logger instances reduce object creation
- Overall memory usage decreases with more services

### Startup Time  
- Services start faster (fewer dependencies to load)
- Docker image builds are faster (layer caching)
- Development hot reload is faster

## Monitoring Migration Success

### Metrics to Track
- Service startup time
- Memory usage
- Error rates
- Response times
- Dependency update frequency

### Success Criteria
- All services start without errors
- No increase in response times
- Error rates remain stable
- Logs maintain proper service context
- Tests pass with new shared dependencies