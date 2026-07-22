/**
 * Supabase Realtime Integration Tests
 *
 * @description Integration tests for Supabase Realtime subscriptions
 * @author Sound Forge Alchemy Team
 * @license MIT
 * @version 2.0.0
 *
 * TDD Phase: RED - Tests written before implementation
 * Coverage Target: 95%+
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RealtimeManager } from '@/lib/realtime';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client will be provided by test setup
const mockSupabase = createClient('http://localhost:54321', 'test-anon-key');

describe('Supabase Realtime Integration', () => {
  let realtimeManager: RealtimeManager;
  let mockChannel: any;
  let mockSubscribeFn: any;

  beforeEach(() => {
    // Create mock channel with method chaining
    mockSubscribeFn = vi.fn().mockReturnValue(Promise.resolve());

    mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: mockSubscribeFn,
      unsubscribe: vi.fn().mockReturnValue(Promise.resolve()),
    };

    // Mock the channel method
    vi.spyOn(mockSupabase, 'channel').mockReturnValue(mockChannel as any);

    realtimeManager = new RealtimeManager(mockSupabase);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Job Subscription', () => {
    it('should subscribe to job updates channel', async () => {
      const jobId = 'test-job-123';
      const callbacks = {
        onUpdate: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      };

      realtimeManager.subscribeToJob(jobId, callbacks);

      expect(mockSupabase.channel).toHaveBeenCalledWith(`job:${jobId}`);
      expect(mockChannel.on).toHaveBeenCalledWith(
        'broadcast',
        { event: 'job:update' },
        callbacks.onUpdate
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    it('should receive job:update events', async () => {
      const jobId = 'test-job-456';
      const updateCallback = vi.fn();

      realtimeManager.subscribeToJob(jobId, {
        onUpdate: updateCallback,
      });

      // Simulate receiving an update event
      const updateEvent = {
        progress: 50,
        status: 'processing',
        message: 'Processing audio...',
      };

      // Trigger the callback that was registered
      const onCall = mockChannel.on.mock.calls.find(
        (call: any[]) => call[1].event === 'job:update'
      );
      if (onCall) {
        onCall[2](updateEvent);
      }

      expect(updateCallback).toHaveBeenCalledWith(updateEvent);
    });

    it('should receive job:complete events', async () => {
      const jobId = 'test-job-789';
      const completeCallback = vi.fn();

      realtimeManager.subscribeToJob(jobId, {
        onComplete: completeCallback,
      });

      // Simulate receiving a complete event
      const completeEvent = {
        jobId,
        status: 'complete',
        result: { outputUrl: 'https://example.com/output.mp3' },
      };

      const onCall = mockChannel.on.mock.calls.find(
        (call: any[]) => call[1].event === 'job:complete'
      );
      if (onCall) {
        onCall[2](completeEvent);
      }

      expect(completeCallback).toHaveBeenCalledWith(completeEvent);
    });

    it('should receive job:error events', async () => {
      const jobId = 'test-job-error';
      const errorCallback = vi.fn();

      realtimeManager.subscribeToJob(jobId, {
        onError: errorCallback,
      });

      // Simulate receiving an error event
      const errorEvent = {
        jobId,
        status: 'failed',
        error: 'Processing failed: Out of memory',
      };

      const onCall = mockChannel.on.mock.calls.find(
        (call: any[]) => call[1].event === 'job:error'
      );
      if (onCall) {
        onCall[2](errorEvent);
      }

      expect(errorCallback).toHaveBeenCalledWith(errorEvent);
    });
  });

  describe('Connection Management', () => {
    it('should handle connection loss gracefully', async () => {
      const jobId = 'test-job-connection';
      const errorCallback = vi.fn();

      // Mock connection error
      mockSubscribeFn.mockRejectedValueOnce(new Error('Connection lost'));

      try {
        await realtimeManager.subscribeToJob(jobId, {
          onError: errorCallback,
        });
      } catch (error: any) {
        expect(error.message).toBe('Connection lost');
      }
    });

    it('should reconnect automatically on disconnect', async () => {
      const jobId = 'test-job-reconnect';
      const updateCallback = vi.fn();

      // Setup auto-reconnect behavior
      let connectionAttempts = 0;
      mockSubscribeFn.mockImplementation(() => {
        connectionAttempts++;
        if (connectionAttempts === 1) {
          return Promise.reject(new Error('Connection lost'));
        }
        return Promise.resolve();
      });

      try {
        await realtimeManager.subscribeToJob(
          jobId,
          { onUpdate: updateCallback },
          { autoReconnect: true, maxReconnectAttempts: 3 }
        );
      } catch (error) {
        // First attempt should fail, triggering reconnect
      }

      // Manually trigger reconnect
      await realtimeManager.reconnect(jobId);

      expect(connectionAttempts).toBeGreaterThan(1);
    });

    it('should cleanup subscriptions on disconnect', async () => {
      const jobId = 'test-job-cleanup';

      const unsubscribe = realtimeManager.subscribeToJob(jobId, {
        onUpdate: vi.fn(),
      });

      // Call unsubscribe
      unsubscribe();

      expect(mockChannel.unsubscribe).toHaveBeenCalled();

      // Verify channel is removed from manager
      const channelExists = realtimeManager.hasActiveSubscription(jobId);
      expect(channelExists).toBe(false);
    });
  });

  describe('Multiple Subscriptions', () => {
    it('should support multiple simultaneous subscriptions', async () => {
      const jobId1 = 'job-1';
      const jobId2 = 'job-2';
      const jobId3 = 'job-3';

      realtimeManager.subscribeToJob(jobId1, { onUpdate: vi.fn() });
      realtimeManager.subscribeToJob(jobId2, { onUpdate: vi.fn() });
      realtimeManager.subscribeToJob(jobId3, { onUpdate: vi.fn() });

      expect(mockSupabase.channel).toHaveBeenCalledTimes(3);
      expect(realtimeManager.getActiveSubscriptionCount()).toBe(3);
    });

    it('should unsubscribe from specific jobs independently', async () => {
      const jobId1 = 'job-1';
      const jobId2 = 'job-2';

      const unsubscribe1 = realtimeManager.subscribeToJob(jobId1, {
        onUpdate: vi.fn(),
      });
      const unsubscribe2 = realtimeManager.subscribeToJob(jobId2, {
        onUpdate: vi.fn(),
      });

      // Unsubscribe from job 1
      unsubscribe1();

      expect(realtimeManager.hasActiveSubscription(jobId1)).toBe(false);
      expect(realtimeManager.hasActiveSubscription(jobId2)).toBe(true);
      expect(realtimeManager.getActiveSubscriptionCount()).toBe(1);
    });

    it('should cleanup all subscriptions on manager destroy', async () => {
      realtimeManager.subscribeToJob('job-1', { onUpdate: vi.fn() });
      realtimeManager.subscribeToJob('job-2', { onUpdate: vi.fn() });
      realtimeManager.subscribeToJob('job-3', { onUpdate: vi.fn() });

      // Destroy manager
      realtimeManager.destroy();

      expect(realtimeManager.getActiveSubscriptionCount()).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid job IDs gracefully', () => {
      expect(() => {
        realtimeManager.subscribeToJob('', { onUpdate: vi.fn() });
      }).toThrow('Job ID is required');
    });

    it('should handle missing callbacks', () => {
      expect(() => {
        realtimeManager.subscribeToJob('test-job', {});
      }).toThrow('At least one callback is required');
    });

    it('should handle subscription errors', async () => {
      mockSubscribeFn.mockRejectedValueOnce(
        new Error('Subscription failed')
      );

      await expect(
        realtimeManager.subscribeToJob('test-job', {
          onUpdate: vi.fn(),
        })
      ).rejects.toThrow('Subscription failed');
    });
  });

  describe('Event Filtering', () => {
    it('should only trigger relevant callbacks for events', async () => {
      const jobId = 'test-job';
      const updateCallback = vi.fn();
      const completeCallback = vi.fn();

      realtimeManager.subscribeToJob(jobId, {
        onUpdate: updateCallback,
        onComplete: completeCallback,
      });

      // Trigger only update event
      const updateCall = mockChannel.on.mock.calls.find(
        (call: any[]) => call[1].event === 'job:update'
      );
      if (updateCall) {
        updateCall[2]({ progress: 25 });
      }

      expect(updateCallback).toHaveBeenCalledTimes(1);
      expect(completeCallback).not.toHaveBeenCalled();
    });
  });
});
