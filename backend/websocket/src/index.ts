import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import Redis from 'ioredis';
const { createLogger } = require('@sound-forge-alchemy/shared/logger');

const logger = createLogger('websocket-service');

// Initialize Redis clients
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const sub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Constants
const PORT = process.env.PORT || 3006;

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Socket.IO events
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  // Handle client subscriptions to track events
  socket.on('subscribe:track', (trackId: string) => {
    logger.info(`Client ${socket.id} subscribed to track: ${trackId}`);
    socket.join(`track:${trackId}`);
  });

  // Handle client unsubscriptions
  socket.on('unsubscribe:track', (trackId: string) => {
    logger.info(`Client ${socket.id} unsubscribed from track: ${trackId}`);
    socket.leave(`track:${trackId}`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });

  // Handle errors
  socket.on('error', (error) => {
    logger.error(`Socket error: ${error.message}`, { socketId: socket.id, error });
  });
});

// Redis subscription for processing updates
sub.subscribe('processing:update', 'processing:complete', 'processing:error');

sub.on('message', (channel: string, message: string) => {
  try {
    const data = JSON.parse(message);
    const trackId = data.trackId;

    if (!trackId) {
      logger.warn(`Received message without trackId on channel: ${channel}`);
      return;
    }

    logger.info(`Broadcasting ${channel} to track:${trackId}`, { data });

    // Broadcast to all clients subscribed to this track
    io.to(`track:${trackId}`).emit(channel, data);
  } catch (error) {
    logger.error(`Error processing Redis message: ${error}`, { channel, message });
  }
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'websocket' });
});

// Start server
server.listen(PORT, () => {
  logger.info(`WebSocket server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    redis.disconnect();
    sub.disconnect();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    redis.disconnect();
    sub.disconnect();
    process.exit(0);
  });
});

export default server;