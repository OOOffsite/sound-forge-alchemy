/**
 * API Client Integration Tests
 *
 * @description Integration tests for API client using MSW
 * @author Sound Forge Alchemy Team
 * @license MIT
 * @version 2.0.0
 *
 * TDD Phase: RED - Tests written before implementation
 * Coverage Target: 95%+
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { api } from '@/lib/api';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

const API_BASE = 'http://localhost:3000';

describe('API Client Integration', () => {
  describe('fetchPlaylist', () => {
    it('should call POST /api/spotify/fetch with URL', async () => {
      const url = 'https://open.spotify.com/playlist/test123';
      const result = await api.fetchPlaylist(url);

      expect(result.success).toBe(true);
      expect(result.type).toBe('playlist');
      expect(result.id).toBe('test-playlist-123');
    });

    it('should return playlist metadata with tracks', async () => {
      const url = 'https://open.spotify.com/playlist/test123';
      const result = await api.fetchPlaylist(url);

      expect(result.tracks).toBeDefined();
      expect(result.tracks).toHaveLength(2);
      expect(result.tracks[0]).toHaveProperty('id');
      expect(result.tracks[0]).toHaveProperty('title');
      expect(result.tracks[0]).toHaveProperty('artist');
    });

    it('should handle invalid URL errors', async () => {
      const url = 'https://invalid.com/playlist';

      await expect(api.fetchPlaylist(url)).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      // Override handler for this test
      server.use(
        http.post(`${API_BASE}/api/spotify/fetch`, () => {
          return HttpResponse.error();
        })
      );

      await expect(
        api.fetchPlaylist('https://open.spotify.com/playlist/test')
      ).rejects.toThrow();
    });

    it('should retry on timeout', async () => {
      let attemptCount = 0;

      // Override handler to succeed on second attempt
      server.use(
        http.post(`${API_BASE}/api/spotify/fetch`, () => {
          attemptCount++;
          if (attemptCount === 1) {
            return new Promise(() => {
              // Never resolve to simulate timeout
            });
          }
          return HttpResponse.json({
            success: true,
            type: 'playlist',
            id: 'test-retry',
            tracks: [],
          });
        })
      );

      // This test expects retry logic in the implementation
      const result = await api.fetchPlaylist(
        'https://open.spotify.com/playlist/retry',
        { timeout: 100, retries: 1 }
      );

      expect(result.success).toBe(true);
      expect(attemptCount).toBeGreaterThan(1);
    });
  });

  describe('downloadTrack', () => {
    it('should create download job with POST /api/download/track', async () => {
      const result = await api.downloadTrack('track-1');

      expect(result.success).toBe(true);
      expect(result.jobId).toBeDefined();
      expect(result.jobId).toContain('job-');
      expect(result.status).toBe('pending');
    });

    it('should return jobId on success', async () => {
      const result = await api.downloadTrack('track-123');

      expect(result.jobId).toBeDefined();
      expect(typeof result.jobId).toBe('string');
      expect(result.jobId.length).toBeGreaterThan(0);
    });

    it('should validate trackId input', async () => {
      await expect(api.downloadTrack('')).rejects.toThrow();
    });

    it('should handle track not found errors', async () => {
      await expect(api.downloadTrack('invalid-track')).rejects.toThrow();
    });
  });

  describe('separateStems', () => {
    it('should create processing job with POST /api/processing/separate', async () => {
      const result = await api.separateStems('audio-123');

      expect(result.success).toBe(true);
      expect(result.jobId).toBeDefined();
      expect(result.jobId).toContain('separation-job-');
      expect(result.status).toBe('processing');
    });

    it('should accept model parameter', async () => {
      const result = await api.separateStems('audio-123', { model: 'mdx_extra' });

      expect(result.success).toBe(true);
      expect(result.model).toBe('mdx_extra');
    });

    it('should use default model when not specified', async () => {
      const result = await api.separateStems('audio-123');

      expect(result.model).toBe('htdemucs');
    });

    it('should validate model parameter', async () => {
      await expect(
        api.separateStems('audio-123', { model: 'invalid-model' })
      ).rejects.toThrow();
    });

    it('should validate audioId input', async () => {
      await expect(api.separateStems('')).rejects.toThrow();
    });
  });

  describe('analyzeAudio', () => {
    it('should create analysis job with POST /api/analysis/analyze', async () => {
      const result = await api.analyzeAudio('audio-456');

      expect(result.success).toBe(true);
      expect(result.jobId).toBeDefined();
      expect(result.jobId).toContain('analysis-job-');
      expect(result.status).toBe('analyzing');
    });

    it('should return analysis results when complete', async () => {
      const createResult = await api.analyzeAudio('audio-456');
      const jobId = createResult.jobId;

      // Fetch results
      const results = await api.getAnalysisResults(jobId);

      expect(results.success).toBe(true);
      expect(results.results).toBeDefined();
      expect(results.results.tempo).toBeDefined();
      expect(results.results.key).toBeDefined();
      expect(results.results.scale).toBeDefined();
    });

    it('should validate audioId input', async () => {
      await expect(api.analyzeAudio('')).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle 400 Bad Request errors', async () => {
      await expect(api.fetchPlaylist('')).rejects.toThrow();
    });

    it('should handle 404 Not Found errors', async () => {
      await expect(api.downloadTrack('invalid-track')).rejects.toThrow();
    });

    it('should handle network errors gracefully', async () => {
      server.use(
        http.post(`${API_BASE}/api/spotify/fetch`, () => {
          return HttpResponse.error();
        })
      );

      await expect(
        api.fetchPlaylist('https://open.spotify.com/playlist/test')
      ).rejects.toThrow();
    });

    it('should include error messages in rejected promises', async () => {
      try {
        await api.fetchPlaylist('https://invalid.com/playlist');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBeDefined();
        expect(typeof error.message).toBe('string');
      }
    });
  });

  describe('Request Options', () => {
    it('should support custom timeout', async () => {
      const startTime = Date.now();

      try {
        await api.fetchPlaylist(
          'https://open.spotify.com/playlist/test',
          { timeout: 50 }
        );
      } catch (error) {
        const elapsed = Date.now() - startTime;
        expect(elapsed).toBeLessThan(200); // Should timeout quickly
      }
    });

    it('should support retry configuration', async () => {
      let attemptCount = 0;

      server.use(
        http.post(`${API_BASE}/api/spotify/fetch`, () => {
          attemptCount++;
          return HttpResponse.error();
        })
      );

      try {
        await api.fetchPlaylist(
          'https://open.spotify.com/playlist/test',
          { retries: 3 }
        );
      } catch (error) {
        expect(attemptCount).toBe(4); // Initial + 3 retries
      }
    });
  });
});
