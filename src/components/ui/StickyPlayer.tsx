/*
 * Author: Sound Forge Team <word@iite.bet>, Jeremiah Pegues <jeremiah@pegues.io>
 * Version: 1.0.0
 * License: MIT
 *
 * StickyPlayer component for Sound Forge Alchemy frontend.
 * Provides persistent audio playback controls and media session integration.
 *
 * Logging is maximized at all levels for playback, UI, and error events.
 */

import React, { useState, useRef } from 'react';
import { ChevronUp, ChevronDown, Pause, Play, Volume2, SkipBack, SkipForward } from 'lucide-react';
import VolumeVisualizer from './VolumeVisualizer';
import logger from '../../lib/logger';

interface StickyPlayerProps {
  track?: {
    title: string;
    artist: string;
    albumArt?: string;
    duration: string;
    audioUrl?: string;
  };
  isProcessing: boolean;
  isWorkingWithStems: boolean;
}

const StickyPlayer: React.FC<StickyPlayerProps> = ({ track, isProcessing, isWorkingWithStems }) => {
  logger.info('StickyPlayer rendered', { track });
  const [expanded, setExpanded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Auto-collapse if processing or working with stems
  React.useEffect(() => {
    if (isProcessing || isWorkingWithStems) setExpanded(false);
  }, [isProcessing, isWorkingWithStems]);

  // Sync play/pause
  React.useEffect(() => {
    if (audioRef.current) {
      if (playing) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    }
  }, [playing]);
  
  // Set up media session API integration
  React.useEffect(() => {
    if (!track || !track.title || !('mediaSession' in navigator)) return;
    
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      artwork: track.albumArt ? [{ src: track.albumArt }] : []
    });
    
    // Action handlers
    navigator.mediaSession.setActionHandler('play', () => {
      setPlaying(true);
    });
    
    navigator.mediaSession.setActionHandler('pause', () => {
      setPlaying(false);
    });
    
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (audioRef.current && details.seekTime !== undefined) {
        audioRef.current.currentTime = details.seekTime;
        setProgress(details.seekTime / (audioRef.current.duration || 1));
      }
    });
    
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      if (audioRef.current) {
        const skipTime = details?.seekOffset || 10;
        const newTime = Math.min(audioRef.current.currentTime + skipTime, audioRef.current.duration);
        audioRef.current.currentTime = newTime;
        setProgress(newTime / (audioRef.current.duration || 1));
      }
    });
    
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      if (audioRef.current) {
        const skipTime = details?.seekOffset || 10;
        const newTime = Math.max(audioRef.current.currentTime - skipTime, 0);
        audioRef.current.currentTime = newTime;
        setProgress(newTime / (audioRef.current.duration || 1));
      }
    });
    
    return () => {
      // Clear handlers when component unmounts
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('seekto', null);
      navigator.mediaSession.setActionHandler('seekforward', null);
      navigator.mediaSession.setActionHandler('seekbackward', null);
    };
  }, [track]);

  // Update media session playback state and position
  React.useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    
    const updatePosition = () => {
      if (audioRef.current) {
        navigator.mediaSession.setPositionState({
          duration: audioRef.current.duration || 0,
          position: audioRef.current.currentTime || 0,
          playbackRate: audioRef.current.playbackRate
        });
      }
    };
    
    if (playing) {
      updatePosition();
      const interval = setInterval(updatePosition, 1000);
      return () => clearInterval(interval);
    }
  }, [playing, progress]);

  // Sync volume
  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Update progress
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime / (audioRef.current.duration || 1));
    }
  };

  // Seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const newTime = (audioRef.current.duration || 0) * Number(e.target.value);
      audioRef.current.currentTime = newTime;
      setProgress(Number(e.target.value));
    }
  };

  // Log playback events
  React.useEffect(() => {
    logger.debug('StickyPlayer effect: track or playback state changed', { track, playing });
  }, [track, playing]);

  // Log errors
  try {
    if (!track || !track.audioUrl) return null;
  } catch (error) {
    logger.error('Error in StickyPlayer', { error });
    throw error;
  }

  return (
    <div className={`fixed left-0 right-0 bottom-0 z-40 transition-all ${expanded ? 'h-64' : 'h-20'} bg-background border-t border-border shadow-lg flex flex-col`}>
      <audio
        ref={audioRef}
        src={track.audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setPlaying(false)}
        style={{ display: 'none' }}
      />
      <div className="flex items-center px-4 h-20">
        <button onClick={() => setExpanded((v) => !v)} className="mr-2 text-muted-foreground">
          {expanded ? <ChevronDown /> : <ChevronUp />}
        </button>
        {track.albumArt && <img src={track.albumArt} alt="Album Art" className="w-12 h-12 rounded mr-4" />}
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{track.title}</div>
          <div className="text-xs text-muted-foreground truncate">{track.artist}</div>
        </div>
        <button onClick={() => setPlaying((p) => !p)} className="mx-4">
          {playing ? <Pause /> : <Play />}
        </button>
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4" />
          <div className="flex flex-col gap-1">
            <input type="range" min={0} max={1} step={0.01} value={volume} onChange={e => setVolume(Number(e.target.value))} className="w-20" />
            {/* Volume visualizer */}
            <VolumeVisualizer 
              audioRef={audioRef}
              playing={playing}
              volume={volume}
              width={80}
              height={20}
            />
          </div>
        </div>
      </div>
      <div className="flex items-center px-4">
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={progress}
          onChange={handleSeek}
          className="w-full accent-primary"
        />
      </div>
      {expanded && (
        <div className="flex-1 flex flex-col p-4 bg-muted-foreground/10">
          {/* Overlay content: waveform, queue, advanced controls, etc. */}
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <span>Waveform/Queue/Advanced Controls (coming soon)</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default StickyPlayer;
