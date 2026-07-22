/*
 * Author: Sound Forge Team <word@iite.bet>, Jeremiah Pegues <jeremiah@pegues.io>
 * Version: 1.0.0
 * License: MIT
 *
 * JobProgress Component Tests - TDD Implementation
 * Red-Green-Refactor Cycle
 *
 * Tests for job progress tracking, Realtime updates, and status display.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import JobProgress from './JobProgress';

// Mock Supabase Realtime
const mockChannel = {
  on: vi.fn((event: string, callback: Function) => {
    mockChannel._callbacks = mockChannel._callbacks || {};
    mockChannel._callbacks[event] = callback;
    return mockChannel;
  }),
  subscribe: vi.fn((callback?: Function) => {
    callback?.();
    return mockChannel;
  }),
  unsubscribe: vi.fn(),
  _callbacks: {} as Record<string, Function>,
  _trigger: (event: string, payload: any) => {
    mockChannel._callbacks?.[event]?.(payload);
  },
};

const mockSupabase = {
  channel: vi.fn(() => mockChannel),
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => ({
          data: {
            id: 'job-1',
            status: 'processing',
            progress: 50,
            message: 'Processing audio...',
          },
          error: null,
        })),
      })),
    })),
  })),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

describe('JobProgress Component - TDD', () => {
  const mockJobId = 'job-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('RED Phase - Component Rendering', () => {
    it('should render progress bar', () => {
      render(<JobProgress jobId={mockJobId} />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should display job status', () => {
      render(<JobProgress jobId={mockJobId} />);

      expect(screen.getByText(/processing/i)).toBeInTheDocument();
    });

    it('should display progress percentage', () => {
      render(<JobProgress jobId={mockJobId} />);

      expect(screen.getByText(/50%/)).toBeInTheDocument();
    });

    it('should display job message', () => {
      render(<JobProgress jobId={mockJobId} />);

      expect(screen.getByText(/processing audio/i)).toBeInTheDocument();
    });
  });

  describe('RED Phase - Realtime Updates', () => {
    it('should subscribe to Realtime channel on mount', () => {
      render(<JobProgress jobId={mockJobId} />);

      expect(mockSupabase.channel).toHaveBeenCalledWith(expect.stringContaining('job'));
    });

    it('should update progress when Realtime event received', async () => {
      render(<JobProgress jobId={mockJobId} />);

      // Simulate Realtime update
      mockChannel._trigger('postgres_changes', {
        new: {
          progress: 75,
          status: 'processing',
          message: 'Almost done...',
        },
      });

      await waitFor(() => {
        expect(screen.getByText(/75%/)).toBeInTheDocument();
        expect(screen.getByText(/almost done/i)).toBeInTheDocument();
      });
    });

    it('should unsubscribe from channel on unmount', () => {
      const { unmount } = render(<JobProgress jobId={mockJobId} />);

      unmount();

      expect(mockChannel.unsubscribe).toHaveBeenCalled();
    });

    it('should handle multiple progress updates', async () => {
      render(<JobProgress jobId={mockJobId} />);

      // First update
      mockChannel._trigger('postgres_changes', {
        new: { progress: 25 },
      });

      await waitFor(() => {
        expect(screen.getByText(/25%/)).toBeInTheDocument();
      });

      // Second update
      mockChannel._trigger('postgres_changes', {
        new: { progress: 75 },
      });

      await waitFor(() => {
        expect(screen.getByText(/75%/)).toBeInTheDocument();
      });
    });
  });

  describe('RED Phase - Job Status Indicators', () => {
    it('should display "pending" status', () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { status: 'pending', progress: 0 },
              error: null,
            })),
          })),
        })),
      }));

      render(<JobProgress jobId={mockJobId} />);

      expect(screen.getByText(/pending/i)).toBeInTheDocument();
    });

    it('should display "processing" status', () => {
      render(<JobProgress jobId={mockJobId} />);

      expect(screen.getByText(/processing/i)).toBeInTheDocument();
    });

    it('should display "completed" status', () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { status: 'completed', progress: 100 },
              error: null,
            })),
          })),
        })),
      }));

      render(<JobProgress jobId={mockJobId} />);

      expect(screen.getByText(/completed/i)).toBeInTheDocument();
    });

    it('should display "failed" status', () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { status: 'failed', progress: 0 },
              error: null,
            })),
          })),
        })),
      }));

      render(<JobProgress jobId={mockJobId} />);

      expect(screen.getByText(/failed/i)).toBeInTheDocument();
    });
  });

  describe('RED Phase - Job Completion', () => {
    it('should show success indicator when job completes', async () => {
      render(<JobProgress jobId={mockJobId} />);

      mockChannel._trigger('postgres_changes', {
        new: {
          status: 'completed',
          progress: 100,
        },
      });

      await waitFor(() => {
        expect(screen.getByTestId('success-icon')).toBeInTheDocument();
      });
    });

    it('should call onComplete callback when job completes', async () => {
      const onComplete = vi.fn();
      render(<JobProgress jobId={mockJobId} onComplete={onComplete} />);

      mockChannel._trigger('postgres_changes', {
        new: {
          status: 'completed',
          progress: 100,
        },
      });

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
      });
    });

    it('should show completion message', async () => {
      render(<JobProgress jobId={mockJobId} />);

      mockChannel._trigger('postgres_changes', {
        new: {
          status: 'completed',
          progress: 100,
          message: 'Processing complete',
        },
      });

      await waitFor(() => {
        expect(screen.getByText(/processing complete/i)).toBeInTheDocument();
      });
    });
  });

  describe('RED Phase - Job Errors', () => {
    it('should display error message when job fails', async () => {
      render(<JobProgress jobId={mockJobId} />);

      mockChannel._trigger('postgres_changes', {
        new: {
          status: 'failed',
          error: 'Processing failed',
        },
      });

      await waitFor(() => {
        expect(screen.getByText(/processing failed/i)).toBeInTheDocument();
      });
    });

    it('should call onError callback when job fails', async () => {
      const onError = vi.fn();
      render(<JobProgress jobId={mockJobId} onError={onError} />);

      mockChannel._trigger('postgres_changes', {
        new: {
          status: 'failed',
          error: 'Test error',
        },
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Test error');
      });
    });

    it('should show error icon when job fails', async () => {
      render(<JobProgress jobId={mockJobId} />);

      mockChannel._trigger('postgres_changes', {
        new: {
          status: 'failed',
        },
      });

      await waitFor(() => {
        expect(screen.getByTestId('error-icon')).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: null,
              error: new Error('Network error'),
            })),
          })),
        })),
      }));

      render(<JobProgress jobId={mockJobId} />);

      expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
    });
  });

  describe('RED Phase - Progress Bar Styling', () => {
    it('should have correct width based on progress', () => {
      render(<JobProgress jobId={mockJobId} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveStyle({ width: '50%' });
    });

    it('should update width when progress changes', async () => {
      render(<JobProgress jobId={mockJobId} />);

      mockChannel._trigger('postgres_changes', {
        new: { progress: 80 },
      });

      await waitFor(() => {
        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toHaveStyle({ width: '80%' });
      });
    });

    it('should have different color for completed state', async () => {
      render(<JobProgress jobId={mockJobId} />);

      mockChannel._trigger('postgres_changes', {
        new: {
          status: 'completed',
          progress: 100,
        },
      });

      await waitFor(() => {
        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toHaveClass('bg-success');
      });
    });

    it('should have different color for failed state', async () => {
      render(<JobProgress jobId={mockJobId} />);

      mockChannel._trigger('postgres_changes', {
        new: {
          status: 'failed',
        },
      });

      await waitFor(() => {
        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toHaveClass('bg-destructive');
      });
    });
  });

  describe('RED Phase - Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<JobProgress jobId={mockJobId} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-label');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('should announce status changes to screen readers', async () => {
      render(<JobProgress jobId={mockJobId} />);

      mockChannel._trigger('postgres_changes', {
        new: {
          status: 'completed',
        },
      });

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(/completed/i);
      });
    });

    it('should have live region for updates', () => {
      render(<JobProgress jobId={mockJobId} />);

      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('RED Phase - Loading State', () => {
    it('should show loading indicator while fetching initial data', () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => new Promise(() => {})), // Never resolves
          })),
        })),
      }));

      render(<JobProgress jobId={mockJobId} />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should hide loading indicator after data loads', async () => {
      render(<JobProgress jobId={mockJobId} />);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });
    });
  });
});
