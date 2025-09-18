// require('dotenv').config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { createProxyMiddleware } = require("http-proxy-middleware");
const { createClient } = require("@supabase/supabase-js");
const Redis = require("ioredis");
const logger = require("../config/logging");

// Initialize Redis client (optional)
let redis = null;
if (process.env.REDIS_URL) {
  try {
    redis = new Redis(process.env.REDIS_URL);
    redis.on('error', (err) => {
      logger.warn('Redis connection error:', err.message);
      // Don't crash on Redis errors
    });
  } catch (err) {
    logger.warn('Failed to connect to Redis:', err.message);
  }
}

// Initialize Supabase client (optional)
let supabase = null;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (err) {
    logger.warn('Failed to initialize Supabase:', err.message);
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(morgan("dev"));

// Proxy middleware options
const spotifyServiceProxy = createProxyMiddleware({
  target: process.env.SPOTIFY_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    "^/api/spotify": "/",
  },
});

const downloadServiceProxy = createProxyMiddleware({
  target: process.env.DOWNLOAD_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    "^/api/download": "/",
  },
});

const processingServiceProxy = createProxyMiddleware({
  target: process.env.PROCESSING_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    "^/api/process": "/",
  },
});

const analysisServiceProxy = createProxyMiddleware({
  target: process.env.ANALYSIS_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    "^/api/analyze": "/",
  },
});

const modelsProxy = createProxyMiddleware({
  target: process.env.PROCESSING_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { "^/api/models": "/models" },
});

// Proxy routes (no body parser before these)
app.use("/api/spotify", spotifyServiceProxy);
app.use("/api/download", downloadServiceProxy);
app.use("/api/process", processingServiceProxy);
app.use("/api/analyze", analysisServiceProxy);
app.use("/api/models", modelsProxy);

// Serve audio files statically
app.use("/audio_data", express.static("/app/audio_data"));

// Health check endpoint (no body parser needed)
app.get("/health", (req, res) => {
  res.status(200).send({
    status: "ok",
    services: {
      apiGateway: "up",
      redis: redis.status === "ready" ? "up" : "down",
      supabase: supabase ? "up" : "down",
    },
  });
});

// Supabase proxy endpoint for client-side access (apply express.json only here if needed)
app.get("/api/config", (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_KEY,
  });
});

// Start the server
app.listen(PORT, () => {
  logger.info(`API Gateway listening on port ${PORT}`);
});
