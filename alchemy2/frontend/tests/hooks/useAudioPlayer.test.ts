/**
 * Tests: useAudioPlayer Hook
 *
 * @description TDD tests for HTML5 audio playback with stem switching
 * @author Sound Forge Alchemy Team
 * @license MIT
 * @version 2.0.0
 * @phase RED - Write failing tests first
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';

describe('useAudioPlayer', () => {
  let mockAudio: {
    play: ReturnType<typeof vi.fn>;
    pause: ReturnType<typeof vi.fn>;
    load: ReturnType<typeof vi.fn>;
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
    currentTime: number;
    duration: number;
    volume: number;
    src: string;
    paused: boolean;
  };

  beforeEach(() => {
    mockAudio = {
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      load: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      currentTime: 0,
      duration: 180,
      volume: 1,
      src: '',
      paused: true,
    };

    global.Audio = vi.fn(() => mockAudio) as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('RED Phase - Failing Tests', () => {
    it('should initialize audio element on mount', () => {
      renderHook(() => useAudioPlayer());

      expect(global.Audio).toHaveBeenCalled();
    });

    it('should initialize with default state', () => {
      const { result } = renderHook(() => useAudioPlayer());

      expect(result.current.isPlaying).toBe(false);
      expect(result.current.currentTime).toBe(0);
      expect(result.current.duration).toBe(0);
      expect(result.current.volume).toBe(1);
      expect(result.current.currentStem).toBeNull();
    });

    it('should load audio source when provided', () => {
      const audioUrl = 'https://example.com/track.mp3';

      const { result } = renderHook(() => useAudioPlayer());

      act(() => {
        result.current.loadAudio(audioUrl);
      });

      expect(mockAudio.src).toBe(audioUrl);
      expect(mockAudio.load).toHaveBeenCalled();
    });

    it('should play audio when play is called', async () => {
      const { result } = renderHook(() => useAudioPlayer());

      act(() => {
        result.current.loadAudio('https://example.com/track.mp3');
      });

      await act(async () => {
        await result.current.play();
      });

      expect(mockAudio.play).toHaveBeenCalled();
    });

    it('should pause audio when pause is called', () => {
      const { result } = renderHook(() => useAudioPlayer());

      act(() => {
        result.current.loadAudio('https://example.com/track.mp3');
        result.current.pause();
      });

      expect(mockAudio.pause).toHaveBeenCalled();
    });

    it('should toggle play/pause state', async () => {
      mockAudio.paused = true;

      const { result } = renderHook(() => useAudioPlayer());

      act(() => {
        result.current.loadAudio('https://example.com/track.mp3');
      });

      // First toggle - should play
      await act(async () => {
        await result.current.togglePlay();
      });

      expect(mockAudio.play).toHaveBeenCalled();

      // Simulate playing state
      mockAudio.paused = false;

      // Second toggle - should pause
      act(() => {
        result.current.togglePlay();
      });

      expect(mockAudio.pause).toHaveBeenCalled();
    });

    it('should seek to specific time', () => {
      const { result } = renderHook(() => useAudioPlayer());

      act(() => {
        result.current.loadAudio('https://example.com/track.mp3');
        result.current.seek(60);
      });

      expect(mockAudio.currentTime).toBe(60);
    });

    it('should update volume', () => {
      const { result } = renderHook(() => useAudioPlayer());

      act(() => {
        result.current.setVolume(0.5);
      });

      expect(mockAudio.volume).toBe(0.5);
      expect(result.current.volume).toBe(0.5);
    });

    it('should track playback position', async () => {
      let timeUpdateCallback: (() => void) | undefined;

      mockAudio.addEventListener.mockImplementation((event, callback) => {
        if (event === 'timeupdate') {
          timeUpdateCallback = callback as () => void;
        }
      });

      const { result } = renderHook(() => useAudioPlayer());

      act(() => {
        result.current.loadAudio('https://example.com/track.mp3');
      });

      // Simulate time update
      mockAudio.currentTime = 30;
      act(() => {
        timeUpdateCallback?.();
      });

      await waitFor(() => {
        expect(result.current.currentTime).toBe(30);
      });
    });

    it('should track duration when metadata loads', async () => {
      let loadedMetadataCallback: (() => void) | undefined;

      mockAudio.addEventListener.mockImplementation((event, callback) => {
        if (event === 'loadedmetadata') {
          loadedMetadataCallback = callback as () => void;
        }
      });

      const { result } = renderHook(() => useAudioPlayer());

      act(() => {
        result.current.loadAudio('https://example.com/track.mp3');
      });

      // Simulate metadata loaded
      mockAudio.duration = 180;
      act(() => {
        loadedMetadataCallback?.();
      });

      await waitFor(() => {
        expect(result.current.duration).toBe(180);
      });
    });

    it('should switch between stems', () => {
      const stems = {
        vocals: 'https://example.com/vocals.mp3',
        drums: 'https://example.com/drums.mp3',
        bass: 'https://example.com/bass.mp3',
      };

      const { result } = renderHook(() => useAudioPlayer());

      act(() => {
        result.current.loadStems(stems);
        result.current.switchStem('vocals');
      });

      expect(mockAudio.src).toBe(stems.vocals);
      expect(result.current.currentStem).toBe('vocals');
    });

    it('should preserve playback position when switching stems', () => {
      const stems = {
        vocals: 'https://example.com/vocals.mp3',
        drums: 'https://example.com/drums.mp3',
      };

      mockAudio.currentTime = 45;

      const { result } = renderHook(() => useAudioPlayer());

      act(() => {
        result.current.loadStems(stems);
        result.current.switchStem('vocals');
      });

      const savedTime = mockAudio.currentTime;

      act(() => {
        result.current.switchStem('drums');
      });

      expect(mockAudio.currentTime).toBe(savedTime);
    });

    it('should cleanup audio element on unmount', () => {
      const { unmount } = renderHook(() => useAudioPlayer());

      unmount();

      expect(mockAudio.pause).toHaveBeenCalled();
      expect(mockAudio.src).toBe('');
    });

    it('should handle playback errors gracefully', async () => {
      const playError = new Error('Playback failed');
      mockAudio.play.mockRejectedValue(playError);

      const { result } = renderHook(() => useAudioPlayer());

      act(() => {
        result.current.loadAudio('https://example.com/track.mp3');
      });

      await act(async () => {
        await result.current.play();
      });

      expect(result.current.error).toBeTruthy();
    });

    it('should emit ended event when playback completes', async () => {
      const onEnded = vi.fn();
      let endedCallback: (() => void) | undefined;

      mockAudio.addEventListener.mockImplementation((event, callback) => {
        if (event === 'ended') {
          endedCallback = callback as () => void;
        }
      });

      const { result } = renderHook(() => useAudioPlayer({ onEnded }));

      act(() => {
        result.current.loadAudio('https://example.com/track.mp3');
      });

      // Simulate playback ended
      act(() => {
        endedCallback?.();
      });

      await waitFor(() => {
        expect(onEnded).toHaveBeenCalled();
      });
    });

    it('should calculate playback progress percentage', () => {
      let timeUpdateCallback: (() => void) | undefined;
      let loadedMetadataCallback: (() => void) | undefined;

      mockAudio.addEventListener.mockImplementation((event, callback) => {
        if (event === 'timeupdate') {
          timeUpdateCallback = callback as () => void;
        }
        if (event === 'loadedmetadata') {
          loadedMetadataCallback = callback as () => void;
        }
      });

      const { result } = renderHook(() => useAudioPlayer());

      act(() => {
        result.current.loadAudio('https://example.com/track.mp3');
      });

      mockAudio.duration = 100;
      act(() => {
        loadedMetadataCallback?.();
      });

      mockAudio.currentTime = 50;
      act(() => {
        timeUpdateCallback?.();
      });

      expect(result.current.progress).toBe(50);
    });
  });
});
