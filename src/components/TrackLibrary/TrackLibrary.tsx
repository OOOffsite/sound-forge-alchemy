/*
 * Author: Sound Forge Team <word@iite.bet>, Jeremiah Pegues <jeremiah@pegues.io>
 * Version: 1.0.0
 * License: MIT
 *
 * TrackLibrary component for Sound Forge Alchemy frontend.
 * Fetches and displays tracks from Supabase with search, filter, and pagination.
 *
 * Logging is maximized at all levels for data fetching and user interactions.
 */

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { FileMusic, Download, Play, AlertCircle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import logger from '../../lib/logger';
import type { Track } from '../TrackList';

// Initialize Supabase client (should be from env vars in production)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export interface TrackLibraryProps {
  onSelectTrack: (track: Track) => void;
  onDownloadTrack: (track: Track) => void;
  selectedTrackId?: string;
}

const TRACKS_PER_PAGE = 10;

const TrackLibrary: React.FC<TrackLibraryProps> = ({
  onSelectTrack,
  onDownloadTrack,
  selectedTrackId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch tracks from Supabase
  const { data: tracks = [], isLoading, error } = useQuery({
    queryKey: ['tracks'],
    queryFn: async () => {
      logger.info('Fetching tracks from Supabase');

      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to fetch tracks', { error });
        throw error;
      }

      logger.info('Tracks fetched successfully', { count: data?.length || 0 });

      // Transform to Track type
      return (data || []).map((track: any) => ({
        id: track.id,
        title: track.title,
        artist: track.artist,
        duration: track.duration,
        albumArt: track.album_art,
      })) as Track[];
    },
  });

  // Filter tracks based on search query
  const filteredTracks = useMemo(() => {
    if (!searchQuery.trim()) return tracks;

    const query = searchQuery.toLowerCase();
    return tracks.filter(
      track =>
        track.title.toLowerCase().includes(query) ||
        track.artist.toLowerCase().includes(query)
    );
  }, [tracks, searchQuery]);

  // Paginate filtered tracks
  const totalPages = Math.ceil(filteredTracks.length / TRACKS_PER_PAGE);
  const paginatedTracks = useMemo(() => {
    const startIndex = (currentPage - 1) * TRACKS_PER_PAGE;
    const endIndex = startIndex + TRACKS_PER_PAGE;
    return filteredTracks.slice(startIndex, endIndex);
  }, [filteredTracks, currentPage]);

  // Reset to page 1 when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Handle track click
  const handleTrackClick = (track: Track) => {
    logger.debug('Track selected', { trackId: track.id });
    onSelectTrack(track);
  };

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent, track: Track) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleTrackClick(track);
    }
  };

  // Handle download click
  const handleDownloadClick = (event: React.MouseEvent, track: Track) => {
    event.stopPropagation();
    logger.info('Track download requested', { trackId: track.id });
    onDownloadTrack(track);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading tracks...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="mt-4 text-lg font-semibold">Error loading tracks</p>
        <p className="text-sm text-muted-foreground">
          Failed to fetch tracks. Please try again later.
        </p>
      </div>
    );
  }

  // Empty state
  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <FileMusic className="h-16 w-16 text-muted-foreground" />
        <h3 className="mt-4 text-xl font-semibold">No tracks available</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload or add tracks to get started
        </p>
      </div>
    );
  }

  return (
    <div role="region" aria-label="Track Library" className="space-y-4">
      {/* Search Input */}
      <div className="sticky top-0 z-10 bg-background pb-4">
        <Input
          type="text"
          placeholder="Search tracks or artists..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full"
          aria-label="Search tracks"
        />
      </div>

      {/* Track List */}
      <div className="space-y-2">
        {paginatedTracks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No tracks match your search
          </div>
        ) : (
          paginatedTracks.map(track => (
            <div
              key={track.id}
              role="button"
              tabIndex={0}
              onClick={() => handleTrackClick(track)}
              onKeyDown={e => handleKeyDown(e, track)}
              className={`
                group relative cursor-pointer rounded-lg border p-4 transition-all
                hover:shadow-md hover:border-primary/50
                ${selectedTrackId === track.id ? 'selected border-primary bg-primary/5' : 'border-border'}
              `}
            >
              <div className="flex items-center gap-4">
                {/* Album Art */}
                <div className="flex-shrink-0 w-16 h-16 rounded-md overflow-hidden bg-secondary">
                  {track.albumArt ? (
                    <img
                      src={track.albumArt}
                      alt={`${track.title} album art`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      data-testid="album-art-placeholder"
                    >
                      <FileMusic className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Track Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{track.title}</h3>
                  <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
                </div>

                {/* Duration */}
                <div className="flex-shrink-0 text-sm text-muted-foreground">
                  {track.duration}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleTrackClick(track)}
                    aria-label={`Play ${track.title}`}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={e => handleDownloadClick(e, track)}
                    aria-label={`Download ${track.title}`}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav
          role="navigation"
          aria-label="Pagination"
          className="flex items-center justify-center gap-2 pt-4"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            aria-label="Next page"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </nav>
      )}
    </div>
  );
};

export default TrackLibrary;
