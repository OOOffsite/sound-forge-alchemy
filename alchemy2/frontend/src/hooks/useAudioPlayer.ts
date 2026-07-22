/**
 * Hook: useAudioPlayer
 *
 * @description HTML5 Audio playback with stem switching support
 * @author Sound Forge Alchemy Team
 * @license MIT
 * @version 2.0.0
 * @phase GREEN - Minimal implementation to pass tests
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Audio stems mapping
 */
export interface AudioStems {
  [stemName: string]: string;
}

/**
 * Hook options
 */
export interface UseAudioPlayerOptions {
  onEnded?: () => void;
  onError?: (error: Error) => void;
  onPlay?: () => void;
  onPause?: () => void;
}

/**
 * Hook return value
 */
export interface UseAudioPlayerReturn {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  progress: number;
  currentStem: string | null;
  error: Error | null;
  loadAudio: (url: string) => void;
  loadStems: (stems: AudioStems) => void;
  play: () => Promise<void>;
  pause: () => void;
  togglePlay: () => Promise<void>;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  switchStem: (stemName: string) => void;
}

/**
 * Custom hook for HTML5 audio playback with stem switching
 *
 * @param options - Hook configuration options
 * @returns Audio player state and controls
 *
 * @example
 * ```tsx
 * const { play, pause, currentTime, duration } = useAudioPlayer({
 *   onEnded: () => console.log('Playback complete')
 * });
 *
 * // Load and play
 * loadAudio('https://example.com/track.mp3');
 * play();
 * ```
 */
export function useAudioPlayer(
  options: UseAudioPlayerOptions = {}
): UseAudioPlayerReturn {
  const { onEnded, onError, onPlay, onPause } = options;

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(1);
  const [progress, setProgress] = useState<number>(0);
  const [currentStem, setCurrentStem] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stemsRef = useRef<AudioStems>({});
  const savedTimeRef = useRef<number>(0);

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio();

    const audio = audioRef.current;

    // Event handlers
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration > 0) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (onEnded) {
        onEnded();
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      if (onPlay) {
        onPlay();
      }
    };

    const handlePause = () => {
      setIsPlaying(false);
      if (onPause) {
        onPause();
      }
    };

    const handleError = () => {
      const err = new Error('Audio playback error');
      setError(err);
      setIsPlaying(false);
      if (onError) {
        onError(err);
      }
    };

    // Attach event listeners
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    // Cleanup
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);

      audio.pause();
      audio.src = '';
    };
  }, [onEnded, onError, onPlay, onPause]);

  /**
   * Load audio from URL
   */
  const loadAudio = useCallback((url: string) => {
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.load();
      setError(null);
    }
  }, []);

  /**
   * Load stems for switching
   */
  const loadStems = useCallback((stems: AudioStems) => {
    stemsRef.current = stems;
  }, []);

  /**
   * Play audio
   */
  const play = useCallback(async () => {
    if (audioRef.current) {
      try {
        await audioRef.current.play();
        setError(null);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Playback failed');
        setError(error);
        if (onError) {
          onError(error);
        }
      }
    }
  }, [onError]);

  /**
   * Pause audio
   */
  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  /**
   * Toggle play/pause
   */
  const togglePlay = useCallback(async () => {
    if (audioRef.current) {
      if (audioRef.current.paused) {
        await play();
      } else {
        pause();
      }
    }
  }, [play, pause]);

  /**
   * Seek to specific time
   */
  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  /**
   * Set volume (0-1)
   */
  const setVolume = useCallback((vol: number) => {
    const clampedVolume = Math.max(0, Math.min(1, vol));

    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }

    setVolumeState(clampedVolume);
  }, []);

  /**
   * Switch to different stem
   */
  const switchStem = useCallback((stemName: string) => {
    if (!stemsRef.current[stemName]) {
      console.warn(`Stem "${stemName}" not found`);
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    // Save current playback position
    savedTimeRef.current = audio.currentTime;
    const wasPlaying = !audio.paused;

    // Load new stem
    audio.src = stemsRef.current[stemName];
    audio.load();

    // Restore position
    audio.currentTime = savedTimeRef.current;

    // Resume playback if was playing
    if (wasPlaying) {
      audio.play().catch((err) => {
        const error = err instanceof Error ? err : new Error('Failed to resume playback');
        setError(error);
        if (onError) {
          onError(error);
        }
      });
    }

    setCurrentStem(stemName);
  }, [onError]);

  return {
    isPlaying,
    currentTime,
    duration,
    volume,
    progress,
    currentStem,
    error,
    loadAudio,
    loadStems,
    play,
    pause,
    togglePlay,
    seek,
    setVolume,
    switchStem,
  };
}
