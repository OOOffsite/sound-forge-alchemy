/**
 * Supabase Storage Integration Tests
 *
 * @description Integration tests for Supabase Storage operations
 * @author Sound Forge Alchemy Team
 * @license MIT
 * @version 2.0.0
 *
 * TDD Phase: RED - Tests written before implementation
 * Coverage Target: 95%+
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { storage } from '@/lib/storage';
import { createClient } from '@supabase/supabase-js';

const mockSupabase = createClient('http://localhost:54321', 'test-anon-key');

describe('Supabase Storage Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Upload Operations', () => {
    it('should upload audio files to storage bucket', async () => {
      const file = new File(['audio data'], 'test.mp3', { type: 'audio/mpeg' });
      const trackId = 'track-123';

      const result = await storage.uploadAudio(file, trackId);

      expect(result).toBeDefined();
      expect(result.path).toBeDefined();
      expect(result.path).toContain(trackId);
    });

    it('should generate unique paths for uploaded files', async () => {
      const file1 = new File(['audio 1'], 'track1.mp3', { type: 'audio/mpeg' });
      const file2 = new File(['audio 2'], 'track2.mp3', { type: 'audio/mpeg' });
      const trackId = 'track-456';

      const result1 = await storage.uploadAudio(file1, trackId);
      const result2 = await storage.uploadAudio(file2, trackId);

      expect(result1.path).not.toBe(result2.path);
    });

    it('should validate file types before upload', async () => {
      const invalidFile = new File(['text data'], 'test.txt', {
        type: 'text/plain',
      });
      const trackId = 'track-789';

      await expect(storage.uploadAudio(invalidFile, trackId)).rejects.toThrow(
        'Invalid file type'
      );
    });

    it('should handle large files (>10MB)', async () => {
      // Create a mock large file
      const largeData = new Array(11 * 1024 * 1024).fill('a').join('');
      const largeFile = new File([largeData], 'large.mp3', {
        type: 'audio/mpeg',
      });
      const trackId = 'track-large';

      const result = await storage.uploadAudio(largeFile, trackId, {
        chunkSize: 6 * 1024 * 1024, // 6MB chunks
      });

      expect(result).toBeDefined();
      expect(result.path).toBeDefined();
    });

    it('should include metadata in upload', async () => {
      const file = new File(['audio data'], 'test.mp3', { type: 'audio/mpeg' });
      const trackId = 'track-meta';
      const metadata = {
        artist: 'Test Artist',
        title: 'Test Track',
        duration: 180,
      };

      const result = await storage.uploadAudio(file, trackId, { metadata });

      expect(result).toBeDefined();
      expect(result.metadata).toEqual(metadata);
    });
  });

  describe('Download Operations', () => {
    it('should download audio files from storage', async () => {
      const path = 'track-123/test.mp3';

      const result = await storage.downloadAudio(path);

      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(Blob);
    });

    it('should handle download errors for missing files', async () => {
      const path = 'nonexistent/file.mp3';

      await expect(storage.downloadAudio(path)).rejects.toThrow(
        'File not found'
      );
    });
  });

  describe('Public URL Generation', () => {
    it('should get public URL for files', async () => {
      const path = 'track-123/test.mp3';

      const url = storage.getPublicUrl(path);

      expect(url).toBeDefined();
      expect(typeof url).toBe('string');
      expect(url).toContain(path);
    });

    it('should generate valid HTTPS URLs', () => {
      const path = 'track-456/audio.mp3';

      const url = storage.getPublicUrl(path);

      expect(url).toMatch(/^https?:\/\//);
    });
  });

  describe('File Listing', () => {
    it('should list files in a bucket', async () => {
      const trackId = 'track-123';

      const files = await storage.listFiles(trackId);

      expect(files).toBeDefined();
      expect(Array.isArray(files)).toBe(true);
    });

    it('should filter files by prefix', async () => {
      const trackId = 'track-123';
      const prefix = 'stems';

      const files = await storage.listFiles(trackId, { prefix });

      expect(files).toBeDefined();
      files.forEach((file) => {
        expect(file.name).toContain(prefix);
      });
    });

    it('should return empty array for empty directories', async () => {
      const trackId = 'empty-track';

      const files = await storage.listFiles(trackId);

      expect(files).toEqual([]);
    });
  });

  describe('File Deletion', () => {
    it('should delete files from storage', async () => {
      const path = 'track-123/test.mp3';

      const result = await storage.deleteFile(path);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should handle deletion of non-existent files', async () => {
      const path = 'nonexistent/file.mp3';

      const result = await storage.deleteFile(path);

      // Deletion of non-existent files should succeed silently
      expect(result.success).toBe(true);
    });

    it('should delete multiple files at once', async () => {
      const paths = [
        'track-123/file1.mp3',
        'track-123/file2.mp3',
        'track-123/file3.mp3',
      ];

      const result = await storage.deleteFiles(paths);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle storage quota exceeded errors', async () => {
      const largeData = new Array(100 * 1024 * 1024).fill('a').join('');
      const largeFile = new File([largeData], 'huge.mp3', {
        type: 'audio/mpeg',
      });

      // Mock quota exceeded error
      vi.spyOn(mockSupabase.storage.from('audio-files'), 'upload').mockRejectedValueOnce(
        new Error('Storage quota exceeded')
      );

      await expect(storage.uploadAudio(largeFile, 'track-quota')).rejects.toThrow(
        'Storage quota exceeded'
      );
    });

    it('should handle network errors during upload', async () => {
      const file = new File(['audio data'], 'test.mp3', { type: 'audio/mpeg' });

      vi.spyOn(mockSupabase.storage.from('audio-files'), 'upload').mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(storage.uploadAudio(file, 'track-network')).rejects.toThrow(
        'Network error'
      );
    });

    it('should validate required parameters', async () => {
      const file = new File(['audio data'], 'test.mp3', { type: 'audio/mpeg' });

      await expect(storage.uploadAudio(file, '')).rejects.toThrow(
        'Track ID is required'
      );
    });
  });

  describe('Progress Tracking', () => {
    it('should track upload progress', async () => {
      const file = new File(['audio data'], 'test.mp3', { type: 'audio/mpeg' });
      const trackId = 'track-progress';
      const onProgress = vi.fn();

      await storage.uploadAudio(file, trackId, { onProgress });

      expect(onProgress).toHaveBeenCalled();
      expect(onProgress.mock.calls[0][0]).toHaveProperty('progress');
      expect(onProgress.mock.calls[0][0].progress).toBeGreaterThanOrEqual(0);
      expect(onProgress.mock.calls[0][0].progress).toBeLessThanOrEqual(100);
    });
  });
});
