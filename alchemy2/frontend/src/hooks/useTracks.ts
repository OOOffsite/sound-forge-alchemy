/**
 * Hook: useTracks
 *
 * @description Fetch and manage tracks with TanStack Query and Supabase
 * @author Sound Forge Alchemy Team
 * @license MIT
 * @version 2.0.0
 * @phase GREEN - Minimal implementation to pass tests
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/**
 * Track type definition
 */
export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number;
  created_at: string;
  stems?: {
    [stemName: string]: string;
  };
  [key: string]: any;
}

/**
 * Hook options for filtering and sorting
 */
export interface UseTracksOptions {
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  enabled?: boolean;
}

/**
 * Extended hook return value with utilities
 */
export interface UseTracksReturn extends Omit<UseQueryResult<Track[], Error>, 'data'> {
  tracks: Track[] | undefined;
  isEmpty: boolean;
  count: number;
}

/**
 * Custom hook for fetching and managing tracks
 *
 * @param options - Query options for filtering and sorting
 * @returns Tracks data and query state
 *
 * @example
 * ```tsx
 * const { tracks, isLoading, refetch } = useTracks({
 *   search: 'jazz',
 *   sortBy: 'created_at',
 *   sortOrder: 'desc',
 *   limit: 10
 * });
 * ```
 */
export function useTracks(options: UseTracksOptions = {}): UseTracksReturn {
  const {
    search,
    sortBy = 'created_at',
    sortOrder = 'desc',
    limit,
    enabled = true,
  } = options;

  const queryResult = useQuery<Track[], Error>({
    queryKey: ['tracks', { search, sortBy, sortOrder, limit }],
    queryFn: async () => {
      let query = supabase.from('tracks').select('*');

      // Apply search filter
      if (search) {
        query = query.ilike('title', `%${search}%`);
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply limit
      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });

  const tracks = queryResult.data;
  const isEmpty = !queryResult.isLoading && (!tracks || tracks.length === 0);
  const count = tracks?.length || 0;

  return {
    ...queryResult,
    tracks,
    isEmpty,
    count,
  };
}
