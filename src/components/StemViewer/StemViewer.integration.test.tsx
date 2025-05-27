// StemViewer.integration.test.tsx
// Integration test for StemViewer composite flows: render stems, toggle arrangement/cue points
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StemViewer from './StemViewer';

describe('StemViewer integration', () => {
  const stems = [
    { id: 'vocal', name: 'Vocals', type: 'vocals' },
    { id: 'drums', name: 'Drums', type: 'drums' },
  ];
  const loops = [];
  const cuePoints = [];
  const arrangement = [];

  it('renders stems and toggles arrangement/cue points', () => {
    render(
      <StemViewer
        trackId="1"
        trackName="Test Track"
        bpm={120}
        stems={stems}
        loops={loops}
        cuePoints={cuePoints}
        arrangement={arrangement}
        onSaveLoop={() => {}}
        onAddCuePoint={() => {}}
        onExportStems={() => {}}
      />
    );
    // Should render stem names
    expect(screen.getByText('Vocals')).toBeInTheDocument();
    expect(screen.getByText('Drums')).toBeInTheDocument();
    // Toggle arrangement/cue points
    fireEvent.click(screen.getByRole('button', { name: /show arrangement/i }));
    fireEvent.click(screen.getByRole('button', { name: /show cue points/i }));
  });
});
