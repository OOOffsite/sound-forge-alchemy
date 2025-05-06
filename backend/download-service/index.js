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

// Constants
const AUDIO_DATA_PATH = process.env.AUDIO_DATA_PATH || '/app/audio_data';
const PORT = process.env.PORT || 3002;

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Ensure audio data directory exists
if (!fs.existsSync(AUDIO_DATA_PATH)) {
  fs.mkdirSync(AUDIO_DATA_PATH, { recursive: true });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send({ status: 'ok' });
});

// Download a track from Spotify
app.post('/track', async (req, res) => {
  try {
    const { trackId, spotifyUrl, trackInfo } = req.body;
    
    if (!trackId || (!spotifyUrl && !trackInfo)) {
      return res.status(400).json({ error: 'Track ID and either Spotify URL or track info are required' });
    }
    
    const jobId = uuidv4();
    const trackDir = path.join(AUDIO_DATA_PATH, trackId);
    
    // Create directory for the track
    if (!fs.existsSync(trackDir)) {
      fs.mkdirSync(trackDir, { recursive: true });
    }
    
    // Create job record
    const jobData = {
      id: jobId,
      trackId,
      status: 'queued',
      progress: 0,
      createdAt: new Date().toISOString(),
      outputPath: null,
      error: null
    };
    
    // Store job data in Redis
    await redis.set(`download:job:${jobId}`, JSON.stringify(jobData));
    
    // Add to track's jobs list
    await redis.sadd(`track:${trackId}:jobs`, jobId);
    
    // Publish job creation event
    pub.publish('download:job:created', JSON.stringify(jobData));
    
    // Start download process asynchronously
    downloadTrack(jobId, trackId, spotifyUrl, trackInfo, trackDir);
    
    // Respond with job ID
    res.status(202).json({
      jobId,
      trackId,
      status: 'queued',
      message: 'Download job created successfully'
    });
    
  } catch (error) {
    console.error('Error creating download job:', error);
    res.status(500).json({ error: 'Failed to create download job' });
  }
});

// Get download job status
app.get('/job/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    // Get job data from Redis
    const jobData = await redis.get(`download:job:${jobId}`);
    
    if (!jobData) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json(JSON.parse(jobData));
    
  } catch (error) {
    console.error('Error getting job status:', error);
    res.status(500).json({ error: 'Failed to get job status' });
  }
});

// Get track download status
app.get('/track/:trackId', async (req, res) => {
  try {
    const { trackId } = req.params;
    
    // Get track's jobs from Redis
    const jobIds = await redis.smembers(`track:${trackId}:jobs`);
    
    if (!jobIds || jobIds.length === 0) {
      return res.status(404).json({ error: 'No download jobs found for this track' });
    }
    
    // Get the latest job
    const latestJobId = jobIds[jobIds.length - 1];
    const jobData = await redis.get(`download:job:${latestJobId}`);
    
    if (!jobData) {
      return res.status(404).json({ error: 'Job data not found' });
    }
    
    const parsedJobData = JSON.parse(jobData);
    
    // If the job is complete, check if the file exists
    if (parsedJobData.status === 'completed' && parsedJobData.outputPath) {
      if (!fs.existsSync(parsedJobData.outputPath)) {
        parsedJobData.status = 'error';
        parsedJobData.error = 'Output file not found';
      }
    }
    
    res.json(parsedJobData);
    
  } catch (error) {
    console.error('Error getting track status:', error);
    res.status(500).json({ error: 'Failed to get track status' });
  }
});

// Function to download a track using spotdl
async function downloadTrack(jobId, trackId, spotifyUrl, trackInfo, trackDir) {
  try {
    // Update job status to processing
    const jobData = JSON.parse(await redis.get(`download:job:${jobId}`));
    jobData.status = 'processing';
    jobData.progress = 10;
    jobData.startedAt = new Date().toISOString();
    
    await redis.set(`download:job:${jobId}`, JSON.stringify(jobData));
    pub.publish('download:job:updated', JSON.stringify(jobData));
    
    // Determine the download URL
    const downloadUrl = spotifyUrl || `https://open.spotify.com/track/${trackId}`;
    const outputPath = path.join(trackDir, 'original.mp3');
    
    // Execute spotdl command
    const spotdl = spawn('python', [
      '-m', 'spotdl',
      downloadUrl,
      '--output', trackDir,
      '--output-format', 'mp3',
      '--threads', '1',
      '--format', 'mp3',
      '--bitrate', '320k'
    ]);
    
    let stdoutData = '';
    let stderrData = '';
    
    spotdl.stdout.on('data', (data) => {
      stdoutData += data.toString();
      console.log(`spotdl stdout: ${data}`);
      
      // Try to extract progress information
      const progressMatch = data.toString().match(/Progress: (\d+)%/);
      if (progressMatch && progressMatch[1]) {
        const progress = parseInt(progressMatch[1], 10);
        
        // Update job progress
        jobData.progress = Math.min(10 + (progress * 0.8), 90); // Reserve 10% at start and end
        redis.set(`download:job:${jobId}`, JSON.stringify(jobData));
        pub.publish('download:job:updated', JSON.stringify(jobData));
      }
    });
    
    spotdl.stderr.on('data', (data) => {
      stderrData += data.toString();
      console.error(`spotdl stderr: ${data}`);
    });
    
    spotdl.on('close', async (code) => {
      try {
        if (code === 0) {
          // Find the downloaded file
          const files = fs.readdirSync(trackDir);
          const mp3Files = files.filter(file => file.endsWith('.mp3'));
          
          if (mp3Files.length > 0) {
            // If multiple files, use the largest one
            let largestFile = mp3Files[0];
            let largestSize = 0;
            
            for (const file of mp3Files) {
              const filePath = path.join(trackDir, file);
              const stats = fs.statSync(filePath);
              
              if (stats.size > largestSize) {
                largestSize = stats.size;
                largestFile = file;
              }
            }
            
            // Rename the largest file to original.mp3
            const originalFile = path.join(trackDir, largestFile);
            fs.renameSync(originalFile, outputPath);
            
            // Clean up other mp3 files
            for (const file of mp3Files) {
              if (file !== largestFile) {
                fs.unlinkSync(path.join(trackDir, file));
              }
            }
            
            // Update job status to completed
            jobData.status = 'completed';
            jobData.progress = 100;
            jobData.completedAt = new Date().toISOString();
            jobData.outputPath = outputPath;
            
            await redis.set(`download:job:${jobId}`, JSON.stringify(jobData));
            pub.publish('download:job:completed', JSON.stringify(jobData));
            
            console.log(`Download completed successfully for trackId: ${trackId}, jobId: ${jobId}`);
          } else {
            throw new Error('No MP3 files found after download');
          }
        } else {
          throw new Error(`spotdl exited with code ${code}: ${stderrData}`);
        }
      } catch (error) {
        console.error(`Error in download completion handler: ${error.message}`);
        
        // Update job status to error
        jobData.status = 'error';
        jobData.progress = 0;
        jobData.error = error.message;
        jobData.completedAt = new Date().toISOString();
        
        await redis.set(`download:job:${jobId}`, JSON.stringify(jobData));
        pub.publish('download:job:error', JSON.stringify(jobData));
      }
    });
    
  } catch (error) {
    console.error(`Error downloading track: ${error.message}`);
    
    // Update job status to error
    const jobData = JSON.parse(await redis.get(`download:job:${jobId}`));
    jobData.status = 'error';
    jobData.error = error.message;
    jobData.completedAt = new Date().toISOString();
    
    await redis.set(`download:job:${jobId}`, JSON.stringify(jobData));
    pub.publish('download:job:error', JSON.stringify(jobData));
  }
}

// Start the server
app.listen(PORT, () => {
  console.log(`Download service listening on port ${PORT}`);
});