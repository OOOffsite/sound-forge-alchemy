/*
 * Author: Sound Forge Team <word@iite.bet>, Jeremiah Pegues <jeremiah@pegues.io>
 * Version: 1.0.0
 * License: MIT
 *
 * TrackLibrary Component Tests - TDD Implementation
 * Red-Green-Refactor Cycle
 *
 * Tests for track fetching, display, selection, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TrackLibrary from './TrackLibrary';
import type { Track } from '../TrackList';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      order: vi.fn(() => ({
        data: [
          {
            id: 'track-1',
            title: 'Track One',
            artist: 'Artist One',
            duration: '3:30',
            album_art: 'https://example.com/art1.jpg',
          },
          {
            id: 'track-2',
            title: 'Track Two',
            artist: 'Artist Two',
            duration: '4:15',
            album_art: 'https://example.com/art2.jpg',
          },
        ],
        error: null,
      })),
    })),
  })),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

// Mock react-query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(({ queryFn }) => {
    const result = queryFn();
    return {
      data: result,
      isLoading: false,
      error: null,
    };
  }),
  QueryClient: vi.fn(),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('TrackLibrary Component - TDD', () => {
  const mockOnSelectTrack = vi.fn();
  const mockOnDownloadTrack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('RED Phase - Data Fetching', () => {
    it('should fetch tracks from Supabase on mount', async () => {
      render(
        <TrackLibrary
          onSelectTrack={mockOnSelectTrack}
          onDownloadTrack={mockOnDownloadTrack}
        />
      );

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('tracks');
      });
    });

    it('should display loading state while fetching', () => {
      // Mock loading state
      const { useQuery } = require('@tanstack/react-query');
      useQuery.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      render(
        <TrackLibrary
          onSelectTrack={mockOnSelectTrack}
          onDownloadTrack={mockOnDownloadTrack}
        />
      );

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should handle fetch errors gracefully', async () => {
      const { useQuery } = require('@tanstack/react-query');
      useQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch tracks'),
      });

      render(
        <TrackLibrary
          onSelectTrack={mockOnSelectTrack}
          onDownloadTrack={mockOnDownloadTrack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('RED Phase - Track Display', () => {
    it('should display track list with correct data', async () => {
      render(
        <TrackLibrary
          onSelectTrack={mockOnSelectTrack}
          onDownloadTrack={mockOnDownloadTrack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Track One')).toBeInTheDocument();
        expect(screen.getByText('Artist One')).toBeInTheDocument();
        expect(screen.getByText('Track Two')).toBeInTheDocument();
        expect(screen.getByText('Artist Two')).toBeInTheDocument();
      });
    });

    it('should display track duration', async () => {
      render(
        <TrackLibrary
          onSelectTrack={mockOnSelectTrack}
          onDownloadTrack={mockOnDownloadTrack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('3:30')).toBeInTheDocument();
        expect(screen.getByText('4:15')).toBeInTheDocument();
      });
    });

    it('should display album artwork when available', async () => {
      render(
        <TrackLibrary
          onSelectTrack={mockOnSelectTrack}
          onDownloadTrack={mockOnDownloadTrack}
        />
      );

      await waitFor(() => {
        const images = screen.getAllByRole('img');
        expect(images).toHaveLength(2);
        expect(images[0]).toHaveAttribute('src', 'https://example.com/art1.jpg');
      });
    });

    it('should show placeholder when no album art', async () => {
      const { useQuery } = require('@tanstack/react-query');
      useQuery.mockReturnValue({
        data: [
          {
            id: 'track-3',
            title: 'Track Three',
            artist: 'Artist Three',
            duration: '2:45',
            album_art: null,
          },
        ],
        isLoading: false,
        error: null,
      });

      render(
        <TrackLibrary
          onSelectTrack={mockOnSelectTrack}
          onDownloadTrack={mockOnDownloadTrack}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('album-art-placeholder')).toBeInTheDocument();
      });
    });
  });

  describe('RED Phase - Track Selection', () => {
    it('should call onSelectTrack when track is clicked', async () => {
      render(
        <TrackLibrary
          onSelectTrack={mockOnSelectTrack}
          onDownloadTrack={mockOnDownloadTrack}
        />
      );

      await waitFor(() => {
        const track = screen.getByText('Track One');
        fireEvent.click(track);
      });

      expect(mockOnSelectTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'track-1',
          title: 'Track One',
        })
      );
    });

    it('should highlight selected track', async () => {
      render(
        <TrackLibrary
          onSelectTrack={mockOnSelectTrack}
          onDownloadTrack={mockOnDownloadTrack}
          selectedTrackId="track-1"
        />
      );

      await waitFor(() => {
        const trackCard = screen.getByText('Track One').closest('div[role="button"]');
        expect(trackCard).toHaveClass('selected');
      });
    });

    it('should support keyboard navigation for track selection', async () => {
      render(
        <TrackLibrary
          onSelectTrack={mockOnSelectTrack}
          onDownloadTrack={mockOnDownloadTrack}
        />
      );

      await waitFor(() => {
        const track = screen.getByText('Track One').closest('div[role="button"]');
        fireEvent.keyDown(track!, { key: 'Enter' });
      });

      expect(mockOnSelectTrack).toHaveBeenCalled();
    });
  });

  describe('RED Phase - Track Actions', () => {
    it('should call onDownloadTrack when download button is clicked', async () => {
      render(
        <TrackLibrary
          onSelectTrack={mockOnSelectTrack}
          onDownloadTrack={mockOnDownloadTrack}
        />
      );

      await waitFor(() => {
        const downloadButtons = screen.getAllByLabelText(/download|add/i);
        fireEvent.click(downloadButtons[0]);
      });

      expect(mockOnDownloadTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'track-1',
        })
      );
    });

    it('should show download button for each track', async () => {
      render(
        <TrackLibrary
          onSelectTrack={mockOnSelectTrack}
          onDownloadTrack={mockOnDownloadTrack}
        />
      );

      await waitFor(() => {
        const downloadButtons = screen.getAllByLabelText(/download|add/i);
        expect(downloadButtons).toHaveLength(2);
      });
    });
  });

  describe('RED Phase - Empty State', () => {
    it('should display empty state when no tracks available', () => {
      const { useQuery } = require('@tanstack/react-query');
      useQuery.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });

      render(
        <TrackLibrary
          onSelectTrack={mockOnSelectTrack}
          onDownloadTrack={mockOnDownloadTrack}
        />
      );

      expect(screen.getByText(/no tracks/i)).toBeInTheDocument();
    });

    it('should show helpful message in empty state', () => {
      const { useQuery } = require('@tanstack/react-query');
      useQuery.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });

      render(
        <TrackLibrary
          onSelectTrack={mockOnSelectTrack}
          onDownloadTrack={mockOnDownloadTrack}
        />
      );

      expect(screen.getByText(/upload|add tracks/i)).toBeInTheDocument();
    });
  });

  describe('RED Phase - Search and Filter', () => {
    it('should display search input', async () => {
      render(
        <TrackLibrary
          onSelectTrack={mockOnSelectTrack}
          onDownloadTrack={mockOnDownloadTrack}
        />
      );

      expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    });

    it('should filter tracks by title', async () => {
      render(
        <TrackLibrary
          onSelectTrack={mockOnSelectTrack}
          onDownloadTrack={mockOnDownloadTrack}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: 'Track One' } });

      await waitFor(() => {
        expect(screen.getByText('Track One')).toBeInTheDocument();
        expect(screen.queryByText('Track Two')).not.toBeInTheDocument();
      });
    });

    it('should filter tracks by artist', async () => {
      render(
        <TrackLibrary
          onSelectTrack={mockOnSelectTrack}
          onDownloadTrack={mockOnDownloadTrack}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: 'Artist Two' } });

      await waitFor(() => {
        expect(screen.getByText('Track Two')).toBeInTheDocument();
        expect(screen.queryByText('Track One')).not.toBeInTheDocument();
      });
    });

    it('should show all tracks when search is cleared', async () => {
      render(
        <TrackLibrary
          onSelectTrack={mockOnSelectTrack}
          onDownloadTrack={mockOnDownloadTrack}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search/i);

      // Search
      fireEvent.change(searchInput, { target: { value: 'Track One' } });
      await waitFor(() => {
        expect(screen.queryByText('Track Two')).not.toBeInTheDocument();
      });

      // Clear search
      fireEvent.change(searchInput, { target: { value: '' } });
      await waitFor(() => {
        expect(screen.getByText('Track One')).toBeInTheDocument();
        expect(screen.getByText('Track Two')).toBeInTheDocument();
      });
    });
  });

  describe('RED Phase - Pagination', () => {
    it('should display pagination controls when tracks exceed page size', async () => {
      const manyTracks = Array.from({ length: 25 }, (_, i) => ({
        id: `track-${i}`,
        title: `Track ${i}`,
        artist: `Artist ${i}`,
        duration: '3:00',
      }));

      const { useQuery } = require('@tanstack/react-query');
      useQuery.mockReturnValue({
        data: manyTracks,
        isLoading: false,
        error: null,
      });

      render(
        <TrackLibrary
          onSelectTrack={mockOnSelectTrack}
          onDownloadTrack={mockOnDownloadTrack}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument();
      });
    });

    it('should navigate to next page', async () => {
      const manyTracks = Array.from({ length: 25 }, (_, i) => ({
        id: `track-${i}`,
        title: `Track ${i}`,
        artist: `Artist ${i}`,
        duration: '3:00',
      }));

      const { useQuery } = require('@tanstack/react-query');
      useQuery.mockReturnValue({
        data: manyTracks,
        isLoading: false,
        error: null,
      });

      render(
        <TrackLibrary
          onSelectTrack={mockOnSelectTrack}
          onDownloadTrack={mockOnDownloadTrack}
        />
      );

      await waitFor(() => {
        const nextButton = screen.getByRole('button', { name: /next/i });
        fireEvent.click(nextButton);
      });

      // Should show tracks from page 2
      await waitFor(() => {
        expect(screen.getByText('Track 10')).toBeInTheDocument();
      });
    });
  });

  describe('RED Phase - Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      render(
        <TrackLibrary
          onSelectTrack={mockOnSelectTrack}
          onDownloadTrack={mockOnDownloadTrack}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('region', { name: /track library/i })).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      render(
        <TrackLibrary
          onSelectTrack={mockOnSelectTrack}
          onDownloadTrack={mockOnDownloadTrack}
        />
      );

      await waitFor(() => {
        const trackButtons = screen.getAllByRole('button');
        trackButtons.forEach(button => {
          expect(button).toHaveAttribute('tabIndex');
        });
      });
    });
  });
});
