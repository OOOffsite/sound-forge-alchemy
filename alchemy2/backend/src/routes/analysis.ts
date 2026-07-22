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
 * @license MIT
 */

import { Router, Request, Response } from 'express';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import type {
  AnalysisFeature,
  AnalysisResult,
  AnalyzeRequest,
  AnalyzeResponse,
  JobStatusResponse,
  AnalysisJobMetadata
} from '../types/analysis.js';

const router = Router();

// Validation schemas
const analyzeSchema = Joi.object({
  trackId: Joi.string().uuid().required(),
  audioFilePath: Joi.string().required(),
  features: Joi.array()
    .items(
      Joi.string().valid('tempo', 'key', 'energy', 'spectral', 'mfcc', 'chroma', 'all')
    )
    .min(1)
    .default(['tempo', 'key', 'energy'])
});

/**
 * POST /api/analysis/analyze
 * Start audio analysis job
 *
 * @route POST /api/analysis/analyze
 * @group Analysis - Audio analysis operations
 * @param {AnalyzeRequest} req.body - Analysis request parameters
 * @returns {AnalyzeResponse} 200 - Analysis job created successfully
 * @returns {Error} 400 - Validation error
 * @returns {Error} 500 - Internal server error
 *
 * @example request
 * {
 *   "trackId": "123e4567-e89b-12d3-a456-426614174000",
 *   "audioFilePath": "/tmp/audio/track.mp3",
 *   "features": ["tempo", "key", "energy"]
 * }
 *
 * @example response
 * {
 *   "success": true,
 *   "jobId": "987fbc97-4bed-5078-9f07-9141ba07c9f3",
 *   "trackId": "123e4567-e89b-12d3-a456-426614174000",
 *   "status": "queued"
 * }
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
 *
 * @route GET /api/analysis/job/:jobId
 * @group Analysis - Audio analysis operations
 * @param {string} jobId.path.required - Job ID (UUID)
 * @returns {JobStatusResponse} 200 - Job status retrieved successfully
 * @returns {Error} 404 - Job not found
 * @returns {Error} 500 - Internal server error
 *
 * @example response - completed job
 * {
 *   "success": true,
 *   "job": {
 *     "id": "987fbc97-4bed-5078-9f07-9141ba07c9f3",
 *     "track_id": "123e4567-e89b-12d3-a456-426614174000",
 *     "type": "analysis",
 *     "status": "completed",
 *     "progress": 100,
 *     "result": {
 *       "tempo": 128.5,
 *       "key": "C major",
 *       "energy": 0.87
 *     }
 *   }
 * }
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
 * Update job status in database
 */
async function updateJobStatus(
  supabase: any,
  jobId: string,
  status: 'queued' | 'processing' | 'completed' | 'error',
  updates: {
    progress?: number;
    result?: AnalysisResult;
    error?: string;
  } = {}
): Promise<void> {
  await supabase
    .from('jobs')
    .update({
      status,
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId);
}

/**
 * Emit Socket.IO event for job status change
 */
function emitJobEvent(
  io: any,
  jobId: string,
  event: 'job:update' | 'job:complete' | 'job:error',
  data: Record<string, any>
): void {
  io.to(`job:${jobId}`).emit(event, {
    jobId,
    ...data
  });
}

/**
 * Store analysis results in database
 */
async function storeAnalysisResults(
  supabase: any,
  trackId: string,
  results: AnalysisResult,
  logger: any
): Promise<void> {
  const { data: analysis, error: dbError } = await supabase
    .from('analysis_results')
    .insert({
      track_id: trackId,
      tempo: results.tempo,
      key: results.key,
      energy: results.energy,
      features: results
    })
    .select()
    .single();

  if (dbError) {
    logger.error('Failed to store analysis results:', dbError);
  }
}

/**
 * Spawn and configure Python analyzer process
 */
function spawnAnalyzer(
  audioFilePath: string,
  features: AnalysisFeature[],
  logger: any
): ChildProcessWithoutNullStreams {
  const analyzerScript = path.join(__dirname, '../../python/analyzer.py');
  const pythonExecutable = process.env.PYTHON_EXECUTABLE || 'python';

  logger.debug(`Spawning analyzer: ${pythonExecutable} ${analyzerScript}`);
  logger.debug(`Audio path: ${audioFilePath}`);
  logger.debug(`Features: ${features.join(',')}`);

  return spawn(pythonExecutable, [
    analyzerScript,
    audioFilePath,
    '--features', features.join(','),
    '--output', 'json'
  ]);
}

/**
 * Background analysis worker
 */
async function startAnalysis(
  jobId: string,
  trackId: string,
  audioFilePath: string,
  features: AnalysisFeature[],
  supabase: any,
  io: any,
  logger: any
): Promise<void> {
  try {
    // Update job status to processing
    await updateJobStatus(supabase, jobId, 'processing', { progress: 0 });
    emitJobEvent(io, jobId, 'job:update', {
      status: 'processing',
      progress: 0
    });

    // Spawn Python analyzer
    const analyzer = spawnAnalyzer(audioFilePath, features, logger);

    let output = '';
    let errorOutput = '';

    analyzer.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      output += text;
      logger.info(`analyzer stdout: ${text}`);
    });

    analyzer.stderr.on('data', (data: Buffer) => {
      const text = data.toString();
      errorOutput += text;
      logger.warn(`analyzer stderr: ${text}`);
    });

    analyzer.on('close', async (code: number | null) => {
      try {
        if (code === 0) {
          // Success - parse JSON output
          logger.info(`Analysis job ${jobId} completed successfully`);

          let analysisResults: AnalysisResult;
          try {
            analysisResults = JSON.parse(output) as AnalysisResult;
          } catch (parseError) {
            throw new Error(`Failed to parse analysis results: ${parseError}`);
          }

          // Store analysis results in database
          await storeAnalysisResults(supabase, trackId, analysisResults, logger);

          // Update job status to completed
          await updateJobStatus(supabase, jobId, 'completed', {
            progress: 100,
            result: analysisResults
          });

          // Emit completion event
          emitJobEvent(io, jobId, 'job:complete', {
            status: 'completed',
            progress: 100,
            results: analysisResults
          });

        } else {
          // Error - analyzer failed
          throw new Error(`analyzer exited with code ${code}: ${errorOutput}`);
        }
      } catch (closeError) {
        // Handle any errors during result processing
        logger.error(`Analysis job ${jobId} failed during result processing:`, closeError);

        const errorMessage = closeError instanceof Error ? closeError.message : 'Unknown error';

        // Update job status to error
        await updateJobStatus(supabase, jobId, 'error', {
          error: errorMessage
        });

        // Emit error event
        emitJobEvent(io, jobId, 'job:error', {
          status: 'error',
          error: errorMessage
        });
      }
    });

  } catch (error) {
    logger.error(`Analysis job ${jobId} failed:`, error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Update job status to error
    await updateJobStatus(supabase, jobId, 'error', {
      error: errorMessage
    });

    // Emit error event
    emitJobEvent(io, jobId, 'job:error', {
      status: 'error',
      error: errorMessage
    });
  }
}

export default router;
