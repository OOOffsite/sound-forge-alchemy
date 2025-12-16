/**
 * Processing Routes
 *
 * @module routes/processing
 * @description Stem separation using Demucs
 * @migrated_from backend/processing/src/index.js
 *
 * Endpoints:
 * - POST /api/processing/separate - Start stem separation job
 * - GET /api/processing/job/:jobId - Get processing job status
 * - GET /api/processing/models - List available Demucs models
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
const separateSchema = Joi.object({
  trackId: Joi.string().uuid().required(),
  audioFilePath: Joi.string().required(),
  model: Joi.string().valid('htdemucs', 'htdemucs_ft', 'mdx_extra').default('htdemucs'),
  stems: Joi.array().items(Joi.string().valid('vocals', 'drums', 'bass', 'other')).default(['vocals', 'drums', 'bass', 'other'])
});

/**
 * GET /api/processing/models
 * List available Demucs models
 */
router.get('/models', (req: Request, res: Response) => {
  res.json({
    success: true,
    models: [
      {
        name: 'htdemucs',
        description: 'Hybrid Transformer Demucs (default)',
        quality: 'high',
        speed: 'medium'
      },
      {
        name: 'htdemucs_ft',
        description: 'Hybrid Transformer Demucs Fine-Tuned',
        quality: 'highest',
        speed: 'slow'
      },
      {
        name: 'mdx_extra',
        description: 'MDX Extra',
        quality: 'medium',
        speed: 'fast'
      }
    ]
  });
});

/**
 * POST /api/processing/separate
 * Start stem separation job
 */
router.post('/separate', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const supabase = req.app.locals.supabase;
  const io = req.app.locals.io;

  try {
    // Validate request
    const { error: validationError, value } = separateSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationError.details
      });
    }

    const { trackId, audioFilePath, model, stems } = value;
    const jobId = uuidv4();

    logger.info(`Starting separation job ${jobId} for track ${trackId}`);

    // Create job in database
    const { data: job, error: dbError } = await supabase
      .from('jobs')
      .insert({
        id: jobId,
        track_id: trackId,
        type: 'processing',
        status: 'queued',
        progress: 0,
        metadata: { audioFilePath, model, stems }
      })
      .select()
      .single();

    if (dbError) {
      logger.error('Failed to create processing job:', dbError);
      return res.status(500).json({
        error: 'Failed to create job',
        message: dbError.message
      });
    }

    // Start separation in background
    startSeparation(jobId, trackId, audioFilePath, model, stems, supabase, io, logger);

    res.json({
      success: true,
      jobId,
      trackId,
      status: 'queued'
    });

  } catch (error) {
    logger.error('Error starting separation:', error);
    res.status(500).json({
      error: 'Failed to start separation',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/processing/job/:jobId
 * Get processing job status
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
      .eq('type', 'processing')
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
 * GET /api/processing/health
 * Health check
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'processing'
  });
});

/**
 * Background separation worker
 */
async function startSeparation(
  jobId: string,
  trackId: string,
  audioFilePath: string,
  model: string,
  stems: string[],
  supabase: any,
  io: any,
  logger: any
) {
  const outputDir = process.env.STEMS_OUTPUT_DIR || '/tmp/stems';
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

    // Spawn Demucs process
    const demucs = spawn('python', [
      '-m', 'demucs',
      '--two-stems', stems.join(','),
      '--name', model,
      '--out', outputPath,
      audioFilePath
    ]);

    let output = '';
    let errorOutput = '';

    demucs.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      logger.info(`demucs stdout: ${text}`);

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

    demucs.stderr.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      logger.warn(`demucs stderr: ${text}`);
    });

    demucs.on('close', async (code) => {
      if (code === 0) {
        // Success
        logger.info(`Separation job ${jobId} completed successfully`);

        // Find separated stems
        const modelOutputPath = path.join(outputPath, model);
        const stemFiles = await findStemFiles(modelOutputPath);

        // Store stem metadata in database
        const stemRecords = await Promise.all(
          stemFiles.map(async (stem) => {
            const stats = await fs.stat(stem.path);
            return {
              track_id: trackId,
              type: stem.type,
              file_path: stem.path,
              file_size: stats.size
            };
          })
        );

        await supabase.from('stems').insert(stemRecords);

        // Update job status
        await supabase
          .from('jobs')
          .update({
            status: 'completed',
            progress: 100,
            result: {
              stems: stemFiles
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);

        io.to(`job:${jobId}`).emit('job:complete', {
          jobId,
          status: 'completed',
          progress: 100,
          stems: stemFiles
        });

      } else {
        // Error
        throw new Error(`demucs exited with code ${code}: ${errorOutput}`);
      }
    });

  } catch (error) {
    logger.error(`Separation job ${jobId} failed:`, error);

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

/**
 * Find separated stem files in output directory
 */
async function findStemFiles(modelOutputPath: string): Promise<Array<{ type: string; path: string }>> {
  const stemTypes = ['vocals', 'drums', 'bass', 'other'];
  const stems: Array<{ type: string; path: string }> = [];

  for (const type of stemTypes) {
    const stemPath = path.join(modelOutputPath, `${type}.wav`);
    try {
      await fs.access(stemPath);
      stems.push({ type, path: stemPath });
    } catch (error) {
      // Stem file not found (might not be requested)
    }
  }

  return stems;
}

export default router;
