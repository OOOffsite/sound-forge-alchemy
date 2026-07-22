/**
 * Tests: useTracks Hook
 *
 * @description TDD tests for track data fetching with TanStack Query
 * @author Sound Forge Alchemy Team
 * @license MIT
 * @version 2.0.0
 * @phase RED - Write failing tests first
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTracks } from '@/hooks/useTracks';
import { renderWithProviders } from '../helpers/renderHook';
import { mockSupabaseClient } from '../mocks/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabaseClient,
}));

describe('useTracks', () => {
  const mockTracks = [
    {
      id: '1',
      title: 'Track One',
      artist: 'Artist A',
      duration: 180,
      created_at: '2024-01-01T00:00:00Z',
      stems: {
        vocals: 'url1',
        drums: 'url2',
      },
    },
    {
      id: '2',
      title: 'Track Two',
      artist: 'Artist B',
      duration: 240,
      created_at: '2024-01-02T00:00:00Z',
      stems: {
        vocals: 'url3',
        drums: 'url4',
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('RED Phase - Failing Tests', () => {
    it('should fetch tracks from Supabase on mount', async () => {
      const selectMock = vi.fn().mockReturnThis();
      const orderMock = vi.fn().mockResolvedValue({
        data: mockTracks,
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: selectMock,
        order: orderMock,
      } as any);

      const { result } = renderHook(() => useTracks(), {
        wrapper: ({ children }) => renderWithProviders(children as any).container as any,
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('tracks');
      expect(selectMock).toHaveBeenCalledWith('*');
    });

    it('should return tracks data when fetch succeeds', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockTracks,
          error: null,
        }),
      } as any);

      const { result } = renderHook(() => useTracks(), {
        wrapper: ({ children }) => renderWithProviders(children as any).container as any,
      });

      await waitFor(() => {
        expect(result.current.tracks).toEqual(mockTracks);
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should handle loading state correctly', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve({ data: mockTracks, error: null }), 100)
            )
        ),
      } as any);

      const { result } = renderHook(() => useTracks(), {
        wrapper: ({ children }) => renderWithProviders(children as any).container as any,
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Database connection failed');

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error,
        }),
      } as any);

      const { result } = renderHook(() => useTracks(), {
        wrapper: ({ children }) => renderWithProviders(children as any).container as any,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toBeTruthy();
      });
    });

    it('should cache tracks data', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockTracks,
          error: null,
        }),
      } as any);

      const { result: result1 } = renderHook(() => useTracks(), {
        wrapper: ({ children }) => renderWithProviders(children as any).container as any,
      });

      await waitFor(() => {
        expect(result1.current.tracks).toEqual(mockTracks);
      });

      vi.clearAllMocks();

      // Second hook should use cache
      const { result: result2 } = renderHook(() => useTracks(), {
        wrapper: ({ children }) => renderWithProviders(children as any).container as any,
      });

      await waitFor(() => {
        expect(result2.current.tracks).toEqual(mockTracks);
      });

      // Should not fetch again due to cache
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });

    it('should refetch tracks on demand', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockTracks,
          error: null,
        }),
      } as any);

      const { result } = renderHook(() => useTracks(), {
        wrapper: ({ children }) => renderWithProviders(children as any).container as any,
      });

      await waitFor(() => {
        expect(result.current.tracks).toEqual(mockTracks);
      });

      vi.clearAllMocks();

      // Refetch
      await result.current.refetch();

      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalled();
      });
    });

    it('should filter tracks by search query', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockResolvedValue({
          data: [mockTracks[0]],
          error: null,
        }),
      } as any);

      const { result } = renderHook(() => useTracks({ search: 'Track One' }), {
        wrapper: ({ children }) => renderWithProviders(children as any).container as any,
      });

      await waitFor(() => {
        expect(result.current.tracks).toHaveLength(1);
        expect(result.current.tracks?.[0].title).toBe('Track One');
      });
    });

    it('should sort tracks by field', async () => {
      const sortedTracks = [...mockTracks].reverse();

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: sortedTracks,
          error: null,
        }),
      } as any);

      const { result } = renderHook(
        () => useTracks({ sortBy: 'created_at', sortOrder: 'desc' }),
        {
          wrapper: ({ children }) => renderWithProviders(children as any).container as any,
        }
      );

      await waitFor(() => {
        expect(result.current.tracks).toEqual(sortedTracks);
      });

      expect(mockSupabaseClient.from().order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
    });

    it('should limit number of tracks returned', async () => {
      const limitedTracks = [mockTracks[0]];

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: limitedTracks,
          error: null,
        }),
      } as any);

      const { result } = renderHook(() => useTracks({ limit: 1 }), {
        wrapper: ({ children }) => renderWithProviders(children as any).container as any,
      });

      await waitFor(() => {
        expect(result.current.tracks).toHaveLength(1);
      });

      expect(mockSupabaseClient.from().limit).toHaveBeenCalledWith(1);
    });

    it('should provide isEmpty flag when no tracks', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as any);

      const { result } = renderHook(() => useTracks(), {
        wrapper: ({ children }) => renderWithProviders(children as any).container as any,
      });

      await waitFor(() => {
        expect(result.current.isEmpty).toBe(true);
      });
    });

    it('should count total tracks', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockTracks,
          error: null,
        }),
      } as any);

      const { result } = renderHook(() => useTracks(), {
        wrapper: ({ children }) => renderWithProviders(children as any).container as any,
      });

      await waitFor(() => {
        expect(result.current.count).toBe(2);
      });
    });
  });
});
