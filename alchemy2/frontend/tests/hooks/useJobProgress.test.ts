/**
 * Tests: useJobProgress Hook
 *
 * @description TDD tests for job progress tracking via Supabase Realtime
 * @author Sound Forge Alchemy Team
 * @license MIT
 * @version 2.0.0
 * @phase RED - Write failing tests first
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useJobProgress } from '@/hooks/useJobProgress';
import { createMockChannel, resetSupabaseMocks } from '../mocks/supabase';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: vi.fn(() => createMockChannel()),
  },
}));

describe('useJobProgress', () => {
  let mockChannel: ReturnType<typeof createMockChannel>;

  beforeEach(() => {
    mockChannel = createMockChannel();
    const { supabase } = require('@/lib/supabase');
    supabase.channel.mockReturnValue(mockChannel);
  });

  afterEach(() => {
    resetSupabaseMocks();
  });

  describe('RED Phase - Failing Tests', () => {
    it('should subscribe to Supabase Realtime channel on mount', () => {
      const jobId = 'job-123';
      const { supabase } = require('@/lib/supabase');

      renderHook(() => useJobProgress(jobId));

      expect(supabase.channel).toHaveBeenCalledWith(`job:${jobId}`);
      expect(mockChannel.on).toHaveBeenCalledWith(
        'broadcast',
        { event: 'job:update' },
        expect.any(Function)
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    it('should initialize with default state', () => {
      const { result } = renderHook(() => useJobProgress('job-123'));

      expect(result.current.progress).toBe(0);
      expect(result.current.status).toBe('queued');
      expect(result.current.message).toBe('');
      expect(result.current.error).toBeNull();
    });

    it('should update progress state when receiving broadcast updates', async () => {
      const jobId = 'job-123';
      let updateCallback: ((payload: any) => void) | undefined;

      mockChannel.on.mockImplementation((type, config, callback) => {
        if (type === 'broadcast' && config.event === 'job:update') {
          updateCallback = callback;
        }
        return mockChannel;
      });

      const { result } = renderHook(() => useJobProgress(jobId));

      // Simulate broadcast update
      act(() => {
        updateCallback?.({
          progress: 50,
          status: 'processing',
          message: 'Processing stems...',
        });
      });

      await waitFor(() => {
        expect(result.current.progress).toBe(50);
        expect(result.current.status).toBe('processing');
        expect(result.current.message).toBe('Processing stems...');
      });
    });

    it('should filter updates by jobId', async () => {
      const jobId = 'job-123';
      let updateCallback: ((payload: any) => void) | undefined;

      mockChannel.on.mockImplementation((type, config, callback) => {
        updateCallback = callback;
        return mockChannel;
      });

      const { result } = renderHook(() => useJobProgress(jobId));

      // Simulate update for different job
      act(() => {
        updateCallback?.({
          jobId: 'different-job',
          progress: 100,
          status: 'completed',
        });
      });

      // Should not update
      expect(result.current.progress).toBe(0);
      expect(result.current.status).toBe('queued');
    });

    it('should cleanup subscription on unmount', () => {
      const { unmount } = renderHook(() => useJobProgress('job-123'));

      unmount();

      expect(mockChannel.unsubscribe).toHaveBeenCalled();
    });

    it('should handle connection errors gracefully', async () => {
      const jobId = 'job-123';
      mockChannel.subscribe.mockImplementation(() => {
        throw new Error('Connection failed');
      });

      const { result } = renderHook(() => useJobProgress(jobId));

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.status).toBe('error');
      });
    });

    it('should emit completion events when job is done', async () => {
      const jobId = 'job-123';
      const onComplete = vi.fn();
      let updateCallback: ((payload: any) => void) | undefined;

      mockChannel.on.mockImplementation((type, config, callback) => {
        updateCallback = callback;
        return mockChannel;
      });

      const { result } = renderHook(() => useJobProgress(jobId, { onComplete }));

      act(() => {
        updateCallback?.({
          progress: 100,
          status: 'completed',
          message: 'Job completed successfully',
        });
      });

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledWith({
          progress: 100,
          status: 'completed',
          message: 'Job completed successfully',
        });
      });
    });

    it('should handle error status updates', async () => {
      const jobId = 'job-123';
      const onError = vi.fn();
      let updateCallback: ((payload: any) => void) | undefined;

      mockChannel.on.mockImplementation((type, config, callback) => {
        updateCallback = callback;
        return mockChannel;
      });

      const { result } = renderHook(() => useJobProgress(jobId, { onError }));

      act(() => {
        updateCallback?.({
          progress: 45,
          status: 'error',
          message: 'Processing failed',
          error: 'Invalid audio format',
        });
      });

      await waitFor(() => {
        expect(result.current.status).toBe('error');
        expect(result.current.error).toBe('Invalid audio format');
        expect(onError).toHaveBeenCalledWith('Invalid audio format');
      });
    });

    it('should reconnect on subscription failure', async () => {
      const jobId = 'job-123';
      let subscribeCallCount = 0;

      mockChannel.subscribe.mockImplementation(() => {
        subscribeCallCount++;
        if (subscribeCallCount === 1) {
          throw new Error('First connection failed');
        }
        return mockChannel;
      });

      const { result } = renderHook(() => useJobProgress(jobId, { retry: true }));

      await waitFor(() => {
        expect(subscribeCallCount).toBeGreaterThan(1);
      }, { timeout: 3000 });
    });

    it('should update isComplete flag when job finishes', async () => {
      const jobId = 'job-123';
      let updateCallback: ((payload: any) => void) | undefined;

      mockChannel.on.mockImplementation((type, config, callback) => {
        updateCallback = callback;
        return mockChannel;
      });

      const { result } = renderHook(() => useJobProgress(jobId));

      expect(result.current.isComplete).toBe(false);

      act(() => {
        updateCallback?.({
          progress: 100,
          status: 'completed',
        });
      });

      await waitFor(() => {
        expect(result.current.isComplete).toBe(true);
      });
    });
  });
});
