/*
 * Author: Sound Forge Team <word@iite.bet>, Jeremiah Pegues <jeremiah@pegues.io>
 * Version: 1.0.0
 * License: MIT
 *
 * AudioPlayer component for Sound Forge Alchemy frontend.
 * Handles audio playback, waveform visualization, and stem switching.
 *
 * Logging is maximized at all levels for playback and error events.
 */

import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Play, Pause, Volume2, VolumeX, AlertCircle } from 'lucide-react';
import logger from '../lib/logger';
import type { Track } from './TrackList';

export interface Stem {
  id: string;
  name: string;
  url: string;
}

export interface AudioPlayerProps {
  track: Track;
  stems: Stem[];
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ track, stems }) => {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(75);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeStem, setActiveStem] = useState<string>(stems[0]?.id || '');
  const [error, setError] = useState<string | null>(null);

  // Initialize WaveSurfer
  useEffect(() => {
    if (!waveformRef.current) return;

    logger.info('Initializing WaveSurfer', { trackId: track.id });

    try {
      const wavesurfer = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#4F46E5',
        progressColor: '#7C3AED',
        cursorColor: '#EC4899',
        barWidth: 2,
        barRadius: 3,
        cursorWidth: 1,
        height: 80,
        barGap: 2,
      });

      // Load initial stem
      const initialStem = stems.find(s => s.id === activeStem);
      if (initialStem?.url) {
        wavesurfer.load(initialStem.url);
      }

      // Event listeners
      wavesurfer.on('ready', () => {
        logger.info('WaveSurfer ready', { duration: wavesurfer.getDuration() });
        setDuration(wavesurfer.getDuration());
      });

      wavesurfer.on('audioprocess', () => {
        setCurrentTime(wavesurfer.getCurrentTime());
      });

      wavesurfer.on('play', () => {
        logger.debug('Audio playing');
        setIsPlaying(true);
      });

      wavesurfer.on('pause', () => {
        logger.debug('Audio paused');
        setIsPlaying(false);
      });

      wavesurfer.on('error', (err: string) => {
        logger.error('WaveSurfer error', { error: err });
        setError('Error loading audio');
      });

      wavesurferRef.current = wavesurfer;

      return () => {
        logger.info('Destroying WaveSurfer');
        wavesurfer.destroy();
      };
    } catch (err) {
      logger.error('Failed to initialize WaveSurfer', { error: err });
      setError('Failed to initialize audio player');
    }
  }, [track.id, stems, activeStem]);

  // Update volume
  useEffect(() => {
    if (wavesurferRef.current) {
      const normalizedVolume = volume / 100;
      wavesurferRef.current.setVolume(normalizedVolume);
      logger.debug('Volume changed', { volume: normalizedVolume });
    }
  }, [volume]);

  // Play/Pause handler
  const handlePlayPause = () => {
    if (!wavesurferRef.current) return;

    try {
      if (isPlaying) {
        wavesurferRef.current.pause();
      } else {
        wavesurferRef.current.play();
      }
    } catch (err) {
      logger.error('Play/pause error', { error: err });
      setError('Playback error');
    }
  };

  // Stem switching handler
  const handleStemSwitch = (stemId: string) => {
    const stem = stems.find(s => s.id === stemId);

    if (!stem) {
      logger.warn('Stem not found', { stemId });
      return;
    }

    if (!stem.url) {
      logger.error('Stem URL unavailable', { stemId });
      setError('Stem unavailable');
      return;
    }

    logger.info('Switching stem', { stemId, stemName: stem.name });
    setActiveStem(stemId);

    if (wavesurferRef.current) {
      try {
        wavesurferRef.current.load(stem.url);
        setError(null);
      } catch (err) {
        logger.error('Failed to load stem', { error: err, stemId });
        setError('Failed to load stem');
      }
    }
  };

  // Format time helper
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">{track.title}</div>
            <div className="text-sm text-muted-foreground">{track.artist}</div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-md">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Waveform */}
        <div
          ref={waveformRef}
          data-testid="waveform-container"
          className="w-full bg-secondary/30 rounded-md overflow-hidden"
        />

        {/* Progress Bar */}
        <div className="relative h-1 bg-secondary rounded-full overflow-hidden">
          <div
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-full bg-primary transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Time Display */}
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePlayPause}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            aria-pressed={isPlaying}
            className="h-12 w-12 rounded-full"
          >
            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </Button>

          <div className="flex items-center gap-2 flex-1 max-w-xs">
            {volume === 0 ? (
              <VolumeX className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Volume2 className="h-4 w-4 text-muted-foreground" />
            )}
            <Slider
              value={[volume]}
              onValueChange={([value]) => setVolume(value)}
              min={0}
              max={100}
              step={1}
              aria-label="Volume control"
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground w-12 text-right">
              {volume}%
            </span>
          </div>
        </div>

        {/* Stem Switching */}
        <div className="space-y-2">
          <Label>Select Stem</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {stems.map(stem => (
              <Button
                key={stem.id}
                variant={activeStem === stem.id ? 'default' : 'outline'}
                onClick={() => handleStemSwitch(stem.id)}
                className={activeStem === stem.id ? 'active' : ''}
                aria-label={`Switch to ${stem.name} stem`}
                disabled={!stem.url}
              >
                {stem.name}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AudioPlayer;
