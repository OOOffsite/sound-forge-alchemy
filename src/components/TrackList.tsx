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
import { Play, Download, FileMusic, Plus, Users, CheckSquare, PlusCircle, Settings2, BarChart2 } from 'lucide-react';
import TrackWaveform from './TrackWaveform';
import { Input } from './ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';

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
  const [activeFilterProp, setActiveFilterProp] = useState<'title' | 'artist'>('title');
  const [filterValues, setFilterValues] = useState<string[]>([]);
  const [autocompleteOptions, setAutocompleteOptions] = useState<string[]>([]);
  const [autocompleteInput, setAutocompleteInput] = useState('');
  const [selectionAction, setSelectionAction] = useState<'add' | 'process' | 'analyze'>('add');

  // Compute unique values for each property
  const uniqueArtists = Array.from(new Set(tracks.map(t => t.artist))).sort();
  const uniqueTitles = Array.from(new Set(tracks.map(t => t.title))).sort();

  // Autocomplete logic
  React.useEffect(() => {
    let options: string[] = [];
    if (activeFilterProp === 'artist') {
      options = uniqueArtists.filter(a => a.toLowerCase().includes(autocompleteInput.toLowerCase()));
    } else {
      options = uniqueTitles.filter(t => t.toLowerCase().includes(autocompleteInput.toLowerCase()));
    }
    setAutocompleteOptions(options);
  }, [autocompleteInput, activeFilterProp, uniqueArtists, uniqueTitles]);

  // Filtering logic
  const filteredTracks = filterValues.length
    ? tracks.filter(t => filterValues.every(val =>
        (activeFilterProp === 'artist' && t.artist === val) ||
        (activeFilterProp === 'title' && t.title === val)
      ))
    : tracks;

  // Pagination
  const totalPages = Math.ceil(filteredTracks.length / pageSize);
  const paginatedTracks = filteredTracks.slice((page - 1) * pageSize, page * pageSize);

  // Multi-select logic
  const handleTrackClick = (track: Track, e: React.MouseEvent | React.KeyboardEvent) => {
    if (e.shiftKey && selectedIds.length > 0) {
      // Range select
      const lastIdx = paginatedTracks.findIndex(t => t.id === selectedIds[selectedIds.length - 1]);
      const currIdx = paginatedTracks.findIndex(t => t.id === track.id);
      if (lastIdx !== -1 && currIdx !== -1) {
        const [start, end] = [lastIdx, currIdx].sort((a, b) => a - b);
        const rangeIds = paginatedTracks.slice(start, end + 1).map(t => t.id);
        setSelectedIds(ids => Array.from(new Set([...ids, ...rangeIds])));
        return;
      }
    } else if (e.metaKey || e.ctrlKey) {
      // Toggle selection
      setSelectedIds(ids => ids.includes(track.id) ? ids.filter(id => id !== track.id) : [...ids, track.id]);
      return;
    } else {
      // Single select
      setSelectedIds([track.id]);
    }
  };

  const handleSelectionAction = () => {
    if (selectionAction === 'add') {
      paginatedTracks.filter(t => selectedIds.includes(t.id)).forEach(onDownloadTrack);
    } else if (selectionAction === 'process') {
      // TODO: trigger process action for selected tracks
    } else if (selectionAction === 'analyze') {
      // TODO: trigger analyze action for selected tracks
    }
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
      {/* Selection controls: pill button group */}
      <div className="flex items-center gap-4 px-2 pt-2">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectedIds.length === paginatedTracks.length && paginatedTracks.length > 0}
            aria-checked={selectedIds.length > 0 && selectedIds.length < paginatedTracks.length ? 'mixed' : undefined}
            onCheckedChange={checked => {
              if (checked) {
                setSelectedIds(paginatedTracks.map(t => t.id));
              } else {
                setSelectedIds([]);
              }
            }}
            aria-label="Select all tracks on page"
          />
          <div className="inline-flex rounded-full bg-accent/30 border border-accent overflow-hidden" role="group" aria-label="Selection action">
            <button
              type="button"
              className={`px-3 py-1 text-xs font-semibold flex items-center gap-1 focus:outline-none transition-colors ${selectionAction === 'add' ? 'bg-primary text-white' : 'hover:bg-primary/10 text-primary'}`}
              onClick={() => setSelectionAction('add')}
              aria-pressed={selectionAction === 'add'}
            >
              <PlusCircle className="h-4 w-4" /> Add
            </button>
            <button
              type="button"
              className={`px-3 py-1 text-xs font-semibold flex items-center gap-1 focus:outline-none transition-colors ${selectionAction === 'process' ? 'bg-primary text-white' : 'hover:bg-primary/10 text-primary'}`}
              onClick={() => setSelectionAction('process')}
              aria-pressed={selectionAction === 'process'}
            >
              <Settings2 className="h-4 w-4" /> Process
            </button>
            <button
              type="button"
              className={`px-3 py-1 text-xs font-semibold flex items-center gap-1 focus:outline-none transition-colors ${selectionAction === 'analyze' ? 'bg-primary text-white' : 'hover:bg-primary/10 text-primary'}`}
              onClick={() => setSelectionAction('analyze')}
              aria-pressed={selectionAction === 'analyze'}
            >
              <BarChart2 className="h-4 w-4" /> Analyze
            </button>
          </div>
          <Button
            size="sm"
            className="ml-2"
            disabled={!selectedIds.length || isProcessing}
            onClick={handleSelectionAction}
            aria-label={`Perform ${selectionAction} on selected tracks`}
          >
            {selectionAction.charAt(0).toUpperCase() + selectionAction.slice(1)} Selected
          </Button>
        </div>
      </div>
      {/* Filter controls: new line, dropdown and input inline */}
      <div className="flex items-center gap-2 px-2">
        <div className="relative inline-block">
          <select
            value={activeFilterProp}
            onChange={e => setActiveFilterProp(e.target.value as 'title' | 'artist')}
            className="border rounded px-2 py-1 text-xs mr-2 bg-background"
            aria-label="Filter property"
          >
            <option value="title">Title</option>
            <option value="artist">Artist</option>
          </select>
          <input
            type="text"
            value={autocompleteInput}
            onChange={e => setAutocompleteInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && autocompleteOptions[0]) {
                setFilterValues(vals => vals.includes(autocompleteOptions[0]) ? vals : [...vals, autocompleteOptions[0]]);
                setAutocompleteInput('');
              }
              if (e.key === 'Tab' && autocompleteOptions[0]) {
                setFilterValues(vals => vals.includes(autocompleteOptions[0]) ? vals : [...vals, autocompleteOptions[0]]);
                setAutocompleteInput('');
                setActiveFilterProp(activeFilterProp === 'artist' ? 'title' : 'artist');
                e.preventDefault();
              }
            }}
            placeholder={`Filter by ${activeFilterProp}`}
            className="border rounded px-2 py-1 text-xs w-40"
            aria-label={`Filter by ${activeFilterProp}`}
            autoComplete="off"
          />
          {autocompleteInput && autocompleteOptions.length > 0 && (
            <ul className="absolute z-10 bg-popover border rounded mt-1 w-full text-xs max-h-32 overflow-auto">
              {autocompleteOptions.map(opt => (
                <li
                  key={opt}
                  className="px-2 py-1 hover:bg-accent cursor-pointer"
                  onClick={() => {
                    setFilterValues(vals => vals.includes(opt) ? vals : [...vals, opt]);
                    setAutocompleteInput('');
                  }}
                >
                  {opt}
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* Show selected filter values as chips */}
        {filterValues.map(val => (
          <span key={val} className="inline-flex items-center bg-accent text-xs rounded px-2 py-1 mr-1">
            {val}
            <button
              className="ml-1 text-muted-foreground hover:text-red-500"
              onClick={() => setFilterValues(vals => vals.filter(v => v !== val))}
              aria-label={`Remove filter ${val}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      {/* Track list */}
      <div className="grid gap-4" role="listbox" aria-label="Track list">
        {paginatedTracks.map((track) => {
          const isActive = selectedTrackId === track.id;
          const isSelected = selectedIds.includes(track.id);
          return (
            <Card
              key={track.id}
              className={`overflow-hidden transition-shadow duration-200 group ${isActive ? 'border-2 border-primary ring-2 ring-primary/30 bg-primary/5 shadow-lg' : 'border-border'} ${isSelected ? 'ring-2 ring-accent/70 bg-accent/10' : ''} hover:shadow-md`}
              role="option"
              aria-selected={isActive}
              tabIndex={0}
              onClick={e => handleTrackClick(track, e)}
              onKeyDown={e => {
                if (e.key === ' ' || e.key === 'Enter') handleTrackClick(track, e);
              }}
            >
              <CardContent className="p-0">
                <div className="flex items-center p-4 gap-2">
                  <Checkbox
                    checked={isSelected}
                    aria-checked={isSelected ? 'true' : 'false'}
                    onCheckedChange={checked => {
                      if (checked) {
                        setSelectedIds(ids => ids.includes(track.id) ? ids : [...ids, track.id]);
                      } else {
                        setSelectedIds(ids => ids.filter(id => id !== track.id));
                      }
                    }}
                    aria-label={`Select track ${track.title}`}
                    className="mr-2"
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
                      onClick={e => { e.stopPropagation(); onSelectTrack(track); }}
                      disabled={isProcessing}
                      aria-label={`Select track ${track.title}`}
                      className={`group/icon-btn relative flex items-center justify-center h-9 w-9 rounded-full transition-all duration-200 bg-accent/10 hover:bg-primary/90 focus:bg-primary/80 text-primary hover:text-white focus:text-white outline-none border border-transparent hover:shadow-lg focus:ring-2 focus:ring-primary/60 ${isActive ? 'bg-primary text-white' : ''}`}
                    >
                      <Play className="h-5 w-5 transition-transform duration-200 group-hover/icon-btn:scale-110 group-focus/icon-btn:scale-110" />
                      <span className="absolute left-full ml-2 whitespace-nowrap bg-background text-primary text-xs font-semibold px-2 py-1 rounded shadow-lg opacity-0 group-hover/icon-btn:opacity-100 group-focus/icon-btn:opacity-100 transition-opacity duration-200 pointer-events-none">
                        Select
                      </span>
                    </button>
                    {/* Download Button */}
                    <button
                      onClick={e => { e.stopPropagation(); onDownloadTrack(track); }}
                      disabled={isProcessing}
                      aria-label={`Add track ${track.title} to working environment`}
                      className="group/icon-btn relative flex items-center justify-center h-9 w-9 rounded-full transition-all duration-200 bg-accent/10 hover:bg-accent/90 focus:bg-accent/80 text-accent hover:text-white focus:text-white outline-none border border-transparent hover:shadow-lg focus:ring-2 focus:ring-accent/60"
                    >
                      <Plus className="h-5 w-5 transition-transform duration-200 group-hover/icon-btn:scale-110 group-focus/icon-btn:scale-110" />
                      <span className="absolute left-full ml-2 whitespace-nowrap bg-background text-accent text-xs font-semibold px-2 py-1 rounded shadow-lg opacity-0 group-hover/icon-btn:opacity-100 group-focus/icon-btn:opacity-100 transition-opacity duration-200 pointer-events-none">
                        Add
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
      {/* Page size select moved below pagination */}
      <div className="flex justify-end mt-2 px-2">
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
      </div>
    </div>
  );
}
