// require('dotenv').config();
const express = require("express");
const cors = require("cors");
const { exec, spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const Redis = require("ioredis");
const axios = require("axios");
const logger = require("./config/logging");

// Initialize Redis client
const redis = new Redis(process.env.REDIS_URL);
const pub = new Redis(process.env.REDIS_URL);
const sub = new Redis(process.env.REDIS_URL);

// Constants
const AUDIO_DATA_PATH =
  process.env.AUDIO_DATA_PATH || "http://localhost:3000/audio_data";
const PORT = process.env.PORT || 3004;

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Listen for download completion events
sub.subscribe("download:job:completed");
sub.on("message", async (channel, message) => {
  if (channel === "download:job:completed") {
    try {
      const jobData = JSON.parse(message);
      logger.info(`Received download completion for job: ${jobData.id}`);

      // Automatically start analysis if it's a completed download
      if (jobData.status === "completed" && jobData.outputPath) {
        const trackId = jobData.trackId;

        // Check if we should auto-analyze (based on a setting in Redis)
        const autoAnalyze = await redis.get(`track:${trackId}:autoAnalyze`);

        if (autoAnalyze === "true") {
          logger.info(`Auto-analyzing track: ${trackId}`);

          // Start analysis
          const analysisJob = await createAnalysisJob(
            trackId,
            jobData.outputPath
          );

          logger.info(`Created auto-analysis job: ${analysisJob.jobId}`);
        }
      }
    } catch (error) {
      logger.error("Error processing download completion message:", error);
    }
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).send({ status: "ok" });
});

// Analyze a track
app.post("/analyze", async (req, res) => {
  try {
    const { trackId, inputPath } = req.body;
    logger.debug("Received analyze request", {
      kwargs: { trackId, inputPath },
    });

    if (!trackId) {
      logger.error("Track ID is required for analysis", {
        code: 400,
        kwargs: { body: req.body },
      });
      return res.status(400).json({ error: "Track ID is required" });
    }

    // If inputPath is not provided, try to find the downloaded track
    let trackPath = inputPath;
    if (!trackPath) {
      const trackDir = path.join(AUDIO_DATA_PATH, trackId);
      const originalFile = path.join(trackDir, "original.mp3");
      logger.debug("Checking for original file", {
        kwargs: { trackDir, originalFile },
      });

      if (fs.existsSync(originalFile)) {
        trackPath = originalFile;
      } else {
        logger.error("Track file not found for analysis", {
          code: 404,
          kwargs: { trackDir, originalFile },
        });
        return res
          .status(404)
          .json({ error: "Track file not found. Download the track first." });
      }
    }

    logger.info("Creating analysis job", { kwargs: { trackId, trackPath } });
    // Create analysis job
    const analysisJob = await createAnalysisJob(trackId, trackPath);

    logger.info("Analysis job created", {
      kwargs: { jobId: analysisJob.jobId, trackId },
    });
    res.status(202).json({
      jobId: analysisJob.jobId,
      trackId,
      status: "queued",
      message: "Analysis job created successfully",
    });
  } catch (error) {
    logger.error("Error creating analysis job", {
      code: error.code || 500,
      message: error.message,
      kwargs: { stack: error.stack, body: req.body },
    });
    res.status(500).json({ error: "Failed to create analysis job" });
  }
});

// Get analysis job status
app.get("/job/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;
    logger.debug("Fetching job status", { kwargs: { jobId } });

    // Get job data from Redis
    const jobData = await redis.get(`analysis:job:${jobId}`);

    if (!jobData) {
      logger.error("Job not found", { code: 404, kwargs: { jobId } });
      return res.status(404).json({ error: "Job not found" });
    }

    logger.info("Returning job data", { kwargs: { jobId } });
    res.json(JSON.parse(jobData));
  } catch (error) {
    logger.error("Error getting job status", {
      code: error.code || 500,
      message: error.message,
      kwargs: { stack: error.stack, params: req.params },
    });
    res.status(500).json({ error: "Failed to get job status" });
  }
});

// Get track analysis results
app.get("/track/:trackId", async (req, res) => {
  try {
    const { trackId } = req.params;
    logger.debug("Fetching track analysis results", { kwargs: { trackId } });

    // Get track's analysis results from Redis
    const analysisResult = await redis.get(`track:${trackId}:analysis`);

    if (!analysisResult) {
      // Check if there's an ongoing job
      const jobIds = await redis.smembers(`track:${trackId}:analysis:jobs`);
      logger.debug("No analysis result found, checking jobs", {
        kwargs: { trackId, jobIds },
      });

      if (!jobIds || jobIds.length === 0) {
        // No jobs found, check if audio file exists
        const trackDir = path.join(AUDIO_DATA_PATH, trackId);
        const originalFile = path.join(trackDir, "original.mp3");
        logger.debug("No jobs found, checking for audio file", {
          kwargs: { trackDir, originalFile },
        });

        if (fs.existsSync(originalFile)) {
          logger.info("Audio file exists but no analysis jobs found", {
            kwargs: { trackId, originalFile },
          });
          return res.json({
            status: "file-only",
            trackId,
            message: "Audio file exists but no analysis jobs found.",
            audioUrl: originalFile,
          });
        } else {
          logger.error("No analysis jobs or audio file found for this track", {
            code: 404,
            kwargs: { trackId },
          });
          return res.status(404).json({
            error: "No analysis jobs or audio file found for this track",
          });
        }
      }

      // Get the latest job
      const latestJobId = jobIds[jobIds.length - 1];
      const jobData = await redis.get(`analysis:job:${latestJobId}`);
      logger.debug("Returning latest job data for analysis in progress", {
        kwargs: { latestJobId, jobData },
      });

      if (!jobData) {
        logger.error("Analysis job data not found", {
          code: 404,
          kwargs: { latestJobId },
        });
        return res.status(404).json({ error: "Analysis job data not found" });
      }

      const parsedJobData = JSON.parse(jobData);
      return res.json({
        status: parsedJobData.status,
        progress: parsedJobData.progress,
        message: "Analysis in progress",
        jobId: latestJobId,
      });
    }

    logger.info("Returning analysis result from Redis", {
      kwargs: { trackId },
    });
    res.json(JSON.parse(analysisResult));
  } catch (error) {
    logger.error("Error getting track analysis", {
      code: error.code || 500,
      message: error.message,
      kwargs: { stack: error.stack, params: req.params },
    });
    res.status(500).json({ error: "Failed to get track analysis" });
  }
});

// Helper function to create an analysis job
async function createAnalysisJob(trackId, inputPath) {
  const jobId = uuidv4();
  logger.info("Creating new analysis job record", {
    kwargs: { jobId, trackId, inputPath },
  });

  // Create job record
  const jobData = {
    id: jobId,
    trackId,
    status: "queued",
    progress: 0,
    createdAt: new Date().toISOString(),
    inputPath,
    error: null,
  };

  // Store job data in Redis
  await redis.set(`analysis:job:${jobId}`, JSON.stringify(jobData));
  logger.debug("Stored job data in Redis", { kwargs: { jobId } });

  // Add to track's jobs list
  await redis.sadd(`track:${trackId}:analysis:jobs`, jobId);
  logger.debug("Added jobId to track's jobs set", {
    kwargs: { trackId, jobId },
  });

  // Publish job creation event
  pub.publish("analysis:job:created", JSON.stringify(jobData));
  logger.debug("Published job creation event", { kwargs: { jobId } });

  // Start analysis asynchronously
  analyzeTrack(jobId, trackId, inputPath);

  return {
    jobId,
    trackId,
    status: "queued",
  };
}

// Function to analyze a track using Python
async function analyzeTrack(jobId, trackId, inputPath) {
  try {
    logger.info("Starting analysis for track", {
      kwargs: { jobId, trackId, inputPath },
    });
    // Update job status to processing
    const jobData = JSON.parse(await redis.get(`analysis:job:${jobId}`));
    jobData.status = "processing";
    jobData.progress = 10;
    jobData.startedAt = new Date().toISOString();

    await redis.set(`analysis:job:${jobId}`, JSON.stringify(jobData));
    pub.publish("analysis:job:updated", JSON.stringify(jobData));
    logger.debug("Updated job status to processing", { kwargs: { jobId } });

    // Run the Python analyzer script
    const analyzer = spawn("python3", [
      path.join(__dirname, "analyzer.py"),
      inputPath,
      trackId,
      jobId,
      process.env.REDIS_URL || "redis://redis:6379",
    ]);

    let stdoutData = "";
    let stderrData = "";

    analyzer.stdout.on("data", (data) => {
      stdoutData += data.toString();
      logger.info(`analyzer stdout: ${data}`);
      logger.debug("Analyzer stdout data", {
        kwargs: { jobId, data: data.toString() },
      });

      // Try to extract progress information
      const progressMatch = data.toString().match(/Progress: (\d+)%/);
      if (progressMatch && progressMatch[1]) {
        const progress = parseInt(progressMatch[1], 10);

        // Update job progress
        jobData.progress = Math.min(10 + progress * 0.9, 100);
        redis.set(`analysis:job:${jobId}`, JSON.stringify(jobData));
        pub.publish("analysis:job:updated", JSON.stringify(jobData));
        logger.debug("Updated job progress", {
          kwargs: { jobId, progress: jobData.progress },
        });
      }
    });

    analyzer.stderr.on("data", (data) => {
      stderrData += data.toString();
      logger.error(`analyzer stderr: ${data}`);
      logger.debug("Analyzer stderr data", {
        kwargs: { jobId, data: data.toString() },
      });
    });

    analyzer.on("close", async (code) => {
      logger.info("Analyzer process closed", { kwargs: { jobId, code } });
      if (code === 0) {
        // Get the analysis result from Redis
        const analysisResult = await redis.get(`track:${trackId}:analysis`);

        if (analysisResult) {
          // Update job status to completed
          jobData.status = "completed";
          jobData.progress = 100;
          jobData.completedAt = new Date().toISOString();
          jobData.result = JSON.parse(analysisResult);

          await redis.set(`analysis:job:${jobId}`, JSON.stringify(jobData));
          pub.publish("analysis:job:completed", JSON.stringify(jobData));

          logger.info(
            `Analysis completed successfully for trackId: ${trackId}, jobId: ${jobId}`,
            { kwargs: { jobId, trackId } }
          );
        } else {
          // No analysis result found
          logger.error("No analysis result found after successful analysis", {
            code: 500,
            kwargs: { jobId, trackId },
          });
          throw new Error("No analysis result found after successful analysis");
        }
      } else {
        logger.error("Analyzer exited with error code", {
          code,
          kwargs: { jobId, stderrData },
        });

        // Handle the error more gracefully
        jobData.status = "error";
        jobData.error = `Analyzer exited with code ${code || "unknown"}: ${
          stderrData || "Process was likely killed due to memory constraints"
        }`;
        jobData.completedAt = new Date().toISOString();

        await redis.set(`analysis:job:${jobId}`, JSON.stringify(jobData));
        pub.publish("analysis:job:error", JSON.stringify(jobData));
      }
    });
  } catch (error) {
    logger.error(`Error analyzing track: ${error.message}`, {
      code: error.code || 500,
      message: error.message,
      kwargs: { jobId, trackId, inputPath, stack: error.stack },
    });
    // Update job status to error
    const jobData = JSON.parse(await redis.get(`analysis:job:${jobId}`));
    jobData.status = "error";
    jobData.error = error.message;
    jobData.completedAt = new Date().toISOString();

    await redis.set(`analysis:job:${jobId}`, JSON.stringify(jobData));
    pub.publish("analysis:job:error", JSON.stringify(jobData));
  }
}

// Start the server
app.listen(PORT, () => {
  logger.info(`Analysis service listening on port ${PORT}`);
});
