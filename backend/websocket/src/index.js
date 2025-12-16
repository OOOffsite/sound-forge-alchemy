// WebSocket Service
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const Redis = require('ioredis');
const logger = require('../config/logging');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3006;
// Redis connection with better error handling
const redisConfig = {
  host: 'redis',
  port: 6379,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 3,
  enableReadyCheck: false
};

const redis = new Redis(redisConfig);
const sub = new Redis(redisConfig);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'websocket', connections: wss.clients.size });
});

// WebSocket connection handling
wss.on('connection', (ws) => {
  logger.info('New WebSocket connection established');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      logger.info('Received message:', data);
      
      // Echo the message back for now
      ws.send(JSON.stringify({ type: 'echo', data }));
      
      // Publish to Redis for other services
      redis.publish('websocket:messages', message);
    } catch (error) {
      logger.error('Error processing message:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });
  
  ws.on('close', () => {
    logger.info('WebSocket connection closed');
  });
  
  ws.on('error', (error) => {
    logger.error('WebSocket error:', error);
  });
});

// Subscribe to Redis channels for broadcasting
sub.subscribe('broadcast:all');
sub.on('message', (channel, message) => {
  logger.info(`Broadcasting message from ${channel}`);
  
  // Broadcast to all connected clients
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
});

// Start the server
server.listen(PORT, () => {
  logger.info(`WebSocket service listening on port ${PORT}`);
});