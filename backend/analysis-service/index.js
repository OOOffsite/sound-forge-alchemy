require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Redis = require('ioredis');
const axios = require('axios');

// Initialize Redis client
const redis = new Redis(process.env.REDIS_URL);
const pub = new Redis(process.env.REDIS_URL);
const sub = new Redis(process.env.REDIS_URL);

// Constants
const AUDIO_DATA_PATH = process.env.AUDIO_DATA_PATH || '/app/audio_data';
const PORT = process.env.PORT || 3004;

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Listen for download completion events
sub.subscribe('download:job:completed');
sub.on('message', async (channel, message) => {
  if (channel === 'download:job:completed') {
    try {
      const jobData = JSON.parse(message);
      console.log(`Received download completion for job: ${jobData.id}`);
      
      // Automatically start analysis if it's a completed download
      if (jobData.status === 'completed' && jobData.outputPath) {
        const trackId = jobData.trackId;
        
        // Check if we should auto-analyze (based on a setting in Redis)
        const autoAnalyze = await redis.get(`track:${trackId}:autoAnalyze`);
        
        if (autoAnalyze === 'true') {
          console.log(`Auto-analyzing track: ${trackId}`);
          
          // Start analysis
          const analysisJob = await createAnalysisJob(trackId, jobData.outputPath);
          
          console.log(`Created auto-analysis job: ${analysisJob.jobId}`);
        }
      }
    } catch (error) {
      console.error('Error processing download completion message:', error);
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send({ status: 'ok' });
});

// Analyze a track
app.post('/analyze', async (req, res) => {
  try {
    const { trackId, inputPath } = req.body;
    
    if (!trackId) {
      return res.status(400).json({ error: 'Track ID is required' });
    }
    
    // If inputPath is not provided, try to find the downloaded track
    let trackPath = inputPath;
    if (!trackPath) {
      const trackDir = path.join(AUDIO_DATA_PATH, trackId);
      const originalFile = path.join(trackDir, 'original.mp3');
      
      if (fs.existsSync(originalFile)) {
        trackPath = originalFile;
      } else {
        return res.status(404).json({ error: 'Track file not found. Download the track first.' });
      }
    }
    
    // Create analysis job
    const analysisJob = await createAnalysisJob(trackId, trackPath);
    
    res.status(202).json({
      jobId: analysisJob.jobId,
      trackId,
      status: 'queued',
      message: 'Analysis job created successfully'
    });
    
  } catch (error) {
    console.error('Error creating analysis job:', error);
    res.status(500).json({ error: 'Failed to create analysis job' });
  }
});

// Get analysis job status
app.get('/job/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    // Get job data from Redis
    const jobData = await redis.get(`analysis:job:${jobId}`);
    
    if (!jobData) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json(JSON.parse(jobData));
    
  } catch (error) {
    console.error('Error getting job status:', error);
    res.status(500).json({ error: 'Failed to get job status' });
  }
});

// Get track analysis results
app.get('/track/:trackId', async (req, res) => {
  try {
    const { trackId } = req.params;
    
    // Get track's analysis results from Redis
    const analysisResult = await redis.get(`track:${trackId}:analysis`);
    
    if (!analysisResult) {
      // Check if there's an ongoing job
      const jobIds = await redis.smembers(`track:${trackId}:analysis:jobs`);
      
      if (!jobIds || jobIds.length === 0) {
        return res.status(404).json({ error: 'No analysis found for this track' });
      }
      
      // Get the latest job
      const latestJobId = jobIds[jobIds.length - 1];
      const jobData = await redis.get(`analysis:job:${latestJobId}`);
      
      if (!jobData) {
        return res.status(404).json({ error: 'Analysis job data not found' });
      }
      
      const parsedJobData = JSON.parse(jobData);
      return res.json({
        status: parsedJobData.status,
        progress: parsedJobData.progress,
        message: 'Analysis in progress',
        jobId: latestJobId
      });
    }
    
    res.json(JSON.parse(analysisResult));
    
  } catch (error) {
    console.error('Error getting track analysis:', error);
    res.status(500).json({ error: 'Failed to get track analysis' });
  }
});

// Helper function to create an analysis job
async function createAnalysisJob(trackId, inputPath) {
  const jobId = uuidv4();
  
  // Create job record
  const jobData = {
    id: jobId,
    trackId,
    status: 'queued',
    progress: 0,
    createdAt: new Date().toISOString(),
    inputPath,
    error: null
  };
  
  // Store job data in Redis
  await redis.set(`analysis:job:${jobId}`, JSON.stringify(jobData));
  
  // Add to track's jobs list
  await redis.sadd(`track:${trackId}:analysis:jobs`, jobId);
  
  // Publish job creation event
  pub.publish('analysis:job:created', JSON.stringify(jobData));
  
  // Start analysis asynchronously
  analyzeTrack(jobId, trackId, inputPath);
  
  return {
    jobId,
    trackId,
    status: 'queued'
  };
}

// Function to analyze a track using Python
async function analyzeTrack(jobId, trackId, inputPath) {
  try {
    // Update job status to processing
    const jobData = JSON.parse(await redis.get(`analysis:job:${jobId}`));
    jobData.status = 'processing';
    jobData.progress = 10;
    jobData.startedAt = new Date().toISOString();
    
    await redis.set(`analysis:job:${jobId}`, JSON.stringify(jobData));
    pub.publish('analysis:job:updated', JSON.stringify(jobData));
    
    // Run the Python analyzer script
    const analyzer = spawn('python', [
      path.join(__dirname, 'analyzer.py'),
      inputPath,
      trackId,
      jobId,
      process.env.REDIS_URL || 'redis://redis:6379'
    ]);
    
    let stdoutData = '';
    let stderrData = '';
    
    analyzer.stdout.on('data', (data) => {
      stdoutData += data.toString();
      console.log(`analyzer stdout: ${data}`);
      
      // Try to extract progress information
      const progressMatch = data.toString().match(/Progress: (\d+)%/);
      if (progressMatch && progressMatch[1]) {
        const progress = parseInt(progressMatch[1], 10);
        
        // Update job progress
        jobData.progress = Math.min(10 + (progress * 0.9), 100);
        redis.set(`analysis:job:${jobId}`, JSON.stringify(jobData));
        pub.publish('analysis:job:updated', JSON.stringify(jobData));
      }
    });
    
    analyzer.stderr.on('data', (data) => {
      stderrData += data.toString();
      console.error(`analyzer stderr: ${data}`);
    });
    
    analyzer.on('close', async (code) => {
      if (code === 0) {
        // Get the analysis result from Redis
        const analysisResult = await redis.get(`track:${trackId}:analysis`);
        
        if (analysisResult) {
          // Update job status to completed
          jobData.status = 'completed';
          jobData.progress = 100;
          jobData.completedAt = new Date().toISOString();
          jobData.result = JSON.parse(analysisResult);
          
          await redis.set(`analysis:job:${jobId}`, JSON.stringify(jobData));
          pub.publish('analysis:job:completed', JSON.stringify(jobData));
          
          console.log(`Analysis completed successfully for trackId: ${trackId}, jobId: ${jobId}`);
        } else {
          // No analysis result found
          throw new Error('No analysis result found after successful analysis');
        }
      } else {
        throw new Error(`analyzer exited with code ${code}: ${stderrData}`);
      }
    });
    
  } catch (error) {
    console.error(`Error analyzing track: ${error.message}`);
    
    // Update job status to error
    const jobData = JSON.parse(await redis.get(`analysis:job:${jobId}`));
    jobData.status = 'error';
    jobData.error = error.message;
    jobData.completedAt = new Date().toISOString();
    
    await redis.set(`analysis:job:${jobId}`, JSON.stringify(jobData));
    pub.publish('analysis:job:error', JSON.stringify(jobData));
  }
}

// Start the server
app.listen(PORT, () => {
  console.log(`Analysis service listening on port ${PORT}`);
});