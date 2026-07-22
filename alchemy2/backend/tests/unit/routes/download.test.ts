/**
 * Download Routes TDD Test Suite
 *
 * @module tests/unit/routes/download
 * @description Comprehensive test suite for download routes using TDD methodology
 * @phase RED - All tests should fail initially
 *
 * Test Coverage:
 * - POST /api/download/track - Track download initiation
 * - GET /api/download/job/:jobId - Job status retrieval
 * - Error handling and validation
 * - Worker invocation and failures
 *
 * @author Sound Forge Alchemy Team - TDD Agent
 * @version 2.0.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from '@jest/globals';
import request from 'supertest';
import express, { Application } from 'express';
import { createClient } from '@supabase/supabase-js';
import winston from 'winston';

// Mock dependencies before importing the router
vi.mock('child_process');
vi.mock('@supabase/supabase-js');

describe('Download Routes - TDD Test Suite', () => {
  let app: Application;
  let mockSupabase: any;
  let mockLogger: any;
  let mockIo: any;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create Express app
    app = express();
    app.use(express.json());

    // Mock Supabase client
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      storage: {
        from: vi.fn().mockReturnThis(),
        upload: vi.fn()
      }
    };

    // Mock Winston logger
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    };

    // Mock Socket.IO
    mockIo = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn()
    };

    // Attach mocks to app.locals
    app.locals.supabase = mockSupabase;
    app.locals.logger = mockLogger;
    app.locals.io = mockIo;

    // Import and mount router (dynamic import to ensure mocks are set)
    const downloadRoutes = (await import('../../../src/routes/download.js')).default;
    app.use('/api/download', downloadRoutes);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/download/track', () => {
    describe('Validation Tests', () => {
      it('should return 400 if trackId is missing', async () => {
        const response = await request(app)
          .post('/api/download/track')
          .send({
            spotifyUrl: 'https://open.spotify.com/track/123'
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toMatch(/validation/i);
      });

      it('should return 400 if spotifyUrl is missing', async () => {
        const response = await request(app)
          .post('/api/download/track')
          .send({
            trackId: '123e4567-e89b-12d3-a456-426614174000'
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      });

      it('should return 400 if trackId is not a valid UUID', async () => {
        const response = await request(app)
          .post('/api/download/track')
          .send({
            trackId: 'invalid-uuid',
            spotifyUrl: 'https://open.spotify.com/track/123'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/validation/i);
      });

      it('should return 400 if spotifyUrl is not a valid URI', async () => {
        const response = await request(app)
          .post('/api/download/track')
          .send({
            trackId: '123e4567-e89b-12d3-a456-426614174000',
            spotifyUrl: 'not-a-valid-url'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/validation/i);
      });

      it('should accept valid quality values', async () => {
        mockSupabase.single.mockResolvedValue({
          data: { id: 'job-123', status: 'queued' },
          error: null
        });

        const validQualities = ['128k', '192k', '256k', '320k'];

        for (const quality of validQualities) {
          const response = await request(app)
            .post('/api/download/track')
            .send({
              trackId: '123e4567-e89b-12d3-a456-426614174000',
              spotifyUrl: 'https://open.spotify.com/track/123',
              quality
            });

          expect(response.status).toBe(200);
        }
      });

      it('should default to 320k quality if not specified', async () => {
        mockSupabase.single.mockResolvedValue({
          data: { id: 'job-123', status: 'queued', metadata: { quality: '320k' } },
          error: null
        });

        const response = await request(app)
          .post('/api/download/track')
          .send({
            trackId: '123e4567-e89b-12d3-a456-426614174000',
            spotifyUrl: 'https://open.spotify.com/track/123'
          });

        expect(response.status).toBe(200);
        expect(mockSupabase.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({ quality: '320k' })
          })
        );
      });
    });

    describe('Job Creation Tests', () => {
      it('should create download job in Supabase', async () => {
        const jobId = '123e4567-e89b-12d3-a456-426614174000';
        mockSupabase.single.mockResolvedValue({
          data: {
            id: jobId,
            track_id: '123e4567-e89b-12d3-a456-426614174001',
            status: 'queued',
            progress: 0
          },
          error: null
        });

        const response = await request(app)
          .post('/api/download/track')
          .send({
            trackId: '123e4567-e89b-12d3-a456-426614174001',
            spotifyUrl: 'https://open.spotify.com/track/123'
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('jobId');
        expect(response.body).toHaveProperty('status', 'queued');
        expect(response.body.success).toBe(true);
        expect(mockSupabase.from).toHaveBeenCalledWith('jobs');
        expect(mockSupabase.insert).toHaveBeenCalled();
      });

      it('should generate unique job IDs', async () => {
        const jobIds = new Set();

        mockSupabase.single.mockImplementation(() => {
          const jobId = Math.random().toString();
          jobIds.add(jobId);
          return Promise.resolve({
            data: { id: jobId, status: 'queued' },
            error: null
          });
        });

        // Create multiple jobs
        for (let i = 0; i < 5; i++) {
          await request(app)
            .post('/api/download/track')
            .send({
              trackId: `123e4567-e89b-12d3-a456-42661417400${i}`,
              spotifyUrl: `https://open.spotify.com/track/${i}`
            });
        }

        // All job IDs should be unique
        expect(jobIds.size).toBe(5);
      });

      it('should handle Supabase insertion errors', async () => {
        mockSupabase.single.mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' }
        });

        const response = await request(app)
          .post('/api/download/track')
          .send({
            trackId: '123e4567-e89b-12d3-a456-426614174000',
            spotifyUrl: 'https://open.spotify.com/track/123'
          });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error');
        expect(mockLogger.error).toHaveBeenCalled();
      });

      it('should store correct metadata in job', async () => {
        const trackId = '123e4567-e89b-12d3-a456-426614174000';
        const spotifyUrl = 'https://open.spotify.com/track/123';
        const quality = '256k';

        mockSupabase.single.mockResolvedValue({
          data: { id: 'job-123', status: 'queued' },
          error: null
        });

        await request(app)
          .post('/api/download/track')
          .send({ trackId, spotifyUrl, quality });

        expect(mockSupabase.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            track_id: trackId,
            type: 'download',
            status: 'queued',
            progress: 0,
            metadata: { spotifyUrl, quality }
          })
        );
      });
    });

    describe('Worker Invocation Tests', () => {
      it('should invoke download worker asynchronously', async () => {
        mockSupabase.single.mockResolvedValue({
          data: { id: 'job-123', status: 'queued' },
          error: null
        });

        const response = await request(app)
          .post('/api/download/track')
          .send({
            trackId: '123e4567-e89b-12d3-a456-426614174000',
            spotifyUrl: 'https://open.spotify.com/track/123'
          });

        // Should return immediately (202 Accepted or 200 OK)
        expect([200, 202]).toContain(response.status);
        expect(response.body.status).toBe('queued');
      });

      it('should not block on worker execution', async () => {
        mockSupabase.single.mockResolvedValue({
          data: { id: 'job-123', status: 'queued' },
          error: null
        });

        const startTime = Date.now();

        await request(app)
          .post('/api/download/track')
          .send({
            trackId: '123e4567-e89b-12d3-a456-426614174000',
            spotifyUrl: 'https://open.spotify.com/track/123'
          });

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        // Response should be very fast (< 1 second)
        expect(responseTime).toBeLessThan(1000);
      });
    });

    describe('Logging Tests', () => {
      it('should log job creation', async () => {
        mockSupabase.single.mockResolvedValue({
          data: { id: 'job-123', status: 'queued' },
          error: null
        });

        await request(app)
          .post('/api/download/track')
          .send({
            trackId: '123e4567-e89b-12d3-a456-426614174000',
            spotifyUrl: 'https://open.spotify.com/track/123'
          });

        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('Starting download job')
        );
      });

      it('should log errors appropriately', async () => {
        mockSupabase.single.mockResolvedValue({
          data: null,
          error: { message: 'Test error' }
        });

        await request(app)
          .post('/api/download/track')
          .send({
            trackId: '123e4567-e89b-12d3-a456-426614174000',
            spotifyUrl: 'https://open.spotify.com/track/123'
          });

        expect(mockLogger.error).toHaveBeenCalled();
      });
    });
  });

  describe('GET /api/download/job/:jobId', () => {
    describe('Success Cases', () => {
      it('should return job status for valid jobId', async () => {
        const jobId = '123e4567-e89b-12d3-a456-426614174000';
        const mockJob = {
          id: jobId,
          track_id: '123e4567-e89b-12d3-a456-426614174001',
          type: 'download',
          status: 'processing',
          progress: 50,
          metadata: { spotifyUrl: 'https://open.spotify.com/track/123' }
        };

        mockSupabase.single.mockResolvedValue({
          data: mockJob,
          error: null
        });

        const response = await request(app).get(`/api/download/job/${jobId}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.job).toEqual(mockJob);
      });

      it('should return correct progress information', async () => {
        const jobId = '123e4567-e89b-12d3-a456-426614174000';

        mockSupabase.single.mockResolvedValue({
          data: { id: jobId, status: 'processing', progress: 75 },
          error: null
        });

        const response = await request(app).get(`/api/download/job/${jobId}`);

        expect(response.status).toBe(200);
        expect(response.body.job.progress).toBe(75);
      });

      it('should return completed job with result', async () => {
        const jobId = '123e4567-e89b-12d3-a456-426614174000';
        const mockResult = {
          filePath: '/tmp/audio/track-123/song.mp3',
          fileName: 'song.mp3',
          fileSize: 5242880
        };

        mockSupabase.single.mockResolvedValue({
          data: {
            id: jobId,
            status: 'completed',
            progress: 100,
            result: mockResult
          },
          error: null
        });

        const response = await request(app).get(`/api/download/job/${jobId}`);

        expect(response.status).toBe(200);
        expect(response.body.job.status).toBe('completed');
        expect(response.body.job.result).toEqual(mockResult);
      });

      it('should return error status for failed jobs', async () => {
        const jobId = '123e4567-e89b-12d3-a456-426614174000';

        mockSupabase.single.mockResolvedValue({
          data: {
            id: jobId,
            status: 'error',
            error: 'spotdl exited with code 1'
          },
          error: null
        });

        const response = await request(app).get(`/api/download/job/${jobId}`);

        expect(response.status).toBe(200);
        expect(response.body.job.status).toBe('error');
        expect(response.body.job.error).toBeDefined();
      });
    });

    describe('Error Cases', () => {
      it('should return 404 for invalid jobId', async () => {
        mockSupabase.single.mockResolvedValue({
          data: null,
          error: { message: 'Not found' }
        });

        const response = await request(app).get('/api/download/job/invalid-id');

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error');
      });

      it('should return 404 for non-existent job', async () => {
        mockSupabase.single.mockResolvedValue({
          data: null,
          error: null
        });

        const response = await request(app).get(
          '/api/download/job/123e4567-e89b-12d3-a456-426614174000'
        );

        expect(response.status).toBe(404);
      });

      it('should handle database errors gracefully', async () => {
        mockSupabase.single.mockRejectedValue(
          new Error('Database connection lost')
        );

        const response = await request(app).get(
          '/api/download/job/123e4567-e89b-12d3-a456-426614174000'
        );

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error');
      });
    });

    describe('Query Filtering', () => {
      it('should filter by job type (download)', async () => {
        const jobId = '123e4567-e89b-12d3-a456-426614174000';

        mockSupabase.single.mockResolvedValue({
          data: { id: jobId, type: 'download', status: 'queued' },
          error: null
        });

        await request(app).get(`/api/download/job/${jobId}`);

        expect(mockSupabase.eq).toHaveBeenCalledWith('id', jobId);
        expect(mockSupabase.eq).toHaveBeenCalledWith('type', 'download');
      });
    });
  });

  describe('GET /api/download/health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/download/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'ok',
        service: 'download'
      });
    });

    it('should respond quickly', async () => {
      const startTime = Date.now();
      await request(app).get('/api/download/health');
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(100);
    });
  });

  describe('Integration Tests', () => {
    it('should handle full download lifecycle', async () => {
      const trackId = '123e4567-e89b-12d3-a456-426614174000';
      const spotifyUrl = 'https://open.spotify.com/track/123';

      // Step 1: Create job
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'job-123', status: 'queued' },
        error: null
      });

      const createResponse = await request(app)
        .post('/api/download/track')
        .send({ trackId, spotifyUrl });

      expect(createResponse.status).toBe(200);
      const jobId = createResponse.body.jobId;

      // Step 2: Check status immediately
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: jobId, status: 'queued', progress: 0 },
        error: null
      });

      const statusResponse1 = await request(app).get(`/api/download/job/${jobId}`);
      expect(statusResponse1.body.job.status).toBe('queued');

      // Step 3: Check status during processing
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: jobId, status: 'processing', progress: 50 },
        error: null
      });

      const statusResponse2 = await request(app).get(`/api/download/job/${jobId}`);
      expect(statusResponse2.body.job.status).toBe('processing');

      // Step 4: Check final status
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: jobId,
          status: 'completed',
          progress: 100,
          result: { filePath: '/tmp/audio/song.mp3' }
        },
        error: null
      });

      const statusResponse3 = await request(app).get(`/api/download/job/${jobId}`);
      expect(statusResponse3.body.job.status).toBe('completed');
      expect(statusResponse3.body.job.result).toBeDefined();
    });
  });
});
