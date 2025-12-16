/**
 * Download Routes
 *
 * @module routes/download
 * @description Audio download using spotdl
 * @migrated_from backend/download/src/index.js
 *
 * Endpoints:
 * - POST /api/download/track - Download track from Spotify URL
 * - GET /api/download/job/:jobId - Get download job status
 * - GET /api/download/track/:trackId - Get downloaded track info
 *
 * @author Sound Forge Alchemy Team
 * @version 2.0.0
 */

import { Router, Request, Response } from 'express';
import { spawn } from 'child_process';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';

const router = Router();

// Validation schemas
const downloadSchema = Joi.object({
  trackId: Joi.string().uuid().required(),
  spotifyUrl: Joi.string().uri().required(),
  quality: Joi.string().valid('128k', '192k', '256k', '320k').default('320k')
});

/**
 * POST /api/download/track
 * Start download job for a track
 */
router.post('/track', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const supabase = req.app.locals.supabase;
  const io = req.app.locals.io;

  try {
    // Validate request
    const { error: validationError, value } = downloadSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationError.details
      });
    }

    const { trackId, spotifyUrl, quality } = value;
    const jobId = uuidv4();

    logger.info(`Starting download job ${jobId} for track ${trackId}`);

    // Create job in database
    const { data: job, error: dbError } = await supabase
      .from('jobs')
      .insert({
        id: jobId,
        track_id: trackId,
        type: 'download',
        status: 'queued',
        progress: 0,
        metadata: { spotifyUrl, quality }
      })
      .select()
      .single();

    if (dbError) {
      logger.error('Failed to create download job:', dbError);
      return res.status(500).json({
        error: 'Failed to create job',
        message: dbError.message
      });
    }

    // Start download in background
    startDownload(jobId, trackId, spotifyUrl, quality, supabase, io, logger);

    res.json({
      success: true,
      jobId,
      trackId,
      status: 'queued'
    });

  } catch (error) {
    logger.error('Error starting download:', error);
    res.status(500).json({
      error: 'Failed to start download',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/download/job/:jobId
 * Get download job status
 */
router.get('/job/:jobId', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const supabase = req.app.locals.supabase;
  const { jobId } = req.params;

  try {
    const { data: job, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('type', 'download')
      .single();

    if (error || !job) {
      return res.status(404).json({
        error: 'Job not found'
      });
    }

    res.json({
      success: true,
      job
    });

  } catch (error) {
    logger.error('Error fetching job:', error);
    res.status(500).json({
      error: 'Failed to fetch job',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/download/health
 * Health check
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'download'
  });
});

/**
 * Background download worker
 */
async function startDownload(
  jobId: string,
  trackId: string,
  spotifyUrl: string,
  quality: string,
  supabase: any,
  io: any,
  logger: any
) {
  const outputDir = process.env.AUDIO_OUTPUT_DIR || '/tmp/audio';
  const outputPath = path.join(outputDir, trackId);

  try {
    // Ensure output directory exists
    await fs.mkdir(outputPath, { recursive: true });

    // Update job status to processing
    await supabase
      .from('jobs')
      .update({
        status: 'processing',
        progress: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    io.to(`job:${jobId}`).emit('job:update', {
      jobId,
      status: 'processing',
      progress: 0
    });

    // Spawn spotdl process
    const spotdl = spawn('spotdl', [
      spotifyUrl,
      '--output', outputPath,
      '--format', 'mp3',
      '--bitrate', quality,
      '--threads', '4'
    ]);

    let output = '';
    let errorOutput = '';

    spotdl.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      logger.info(`spotdl stdout: ${text}`);

      // Parse progress if available
      const progressMatch = text.match(/(\d+)%/);
      if (progressMatch) {
        const progress = parseInt(progressMatch[1]);
        io.to(`job:${jobId}`).emit('job:update', {
          jobId,
          status: 'processing',
          progress
        });
      }
    });

    spotdl.stderr.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      logger.error(`spotdl stderr: ${text}`);
    });

    spotdl.on('close', async (code) => {
      if (code === 0) {
        // Success
        logger.info(`Download job ${jobId} completed successfully`);

        // Find downloaded file
        const files = await fs.readdir(outputPath);
        const audioFile = files.find(f => f.endsWith('.mp3'));

        if (audioFile) {
          const filePath = path.join(outputPath, audioFile);
          const stats = await fs.stat(filePath);

          // Update job status
          await supabase
            .from('jobs')
            .update({
              status: 'completed',
              progress: 100,
              result: {
                filePath,
                fileName: audioFile,
                fileSize: stats.size
              },
              updated_at: new Date().toISOString()
            })
            .eq('id', jobId);

          io.to(`job:${jobId}`).emit('job:complete', {
            jobId,
            status: 'completed',
            progress: 100,
            filePath
          });

        } else {
          throw new Error('Downloaded file not found');
        }

      } else {
        // Error
        throw new Error(`spotdl exited with code ${code}: ${errorOutput}`);
      }
    });

  } catch (error) {
    logger.error(`Download job ${jobId} failed:`, error);

    await supabase
      .from('jobs')
      .update({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    io.to(`job:${jobId}`).emit('job:error', {
      jobId,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default router;
