// TrackList.integration.test.tsx
// Integration test for TrackList composite flows: select, filter, download, analyze, process
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import TrackList, { Track } from './TrackList';

const tracks: Track[] = [
  { id: '1', title: 'Song A', artist: 'Artist X', albumArt: '', duration: '3:00' },
  { id: '2', title: 'Song B', artist: 'Artist Y', albumArt: '', duration: '4:00' },
  { id: '3', title: 'Song C', artist: 'Artist X', albumArt: '', duration: '2:30' },
];

describe('TrackList integration', () => {
  it('renders tracks and allows single selection', () => {
    const onSelectTrack = vi.fn();
    const onDownloadTrack = vi.fn();
    render(
      <TrackList
        tracks={tracks}
        onSelectTrack={onSelectTrack}
        onDownloadTrack={onDownloadTrack}
        selectedTrackId={undefined}
        isProcessing={false}
      />
    );
    // Should render all tracks
    const listbox = screen.getByRole('listbox', { name: /track list/i });
    expect(within(listbox).getAllByRole('option')).toHaveLength(tracks.length);
    // Click the "Select" button for the first track (not the checkbox)
    const selectBtns = within(listbox).getAllByLabelText('Select track Song A');
    // The second button is the actual "Select" button (first is the checkbox)
    fireEvent.click(selectBtns[1]);
    expect(onSelectTrack).toHaveBeenCalledWith(tracks[0]);
  });

  it('filters tracks by artist', () => {
    render(
      <TrackList
        tracks={tracks}
        onSelectTrack={() => {}}
        onDownloadTrack={() => {}}
        selectedTrackId={undefined}
        isProcessing={false}
      />
    );
    // Switch filter to artist
    fireEvent.change(screen.getByLabelText(/filter property/i), { target: { value: 'artist' } });
    // Type artist name
    fireEvent.change(screen.getByLabelText(/filter by artist/i), { target: { value: 'Artist X' } });
    // Select from autocomplete (find the dropdown option)
    const dropdownOptions = screen.getAllByText('Artist X');
    // Find the one that is in the autocomplete dropdown (should have role 'listbox' as ancestor)
    const option = dropdownOptions.find(opt => opt.closest('ul'));
    fireEvent.click(option!);
    // Only tracks by Artist X should be shown
    const listbox = screen.getByRole('listbox', { name: /track list/i });
    expect(within(listbox).getAllByRole('option')).toHaveLength(2);
    expect(screen.getByText('Song A')).toBeInTheDocument();
    expect(screen.getByText('Song C')).toBeInTheDocument();
  });

  it('allows multi-select and download action', () => {
    const onDownloadTrack = vi.fn();
    render(
      <TrackList
        tracks={tracks}
        onSelectTrack={() => {}}
        onDownloadTrack={onDownloadTrack}
        selectedTrackId={undefined}
        isProcessing={false}
      />
    );
    // Select all tracks
    fireEvent.click(screen.getByLabelText(/select all tracks on page/i));
    // Click the action button for Add
    fireEvent.click(screen.getByRole('button', { name: /perform add on selected tracks/i }));
    // Should call onDownloadTrack for each track
    expect(onDownloadTrack).toHaveBeenCalledTimes(tracks.length);
  });

  it('disables actions when processing', () => {
    render(
      <TrackList
        tracks={tracks}
        onSelectTrack={() => {}}
        onDownloadTrack={() => {}}
        selectedTrackId={undefined}
        isProcessing={true}
      />
    );
    // All select and action buttons should be disabled
    expect(screen.getByLabelText(/select all tracks on page/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /perform add on selected tracks/i })).toBeDisabled();
  });
});
