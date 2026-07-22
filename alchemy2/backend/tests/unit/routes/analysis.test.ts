/**
 * Analysis Routes TDD Test Suite
 *
 * @module tests/unit/routes/analysis
 * @description Comprehensive test suite for audio analysis routes using TDD methodology
 * @phase RED - All tests should fail initially
 *
 * Test Coverage:
 * - POST /api/analysis/analyze - Audio analysis job initiation
 * - GET /api/analysis/job/:jobId - Analysis job status retrieval
 * - Error handling and validation
 * - Librosa worker integration and execution
 * - Analysis result storage and retrieval
 * - Feature extraction validation (tempo, key, energy, spectral, beat tracking)
 *
 * @author Sound Forge Alchemy Team - TDD Analysis Agent
 * @version 2.0.0
 * @coverage-target >95%
 */

import { describe, it, expect, beforeEach, afterEach, vi } from '@jest/globals';
import request from 'supertest';
import express, { Application } from 'express';
import { createClient } from '@supabase/supabase-js';
import winston from 'winston';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

// Mock dependencies before importing the router
vi.mock('child_process');
vi.mock('@supabase/supabase-js');

describe('Analysis Routes - TDD Test Suite', () => {
  let app: Application;
  let mockSupabase: any;
  let mockLogger: any;
  let mockIo: any;
  let mockSpawn: any;
  let mockChildProcess: any;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create Express app
    app = express();
    app.use(express.json());

    // Mock child process
    mockChildProcess = new EventEmitter() as any;
    mockChildProcess.stdout = new EventEmitter();
    mockChildProcess.stderr = new EventEmitter();
    mockChildProcess.pid = 12345;

    mockSpawn = vi.fn(() => mockChildProcess);
    (spawn as any) = mockSpawn;

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
        upload: vi.fn(),
        download: vi.fn()
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
    const analysisRoutes = (await import('../../../src/routes/analysis.js')).default;
    app.use('/api/analysis', analysisRoutes);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/analysis/analyze', () => {
    describe('Validation Tests', () => {
      it('should return 400 if trackId is missing', async () => {
        const response = await request(app)
          .post('/api/analysis/analyze')
          .send({
            audioFilePath: '/tmp/audio/track.mp3'
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toMatch(/validation/i);
      });

      it('should return 400 if audioFilePath is missing', async () => {
        const response = await request(app)
          .post('/api/analysis/analyze')
          .send({
            trackId: '123e4567-e89b-12d3-a456-426614174000'
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toMatch(/validation/i);
      });

      it('should return 400 if trackId is not a valid UUID', async () => {
        const response = await request(app)
          .post('/api/analysis/analyze')
          .send({
            trackId: 'invalid-uuid',
            audioFilePath: '/tmp/audio/track.mp3'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/validation/i);
      });

      it('should accept valid feature arrays', async () => {
        mockSupabase.single.mockResolvedValue({
          data: { id: 'job-123', status: 'queued' },
          error: null
        });

        const validFeatureSets = [
          ['tempo'],
          ['key'],
          ['energy'],
          ['spectral'],
          ['mfcc'],
          ['chroma'],
          ['tempo', 'key'],
          ['tempo', 'key', 'energy'],
          ['all']
        ];

        for (const features of validFeatureSets) {
          const response = await request(app)
            .post('/api/analysis/analyze')
            .send({
              trackId: '123e4567-e89b-12d3-a456-426614174000',
              audioFilePath: '/tmp/audio/track.mp3',
              features
            });

          expect(response.status).toBe(200);
        }
      });

      it('should return 400 for invalid feature names', async () => {
        const response = await request(app)
          .post('/api/analysis/analyze')
          .send({
            trackId: '123e4567-e89b-12d3-a456-426614174000',
            audioFilePath: '/tmp/audio/track.mp3',
            features: ['invalid_feature']
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/validation/i);
      });

      it('should default to [tempo, key, energy] if features not specified', async () => {
        mockSupabase.single.mockResolvedValue({
          data: {
            id: 'job-123',
            status: 'queued',
            metadata: { features: ['tempo', 'key', 'energy'] }
          },
          error: null
        });

        const response = await request(app)
          .post('/api/analysis/analyze')
          .send({
            trackId: '123e4567-e89b-12d3-a456-426614174000',
            audioFilePath: '/tmp/audio/track.mp3'
          });

        expect(response.status).toBe(200);
        expect(mockSupabase.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({
              features: expect.arrayContaining(['tempo', 'key', 'energy'])
            })
          })
        );
      });

      it('should reject empty feature arrays', async () => {
        const response = await request(app)
          .post('/api/analysis/analyze')
          .send({
            trackId: '123e4567-e89b-12d3-a456-426614174000',
            audioFilePath: '/tmp/audio/track.mp3',
            features: []
          });

        expect(response.status).toBe(400);
      });
    });

    describe('Job Creation Tests', () => {
      it('should create analysis job in Supabase', async () => {
        const jobId = '123e4567-e89b-12d3-a456-426614174000';
        mockSupabase.single.mockResolvedValue({
          data: {
            id: jobId,
            track_id: '123e4567-e89b-12d3-a456-426614174001',
            type: 'analysis',
            status: 'queued',
            progress: 0
          },
          error: null
        });

        const response = await request(app)
          .post('/api/analysis/analyze')
          .send({
            trackId: '123e4567-e89b-12d3-a456-426614174001',
            audioFilePath: '/tmp/audio/track.mp3'
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
            .post('/api/analysis/analyze')
            .send({
              trackId: `123e4567-e89b-12d3-a456-42661417400${i}`,
              audioFilePath: `/tmp/audio/track${i}.mp3`
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
          .post('/api/analysis/analyze')
          .send({
            trackId: '123e4567-e89b-12d3-a456-426614174000',
            audioFilePath: '/tmp/audio/track.mp3'
          });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error');
        expect(mockLogger.error).toHaveBeenCalled();
      });

      it('should store correct metadata in job', async () => {
        const trackId = '123e4567-e89b-12d3-a456-426614174000';
        const audioFilePath = '/tmp/audio/track.mp3';
        const features = ['tempo', 'key', 'spectral'];

        mockSupabase.single.mockResolvedValue({
          data: { id: 'job-123', status: 'queued' },
          error: null
        });

        await request(app)
          .post('/api/analysis/analyze')
          .send({ trackId, audioFilePath, features });

        expect(mockSupabase.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            track_id: trackId,
            type: 'analysis',
            status: 'queued',
            progress: 0,
            metadata: { audioFilePath, features }
          })
        );
      });

      it('should set job type to analysis', async () => {
        mockSupabase.single.mockResolvedValue({
          data: { id: 'job-123', type: 'analysis', status: 'queued' },
          error: null
        });

        await request(app)
          .post('/api/analysis/analyze')
          .send({
            trackId: '123e4567-e89b-12d3-a456-426614174000',
            audioFilePath: '/tmp/audio/track.mp3'
          });

        expect(mockSupabase.insert).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'analysis' })
        );
      });
    });

    describe('Librosa Worker Invocation Tests', () => {
      it('should invoke Python analyzer asynchronously', async () => {
        mockSupabase.single.mockResolvedValue({
          data: { id: 'job-123', status: 'queued' },
          error: null
        });

        const response = await request(app)
          .post('/api/analysis/analyze')
          .send({
            trackId: '123e4567-e89b-12d3-a456-426614174000',
            audioFilePath: '/tmp/audio/track.mp3',
            features: ['tempo', 'key']
          });

        // Should return immediately
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('queued');
      });

      it('should not block on analyzer execution', async () => {
        mockSupabase.single.mockResolvedValue({
          data: { id: 'job-123', status: 'queued' },
          error: null
        });

        const startTime = Date.now();

        await request(app)
          .post('/api/analysis/analyze')
          .send({
            trackId: '123e4567-e89b-12d3-a456-426614174000',
            audioFilePath: '/tmp/audio/track.mp3'
          });

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        // Response should be very fast (< 1 second)
        expect(responseTime).toBeLessThan(1000);
      });

      it('should pass correct features to analyzer', async () => {
        mockSupabase.single.mockResolvedValue({
          data: { id: 'job-123', status: 'queued' },
          error: null
        });

        const features = ['tempo', 'key', 'energy', 'spectral'];

        await request(app)
          .post('/api/analysis/analyze')
          .send({
            trackId: '123e4567-e89b-12d3-a456-426614174000',
            audioFilePath: '/tmp/audio/track.mp3',
            features
          });

        // Give background process time to start
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify spawn was called with correct arguments
        expect(mockSpawn).toHaveBeenCalledWith(
          'python',
          expect.arrayContaining([
            expect.stringContaining('analyzer.py'),
            '/tmp/audio/track.mp3',
            '--features',
            features.join(','),
            '--output',
            'json'
          ])
        );
      });
    });

    describe('Socket.IO Notification Tests', () => {
      it('should emit job update when analysis starts', async () => {
        mockSupabase.single.mockResolvedValue({
          data: { id: 'job-123', status: 'queued' },
          error: null
        });

        mockSupabase.update = vi.fn().mockReturnThis();

        await request(app)
          .post('/api/analysis/analyze')
          .send({
            trackId: '123e4567-e89b-12d3-a456-426614174000',
            audioFilePath: '/tmp/audio/track.mp3'
          });

        // Give background process time to start
        await new Promise(resolve => setTimeout(resolve, 100));

        // Should emit processing status
        expect(mockIo.to).toHaveBeenCalledWith(expect.stringContaining('job:'));
        expect(mockIo.emit).toHaveBeenCalledWith(
          'job:update',
          expect.objectContaining({ status: 'processing' })
        );
      });
    });

    describe('Logging Tests', () => {
      it('should log job creation', async () => {
        mockSupabase.single.mockResolvedValue({
          data: { id: 'job-123', status: 'queued' },
          error: null
        });

        await request(app)
          .post('/api/analysis/analyze')
          .send({
            trackId: '123e4567-e89b-12d3-a456-426614174000',
            audioFilePath: '/tmp/audio/track.mp3'
          });

        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('Starting analysis job')
        );
      });

      it('should log errors appropriately', async () => {
        mockSupabase.single.mockResolvedValue({
          data: null,
          error: { message: 'Test error' }
        });

        await request(app)
          .post('/api/analysis/analyze')
          .send({
            trackId: '123e4567-e89b-12d3-a456-426614174000',
            audioFilePath: '/tmp/audio/track.mp3'
          });

        expect(mockLogger.error).toHaveBeenCalled();
      });

      it('should log analyzer stdout', async () => {
        mockSupabase.single.mockResolvedValue({
          data: { id: 'job-123', status: 'queued' },
          error: null
        });

        await request(app)
          .post('/api/analysis/analyze')
          .send({
            trackId: '123e4567-e89b-12d3-a456-426614174000',
            audioFilePath: '/tmp/audio/track.mp3'
          });

        // Simulate analyzer output
        await new Promise(resolve => setTimeout(resolve, 50));
        mockChildProcess.stdout.emit('data', Buffer.from('Processing audio...'));
        await new Promise(resolve => setTimeout(resolve, 50));

        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('analyzer stdout')
        );
      });

      it('should log analyzer stderr as warnings', async () => {
        mockSupabase.single.mockResolvedValue({
          data: { id: 'job-123', status: 'queued' },
          error: null
        });

        await request(app)
          .post('/api/analysis/analyze')
          .send({
            trackId: '123e4567-e89b-12d3-a456-426614174000',
            audioFilePath: '/tmp/audio/track.mp3'
          });

        // Simulate analyzer stderr
        await new Promise(resolve => setTimeout(resolve, 50));
        mockChildProcess.stderr.emit('data', Buffer.from('Warning: low audio quality'));
        await new Promise(resolve => setTimeout(resolve, 50));

        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('analyzer stderr')
        );
      });
    });
  });

  describe('GET /api/analysis/job/:jobId', () => {
    describe('Success Cases', () => {
      it('should return job status for valid jobId', async () => {
        const jobId = '123e4567-e89b-12d3-a456-426614174000';
        const mockJob = {
          id: jobId,
          track_id: '123e4567-e89b-12d3-a456-426614174001',
          type: 'analysis',
          status: 'processing',
          progress: 50,
          metadata: {
            audioFilePath: '/tmp/audio/track.mp3',
            features: ['tempo', 'key']
          }
        };

        mockSupabase.single.mockResolvedValue({
          data: mockJob,
          error: null
        });

        const response = await request(app).get(`/api/analysis/job/${jobId}`);

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

        const response = await request(app).get(`/api/analysis/job/${jobId}`);

        expect(response.status).toBe(200);
        expect(response.body.job.progress).toBe(75);
      });

      it('should return completed job with analysis results', async () => {
        const jobId = '123e4567-e89b-12d3-a456-426614174000';
        const mockResults = {
          tempo: 128.5,
          key: 'C major',
          energy: 0.87,
          spectral_centroid: 2500.3,
          beats: [0.5, 1.0, 1.5, 2.0],
          duration: 180.5
        };

        mockSupabase.single.mockResolvedValue({
          data: {
            id: jobId,
            status: 'completed',
            progress: 100,
            result: mockResults
          },
          error: null
        });

        const response = await request(app).get(`/api/analysis/job/${jobId}`);

        expect(response.status).toBe(200);
        expect(response.body.job.status).toBe('completed');
        expect(response.body.job.result).toEqual(mockResults);
        expect(response.body.job.result.tempo).toBeDefined();
        expect(response.body.job.result.key).toBeDefined();
        expect(response.body.job.result.energy).toBeDefined();
      });

      it('should return error status for failed jobs', async () => {
        const jobId = '123e4567-e89b-12d3-a456-426614174000';

        mockSupabase.single.mockResolvedValue({
          data: {
            id: jobId,
            status: 'error',
            error: 'analyzer exited with code 1: File not found'
          },
          error: null
        });

        const response = await request(app).get(`/api/analysis/job/${jobId}`);

        expect(response.status).toBe(200);
        expect(response.body.job.status).toBe('error');
        expect(response.body.job.error).toBeDefined();
        expect(response.body.job.error).toContain('analyzer exited');
      });

      it('should handle jobs with partial results', async () => {
        const jobId = '123e4567-e89b-12d3-a456-426614174000';
        const partialResults = {
          tempo: 120.0,
          key: 'A minor'
          // energy and spectral features missing
        };

        mockSupabase.single.mockResolvedValue({
          data: {
            id: jobId,
            status: 'completed',
            progress: 100,
            result: partialResults
          },
          error: null
        });

        const response = await request(app).get(`/api/analysis/job/${jobId}`);

        expect(response.status).toBe(200);
        expect(response.body.job.result.tempo).toBe(120.0);
        expect(response.body.job.result.key).toBe('A minor');
      });
    });

    describe('Error Cases', () => {
      it('should return 404 for invalid jobId', async () => {
        mockSupabase.single.mockResolvedValue({
          data: null,
          error: { message: 'Not found' }
        });

        const response = await request(app).get('/api/analysis/job/invalid-id');

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error');
      });

      it('should return 404 for non-existent job', async () => {
        mockSupabase.single.mockResolvedValue({
          data: null,
          error: null
        });

        const response = await request(app).get(
          '/api/analysis/job/123e4567-e89b-12d3-a456-426614174000'
        );

        expect(response.status).toBe(404);
        expect(response.body.error).toMatch(/not found/i);
      });

      it('should handle database errors gracefully', async () => {
        mockSupabase.single.mockRejectedValue(
          new Error('Database connection lost')
        );

        const response = await request(app).get(
          '/api/analysis/job/123e4567-e89b-12d3-a456-426614174000'
        );

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error');
      });
    });

    describe('Query Filtering', () => {
      it('should filter by job type (analysis)', async () => {
        const jobId = '123e4567-e89b-12d3-a456-426614174000';

        mockSupabase.single.mockResolvedValue({
          data: { id: jobId, type: 'analysis', status: 'queued' },
          error: null
        });

        await request(app).get(`/api/analysis/job/${jobId}`);

        expect(mockSupabase.eq).toHaveBeenCalledWith('id', jobId);
        expect(mockSupabase.eq).toHaveBeenCalledWith('type', 'analysis');
      });

      it('should not return jobs of different types', async () => {
        mockSupabase.single.mockResolvedValue({
          data: null,
          error: { message: 'No matching job found' }
        });

        const response = await request(app).get(
          '/api/analysis/job/123e4567-e89b-12d3-a456-426614174000'
        );

        expect(response.status).toBe(404);
      });
    });
  });

  describe('GET /api/analysis/health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/analysis/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'ok',
        service: 'analysis'
      });
    });

    it('should respond quickly', async () => {
      const startTime = Date.now();
      await request(app).get('/api/analysis/health');
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(100);
    });
  });

  describe('Analysis Result Storage Tests', () => {
    it('should store analysis results in analysis_results table', async () => {
      const trackId = '123e4567-e89b-12d3-a456-426614174000';
      const analysisResults = {
        tempo: 128.5,
        key: 'C major',
        energy: 0.87,
        spectral_centroid: 2500.3
      };

      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'job-123', status: 'queued' },
        error: null
      });

      // Mock for analysis_results insert
      mockSupabase.single.mockResolvedValueOnce({
        data: { track_id: trackId, ...analysisResults },
        error: null
      });

      await request(app)
        .post('/api/analysis/analyze')
        .send({
          trackId,
          audioFilePath: '/tmp/audio/track.mp3'
        });

      // Simulate successful analysis
      await new Promise(resolve => setTimeout(resolve, 100));
      mockChildProcess.stdout.emit('data', Buffer.from(JSON.stringify(analysisResults)));
      mockChildProcess.emit('close', 0);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify analysis_results was inserted
      expect(mockSupabase.from).toHaveBeenCalledWith('analysis_results');
    });

    it('should store tempo data correctly', async () => {
      const analysisResults = {
        tempo: 125.8,
        key: 'D minor',
        energy: 0.75
      };

      mockSupabase.single.mockResolvedValue({
        data: { id: 'job-123', status: 'queued' },
        error: null
      });

      await request(app)
        .post('/api/analysis/analyze')
        .send({
          trackId: '123e4567-e89b-12d3-a456-426614174000',
          audioFilePath: '/tmp/audio/track.mp3',
          features: ['tempo']
        });

      await new Promise(resolve => setTimeout(resolve, 100));
      mockChildProcess.stdout.emit('data', Buffer.from(JSON.stringify(analysisResults)));
      mockChildProcess.emit('close', 0);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify tempo was stored
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({ tempo: 125.8 })
      );
    });

    it('should handle analysis result storage errors', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'job-123', status: 'queued' },
        error: null
      });

      // Mock analysis_results insert error
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Insert failed' }
      });

      await request(app)
        .post('/api/analysis/analyze')
        .send({
          trackId: '123e4567-e89b-12d3-a456-426614174000',
          audioFilePath: '/tmp/audio/track.mp3'
        });

      await new Promise(resolve => setTimeout(resolve, 100));
      mockChildProcess.stdout.emit('data', Buffer.from(JSON.stringify({ tempo: 120 })));
      mockChildProcess.emit('close', 0);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should log error but still complete job
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to store analysis results')
      );
    });
  });

  describe('Feature Extraction Tests', () => {
    it('should extract tempo correctly', async () => {
      const results = { tempo: 140.2, key: 'E major', energy: 0.9 };

      mockSupabase.single.mockResolvedValue({
        data: { id: 'job-123', status: 'queued' },
        error: null
      });

      await request(app)
        .post('/api/analysis/analyze')
        .send({
          trackId: '123e4567-e89b-12d3-a456-426614174000',
          audioFilePath: '/tmp/audio/track.mp3',
          features: ['tempo']
        });

      await new Promise(resolve => setTimeout(resolve, 100));
      mockChildProcess.stdout.emit('data', Buffer.from(JSON.stringify(results)));
      mockChildProcess.emit('close', 0);
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          result: expect.objectContaining({ tempo: 140.2 })
        })
      );
    });

    it('should extract key correctly', async () => {
      const results = { tempo: 120, key: 'F# minor', energy: 0.6 };

      mockSupabase.single.mockResolvedValue({
        data: { id: 'job-123', status: 'queued' },
        error: null
      });

      await request(app)
        .post('/api/analysis/analyze')
        .send({
          trackId: '123e4567-e89b-12d3-a456-426614174000',
          audioFilePath: '/tmp/audio/track.mp3',
          features: ['key']
        });

      await new Promise(resolve => setTimeout(resolve, 100));
      mockChildProcess.stdout.emit('data', Buffer.from(JSON.stringify(results)));
      mockChildProcess.emit('close', 0);
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          result: expect.objectContaining({ key: 'F# minor' })
        })
      );
    });

    it('should extract energy correctly', async () => {
      const results = { tempo: 130, key: 'G major', energy: 0.82 };

      mockSupabase.single.mockResolvedValue({
        data: { id: 'job-123', status: 'queued' },
        error: null
      });

      await request(app)
        .post('/api/analysis/analyze')
        .send({
          trackId: '123e4567-e89b-12d3-a456-426614174000',
          audioFilePath: '/tmp/audio/track.mp3',
          features: ['energy']
        });

      await new Promise(resolve => setTimeout(resolve, 100));
      mockChildProcess.stdout.emit('data', Buffer.from(JSON.stringify(results)));
      mockChildProcess.emit('close', 0);
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          result: expect.objectContaining({ energy: 0.82 })
        })
      );
    });

    it('should extract spectral features correctly', async () => {
      const results = {
        tempo: 125,
        key: 'A major',
        energy: 0.7,
        spectral_centroid: 2800.5,
        spectral_rolloff: 5000.2,
        spectral_bandwidth: 1500.1
      };

      mockSupabase.single.mockResolvedValue({
        data: { id: 'job-123', status: 'queued' },
        error: null
      });

      await request(app)
        .post('/api/analysis/analyze')
        .send({
          trackId: '123e4567-e89b-12d3-a456-426614174000',
          audioFilePath: '/tmp/audio/track.mp3',
          features: ['spectral']
        });

      await new Promise(resolve => setTimeout(resolve, 100));
      mockChildProcess.stdout.emit('data', Buffer.from(JSON.stringify(results)));
      mockChildProcess.emit('close', 0);
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          result: expect.objectContaining({
            spectral_centroid: 2800.5,
            spectral_rolloff: 5000.2,
            spectral_bandwidth: 1500.1
          })
        })
      );
    });

    it('should extract all features when features=["all"]', async () => {
      const results = {
        tempo: 128,
        key: 'C major',
        energy: 0.85,
        spectral_centroid: 2500,
        mfcc: [1.2, -0.5, 0.8],
        chroma: [0.1, 0.2, 0.3],
        beats: [0.5, 1.0, 1.5]
      };

      mockSupabase.single.mockResolvedValue({
        data: { id: 'job-123', status: 'queued' },
        error: null
      });

      await request(app)
        .post('/api/analysis/analyze')
        .send({
          trackId: '123e4567-e89b-12d3-a456-426614174000',
          audioFilePath: '/tmp/audio/track.mp3',
          features: ['all']
        });

      await new Promise(resolve => setTimeout(resolve, 100));
      mockChildProcess.stdout.emit('data', Buffer.from(JSON.stringify(results)));
      mockChildProcess.emit('close', 0);
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          result: expect.objectContaining({
            tempo: expect.any(Number),
            key: expect.any(String),
            energy: expect.any(Number),
            spectral_centroid: expect.any(Number),
            mfcc: expect.any(Array),
            chroma: expect.any(Array),
            beats: expect.any(Array)
          })
        })
      );
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle Python analyzer failures', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: 'job-123', status: 'queued' },
        error: null
      });

      await request(app)
        .post('/api/analysis/analyze')
        .send({
          trackId: '123e4567-e89b-12d3-a456-426614174000',
          audioFilePath: '/tmp/audio/track.mp3'
        });

      // Simulate analyzer failure
      await new Promise(resolve => setTimeout(resolve, 100));
      mockChildProcess.stderr.emit('data', Buffer.from('Error: File not found'));
      mockChildProcess.emit('close', 1);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should update job status to error
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          error: expect.stringContaining('exited with code 1')
        })
      );
    });

    it('should handle malformed JSON from analyzer', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: 'job-123', status: 'queued' },
        error: null
      });

      await request(app)
        .post('/api/analysis/analyze')
        .send({
          trackId: '123e4567-e89b-12d3-a456-426614174000',
          audioFilePath: '/tmp/audio/track.mp3'
        });

      // Simulate malformed JSON output
      await new Promise(resolve => setTimeout(resolve, 100));
      mockChildProcess.stdout.emit('data', Buffer.from('{ invalid json }'));
      mockChildProcess.emit('close', 0);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should update job status to error
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          error: expect.stringContaining('Failed to parse')
        })
      );
    });

    it('should emit error events via Socket.IO', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: 'job-123', status: 'queued' },
        error: null
      });

      await request(app)
        .post('/api/analysis/analyze')
        .send({
          trackId: '123e4567-e89b-12d3-a456-426614174000',
          audioFilePath: '/tmp/audio/track.mp3'
        });

      // Simulate analyzer failure
      await new Promise(resolve => setTimeout(resolve, 100));
      mockChildProcess.emit('close', 1);
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockIo.emit).toHaveBeenCalledWith(
        'job:error',
        expect.objectContaining({
          status: 'error',
          error: expect.any(String)
        })
      );
    });
  });

  describe('Integration Tests', () => {
    it('should handle full analysis lifecycle', async () => {
      const trackId = '123e4567-e89b-12d3-a456-426614174000';
      const audioFilePath = '/tmp/audio/track.mp3';
      const features = ['tempo', 'key', 'energy'];

      // Step 1: Create job
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'job-123', status: 'queued' },
        error: null
      });

      const createResponse = await request(app)
        .post('/api/analysis/analyze')
        .send({ trackId, audioFilePath, features });

      expect(createResponse.status).toBe(200);
      const jobId = createResponse.body.jobId;

      // Step 2: Check status immediately
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: jobId, status: 'queued', progress: 0 },
        error: null
      });

      const statusResponse1 = await request(app).get(`/api/analysis/job/${jobId}`);
      expect(statusResponse1.body.job.status).toBe('queued');

      // Step 3: Check status during processing
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: jobId, status: 'processing', progress: 50 },
        error: null
      });

      const statusResponse2 = await request(app).get(`/api/analysis/job/${jobId}`);
      expect(statusResponse2.body.job.status).toBe('processing');

      // Step 4: Check final status
      const finalResults = { tempo: 128, key: 'C major', energy: 0.85 };
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: jobId,
          status: 'completed',
          progress: 100,
          result: finalResults
        },
        error: null
      });

      const statusResponse3 = await request(app).get(`/api/analysis/job/${jobId}`);
      expect(statusResponse3.body.job.status).toBe('completed');
      expect(statusResponse3.body.job.result).toEqual(finalResults);
    });

    it('should handle concurrent analysis jobs', async () => {
      const jobs = [];

      // Create multiple jobs concurrently
      for (let i = 0; i < 3; i++) {
        mockSupabase.single.mockResolvedValueOnce({
          data: { id: `job-${i}`, status: 'queued' },
          error: null
        });

        const response = await request(app)
          .post('/api/analysis/analyze')
          .send({
            trackId: `123e4567-e89b-12d3-a456-42661417400${i}`,
            audioFilePath: `/tmp/audio/track${i}.mp3`
          });

        jobs.push(response.body.jobId);
      }

      // All jobs should be created successfully
      expect(jobs.length).toBe(3);
      expect(new Set(jobs).size).toBe(3); // All unique
    });
  });
});
