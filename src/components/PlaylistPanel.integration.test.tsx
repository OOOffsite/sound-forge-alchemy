// PlaylistPanel.integration.test.tsx
// Integration test for PlaylistPanel: render, select, download
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PlaylistPanel from './PlaylistPanel';

const tracks = [
  { id: '1', title: 'Song A', artist: 'Artist X', albumArt: '', duration: '3:00' },
  { id: '2', title: 'Song B', artist: 'Artist Y', albumArt: '', duration: '4:00' },
];

describe('PlaylistPanel integration', () => {
  it('renders and allows track selection', () => {
    const onSelectTrack = vi.fn();
    render(
      <PlaylistPanel
        tracks={tracks}
        onSelectTrack={onSelectTrack}
        onDownloadTrack={() => {}}
        selectedTrackId={undefined}
        isProcessing={false}
      />
    );
    // Click the first track's select button
    const selectBtns = screen.getAllByLabelText('Select track Song A');
    fireEvent.click(selectBtns[1]);
    expect(onSelectTrack).toHaveBeenCalledWith(tracks[0]);
  });
});
