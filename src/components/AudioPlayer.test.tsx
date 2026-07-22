/*
 * Author: Sound Forge Team <word@iite.bet>, Jeremiah Pegues <jeremiah@pegues.io>
 * Version: 1.0.0
 * License: MIT
 *
 * AudioPlayer Component Tests - TDD Implementation
 * Red-Green-Refactor Cycle
 *
 * Tests for audio playback, waveform display, and stem switching.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AudioPlayer from './AudioPlayer';
import type { Track } from './TrackList';

// Mock WaveSurfer
const mockWaveSurfer = {
  load: vi.fn(),
  play: vi.fn(),
  pause: vi.fn(),
  stop: vi.fn(),
  setVolume: vi.fn(),
  getCurrentTime: vi.fn(() => 30),
  getDuration: vi.fn(() => 180),
  isPlaying: vi.fn(() => false),
  on: vi.fn(),
  destroy: vi.fn(),
};

vi.mock('wavesurfer.js', () => ({
  default: {
    create: vi.fn(() => mockWaveSurfer),
  },
}));

// Mock HTMLMediaElement
global.HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
global.HTMLMediaElement.prototype.pause = vi.fn();
global.HTMLMediaElement.prototype.load = vi.fn();

describe('AudioPlayer Component - TDD', () => {
  const mockTrack: Track = {
    id: 'track-1',
    title: 'Test Track',
    artist: 'Test Artist',
    duration: '3:00',
    albumArt: 'https://example.com/album.jpg',
  };

  const mockStems = [
    { id: 'vocals', name: 'Vocals', url: 'https://example.com/vocals.mp3' },
    { id: 'bass', name: 'Bass', url: 'https://example.com/bass.mp3' },
    { id: 'drums', name: 'Drums', url: 'https://example.com/drums.mp3' },
    { id: 'other', name: 'Other', url: 'https://example.com/other.mp3' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('RED Phase - Component Rendering', () => {
    it('should render player controls', () => {
      render(<AudioPlayer track={mockTrack} stems={mockStems} />);

      // Should have play/pause button
      expect(screen.getByRole('button', { name: /play|pause/i })).toBeInTheDocument();

      // Should have volume control
      expect(screen.getByLabelText(/volume/i)).toBeInTheDocument();

      // Should display track information
      expect(screen.getByText(mockTrack.title)).toBeInTheDocument();
      expect(screen.getByText(mockTrack.artist)).toBeInTheDocument();
    });

    it('should display waveform container', () => {
      render(<AudioPlayer track={mockTrack} stems={mockStems} />);

      // Should have waveform container
      const waveformContainer = screen.getByTestId('waveform-container');
      expect(waveformContainer).toBeInTheDocument();
    });

    it('should render stem switching UI', () => {
      render(<AudioPlayer track={mockTrack} stems={mockStems} />);

      // Should have stem buttons for each stem
      mockStems.forEach(stem => {
        expect(screen.getByRole('button', { name: new RegExp(stem.name, 'i') })).toBeInTheDocument();
      });
    });

    it('should show current time and duration', () => {
      render(<AudioPlayer track={mockTrack} stems={mockStems} />);

      // Should display time information
      expect(screen.getByText(/0:00/)).toBeInTheDocument();
      expect(screen.getByText(/3:00/)).toBeInTheDocument();
    });
  });

  describe('RED Phase - Play/Pause Functionality', () => {
    it('should play audio when play button is clicked', async () => {
      render(<AudioPlayer track={mockTrack} stems={mockStems} />);

      const playButton = screen.getByRole('button', { name: /play/i });
      fireEvent.click(playButton);

      await waitFor(() => {
        expect(mockWaveSurfer.play).toHaveBeenCalled();
      });
    });

    it('should pause audio when pause button is clicked', async () => {
      mockWaveSurfer.isPlaying.mockReturnValue(true);
      render(<AudioPlayer track={mockTrack} stems={mockStems} />);

      const pauseButton = screen.getByRole('button', { name: /pause/i });
      fireEvent.click(pauseButton);

      await waitFor(() => {
        expect(mockWaveSurfer.pause).toHaveBeenCalled();
      });
    });

    it('should toggle between play and pause states', async () => {
      render(<AudioPlayer track={mockTrack} stems={mockStems} />);

      const playButton = screen.getByRole('button', { name: /play/i });

      // First click should play
      fireEvent.click(playButton);
      await waitFor(() => {
        expect(mockWaveSurfer.play).toHaveBeenCalled();
      });

      // Second click should pause
      mockWaveSurfer.isPlaying.mockReturnValue(true);
      fireEvent.click(playButton);
      await waitFor(() => {
        expect(mockWaveSurfer.pause).toHaveBeenCalled();
      });
    });
  });

  describe('RED Phase - Stem Switching', () => {
    it('should switch to vocals stem when vocals button is clicked', async () => {
      render(<AudioPlayer track={mockTrack} stems={mockStems} />);

      const vocalsButton = screen.getByRole('button', { name: /vocals/i });
      fireEvent.click(vocalsButton);

      await waitFor(() => {
        expect(mockWaveSurfer.load).toHaveBeenCalledWith('https://example.com/vocals.mp3');
      });
    });

    it('should highlight active stem', () => {
      render(<AudioPlayer track={mockTrack} stems={mockStems} />);

      const vocalsButton = screen.getByRole('button', { name: /vocals/i });
      fireEvent.click(vocalsButton);

      // Active stem should have different styling
      expect(vocalsButton).toHaveClass('active');
    });

    it('should load correct stem URL when switching', async () => {
      render(<AudioPlayer track={mockTrack} stems={mockStems} />);

      // Switch to bass
      const bassButton = screen.getByRole('button', { name: /bass/i });
      fireEvent.click(bassButton);

      await waitFor(() => {
        expect(mockWaveSurfer.load).toHaveBeenCalledWith('https://example.com/bass.mp3');
      });
    });
  });

  describe('RED Phase - Volume Control', () => {
    it('should update volume when volume slider is changed', async () => {
      render(<AudioPlayer track={mockTrack} stems={mockStems} />);

      const volumeSlider = screen.getByLabelText(/volume/i);
      fireEvent.change(volumeSlider, { target: { value: '50' } });

      await waitFor(() => {
        expect(mockWaveSurfer.setVolume).toHaveBeenCalledWith(0.5);
      });
    });

    it('should mute audio when volume is set to 0', async () => {
      render(<AudioPlayer track={mockTrack} stems={mockStems} />);

      const volumeSlider = screen.getByLabelText(/volume/i);
      fireEvent.change(volumeSlider, { target: { value: '0' } });

      await waitFor(() => {
        expect(mockWaveSurfer.setVolume).toHaveBeenCalledWith(0);
      });
    });

    it('should set volume to maximum when slider is at 100', async () => {
      render(<AudioPlayer track={mockTrack} stems={mockStems} />);

      const volumeSlider = screen.getByLabelText(/volume/i);
      fireEvent.change(volumeSlider, { target: { value: '100' } });

      await waitFor(() => {
        expect(mockWaveSurfer.setVolume).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('RED Phase - Waveform Display', () => {
    it('should initialize WaveSurfer on mount', () => {
      render(<AudioPlayer track={mockTrack} stems={mockStems} />);

      expect(mockWaveSurfer.load).toHaveBeenCalled();
    });

    it('should load track audio into waveform', () => {
      render(<AudioPlayer track={mockTrack} stems={mockStems} />);

      // Should load the first stem by default
      expect(mockWaveSurfer.load).toHaveBeenCalledWith(mockStems[0].url);
    });

    it('should cleanup WaveSurfer on unmount', () => {
      const { unmount } = render(<AudioPlayer track={mockTrack} stems={mockStems} />);

      unmount();

      expect(mockWaveSurfer.destroy).toHaveBeenCalled();
    });
  });

  describe('RED Phase - Time Display and Progress', () => {
    it('should update current time display during playback', async () => {
      render(<AudioPlayer track={mockTrack} stems={mockStems} />);

      // Simulate time update
      mockWaveSurfer.getCurrentTime.mockReturnValue(30);
      mockWaveSurfer.on.mock.calls.find(call => call[0] === 'audioprocess')?.[1]?.();

      await waitFor(() => {
        expect(screen.getByText(/0:30/)).toBeInTheDocument();
      });
    });

    it('should format time correctly (mm:ss)', () => {
      render(<AudioPlayer track={mockTrack} stems={mockStems} />);

      // Should display formatted time
      expect(screen.getByText(/\d:\d{2}/)).toBeInTheDocument();
    });

    it('should show progress bar that reflects current position', () => {
      render(<AudioPlayer track={mockTrack} stems={mockStems} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe('RED Phase - Error Handling', () => {
    it('should handle audio load errors gracefully', async () => {
      mockWaveSurfer.load.mockRejectedValue(new Error('Failed to load audio'));

      render(<AudioPlayer track={mockTrack} stems={mockStems} />);

      await waitFor(() => {
        expect(screen.getByText(/error loading audio/i)).toBeInTheDocument();
      });
    });

    it('should display error message when stem is unavailable', async () => {
      const invalidStems = [
        { id: 'vocals', name: 'Vocals', url: '' },
      ];

      render(<AudioPlayer track={mockTrack} stems={invalidStems} />);

      const vocalsButton = screen.getByRole('button', { name: /vocals/i });
      fireEvent.click(vocalsButton);

      await waitFor(() => {
        expect(screen.getByText(/stem unavailable/i)).toBeInTheDocument();
      });
    });
  });

  describe('RED Phase - Accessibility', () => {
    it('should have proper ARIA labels for controls', () => {
      render(<AudioPlayer track={mockTrack} stems={mockStems} />);

      expect(screen.getByRole('button', { name: /play/i })).toHaveAttribute('aria-label');
      expect(screen.getByLabelText(/volume/i)).toHaveAttribute('aria-label');
    });

    it('should support keyboard navigation', () => {
      render(<AudioPlayer track={mockTrack} stems={mockStems} />);

      const playButton = screen.getByRole('button', { name: /play/i });
      expect(playButton).toHaveAttribute('tabIndex');
    });

    it('should announce play state changes to screen readers', async () => {
      render(<AudioPlayer track={mockTrack} stems={mockStems} />);

      const playButton = screen.getByRole('button', { name: /play/i });
      fireEvent.click(playButton);

      await waitFor(() => {
        expect(playButton).toHaveAttribute('aria-pressed', 'true');
      });
    });
  });
});
