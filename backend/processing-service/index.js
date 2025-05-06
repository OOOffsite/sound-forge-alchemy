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
const PORT = process.env.PORT || 3003;
const WEBSOCKET_SERVICE_URL = process.env.WEBSOCKET_SERVICE_URL || 'http://websocket-service:3006';

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Ensure audio data directory exists
if (!fs.existsSync(AUDIO_DATA_PATH)) {
  fs.mkdirSync(AUDIO_DATA_PATH, { recursive: true });
}

// Listen for download completion events
sub.subscribe('download:job:completed');
sub.on('message', async (channel, message) => {
  if (channel === 'download:job:completed') {
    try {
      const jobData = JSON.parse(message);
      console.log(`Received download completion for job: ${jobData.id}`);
      
      // Automatically start processing if it's a completed download
      if (jobData.status === 'completed' && jobData.outputPath) {
        const trackId = jobData.trackId;
        
        // Check if we should auto-process (based on a setting in Redis)
        const autoProcess = await redis.get(`track:${trackId}:autoProcess`);
        
        if (autoProcess === 'true') {
          console.log(`Auto-processing track: ${trackId}`);
          
          // Get default separation options
          const separationOptions = JSON.parse(await redis.get(`track:${trackId}:separationOptions`) || '{}');
          
          // Start processing
          const processingJob = await createProcessingJob(trackId, jobData.outputPath, separationOptions);
          
          // Notify the client via WebSocket service
          try {
            await axios.post(`${WEBSOCKET_SERVICE_URL}/notify`, {
              event: 'processing:started',
              data: {
                trackId,
                jobId: processingJob.jobId,
                status: 'processing',
                message: 'Processing started automatically after download'
              }
            });
          } catch (error) {
            console.error('Error notifying WebSocket service:', error);
          }
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

// Separate a track into stems
app.post('/separate', async (req, res) => {
  try {
    const { trackId, inputPath, options } = req.body;
    
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
    
    // Store separation options for this track
    if (options) {
      await redis.set(`track:${trackId}:separationOptions`, JSON.stringify(options));
    }
    
    // Create processing job
    const processingJob = await createProcessingJob(trackId, trackPath, options);
    
    res.status(202).json({
      jobId: processingJob.jobId,
      trackId,
      status: 'queued',
      message: 'Separation job created successfully'
    });
    
  } catch (error) {
    console.error('Error creating separation job:', error);
    res.status(500).json({ error: 'Failed to create separation job' });
  }
});

// Get processing job status
app.get('/job/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    // Get job data from Redis
    const jobData = await redis.get(`processing:job:${jobId}`);
    
    if (!jobData) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json(JSON.parse(jobData));
    
  } catch (error) {
    console.error('Error getting job status:', error);
    res.status(500).json({ error: 'Failed to get job status' });
  }
});

// Get track processing status and stems
app.get('/track/:trackId', async (req, res) => {
  try {
    const { trackId } = req.params;
    
    // Get track's jobs from Redis
    const jobIds = await redis.smembers(`track:${trackId}:processing:jobs`);
    
    if (!jobIds || jobIds.length === 0) {
      return res.status(404).json({ error: 'No processing jobs found for this track' });
    }
    
    // Get the latest job
    const latestJobId = jobIds[jobIds.length - 1];
    const jobData = await redis.get(`processing:job:${latestJobId}`);
    
    if (!jobData) {
      return res.status(404).json({ error: 'Job data not found' });
    }
    
    const parsedJobData = JSON.parse(jobData);
    
    // If the job is complete, get the stems information
    if (parsedJobData.status === 'completed' && parsedJobData.outputPath) {
      // Get the stems directory
      const stemsDir = parsedJobData.outputPath;
      
      if (!fs.existsSync(stemsDir)) {
        parsedJobData.status = 'error';
        parsedJobData.error = 'Stems directory not found';
        return res.json(parsedJobData);
      }
      
      // Get all the stems files
      const stemFiles = fs.readdirSync(stemsDir)
        .filter(file => file.endsWith('.mp3') || file.endsWith('.wav'))
        .map(file => {
          const stemPath = path.join(stemsDir, file);
          const stats = fs.statSync(stemPath);
          
          // Determine stem type from filename
          let stemType = 'other';
          if (file.toLowerCase().includes('vocal') || file.toLowerCase().includes('vocals')) {
            stemType = 'vocals';
          } else if (file.toLowerCase().includes('drum') || file.toLowerCase().includes('drums')) {
            stemType = 'drums';
          } else if (file.toLowerCase().includes('bass')) {
            stemType = 'bass';
          } else if (file.toLowerCase().includes('other')) {
            stemType = 'other';
          }
          
          return {
            name: file,
            path: stemPath,
            type: stemType,
            size: stats.size,
            lastModified: stats.mtime.toISOString()
          };
        });
      
      // Add stems to the response
      parsedJobData.stems = stemFiles;
    }
    
    res.json(parsedJobData);
    
  } catch (error) {
    console.error('Error getting track processing status:', error);
    res.status(500).json({ error: 'Failed to get track processing status' });
  }
});

// Helper function to create a processing job
async function createProcessingJob(trackId, inputPath, options = {}) {
  const jobId = uuidv4();
  const trackDir = path.join(AUDIO_DATA_PATH, trackId);
  const stemsDir = path.join(trackDir, 'stems');
  
  // Create directories
  if (!fs.existsSync(trackDir)) {
    fs.mkdirSync(trackDir, { recursive: true });
  }
  
  if (!fs.existsSync(stemsDir)) {
    fs.mkdirSync(stemsDir, { recursive: true });
  }
  
  // Default options
  const separationOptions = {
    model: options.model || 'htdemucs',
    twoStems: options.twoStems || false, // If true, separate into vocals and accompaniment only
    extractVocals: options.extractVocals !== false,
    extractBass: options.extractBass !== false,
    extractDrums: options.extractDrums !== false,
    extractOther: options.extractOther !== false,
    ...options
  };
  
  // Create job record
  const jobData = {
    id: jobId,
    trackId,
    status: 'queued',
    progress: 0,
    createdAt: new Date().toISOString(),
    inputPath,
    outputPath: stemsDir,
    options: separationOptions,
    error: null
  };
  
  // Store job data in Redis
  await redis.set(`processing:job:${jobId}`, JSON.stringify(jobData));
  
  // Add to track's jobs list
  await redis.sadd(`track:${trackId}:processing:jobs`, jobId);
  
  // Publish job creation event
  pub.publish('processing:job:created', JSON.stringify(jobData));
  
  // Set auto-process flag for this track
  if (options.autoProcess !== undefined) {
    await redis.set(`track:${trackId}:autoProcess`, options.autoProcess ? 'true' : 'false');
  }
  
  // Start processing asynchronously
  processSeparation(jobId, trackId, inputPath, stemsDir, separationOptions);
  
  return {
    jobId,
    trackId,
    status: 'queued'
  };
}

// Function to separate audio using Demucs
async function processSeparation(jobId, trackId, inputPath, outputPath, options) {
  try {
    // Update job status to processing
    const jobData = JSON.parse(await redis.get(`processing:job:${jobId}`));
    jobData.status = 'processing';
    jobData.progress = 5;
    jobData.startedAt = new Date().toISOString();
    
    await redis.set(`processing:job:${jobId}`, JSON.stringify(jobData));
    pub.publish('processing:job:updated', JSON.stringify(jobData));
    
    // Notify via WebSocket
    try {
      await axios.post(`${WEBSOCKET_SERVICE_URL}/notify`, {
        event: 'processing:update',
        data: {
          trackId,
          jobId,
          status: 'processing',
          progress: 5
        }
      });
    } catch (error) {
      console.error('Error notifying WebSocket service:', error);
    }
    
    // Prepare Demucs command
    const modelName = options.model || 'htdemucs';
    
    // Build the demucs command
    let args = [
      '-m', 'demucs.separate',
      '-n', modelName,
      '--mp3',
      '--mp3-bitrate', '320',
      '--two-stems', options.twoStems ? 'vocals' : 'no',
      '-o', path.dirname(outputPath),
      inputPath
    ];
    
    if (process.env.CUDA_VISIBLE_DEVICES) {
      args.push('--device', 'cuda');
    } else {
      args.push('--device', 'cpu');
    }
    
    console.log(`Running Demucs with args: ${args.join(' ')}`);
    
    // Execute Demucs command
    const demucs = spawn('python', args);
    
    let stdoutData = '';
    let stderrData = '';
    
    demucs.stdout.on('data', (data) => {
      stdoutData += data.toString();
      console.log(`demucs stdout: ${data}`);
      
      // Try to extract progress information
      const separator = options.twoStems ? 1 : 4;
      const progressMatch = data.toString().match(/Separated track (\d+)\/(\d+)/);
      
      if (progressMatch && progressMatch[1] && progressMatch[2]) {
        const current = parseInt(progressMatch[1], 10);
        const total = parseInt(progressMatch[2], 10);
        const progress = Math.min(5 + Math.floor((current / total) * 90), 95);
        
        // Update job progress
        jobData.progress = progress;
        redis.set(`processing:job:${jobId}`, JSON.stringify(jobData));
        pub.publish('processing:job:updated', JSON.stringify(jobData));
        
        // Notify via WebSocket
        try {
          axios.post(`${WEBSOCKET_SERVICE_URL}/notify`, {
            event: 'processing:update',
            data: {
              trackId,
              jobId,
              status: 'processing',
              progress
            }
          });
        } catch (error) {
          console.error('Error notifying WebSocket service:', error);
        }
      }
    });
    
    demucs.stderr.on('data', (data) => {
      stderrData += data.toString();
      console.error(`demucs stderr: ${data}`);
    });
    
    demucs.on('close', async (code) => {
      try {
        if (code === 0) {
          // Move the files to the right location
          const demucsOutputDir = path.join(path.dirname(outputPath), 'htdemucs', path.basename(inputPath, path.extname(inputPath)));
          
          if (fs.existsSync(demucsOutputDir)) {
            // Get all stem files
            const files = fs.readdirSync(demucsOutputDir);
            
            // Move all files to the output directory
            for (const file of files) {
              const sourcePath = path.join(demucsOutputDir, file);
              const targetPath = path.join(outputPath, file);
              
              fs.renameSync(sourcePath, targetPath);
            }
            
            // Clean up the demucs output directory
            fs.rmdirSync(demucsOutputDir, { recursive: true });
            
            // Update job status to completed
            jobData.status = 'completed';
            jobData.progress = 100;
            jobData.completedAt = new Date().toISOString();
            
            await redis.set(`processing:job:${jobId}`, JSON.stringify(jobData));
            pub.publish('processing:job:completed', JSON.stringify(jobData));
            
            // Notify via WebSocket
            try {
              await axios.post(`${WEBSOCKET_SERVICE_URL}/notify`, {
                event: 'processing:completed',
                data: {
                  trackId,
                  jobId,
                  status: 'completed',
                  progress: 100,
                  stems: fs.readdirSync(outputPath)
                    .filter(file => file.endsWith('.mp3') || file.endsWith('.wav'))
                }
              });
            } catch (error) {
              console.error('Error notifying WebSocket service:', error);
            }
            
            console.log(`Separation completed successfully for trackId: ${trackId}, jobId: ${jobId}`);
          } else {
            throw new Error(`Demucs output directory not found: ${demucsOutputDir}`);
          }
        } else {
          throw new Error(`Demucs exited with code ${code}: ${stderrData}`);
        }
      } catch (error) {
        console.error(`Error in separation completion handler: ${error.message}`);
        
        // Update job status to error
        jobData.status = 'error';
        jobData.progress = 0;
        jobData.error = error.message;
        jobData.completedAt = new Date().toISOString();
        
        await redis.set(`processing:job:${jobId}`, JSON.stringify(jobData));
        pub.publish('processing:job:error', JSON.stringify(jobData));
        
        // Notify via WebSocket
        try {
          await axios.post(`${WEBSOCKET_SERVICE_URL}/notify`, {
            event: 'processing:error',
            data: {
              trackId,
              jobId,
              status: 'error',
              error: error.message
            }
          });
        } catch (error) {
          console.error('Error notifying WebSocket service:', error);
        }
      }
    });
    
  } catch (error) {
    console.error(`Error separating audio: ${error.message}`);
    
    // Update job status to error
    const jobData = JSON.parse(await redis.get(`processing:job:${jobId}`));
    jobData.status = 'error';
    jobData.error = error.message;
    jobData.completedAt = new Date().toISOString();
    
    await redis.set(`processing:job:${jobId}`, JSON.stringify(jobData));
    pub.publish('processing:job:error', JSON.stringify(jobData));
    
    // Notify via WebSocket
    try {
      await axios.post(`${WEBSOCKET_SERVICE_URL}/notify`, {
        event: 'processing:error',
        data: {
          trackId,
          jobId,
          status: 'error',
          error: error.message
        }
      });
    } catch (error) {
      console.error('Error notifying WebSocket service:', error);
    }
  }
}

// Start the server
app.listen(PORT, () => {
  console.log(`Processing service listening on port ${PORT}`);
});