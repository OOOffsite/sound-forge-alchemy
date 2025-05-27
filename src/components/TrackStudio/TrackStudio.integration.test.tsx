// TrackStudio.integration.test.tsx
// Integration test for TrackStudio composite flows: tabs, cue points, loops, arrangement
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TrackStudio from './TrackStudio';

// Mock useParams to always return a test trackId
vi.mock('react-router-dom', () => ({
  ...vi.importActual('react-router-dom'),
  useParams: () => ({ trackId: '1' }),
}));

describe('TrackStudio integration', () => {
  it('renders tabs and switches between them', () => {
    render(<TrackStudio />);
    // Should render tab triggers
    expect(screen.getByRole('tab', { name: /stem editor/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /arrangement/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /loops/i })).toBeInTheDocument();
    // Switch to arrangement tab
    fireEvent.click(screen.getByRole('tab', { name: /arrangement/i }));
    expect(screen.getByText(/arrangement/i)).toBeInTheDocument();
    // Switch to loops tab
    fireEvent.click(screen.getByRole('tab', { name: /loops/i }));
    expect(screen.getByText(/loop library/i)).toBeInTheDocument();
  });
});
