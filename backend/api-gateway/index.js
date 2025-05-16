// require('dotenv').config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { createProxyMiddleware } = require("http-proxy-middleware");
const { createClient } = require("@supabase/supabase-js");
const Redis = require("ioredis");
const logger = require("./config/logging");

// Initialize Redis client
const redis = new Redis(process.env.REDIS_URL);

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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

// Proxy routes (no body parser before these)
app.use("/api/spotify", spotifyServiceProxy);
app.use("/api/download", downloadServiceProxy);
app.use("/api/process", processingServiceProxy);
app.use("/api/analyze", analysisServiceProxy);

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
