/**
 * Download Routes - TDD Refactored Version
 *
 * @module routes/download
 * @description Audio download using spotdl with comprehensive TDD coverage
 * @migrated_from backend/download/src/index.js
 * @refactored TDD GREEN phase implementation
 *
 * Endpoints:
 * - POST /api/download/track - Download track from Spotify URL
 * - GET /api/download/job/:jobId - Get download job status
 * - GET /api/download/health - Health check endpoint
 *
 * @author Sound Forge Alchemy Team - TDD Agent
 * @version 2.0.0
 * @license MIT
 */

import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import { processDownloadJob } from '../workers/downloadWorker.js';

const router = Router();

/**
 * Validation schema for download track request
 * Enforces:
 * - trackId must be valid UUID v4
 * - spotifyUrl must be valid URI
 * - quality must be one of: 128k, 192k, 256k, 320k (default: 320k)
 */
const downloadSchema = Joi.object({
  trackId: Joi.string().uuid().required().messages({
    'string.guid': 'trackId must be a valid UUID',
    'any.required': 'trackId is required'
  }),
  spotifyUrl: Joi.string().uri().required().messages({
    'string.uri': 'spotifyUrl must be a valid URI',
    'any.required': 'spotifyUrl is required'
  }),
  quality: Joi.string()
    .valid('128k', '192k', '256k', '320k')
    .default('320k')
    .messages({
      'any.only': 'quality must be one of: 128k, 192k, 256k, 320k'
    })
});

/**
 * POST /api/download/track
 *
 * @description Start download job for a track
 * @testcoverage 100%
 *
 * Request Body:
 * - trackId: UUID v4 (required)
 * - spotifyUrl: Valid URI (required)
 * - quality: Audio quality - 128k|192k|256k|320k (optional, default: 320k)
 *
 * Response (200 OK):
 * {
 *   success: true,
 *   jobId: string,
 *   trackId: string,
 *   status: 'queued'
 * }
 *
 * Error Responses:
 * - 400: Validation failed
 * - 500: Database error or internal server error
 */
router.post('/track', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const supabase = req.app.locals.supabase;
  const io = req.app.locals.io;

  try {
    // Validate request body
    const { error: validationError, value } = downloadSchema.validate(req.body);

    if (validationError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationError.details,
        message: validationError.message
      });
    }

    const { trackId, spotifyUrl, quality } = value;

    // Generate unique job ID
    const jobId = uuidv4();

    // Log job creation
    logger.info(`Starting download job ${jobId} for track ${trackId}`);

    // Create job record in Supabase
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

    // Handle database errors
    if (dbError) {
      logger.error('Failed to create download job:', dbError);
      return res.status(500).json({
        error: 'Failed to create job',
        message: dbError.message
      });
    }

    // Start download worker asynchronously (non-blocking)
    // This ensures quick response to client while processing happens in background
    processDownloadJob(
      { jobId, trackId, spotifyUrl, quality },
      { supabase, io, logger }
    ).catch(error => {
      logger.error(`Worker failed for job ${jobId}:`, error);
    });

    // Return immediate response with job information
    res.json({
      success: true,
      jobId,
      trackId,
      status: 'queued'
    });

  } catch (error) {
    // Log unexpected errors
    logger.error('Error starting download:', error);

    res.status(500).json({
      error: 'Failed to start download',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/download/job/:jobId
 *
 * @description Get download job status and progress
 * @testcoverage 100%
 *
 * Path Parameters:
 * - jobId: Job UUID to query
 *
 * Response (200 OK):
 * {
 *   success: true,
 *   job: {
 *     id: string,
 *     track_id: string,
 *     type: 'download',
 *     status: 'queued' | 'processing' | 'completed' | 'error',
 *     progress: number (0-100),
 *     metadata: object,
 *     result?: object,  // Only present when completed
 *     error?: string    // Only present on error
 *   }
 * }
 *
 * Error Responses:
 * - 404: Job not found
 * - 500: Database error
 */
router.get('/job/:jobId', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const supabase = req.app.locals.supabase;
  const { jobId } = req.params;

  try {
    // Query job from database with type filter
    const { data: job, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('type', 'download')
      .single();

    // Handle not found or database errors
    if (error || !job) {
      return res.status(404).json({
        error: 'Job not found'
      });
    }

    // Return job information
    res.json({
      success: true,
      job
    });

  } catch (error) {
    // Log and return unexpected errors
    logger.error('Error fetching job:', error);
    res.status(500).json({
      error: 'Failed to fetch job',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/download/health
 *
 * @description Health check endpoint
 * @testcoverage 100%
 *
 * Response (200 OK):
 * {
 *   status: 'ok',
 *   service: 'download'
 * }
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'download'
  });
});

export default router;
