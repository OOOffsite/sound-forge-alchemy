/*
 * Author: Sound Forge Team <word@iite.bet>, Jeremiah Pegues <jeremiah@pegues.io>
 * Version: 1.0.0
 * License: MIT
 *
 * JobProgress component for Sound Forge Alchemy frontend.
 * Displays real-time job progress updates from Supabase Realtime.
 *
 * Logging is maximized at all levels for progress tracking and error events.
 */

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { CheckCircle, AlertCircle, Loader2, Clock } from 'lucide-react';
import logger from '../lib/logger';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export interface JobProgressProps {
  jobId: string;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export interface JobStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message?: string;
  error?: string;
}

const JobProgress: React.FC<JobProgressProps> = ({ jobId, onComplete, onError }) => {
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial job status
  useEffect(() => {
    const fetchInitialStatus = async () => {
      logger.info('Fetching initial job status', { jobId });

      try {
        const { data, error: fetchError } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (fetchError) {
          logger.error('Failed to fetch job status', { error: fetchError, jobId });
          setError('Failed to load job status');
          setIsLoading(false);
          return;
        }

        logger.info('Job status fetched', { jobId, status: data.status });
        setJobStatus(data);
        setIsLoading(false);
      } catch (err) {
        logger.error('Error fetching job status', { error: err, jobId });
        setError('Network error');
        setIsLoading(false);
      }
    };

    fetchInitialStatus();
  }, [jobId]);

  // Subscribe to Realtime updates
  useEffect(() => {
    if (!jobId) return;

    logger.info('Subscribing to job updates', { jobId });

    const channel = supabase
      .channel(`job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload: any) => {
          logger.debug('Job update received', { jobId, payload: payload.new });

          const newStatus = payload.new as JobStatus;
          setJobStatus(newStatus);

          // Handle completion
          if (newStatus.status === 'completed') {
            logger.info('Job completed', { jobId });
            onComplete?.();
          }

          // Handle errors
          if (newStatus.status === 'failed') {
            logger.error('Job failed', { jobId, error: newStatus.error });
            onError?.(newStatus.error || 'Job failed');
          }
        }
      )
      .subscribe();

    // Cleanup on unmount
    return () => {
      logger.info('Unsubscribing from job updates', { jobId });
      channel.unsubscribe();
    };
  }, [jobId, onComplete, onError]);

  // Get status icon and color
  const getStatusDisplay = () => {
    if (!jobStatus) return { icon: <Clock />, color: 'text-muted-foreground', bgColor: 'bg-secondary' };

    switch (jobStatus.status) {
      case 'pending':
        return {
          icon: <Clock className="h-5 w-5" data-testid="pending-icon" />,
          color: 'text-blue-500',
          bgColor: 'bg-blue-500',
        };
      case 'processing':
        return {
          icon: <Loader2 className="h-5 w-5 animate-spin" data-testid="processing-icon" />,
          color: 'text-primary',
          bgColor: 'bg-primary',
        };
      case 'completed':
        return {
          icon: <CheckCircle className="h-5 w-5" data-testid="success-icon" />,
          color: 'text-green-500',
          bgColor: 'bg-success',
        };
      case 'failed':
        return {
          icon: <AlertCircle className="h-5 w-5" data-testid="error-icon" />,
          color: 'text-destructive',
          bgColor: 'bg-destructive',
        };
      default:
        return {
          icon: <Clock className="h-5 w-5" />,
          color: 'text-muted-foreground',
          bgColor: 'bg-secondary',
        };
    }
  };

  const { icon, color, bgColor } = getStatusDisplay();
  const progress = jobStatus?.progress || 0;
  const status = jobStatus?.status || 'pending';
  const message = jobStatus?.message || 'Initializing...';

  // Loading state
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="w-full border-destructive">
        <CardContent className="flex items-center gap-2 p-6">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <span className="text-sm text-destructive">{error}</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className={color}>{icon}</span>
          <span className="capitalize">{status}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="relative">
          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
            <div
              role="progressbar"
              aria-label="Job progress"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              className={`h-full transition-all duration-300 ${bgColor}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between items-center">
            <span className="text-sm font-medium">{progress}%</span>
            <span
              role="status"
              aria-live="polite"
              className="text-sm text-muted-foreground"
            >
              {message}
            </span>
          </div>
        </div>

        {/* Error Message */}
        {jobStatus?.error && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-md">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
            <span className="text-sm text-destructive">{jobStatus.error}</span>
          </div>
        )}

        {/* Completion Message */}
        {status === 'completed' && (
          <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-md">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-500">
              {message || 'Processing complete'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default JobProgress;
