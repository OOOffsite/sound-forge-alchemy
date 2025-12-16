/**
 * Analysis Routes
 *
 * @module routes/analysis
 * @description Audio analysis using librosa
 * @migrated_from backend/analysis/src/index.js
 *
 * Endpoints:
 * - POST /api/analysis/analyze - Analyze audio file
 * - GET /api/analysis/job/:jobId - Get analysis job status
 *
 * @author Sound Forge Alchemy Team
 * @version 2.0.0
 */

import { Router, Request, Response } from 'express';
import { spawn } from 'child_process';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const router = Router();

// Validation schemas
const analyzeSchema = Joi.object({
  trackId: Joi.string().uuid().required(),
  audioFilePath: Joi.string().required(),
  features: Joi.array().items(
    Joi.string().valid('tempo', 'key', 'energy', 'spectral', 'mfcc', 'chroma', 'all')
  ).default(['tempo', 'key', 'energy'])
});

/**
 * POST /api/analysis/analyze
 * Start audio analysis job
 */
router.post('/analyze', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const supabase = req.app.locals.supabase;
  const io = req.app.locals.io;

  try {
    // Validate request
    const { error: validationError, value } = analyzeSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationError.details
      });
    }

    const { trackId, audioFilePath, features } = value;
    const jobId = uuidv4();

    logger.info(`Starting analysis job ${jobId} for track ${trackId}`);

    // Create job in database
    const { data: job, error: dbError } = await supabase
      .from('jobs')
      .insert({
        id: jobId,
        track_id: trackId,
        type: 'analysis',
        status: 'queued',
        progress: 0,
        metadata: { audioFilePath, features }
      })
      .select()
      .single();

    if (dbError) {
      logger.error('Failed to create analysis job:', dbError);
      return res.status(500).json({
        error: 'Failed to create job',
        message: dbError.message
      });
    }

    // Start analysis in background
    startAnalysis(jobId, trackId, audioFilePath, features, supabase, io, logger);

    res.json({
      success: true,
      jobId,
      trackId,
      status: 'queued'
    });

  } catch (error) {
    logger.error('Error starting analysis:', error);
    res.status(500).json({
      error: 'Failed to start analysis',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/analysis/job/:jobId
 * Get analysis job status
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
      .eq('type', 'analysis')
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
 * GET /api/analysis/health
 * Health check
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'analysis'
  });
});

/**
 * Background analysis worker
 */
async function startAnalysis(
  jobId: string,
  trackId: string,
  audioFilePath: string,
  features: string[],
  supabase: any,
  io: any,
  logger: any
) {
  const analyzerScript = path.join(__dirname, '../../python/analyzer.py');

  try {
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

    // Spawn Python analyzer
    const analyzer = spawn('python', [
      analyzerScript,
      audioFilePath,
      '--features', features.join(','),
      '--output', 'json'
    ]);

    let output = '';
    let errorOutput = '';

    analyzer.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      logger.info(`analyzer stdout: ${text}`);
    });

    analyzer.stderr.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      logger.warn(`analyzer stderr: ${text}`);
    });

    analyzer.on('close', async (code) => {
      if (code === 0) {
        // Success - parse JSON output
        logger.info(`Analysis job ${jobId} completed successfully`);

        let analysisResults;
        try {
          analysisResults = JSON.parse(output);
        } catch (parseError) {
          throw new Error(`Failed to parse analysis results: ${parseError}`);
        }

        // Store analysis results in database
        const { data: analysis, error: dbError } = await supabase
          .from('analysis_results')
          .insert({
            track_id: trackId,
            tempo: analysisResults.tempo,
            key: analysisResults.key,
            energy: analysisResults.energy,
            features: analysisResults
          })
          .select()
          .single();

        if (dbError) {
          logger.error('Failed to store analysis results:', dbError);
        }

        // Update job status
        await supabase
          .from('jobs')
          .update({
            status: 'completed',
            progress: 100,
            result: analysisResults,
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);

        io.to(`job:${jobId}`).emit('job:complete', {
          jobId,
          status: 'completed',
          progress: 100,
          results: analysisResults
        });

      } else {
        // Error
        throw new Error(`analyzer exited with code ${code}: ${errorOutput}`);
      }
    });

  } catch (error) {
    logger.error(`Analysis job ${jobId} failed:`, error);

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
