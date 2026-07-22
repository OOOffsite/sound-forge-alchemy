/**
 * Supabase Realtime Manager
 *
 * @description Manager for Supabase Realtime subscriptions and job updates
 * @author Sound Forge Alchemy Team
 * @license MIT
 * @version 2.0.0
 *
 * TDD Phase: GREEN - Implementation to make tests pass
 */

import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

// Type definitions
export interface JobUpdateEvent {
  progress: number;
  status: string;
  message?: string;
}

export interface JobCompleteEvent {
  jobId: string;
  status: string;
  result?: any;
}

export interface JobErrorEvent {
  jobId: string;
  status: string;
  error: string;
}

export interface JobCallbacks {
  onUpdate?: (event: JobUpdateEvent) => void;
  onComplete?: (event: JobCompleteEvent) => void;
  onError?: (event: JobErrorEvent) => void;
}

export interface RealtimeOptions {
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}

/**
 * Realtime Manager Class
 */
export class RealtimeManager {
  private channels: Map<string, RealtimeChannel> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Subscribe to job updates
   */
  subscribeToJob(
    jobId: string,
    callbacks: JobCallbacks,
    options: RealtimeOptions = {}
  ): () => void {
    // Validation
    if (!jobId || jobId.trim() === '') {
      throw new Error('Job ID is required');
    }

    if (!callbacks.onUpdate && !callbacks.onComplete && !callbacks.onError) {
      throw new Error('At least one callback is required');
    }

    const { autoReconnect = false, maxReconnectAttempts = 3 } = options;

    // Create channel
    const channel = this.supabase.channel(`job:${jobId}`);

    // Register event handlers
    if (callbacks.onUpdate) {
      channel.on('broadcast', { event: 'job:update' }, callbacks.onUpdate);
    }

    if (callbacks.onComplete) {
      channel.on('broadcast', { event: 'job:complete' }, callbacks.onComplete);
    }

    if (callbacks.onError) {
      channel.on('broadcast', { event: 'job:error' }, callbacks.onError);
    }

    // Subscribe and handle errors
    const subscribePromise = channel.subscribe();

    // Handle subscription errors
    if (subscribePromise && typeof subscribePromise.then === 'function') {
      subscribePromise.catch((error) => {
        if (autoReconnect) {
          const attempts = this.reconnectAttempts.get(jobId) || 0;
          if (attempts < maxReconnectAttempts) {
            this.reconnectAttempts.set(jobId, attempts + 1);
            setTimeout(() => {
              this.reconnect(jobId, callbacks, options);
            }, options.reconnectDelay || 1000);
          }
        }
        throw error;
      });
    }

    // Store channel
    this.channels.set(jobId, channel);

    // Return unsubscribe function
    return () => this.unsubscribe(jobId);
  }

  /**
   * Unsubscribe from a job
   */
  unsubscribe(jobId: string): void {
    const channel = this.channels.get(jobId);
    if (channel) {
      channel.unsubscribe();
      this.channels.delete(jobId);
      this.reconnectAttempts.delete(jobId);
    }
  }

  /**
   * Reconnect to a job subscription
   */
  async reconnect(
    jobId: string,
    callbacks?: JobCallbacks,
    options?: RealtimeOptions
  ): Promise<void> {
    // Unsubscribe first
    this.unsubscribe(jobId);

    // Re-subscribe if callbacks provided
    if (callbacks) {
      this.subscribeToJob(jobId, callbacks, options);
    }
  }

  /**
   * Check if a subscription is active
   */
  hasActiveSubscription(jobId: string): boolean {
    return this.channels.has(jobId);
  }

  /**
   * Get count of active subscriptions
   */
  getActiveSubscriptionCount(): number {
    return this.channels.size;
  }

  /**
   * Destroy all subscriptions
   */
  destroy(): void {
    for (const [jobId] of this.channels) {
      this.unsubscribe(jobId);
    }
  }
}
