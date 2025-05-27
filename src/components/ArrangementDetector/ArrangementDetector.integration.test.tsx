// ArrangementDetector.integration.test.tsx
// Integration test for ArrangementDetector composite flows: detect, edit, save template
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ArrangementDetector from './ArrangementDetector';

describe('ArrangementDetector integration', () => {
  it('renders and triggers arrangement detection', async () => {
    const onArrangementDetected = vi.fn();
    render(
      <ArrangementDetector
        trackId="1"
        audioUrl="/audio/1.mp3"
        bpm={120}
        duration={180}
        onArrangementDetected={onArrangementDetected}
        onSaveArrangementTemplate={() => {}}
      />
    );
    // Click the detect arrangement button
    fireEvent.click(screen.getByRole('button', { name: /detect arrangement/i }));
    // Progress bar should appear
    expect(await screen.findByText(/analyzing/i)).toBeInTheDocument();
  });

  it('allows saving a template when arrangement exists', () => {
    render(
      <ArrangementDetector
        trackId="1"
        audioUrl="/audio/1.mp3"
        bpm={120}
        duration={180}
        onArrangementDetected={() => {}}
        onSaveArrangementTemplate={vi.fn()}
      />
    );
    // Simulate arrangement exists
    fireEvent.click(screen.getByRole('button', { name: /detect arrangement/i }));
    // Enter template name and save
    const input = screen.getByPlaceholderText(/template name/i);
    fireEvent.change(input, { target: { value: 'My Template' } });
    const saveBtn = screen.getByRole('button', { name: /save as template/i });
    expect(saveBtn).not.toBeDisabled();
  });
});
