/**
 * Hook: useJobProgress
 *
 * @description Real-time job progress tracking via Supabase Realtime
 * @author Sound Forge Alchemy Team
 * @license MIT
 * @version 2.0.0
 * @phase GREEN - Minimal implementation to pass tests
 */

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Job status types
 */
export type JobStatus = 'queued' | 'processing' | 'completed' | 'error';

/**
 * Job progress update payload
 */
export interface JobProgressUpdate {
  jobId?: string;
  progress: number;
  status: JobStatus;
  message?: string;
  error?: string;
}

/**
 * Hook options
 */
export interface UseJobProgressOptions {
  onComplete?: (update: JobProgressUpdate) => void;
  onError?: (error: string) => void;
  retry?: boolean;
  retryDelay?: number;
  maxRetries?: number;
}

/**
 * Hook return value
 */
export interface UseJobProgressReturn {
  progress: number;
  status: JobStatus;
  message: string;
  error: string | null;
  isComplete: boolean;
}

/**
 * Custom hook for tracking job progress via Supabase Realtime
 *
 * @param jobId - Unique job identifier
 * @param options - Hook configuration options
 * @returns Job progress state and utilities
 *
 * @example
 * ```tsx
 * const { progress, status, isComplete } = useJobProgress('job-123', {
 *   onComplete: (update) => console.log('Job done!', update),
 *   onError: (error) => console.error('Job failed:', error)
 * });
 * ```
 */
export function useJobProgress(
  jobId: string,
  options: UseJobProgressOptions = {}
): UseJobProgressReturn {
  const {
    onComplete,
    onError,
    retry = false,
    retryDelay = 1000,
    maxRetries = 3,
  } = options;

  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<JobStatus>('queued');
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState<boolean>(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryCountRef = useRef<number>(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const setupSubscription = () => {
      try {
        const channel = supabase.channel(`job:${jobId}`);

        channel.on(
          'broadcast',
          { event: 'job:update' },
          (payload: { payload: JobProgressUpdate }) => {
            const update = payload.payload;

            // Filter updates by jobId if provided
            if (update.jobId && update.jobId !== jobId) {
              return;
            }

            // Update progress state
            setProgress(update.progress);
            setStatus(update.status);

            if (update.message) {
              setMessage(update.message);
            }

            // Handle completion
            if (update.status === 'completed') {
              setIsComplete(true);
              if (onComplete) {
                onComplete(update);
              }
            }

            // Handle errors
            if (update.status === 'error') {
              const errorMsg = update.error || 'Unknown error occurred';
              setError(errorMsg);
              if (onError) {
                onError(errorMsg);
              }
            }
          }
        );

        channel.subscribe();
        channelRef.current = channel;
        retryCountRef.current = 0; // Reset retry count on successful subscription

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Subscription failed';
        setError(errorMsg);
        setStatus('error');

        // Retry logic
        if (retry && retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          retryTimeoutRef.current = setTimeout(() => {
            setupSubscription();
          }, retryDelay * retryCountRef.current);
        }
      }
    };

    setupSubscription();

    // Cleanup function
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [jobId, onComplete, onError, retry, retryDelay, maxRetries]);

  return {
    progress,
    status,
    message,
    error,
    isComplete,
  };
}
