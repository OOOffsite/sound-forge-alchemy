// AudioProcessor.integration.test.tsx
// Integration test for AudioProcessor composite flows: separation, error handling, analysis
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AudioProcessor from './AudioProcessor';

const mockTrack = {
  id: '1',
  title: 'Test Song',
  artist: 'Test Artist',
  albumArt: '',
  duration: '3:00',
};

describe('AudioProcessor integration', () => {
  it('renders separation controls and triggers onSeparate', () => {
    const onSeparate = vi.fn();
    render(
      <AudioProcessor
        selectedTrack={mockTrack}
        isProcessing={false}
        onSeparate={onSeparate}
        analysisResult={null}
        onAnalyze={() => {}}
      />
    );
    // Should render stem switches and separate button
    expect(screen.getByText(/separate/i)).toBeInTheDocument();
    // Click the separate button
    fireEvent.click(screen.getByRole('button', { name: /separate/i }));
    expect(onSeparate).toHaveBeenCalled();
  });

  it('shows error if no track is selected and separate is clicked', () => {
    render(
      <AudioProcessor
        selectedTrack={null}
        isProcessing={false}
        onSeparate={() => {}}
        analysisResult={null}
        onAnalyze={() => {}}
      />
    );
    // Click the separate button
    fireEvent.click(screen.getByRole('button', { name: /separate/i }));
    expect(screen.getByText(/please select a track/i)).toBeInTheDocument();
  });

  it('triggers onAnalyze when analyze button is clicked', () => {
    const onAnalyze = vi.fn();
    render(
      <AudioProcessor
        selectedTrack={mockTrack}
        isProcessing={false}
        onSeparate={() => {}}
        analysisResult={null}
        onAnalyze={onAnalyze}
      />
    );
    // Click the analyze button
    fireEvent.click(screen.getByRole('button', { name: /analyze/i }));
    expect(onAnalyze).toHaveBeenCalled();
  });
});
