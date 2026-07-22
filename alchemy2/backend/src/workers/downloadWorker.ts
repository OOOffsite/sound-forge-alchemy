/**
 * Download Worker
 *
 * @module workers/downloadWorker
 * @description Asynchronous worker for processing audio download jobs using spotdl
 * @refactored Extracted from routes/download.ts for better separation of concerns
 *
 * Features:
 * - Non-blocking job processing
 * - Real-time progress tracking via Socket.IO
 * - Automatic error handling and retry logic
 * - File system management
 * - Supabase job state persistence
 *
 * @author Sound Forge Alchemy Team - TDD Agent
 * @version 2.0.0
 * @license MIT
 */

import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Server as SocketIOServer } from 'socket.io';
import type { Logger } from 'winston';

/**
 * Job processing options
 */
export interface DownloadJobOptions {
  jobId: string;
  trackId: string;
  spotifyUrl: string;
  quality: '128k' | '192k' | '256k' | '320k';
}

/**
 * Worker dependencies
 */
export interface WorkerDependencies {
  supabase: SupabaseClient | any;
  io: SocketIOServer | any;
  logger: Logger | any;
}

/**
 * Download job result
 */
export interface DownloadResult {
  filePath: string;
  fileName: string;
  fileSize: number;
}

/**
 * Process download job
 *
 * @description Main worker function that handles the complete download lifecycle
 * @testcoverage Integration tests
 *
 * @param options - Job configuration
 * @param dependencies - External dependencies (Supabase, Socket.IO, Logger)
 * @returns Promise that resolves when job completes or fails
 */
export async function processDownloadJob(
  options: DownloadJobOptions,
  dependencies: WorkerDependencies
): Promise<void> {
  const { jobId, trackId, spotifyUrl, quality } = options;
  const { supabase, io, logger } = dependencies;

  const outputDir = process.env.AUDIO_OUTPUT_DIR || '/tmp/audio';
  const outputPath = path.join(outputDir, trackId);

  try {
    // Step 1: Create output directory
    await createOutputDirectory(outputPath, logger);

    // Step 2: Update job status to processing
    await updateJobStatus(jobId, 'processing', 0, supabase, io, logger);

    // Step 3: Execute spotdl download
    const result = await executeSpotdlDownload(
      { jobId, trackId, spotifyUrl, quality, outputPath },
      { supabase, io, logger }
    );

    // Step 4: Update job with completion status
    await completeJob(jobId, result, supabase, io, logger);

  } catch (error) {
    // Handle all errors
    await handleJobError(jobId, error, supabase, io, logger);
  }
}

/**
 * Create output directory if it doesn't exist
 */
async function createOutputDirectory(outputPath: string, logger: any): Promise<void> {
  try {
    await fs.mkdir(outputPath, { recursive: true });
    logger.debug(`Created output directory: ${outputPath}`);
  } catch (error) {
    logger.error(`Failed to create output directory: ${outputPath}`, error);
    throw new Error(`Failed to create output directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update job status in database and emit Socket.IO event
 */
async function updateJobStatus(
  jobId: string,
  status: string,
  progress: number,
  supabase: any,
  io: any,
  logger: any
): Promise<void> {
  try {
    // Update database
    await supabase
      .from('jobs')
      .update({
        status,
        progress,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    // Emit Socket.IO event
    io.to(`job:${jobId}`).emit('job:update', {
      jobId,
      status,
      progress
    });

    logger.info(`Job ${jobId} status updated: ${status} (${progress}%)`);

  } catch (error) {
    logger.error(`Failed to update job status for ${jobId}:`, error);
    throw error;
  }
}

/**
 * Execute spotdl download process
 */
async function executeSpotdlDownload(
  config: {
    jobId: string;
    trackId: string;
    spotifyUrl: string;
    quality: string;
    outputPath: string;
  },
  dependencies: { supabase: any; io: any; logger: any }
): Promise<DownloadResult> {
  const { jobId, spotifyUrl, quality, outputPath } = config;
  const { io, logger } = dependencies;

  return new Promise((resolve, reject) => {
    // Spawn spotdl process
    const spotdl: ChildProcessWithoutNullStreams = spawn('spotdl', [
      spotifyUrl,
      '--output', outputPath,
      '--format', 'mp3',
      '--bitrate', quality,
      '--threads', '4'
    ]);

    let output = '';
    let errorOutput = '';

    // Capture stdout for logging and progress tracking
    spotdl.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      output += text;
      logger.info(`[spotdl:${jobId}] ${text.trim()}`);

      // Parse and emit progress updates
      const progressMatch = text.match(/(\d+)%/);
      if (progressMatch) {
        const progress = parseInt(progressMatch[1], 10);
        io.to(`job:${jobId}`).emit('job:update', {
          jobId,
          status: 'processing',
          progress
        });
      }
    });

    // Capture stderr for error diagnostics
    spotdl.stderr.on('data', (data: Buffer) => {
      const text = data.toString();
      errorOutput += text;
      logger.warn(`[spotdl:${jobId}:stderr] ${text.trim()}`);
    });

    // Handle process completion
    spotdl.on('close', async (code: number | null) => {
      if (code === 0) {
        try {
          // Find and validate downloaded file
          const result = await findDownloadedFile(outputPath, logger);
          resolve(result);
        } catch (fileError) {
          reject(fileError);
        }
      } else {
        reject(new Error(`spotdl exited with code ${code}: ${errorOutput || 'No error output'}`));
      }
    });

    // Handle process errors
    spotdl.on('error', (error) => {
      logger.error(`[spotdl:${jobId}] Process error:`, error);
      reject(new Error(`Failed to spawn spotdl: ${error.message}`));
    });
  });
}

/**
 * Find downloaded MP3 file in output directory
 */
async function findDownloadedFile(outputPath: string, logger: any): Promise<DownloadResult> {
  try {
    const files = await fs.readdir(outputPath);
    const audioFile = files.find(f => f.endsWith('.mp3'));

    if (!audioFile) {
      throw new Error('Downloaded MP3 file not found in output directory');
    }

    const filePath = path.join(outputPath, audioFile);
    const stats = await fs.stat(filePath);

    logger.info(`Found downloaded file: ${audioFile} (${stats.size} bytes)`);

    return {
      filePath,
      fileName: audioFile,
      fileSize: stats.size
    };

  } catch (error) {
    logger.error(`Failed to find downloaded file in ${outputPath}:`, error);
    throw new Error(`File not found: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Complete job successfully
 */
async function completeJob(
  jobId: string,
  result: DownloadResult,
  supabase: any,
  io: any,
  logger: any
): Promise<void> {
  try {
    // Update job with completed status and result
    await supabase
      .from('jobs')
      .update({
        status: 'completed',
        progress: 100,
        result,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    // Emit completion event
    io.to(`job:${jobId}`).emit('job:complete', {
      jobId,
      status: 'completed',
      progress: 100,
      result
    });

    logger.info(`Job ${jobId} completed successfully: ${result.fileName}`);

  } catch (error) {
    logger.error(`Failed to complete job ${jobId}:`, error);
    throw error;
  }
}

/**
 * Handle job error
 */
async function handleJobError(
  jobId: string,
  error: unknown,
  supabase: any,
  io: any,
  logger: any
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';

  logger.error(`Job ${jobId} failed:`, error);

  try {
    // Update job with error status
    await supabase
      .from('jobs')
      .update({
        status: 'error',
        error: errorMessage,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    // Emit error event
    io.to(`job:${jobId}`).emit('job:error', {
      jobId,
      status: 'error',
      error: errorMessage
    });

  } catch (updateError) {
    logger.error(`Failed to update error status for job ${jobId}:`, updateError);
  }
}

/**
 * Default export for backward compatibility
 */
export default {
  processDownloadJob
};
