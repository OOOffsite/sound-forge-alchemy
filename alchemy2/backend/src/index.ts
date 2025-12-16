/**
 * Sound Forge Alchemy - Unified Backend API
 *
 * @module index
 * @description Main entry point for consolidated backend service
 * @consolidates api-gateway, spotify, download, processing, analysis, websocket
 *
 * Architecture:
 * - Single Express application
 * - Supabase for database and storage (replaces Redis)
 * - Socket.IO for real-time progress updates
 * - Python workers for audio processing (Demucs, librosa, spotdl)
 *
 * @author Sound Forge Alchemy Team
 * @version 2.0.0
 * @license MIT
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { Server } from 'socket.io';
import { createServer } from 'http';
import winston from 'winston';

// Import routes (consolidated from 6 services)
import spotifyRoutes from './routes/spotify.js';
import downloadRoutes from './routes/download.js';
import processingRoutes from './routes/processing.js';
import analysisRoutes from './routes/analysis.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { validateRequest } from './middleware/validation.js';

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO for real-time updates
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Initialize Supabase client (replaces Redis)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

// Make Supabase and Socket.IO available to routes
app.locals.supabase = supabase;
app.locals.io = io;
app.locals.logger = logger;

// Middleware stack
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'sound-forge-alchemy-unified-api',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes (consolidated from 6 microservices)
app.use('/api/spotify', spotifyRoutes);      // from spotify service
app.use('/api/download', downloadRoutes);    // from download service
app.use('/api/processing', processingRoutes); // from processing service
app.use('/api/analysis', analysisRoutes);     // from analysis service

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('subscribe:job', (jobId: string) => {
    socket.join(`job:${jobId}`);
    logger.info(`Client ${socket.id} subscribed to job ${jobId}`);
  });

  socket.on('unsubscribe:job', (jobId: string) => {
    socket.leave(`job:${jobId}`);
    logger.info(`Client ${socket.id} unsubscribed from job ${jobId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  logger.info(`
╔═══════════════════════════════════════════════════════════╗
║  Sound Forge Alchemy - Unified Backend API               ║
║  Version: 2.0.0                                           ║
║  Port: ${PORT}                                              ║
║  Environment: ${process.env.NODE_ENV || 'development'}                              ║
║  Frontend: ${process.env.FRONTEND_URL || 'http://localhost:5173'}              ║
║                                                           ║
║  Consolidated Services:                                   ║
║  ✓ Spotify Integration                                   ║
║  ✓ Audio Download (spotdl)                               ║
║  ✓ Stem Separation (Demucs)                              ║
║  ✓ Audio Analysis (librosa)                              ║
║  ✓ Real-time Updates (Socket.IO)                         ║
║                                                           ║
║  Storage: Supabase                                        ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export { app, io, supabase, logger };
