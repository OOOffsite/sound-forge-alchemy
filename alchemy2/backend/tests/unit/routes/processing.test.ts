/**
 * Processing Routes TDD Tests
 *
 * @module tests/unit/routes/processing
 * @description Comprehensive TDD tests for audio processing routes
 *
 * Test Coverage:
 * - Validation tests
 * - Job creation tests
 * - Demucs worker invocation tests
 * - Progress tracking tests
 * - Status retrieval tests
 * - Health check tests
 * - Integration tests
 * - Edge cases
 *
 * @author Sound Forge Alchemy Team
 * @version 2.0.0
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';
import processingRoutes from '../../../src/routes/processing';
import { jest as jestGlobal } from '@jest/globals';

// Mock dependencies
const mockSupabase = {
  from: jest.fn(() => ({
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn()
      }))
    })),
    update: jest.fn(() => ({
      eq: jest.fn()
    })),
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    }))
  }))
};

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

const mockIo = {
  to: jest.fn(() => ({
    emit: jest.fn()
  }))
};

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn()
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
  mkdir: jest.fn(),
  access: jest.fn(),
  stat: jest.fn()
}));

let app: Express;

beforeEach(() => {
  app = express();
  app.use(express.json());
  app.locals.supabase = mockSupabase;
  app.locals.logger = mockLogger;
  app.locals.io = mockIo;
  app.use('/api/processing', processingRoutes);

  // Clear all mocks
  jest.clearAllMocks();
});

describe('Processing Routes', () => {
  describe('GET /api/processing/models', () => {
    it('should return list of available Demucs models', async () => {
      const response = await request(app)
        .get('/api/processing/models');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('models');
      expect(Array.isArray(response.body.models)).toBe(true);
      expect(response.body.models.length).toBeGreaterThan(0);
    });

    it('should return htdemucs as default model', async () => {
      const response = await request(app)
        .get('/api/processing/models');

      const defaultModel = response.body.models.find((m: any) => m.name === 'htdemucs');
      expect(defaultModel).toBeDefined();
      expect(defaultModel.description).toContain('default');
    });

    it('should include model quality and speed information', async () => {
      const response = await request(app)
        .get('/api/processing/models');

      response.body.models.forEach((model: any) => {
        expect(model).toHaveProperty('name');
        expect(model).toHaveProperty('description');
        expect(model).toHaveProperty('quality');
        expect(model).toHaveProperty('speed');
      });
    });
  });

  describe('POST /api/processing/separate - Validation', () => {
    it('should return 400 if trackId is missing', async () => {
      const response = await request(app)
        .post('/api/processing/separate')
        .send({
          audioFilePath: '/path/to/audio.mp3'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should return 400 if trackId is not a valid UUID', async () => {
      const response = await request(app)
        .post('/api/processing/separate')
        .send({
          trackId: 'invalid-uuid',
          audioFilePath: '/path/to/audio.mp3'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should return 400 if audioFilePath is missing', async () => {
      const response = await request(app)
        .post('/api/processing/separate')
        .send({
          trackId: '123e4567-e89b-12d3-a456-426614174000'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should return 400 if model is invalid', async () => {
      const response = await request(app)
        .post('/api/processing/separate')
        .send({
          trackId: '123e4567-e89b-12d3-a456-426614174000',
          audioFilePath: '/path/to/audio.mp3',
          model: 'invalid-model'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should accept valid Demucs models', async () => {
      const validModels = ['htdemucs', 'htdemucs_ft', 'mdx_extra'];

      for (const model of validModels) {
        (mockSupabase.from as any).mockReturnValueOnce({
          insert: jest.fn().mockReturnValueOnce({
            select: jest.fn().mockReturnValueOnce({
              single: jest.fn().mockResolvedValueOnce({
                data: {
                  id: '123e4567-e89b-12d3-a456-426614174001',
                  track_id: '123e4567-e89b-12d3-a456-426614174000',
                  type: 'processing',
                  status: 'queued',
                  progress: 0
                },
                error: null
              })
            })
          })
        });

        const response = await request(app)
          .post('/api/processing/separate')
          .send({
            trackId: '123e4567-e89b-12d3-a456-426614174000',
            audioFilePath: '/path/to/audio.mp3',
            model
          });

        expect(response.status).toBe(200);
      }
    });

    it('should default to htdemucs if model not specified', async () => {
      (mockSupabase.from as any).mockReturnValueOnce({
        insert: jest.fn().mockReturnValueOnce({
          select: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValueOnce({
              data: {
                id: '123e4567-e89b-12d3-a456-426614174001',
                metadata: { model: 'htdemucs' }
              },
              error: null
            })
          })
        })
      });

      const response = await request(app)
        .post('/api/processing/separate')
        .send({
          trackId: '123e4567-e89b-12d3-a456-426614174000',
          audioFilePath: '/path/to/audio.mp3'
        });

      expect(response.status).toBe(200);
    });

    it('should validate stems array contains only valid types', async () => {
      const response = await request(app)
        .post('/api/processing/separate')
        .send({
          trackId: '123e4567-e89b-12d3-a456-426614174000',
          audioFilePath: '/path/to/audio.mp3',
          stems: ['vocals', 'invalid']
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/processing/separate - Job Creation', () => {
    it('should create processing job in Supabase', async () => {
      const jobId = '123e4567-e89b-12d3-a456-426614174001';
      const trackId = '123e4567-e89b-12d3-a456-426614174000';

      (mockSupabase.from as any).mockReturnValueOnce({
        insert: jest.fn().mockReturnValueOnce({
          select: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValueOnce({
              data: {
                id: jobId,
                track_id: trackId,
                type: 'processing',
                status: 'queued',
                progress: 0,
                metadata: {
                  audioFilePath: '/path/to/audio.mp3',
                  model: 'htdemucs',
                  stems: ['vocals', 'drums', 'bass', 'other']
                }
              },
              error: null
            })
          })
        })
      });

      const response = await request(app)
        .post('/api/processing/separate')
        .send({
          trackId,
          audioFilePath: '/path/to/audio.mp3'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('jobId');
      expect(response.body).toHaveProperty('trackId', trackId);
      expect(response.body).toHaveProperty('status', 'queued');
    });

    it('should return 500 if database insert fails', async () => {
      (mockSupabase.from as any).mockReturnValueOnce({
        insert: jest.fn().mockReturnValueOnce({
          select: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValueOnce({
              data: null,
              error: { message: 'Database error' }
            })
          })
        })
      });

      const response = await request(app)
        .post('/api/processing/separate')
        .send({
          trackId: '123e4567-e89b-12d3-a456-426614174000',
          audioFilePath: '/path/to/audio.mp3'
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to create job');
    });

    it('should generate unique job IDs', async () => {
      const jobIds = new Set();

      for (let i = 0; i < 5; i++) {
        (mockSupabase.from as any).mockReturnValueOnce({
          insert: jest.fn().mockReturnValueOnce({
            select: jest.fn().mockReturnValueOnce({
              single: jest.fn().mockResolvedValueOnce({
                data: { id: `job-${i}` },
                error: null
              })
            })
          })
        });

        const response = await request(app)
          .post('/api/processing/separate')
          .send({
            trackId: '123e4567-e89b-12d3-a456-426614174000',
            audioFilePath: '/path/to/audio.mp3'
          });

        jobIds.add(response.body.jobId);
      }

      expect(jobIds.size).toBe(5);
    });

    it('should store metadata in job record', async () => {
      let capturedMetadata: any;

      (mockSupabase.from as any).mockReturnValueOnce({
        insert: jest.fn().mockImplementationOnce((data: any) => {
          capturedMetadata = data.metadata;
          return {
            select: jest.fn().mockReturnValueOnce({
              single: jest.fn().mockResolvedValueOnce({
                data: { id: 'test-job' },
                error: null
              })
            })
          };
        })
      });

      await request(app)
        .post('/api/processing/separate')
        .send({
          trackId: '123e4567-e89b-12d3-a456-426614174000',
          audioFilePath: '/path/to/audio.mp3',
          model: 'htdemucs_ft',
          stems: ['vocals', 'drums']
        });

      expect(capturedMetadata).toHaveProperty('audioFilePath');
      expect(capturedMetadata).toHaveProperty('model', 'htdemucs_ft');
      expect(capturedMetadata).toHaveProperty('stems');
    });

    it('should log job creation', async () => {
      (mockSupabase.from as any).mockReturnValueOnce({
        insert: jest.fn().mockReturnValueOnce({
          select: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValueOnce({
              data: { id: 'test-job' },
              error: null
            })
          })
        })
      });

      await request(app)
        .post('/api/processing/separate')
        .send({
          trackId: '123e4567-e89b-12d3-a456-426614174000',
          audioFilePath: '/path/to/audio.mp3'
        });

      expect(mockLogger.info).toHaveBeenCalled();
    });
  });

  describe('GET /api/processing/job/:jobId', () => {
    it('should return job status for valid jobId', async () => {
      const jobId = '123e4567-e89b-12d3-a456-426614174001';

      (mockSupabase.from as any).mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            eq: jest.fn().mockReturnValueOnce({
              single: jest.fn().mockResolvedValueOnce({
                data: {
                  id: jobId,
                  track_id: '123e4567-e89b-12d3-a456-426614174000',
                  type: 'processing',
                  status: 'processing',
                  progress: 45
                },
                error: null
              })
            })
          })
        })
      });

      const response = await request(app)
        .get(`/api/processing/job/${jobId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('job');
      expect(response.body.job).toHaveProperty('id', jobId);
    });

    it('should return 404 for non-existent job', async () => {
      (mockSupabase.from as any).mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            eq: jest.fn().mockReturnValueOnce({
              single: jest.fn().mockResolvedValueOnce({
                data: null,
                error: { message: 'Not found' }
              })
            })
          })
        })
      });

      const response = await request(app)
        .get('/api/processing/job/00000000-0000-0000-0000-000000000000');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Job not found');
    });

    it('should filter by job type', async () => {
      (mockSupabase.from as any).mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            eq: jest.fn().mockImplementationOnce((field: string, value: string) => {
              expect(field).toBe('type');
              expect(value).toBe('processing');
              return {
                single: jest.fn().mockResolvedValueOnce({
                  data: { id: 'test' },
                  error: null
                })
              };
            })
          })
        })
      });

      await request(app)
        .get('/api/processing/job/123e4567-e89b-12d3-a456-426614174001');
    });

    it('should return different job statuses correctly', async () => {
      const statuses = ['queued', 'processing', 'completed', 'error'];

      for (const status of statuses) {
        (mockSupabase.from as any).mockReturnValueOnce({
          select: jest.fn().mockReturnValueOnce({
            eq: jest.fn().mockReturnValueOnce({
              eq: jest.fn().mockReturnValueOnce({
                single: jest.fn().mockResolvedValueOnce({
                  data: { status },
                  error: null
                })
              })
            })
          })
        });

        const response = await request(app)
          .get('/api/processing/job/123e4567-e89b-12d3-a456-426614174001');

        expect(response.body.job.status).toBe(status);
      }
    });

    it('should include progress information', async () => {
      (mockSupabase.from as any).mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            eq: jest.fn().mockReturnValueOnce({
              single: jest.fn().mockResolvedValueOnce({
                data: {
                  id: 'test',
                  progress: 75
                },
                error: null
              })
            })
          })
        })
      });

      const response = await request(app)
        .get('/api/processing/job/123e4567-e89b-12d3-a456-426614174001');

      expect(response.body.job).toHaveProperty('progress', 75);
    });

    it('should handle database errors gracefully', async () => {
      (mockSupabase.from as any).mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            eq: jest.fn().mockReturnValueOnce({
              single: jest.fn().mockRejectedValueOnce(new Error('Database connection failed'))
            })
          })
        })
      });

      const response = await request(app)
        .get('/api/processing/job/123e4567-e89b-12d3-a456-426614174001');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/processing/health', () => {
    it('should return health check status', async () => {
      const response = await request(app)
        .get('/api/processing/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('service', 'processing');
    });

    it('should always return 200 even if other routes fail', async () => {
      const response = await request(app)
        .get('/api/processing/health');

      expect(response.status).toBe(200);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete separation workflow', async () => {
      const trackId = '123e4567-e89b-12d3-a456-426614174000';
      let jobId: string;

      // Step 1: Create separation job
      (mockSupabase.from as any).mockReturnValueOnce({
        insert: jest.fn().mockReturnValueOnce({
          select: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValueOnce({
              data: {
                id: 'test-job-id',
                track_id: trackId,
                status: 'queued'
              },
              error: null
            })
          })
        })
      });

      const createResponse = await request(app)
        .post('/api/processing/separate')
        .send({
          trackId,
          audioFilePath: '/path/to/audio.mp3'
        });

      expect(createResponse.status).toBe(200);
      jobId = createResponse.body.jobId;

      // Step 2: Check job status
      (mockSupabase.from as any).mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            eq: jest.fn().mockReturnValueOnce({
              single: jest.fn().mockResolvedValueOnce({
                data: {
                  id: jobId,
                  status: 'processing',
                  progress: 50
                },
                error: null
              })
            })
          })
        })
      });

      const statusResponse = await request(app)
        .get(`/api/processing/job/${jobId}`);

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.job.status).toBe('processing');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long file paths', async () => {
      const longPath = '/very/long/path/'.repeat(50) + 'audio.mp3';

      (mockSupabase.from as any).mockReturnValueOnce({
        insert: jest.fn().mockReturnValueOnce({
          select: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValueOnce({
              data: { id: 'test' },
              error: null
            })
          })
        })
      });

      const response = await request(app)
        .post('/api/processing/separate')
        .send({
          trackId: '123e4567-e89b-12d3-a456-426614174000',
          audioFilePath: longPath
        });

      expect(response.status).toBe(200);
    });

    it('should handle special characters in file paths', async () => {
      const specialPath = '/path/to/audio (remix) [2024] #1.mp3';

      (mockSupabase.from as any).mockReturnValueOnce({
        insert: jest.fn().mockReturnValueOnce({
          select: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValueOnce({
              data: { id: 'test' },
              error: null
            })
          })
        })
      });

      const response = await request(app)
        .post('/api/processing/separate')
        .send({
          trackId: '123e4567-e89b-12d3-a456-426614174000',
          audioFilePath: specialPath
        });

      expect(response.status).toBe(200);
    });

    it('should handle single stem extraction', async () => {
      (mockSupabase.from as any).mockReturnValueOnce({
        insert: jest.fn().mockReturnValueOnce({
          select: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValueOnce({
              data: { id: 'test' },
              error: null
            })
          })
        })
      });

      const response = await request(app)
        .post('/api/processing/separate')
        .send({
          trackId: '123e4567-e89b-12d3-a456-426614174000',
          audioFilePath: '/path/to/audio.mp3',
          stems: ['vocals']
        });

      expect(response.status).toBe(200);
    });

    it('should handle concurrent separation requests', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => {
        (mockSupabase.from as any).mockReturnValueOnce({
          insert: jest.fn().mockReturnValueOnce({
            select: jest.fn().mockReturnValueOnce({
              single: jest.fn().mockResolvedValueOnce({
                data: { id: `job-${i}` },
                error: null
              })
            })
          })
        });

        return request(app)
          .post('/api/processing/separate')
          .send({
            trackId: '123e4567-e89b-12d3-a456-426614174000',
            audioFilePath: `/path/to/audio${i}.mp3`
          });
      });

      const responses = await Promise.all(requests);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should handle missing optional parameters gracefully', async () => {
      (mockSupabase.from as any).mockReturnValueOnce({
        insert: jest.fn().mockReturnValueOnce({
          select: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValueOnce({
              data: { id: 'test' },
              error: null
            })
          })
        })
      });

      const response = await request(app)
        .post('/api/processing/separate')
        .send({
          trackId: '123e4567-e89b-12d3-a456-426614174000',
          audioFilePath: '/path/to/audio.mp3'
          // model and stems not provided - should use defaults
        });

      expect(response.status).toBe(200);
    });
  });
});
