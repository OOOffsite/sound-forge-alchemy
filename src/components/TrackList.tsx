import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from './ui/pagination';
import { Play, Download, FileMusic } from 'lucide-react';
import TrackWaveform from './TrackWaveform';

export interface Track {
  id: string;
  title: string;
  artist: string;
  albumArt?: string;
  duration: string;
}

interface TrackListProps {
  tracks: Track[];
  onSelectTrack: (track: Track) => void;
  onDownloadTrack: (track: Track) => void;
  selectedTrackId?: string;
  isProcessing: boolean;
}

export default function TrackList({
  tracks,
  onSelectTrack,
  onDownloadTrack,
  selectedTrackId,
  isProcessing
}: TrackListProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState('');

  // Filtering
  const filteredTracks = filter
    ? tracks.filter(t => t.title.toLowerCase().includes(filter.toLowerCase()) || t.artist.toLowerCase().includes(filter.toLowerCase()))
    : tracks;

  // Pagination
  const totalPages = Math.ceil(filteredTracks.length / pageSize);
  const paginatedTracks = filteredTracks.slice((page - 1) * pageSize, page * pageSize);

  // Batch actions
  const allOnPageSelected = paginatedTracks.every(t => selectedIds.includes(t.id));
  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedIds(ids => ids.filter(id => !paginatedTracks.some(t => t.id === id)));
    } else {
      setSelectedIds(ids => Array.from(new Set([...ids, ...paginatedTracks.map(t => t.id)])));
    }
  };

  const handleBatchDownload = () => {
    paginatedTracks.filter(t => selectedIds.includes(t.id)).forEach(onDownloadTrack);
  };

  if (!tracks.length) {
    return (
      <div className="mt-8 text-center py-12">
        <FileMusic className="mx-auto h-16 w-16 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">No tracks found</h2>
        <p className="mt-2 text-muted-foreground">Enter a Spotify playlist URL to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h2 className="text-2xl font-bold">Playlist Tracks</h2>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Filter by title or artist"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          />
          <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="border rounded px-2 py-1 text-sm">
            {[5, 10, 20, 50].map(size => (
              <option key={size} value={size}>{size} / page</option>
            ))}
          </select>
          <Button size="sm" variant="outline" onClick={handleBatchDownload} disabled={!selectedIds.length || isProcessing}>
            Download Selected
          </Button>
          <Button size="sm" variant="secondary" onClick={() => paginatedTracks.forEach(onDownloadTrack)} disabled={isProcessing}>
            Download All
          </Button>
        </div>
      </div>
      <div className="grid gap-4">
        <div className="flex items-center px-4 py-2 border-b">
          <input type="checkbox" checked={allOnPageSelected} onChange={toggleSelectAll} className="mr-2" />
          <span className="text-xs text-muted-foreground">Select All</span>
        </div>
        {paginatedTracks.map((track) => (
          <Card key={track.id} className={`overflow-hidden ${selectedTrackId === track.id ? 'border-primary' : ''}`}>
            <CardContent className="p-0">
              <div className="flex items-center p-4">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(track.id)}
                  onChange={() => setSelectedIds(ids => ids.includes(track.id) ? ids.filter(id => id !== track.id) : [...ids, track.id])}
                  className="mr-2"
                />
                <div className="w-12 h-12 mr-4 flex-shrink-0 bg-secondary flex items-center justify-center rounded overflow-hidden">
                  {track.albumArt ? (
                    <img src={track.albumArt} alt={`${track.title} album art`} className="w-full h-full object-cover" />
                  ) : (
                    <FileMusic className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-grow min-w-0">
                  <h3 className="font-medium truncate">{track.title}</h3>
                  <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
                  {selectedTrackId === track.id && (
                    <div className="mt-2">
                      <TrackWaveform />
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0 ml-4 flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onSelectTrack(track)}
                    disabled={isProcessing}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Select</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDownloadTrack(track)}
                    disabled={isProcessing}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Download</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Pagination Bar */}
      <Pagination className="mt-4">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              size="default"
              onClick={e => { e.preventDefault(); setPage(p => Math.max(1, p - 1)); }}
              aria-disabled={page === 1}
            />
          </PaginationItem>
          {Array.from({ length: totalPages }).map((_, i) => (
            <PaginationItem key={i}>
              <PaginationLink
                href="#"
                size="default"
                isActive={page === i + 1}
                onClick={e => { e.preventDefault(); setPage(i + 1); }}
              >
                {i + 1}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              href="#"
              size="default"
              onClick={e => { e.preventDefault(); setPage(p => Math.min(totalPages, p + 1)); }}
              aria-disabled={page === totalPages}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
