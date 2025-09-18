# Sound Forge Alchemy - Shared Backend Module

This shared module provides common functionality, middleware, and utilities for all Sound Forge Alchemy backend services to eliminate code duplication and ensure consistent behavior throughout the application.

## Overview

The shared module contains:
- **Common dependencies** - All shared npm packages (express, redis, winston, etc.)
- **Logger configuration** - Centralized logging with service-specific contexts
- **Redis client management** - Connection pooling and event handling
- **Middleware** - CORS, error handling, request logging
- **Utilities** - Validation, helpers, and common functions

## Architecture

```
backend/
├── shared/                    # Shared module
│   ├── package.json          # Common dependencies
│   ├── index.js             # Main exports
│   ├── logger.js            # Logging configuration
│   ├── redis.js             # Redis client management
│   ├── middleware/          # Common middleware
│   │   ├── index.js
│   │   ├── cors.js
│   │   ├── errorHandler.js
│   │   └── requestLogger.js
│   └── utils/               # Shared utilities
│       ├── index.js
│       ├── validation.js
│       └── helpers.js
├── api-gateway/             # Service-specific code only
├── spotify/                 # Service-specific code only
├── download/                # Service-specific code only
├── processing/              # Service-specific code only
├── analysis/                # Service-specific code only
└── websocket/               # Service-specific code only
```

## Installation & Build Strategy

### 1. Initial Setup

Install shared dependencies first:

```bash
# From backend/shared directory
npm install
```

### 2. Service Dependencies

Each service now only installs service-specific dependencies:

```bash
# From any service directory
npm run install-deps  # Installs shared deps + service deps
```

Or manually:
```bash
cd ../shared && npm install
cd ../[service-name] && npm install
```

### 3. Development Workflow

```bash
# Start all services in development mode
npm run dev    # From each service directory

# Or use docker-compose (recommended)
docker-compose up --build
```

### 4. Production Build

```bash
# Build all services
./scripts/build-all.sh

# Or individually
cd backend/shared && npm install --production
cd backend/[service] && npm install --production
```

## Usage in Services

### Basic Setup

```javascript
// Import shared modules
const { 
  createLogger, 
  createRedisClient, 
  createErrorHandler,
  cors,
  createValidationMiddleware,
  msToMinSec 
} = require('@sound-forge-alchemy/shared');

// Create service-specific instances
const logger = createLogger('my-service');
const redis = createRedisClient();
const app = express();

// Use shared middleware
app.use(cors);
app.use(createErrorHandler('my-service'));
```

### Logger Usage

```javascript
const { createLogger } = require('@sound-forge-alchemy/shared');
const logger = createLogger('spotify-service');

logger.info('Service starting', { port: 3001 });
logger.error('Failed to connect', { error: error.message });
```

### Redis Usage

```javascript
const { createRedisClient } = require('@sound-forge-alchemy/shared');

// Default client
const redis = createRedisClient();

// Custom configuration
const redis = createRedisClient({
  url: 'redis://custom-host:6379',
  retryDelayOnFailover: 200
});
```

### Middleware Usage

```javascript
const { 
  createErrorHandler, 
  createRequestLogger,
  createValidationMiddleware,
  commonSchemas 
} = require('@sound-forge-alchemy/shared');

const app = express();

// Request logging
app.use(createRequestLogger('my-service'));

// Validation
app.post('/api/data', 
  createValidationMiddleware({
    body: commonSchemas.trackInfo
  }),
  (req, res) => { /* handler */ }
);

// Error handling (must be last)
app.use(createErrorHandler('my-service'));
```

## Dependency Management

### Common Dependencies (in shared/package.json)
- `axios` - HTTP client
- `cors` - Cross-origin resource sharing
- `dotenv` - Environment variables
- `express` - Web framework
- `ioredis` - Redis client
- `winston` - Logging
- `uuid` - UUID generation
- `joi` - Data validation

### Service-Specific Dependencies (remain in service package.json)
- **api-gateway**: `http-proxy-middleware`, `morgan`, `@supabase/supabase-js`
- **spotify**: `spotify-web-api-node`
- **download**: `child_process`
- **processing**: `child_process`
- **analysis**: `child_process`
- **websocket**: `socket.io`

## Environment Variables

The shared module respects these environment variables:

- `LOG_LEVEL` - Logging level (debug, info, warn, error)
- `REDIS_URL` - Redis connection string
- `NODE_ENV` - Environment (development, production)
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins

## Migration Guide

### From Individual Service Dependencies

1. **Update package.json** - Remove common dependencies, add shared module reference
2. **Update imports** - Change from individual packages to shared module
3. **Update logging** - Use shared logger with service name
4. **Update Redis** - Use shared Redis client
5. **Update middleware** - Use shared middleware functions

### Before (in service):
```javascript
const express = require('express');
const cors = require('cors');
const Redis = require('ioredis');
const winston = require('winston');
const logger = require('./logging');

const redis = new Redis(process.env.REDIS_URL);
app.use(cors());
```

### After (using shared):
```javascript
const { 
  createLogger, 
  createRedisClient, 
  cors 
} = require('@sound-forge-alchemy/shared');

const logger = createLogger('my-service');
const redis = createRedisClient();
app.use(cors);
```

## Testing

```bash
# Test shared module
cd backend/shared
npm test

# Test individual services
cd backend/[service-name]
npm test
```

## Versioning

The shared module uses semantic versioning. When making changes:

1. **Patch** (1.0.x) - Bug fixes, no breaking changes
2. **Minor** (1.x.0) - New features, backward compatible
3. **Major** (x.0.0) - Breaking changes requiring service updates

## Troubleshooting

### Common Issues

1. **Module not found** - Run `npm run install-deps` in service directory
2. **Redis connection failed** - Check `REDIS_URL` environment variable
3. **CORS errors** - Update `ALLOWED_ORIGINS` environment variable
4. **Import errors** - Ensure shared module is properly linked

### Debugging

Enable debug logging:
```bash
LOG_LEVEL=debug npm start
```

## Contributing

When adding new shared functionality:

1. Add to appropriate module (logger, redis, middleware, utils)
2. Export from main index.js
3. Update README.md
4. Add tests
5. Update service examples if needed

## License

MIT License - See LICENSE file for details.