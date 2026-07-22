/**
 * End-to-End Workflow Integration Tests
 *
 * @description Integration tests for complete workflows combining API, Realtime, and Storage
 * @author Sound Forge Alchemy Team
 * @license MIT
 * @version 2.0.0
 *
 * TDD Phase: RED - Tests written before implementation
 * Coverage Target: 95%+
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { workflow } from '@/lib/workflow';
import { createClient } from '@supabase/supabase-js';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

const API_BASE = 'http://localhost:3000';
const mockSupabase = createClient('http://localhost:54321', 'test-anon-key');

describe('End-to-End Workflow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Download Workflow', () => {
    it('should complete full download workflow from URL to storage', async () => {
      // Test workflow:
      // 1. Fetch playlist from Spotify URL
      // 2. Create download job for first track
      // 3. Subscribe to job progress
      // 4. Wait for job completion
      // 5. Verify file exists in storage

      const playlistUrl = 'https://open.spotify.com/playlist/test123';
      const progressUpdates: any[] = [];

      const result = await workflow.downloadPlaylist(playlistUrl, {
        onProgress: (update) => {
          progressUpdates.push(update);
        },
      });

      // Verify workflow completed
      expect(result.success).toBe(true);
      expect(result.tracks).toBeDefined();
      expect(result.tracks.length).toBeGreaterThan(0);

      // Verify each track was processed
      for (const track of result.tracks) {
        expect(track.jobId).toBeDefined();
        expect(track.status).toBe('complete');
        expect(track.storagePath).toBeDefined();
      }

      // Verify progress updates were received
      expect(progressUpdates.length).toBeGreaterThan(0);

      // Verify final progress is 100%
      const finalProgress = progressUpdates[progressUpdates.length - 1];
      expect(finalProgress.progress).toBe(100);
    });

    it('should handle errors during download workflow', async () => {
      const invalidUrl = 'https://invalid.com/playlist';

      await expect(
        workflow.downloadPlaylist(invalidUrl)
      ).rejects.toThrow();
    });

    it('should support cancellation of download workflow', async () => {
      const playlistUrl = 'https://open.spotify.com/playlist/test123';

      // Start workflow
      const workflowPromise = workflow.downloadPlaylist(playlistUrl);

      // Cancel after a short delay
      setTimeout(() => {
        workflow.cancelDownload();
      }, 100);

      await expect(workflowPromise).rejects.toThrow('Workflow cancelled');
    });
  });

  describe('Complete Stem Separation Workflow', () => {
    it('should complete full stem separation workflow', async () => {
      // Test workflow:
      // 1. Upload audio file
      // 2. Create processing job
      // 3. Subscribe to progress
      // 4. Wait for completion
      // 5. Verify stems in storage

      const audioFile = new File(['audio data'], 'test.mp3', {
        type: 'audio/mpeg',
      });
      const trackId = 'track-stems-test';
      const progressUpdates: any[] = [];

      const result = await workflow.separateStems(audioFile, trackId, {
        model: 'htdemucs',
        onProgress: (update) => {
          progressUpdates.push(update);
        },
      });

      // Verify workflow completed
      expect(result.success).toBe(true);
      expect(result.jobId).toBeDefined();
      expect(result.stems).toBeDefined();

      // Verify stems were created
      expect(result.stems.vocals).toBeDefined();
      expect(result.stems.drums).toBeDefined();
      expect(result.stems.bass).toBeDefined();
      expect(result.stems.other).toBeDefined();

      // Verify each stem has storage path
      Object.values(result.stems).forEach((stemPath) => {
        expect(stemPath).toContain(trackId);
      });

      // Verify progress updates
      expect(progressUpdates.length).toBeGreaterThan(0);

      // Verify stages were tracked
      const stages = progressUpdates.map((u) => u.stage);
      expect(stages).toContain('uploading');
      expect(stages).toContain('processing');
      expect(stages).toContain('complete');
    });

    it('should support different separation models', async () => {
      const audioFile = new File(['audio data'], 'test.mp3', {
        type: 'audio/mpeg',
      });
      const trackId = 'track-model-test';

      const models = ['htdemucs', 'htdemucs_ft', 'mdx_extra'];

      for (const model of models) {
        const result = await workflow.separateStems(audioFile, trackId, {
          model: model as any,
        });

        expect(result.success).toBe(true);
        expect(result.model).toBe(model);
      }
    });

    it('should handle processing errors gracefully', async () => {
      const invalidFile = new File(['invalid'], 'test.txt', {
        type: 'text/plain',
      });
      const trackId = 'track-error-test';

      await expect(
        workflow.separateStems(invalidFile, trackId)
      ).rejects.toThrow('Invalid file type');
    });
  });

  describe('Complete Analysis Workflow', () => {
    it('should complete full analysis workflow', async () => {
      // Test workflow:
      // 1. Upload audio file
      // 2. Create analysis job
      // 3. Subscribe to progress
      // 4. Wait for completion
      // 5. Return analysis results

      const audioFile = new File(['audio data'], 'test.mp3', {
        type: 'audio/mpeg',
      });
      const trackId = 'track-analysis-test';
      const progressUpdates: any[] = [];

      const result = await workflow.analyzeAudio(audioFile, trackId, {
        onProgress: (update) => {
          progressUpdates.push(update);
        },
      });

      // Verify workflow completed
      expect(result.success).toBe(true);
      expect(result.jobId).toBeDefined();
      expect(result.analysis).toBeDefined();

      // Verify analysis contains expected properties
      expect(result.analysis.tempo).toBeDefined();
      expect(result.analysis.key).toBeDefined();
      expect(result.analysis.scale).toBeDefined();
      expect(result.analysis.energy).toBeDefined();
      expect(result.analysis.danceability).toBeDefined();
      expect(result.analysis.valence).toBeDefined();

      // Verify numeric ranges
      expect(result.analysis.tempo).toBeGreaterThan(0);
      expect(result.analysis.energy).toBeGreaterThanOrEqual(0);
      expect(result.analysis.energy).toBeLessThanOrEqual(1);

      // Verify progress updates
      expect(progressUpdates.length).toBeGreaterThan(0);
    });

    it('should store analysis results in database', async () => {
      const audioFile = new File(['audio data'], 'test.mp3', {
        type: 'audio/mpeg',
      });
      const trackId = 'track-db-test';

      const result = await workflow.analyzeAudio(audioFile, trackId, {
        saveToDatabase: true,
      });

      expect(result.success).toBe(true);
      expect(result.savedToDatabase).toBe(true);
      expect(result.databaseId).toBeDefined();
    });

    it('should handle timeout during analysis', async () => {
      const audioFile = new File(['audio data'], 'long.mp3', {
        type: 'audio/mpeg',
      });
      const trackId = 'track-timeout-test';

      // Mock long-running analysis
      server.use(
        http.post(`${API_BASE}/api/analysis/analyze`, () => {
          return new Promise(() => {
            // Never resolve
          });
        })
      );

      await expect(
        workflow.analyzeAudio(audioFile, trackId, {
          timeout: 100, // Very short timeout
        })
      ).rejects.toThrow();
    });
  });

  describe('Workflow State Management', () => {
    it('should track workflow state throughout execution', async () => {
      const audioFile = new File(['audio data'], 'test.mp3', {
        type: 'audio/mpeg',
      });
      const trackId = 'track-state-test';

      const states: string[] = [];

      const result = await workflow.separateStems(audioFile, trackId, {
        onStateChange: (state) => {
          states.push(state);
        },
      });

      expect(result.success).toBe(true);

      // Verify state progression
      expect(states).toContain('uploading');
      expect(states).toContain('processing');
      expect(states).toContain('complete');

      // Verify states are in order
      const uploadIndex = states.indexOf('uploading');
      const processingIndex = states.indexOf('processing');
      const completeIndex = states.indexOf('complete');

      expect(uploadIndex).toBeLessThan(processingIndex);
      expect(processingIndex).toBeLessThan(completeIndex);
    });

    it('should allow querying workflow status', async () => {
      const audioFile = new File(['audio data'], 'test.mp3', {
        type: 'audio/mpeg',
      });
      const trackId = 'track-status-test';

      // Start workflow (don't await)
      const workflowPromise = workflow.separateStems(audioFile, trackId);

      // Query status while running
      const status = workflow.getStatus();

      expect(status.isRunning).toBe(true);
      expect(status.currentStage).toBeDefined();

      // Wait for completion
      await workflowPromise;

      const finalStatus = workflow.getStatus();
      expect(finalStatus.isRunning).toBe(false);
      expect(finalStatus.currentStage).toBe('complete');
    });
  });

  describe('Error Recovery', () => {
    it('should retry failed operations automatically', async () => {
      let attemptCount = 0;

      server.use(
        http.post(`${API_BASE}/api/processing/separate`, () => {
          attemptCount++;
          if (attemptCount < 3) {
            return HttpResponse.error();
          }
          return HttpResponse.json({
            success: true,
            jobId: 'retry-job-123',
            model: 'htdemucs',
            status: 'processing',
          });
        })
      );

      const audioFile = new File(['audio data'], 'test.mp3', {
        type: 'audio/mpeg',
      });
      const trackId = 'track-retry-test';

      const result = await workflow.separateStems(audioFile, trackId, {
        retries: 3,
      });

      expect(result.success).toBe(true);
      expect(attemptCount).toBe(3);
    });

    it('should cleanup resources on workflow failure', async () => {
      const audioFile = new File(['audio data'], 'test.mp3', {
        type: 'audio/mpeg',
      });
      const trackId = 'track-cleanup-test';

      // Force an error
      server.use(
        http.post(`${API_BASE}/api/processing/separate`, () => {
          return HttpResponse.error();
        })
      );

      try {
        await workflow.separateStems(audioFile, trackId, {
          retries: 0,
        });
      } catch (error) {
        // Expected error
      }

      // Verify cleanup occurred
      const status = workflow.getStatus();
      expect(status.isRunning).toBe(false);
      expect(status.error).toBeDefined();
    });
  });
});
