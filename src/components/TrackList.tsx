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
} from './ui/pagination';
import { Play, Download, FileMusic } from 'lucide-react';
import TrackWaveform from './TrackWaveform';
import { Input } from './ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from './ui/select';

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
    <div className="space-y-4" role="region" aria-label="Playlist Panel">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 px-2 pt-2">
        <Input
          type="text"
          placeholder="Filter by title or artist"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="max-w-xs"
          aria-label="Filter tracks"
        />
        <Select value={String(pageSize)} onValueChange={v => setPageSize(Number(v))}>
          <SelectTrigger className="w-[120px]" aria-label="Page size">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[5, 10, 20, 50].map(size => (
              <SelectItem key={size} value={String(size)}>{size} / page</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={handleBatchDownload} disabled={!selectedIds.length || isProcessing} aria-label="Download selected tracks">
          Download Selected
        </Button>
        <Button size="sm" variant="secondary" onClick={() => paginatedTracks.forEach(onDownloadTrack)} disabled={isProcessing} aria-label="Download all tracks on page">
          Download All
        </Button>
      </div>
      <div className="grid gap-4" role="listbox" aria-label="Track list">
        <div className="flex items-center px-4 py-2 border-b">
          <input type="checkbox" checked={allOnPageSelected} onChange={toggleSelectAll} className="mr-2" aria-label="Select all tracks on page" />
          <span className="text-xs text-muted-foreground">Select All</span>
        </div>
        {paginatedTracks.map((track) => {
          const isActive = selectedTrackId === track.id;
          return (
            <Card
              key={track.id}
              className={`overflow-hidden transition-shadow duration-200 group ${isActive ? 'border-2 border-primary ring-2 ring-primary/30 bg-primary/5 shadow-lg' : 'border-border'} hover:shadow-md`}
              role="option"
              aria-selected={isActive}
            >
              <CardContent className="p-0">
                <div className="flex items-center p-4 gap-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(track.id)}
                    onChange={() => setSelectedIds(ids => ids.includes(track.id) ? ids.filter(id => id !== track.id) : [...ids, track.id])}
                    className="mr-2"
                    aria-label={`Select track ${track.title} by ${track.artist}`}
                  />
                  <div className="w-12 h-12 mr-2 flex-shrink-0 bg-secondary flex items-center justify-center rounded overflow-hidden">
                    {track.albumArt ? (
                      <img src={track.albumArt} alt={`${track.title} album art`} className="w-full h-full object-cover" />
                    ) : (
                      <FileMusic className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <h3 className="font-medium truncate">{track.title}</h3>
                    <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
                    {isActive && (
                      <div className="mt-2">
                        <TrackWaveform />
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0 ml-2 flex gap-1">
                    {/* Select/Play Button */}
                    <button
                      onClick={() => onSelectTrack(track)}
                      disabled={isProcessing}
                      aria-label={`Select track ${track.title}`}
                      className={
                        `group/icon-btn relative flex items-center justify-center h-9 w-9 rounded-full transition-all duration-200 bg-accent/10 hover:bg-primary/90 focus:bg-primary/80 text-primary hover:text-white focus:text-white outline-none border border-transparent hover:shadow-lg focus:ring-2 focus:ring-primary/60 ${isActive ? 'bg-primary text-white' : ''}`
                      }
                    >
                      <Play className="h-5 w-5 transition-transform duration-200 group-hover/icon-btn:scale-110 group-focus/icon-btn:scale-110" />
                      <span className="absolute left-full ml-2 whitespace-nowrap bg-background text-primary text-xs font-semibold px-2 py-1 rounded shadow-lg opacity-0 group-hover/icon-btn:opacity-100 group-focus/icon-btn:opacity-100 transition-opacity duration-200 pointer-events-none">
                        Select
                      </span>
                    </button>
                    {/* Download Button */}
                    <button
                      onClick={() => onDownloadTrack(track)}
                      disabled={isProcessing}
                      aria-label={`Download track ${track.title}`}
                      className="group/icon-btn relative flex items-center justify-center h-9 w-9 rounded-full transition-all duration-200 bg-accent/10 hover:bg-accent/90 focus:bg-accent/80 text-accent hover:text-white focus:text-white outline-none border border-transparent hover:shadow-lg focus:ring-2 focus:ring-accent/60"
                    >
                      <Download className="h-5 w-5 transition-transform duration-200 group-hover/icon-btn:scale-110 group-focus/icon-btn:scale-110" />
                      <span className="absolute left-full ml-2 whitespace-nowrap bg-background text-accent text-xs font-semibold px-2 py-1 rounded shadow-lg opacity-0 group-hover/icon-btn:opacity-100 group-focus/icon-btn:opacity-100 transition-opacity duration-200 pointer-events-none">
                        Download
                      </span>
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
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
