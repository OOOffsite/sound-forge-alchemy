import React, { useState, useRef } from 'react';
import { ChevronUp, ChevronDown, Pause, Play, Volume2 } from 'lucide-react';

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

  if (!track || !track.audioUrl) return null;

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
          <input type="range" min={0} max={1} step={0.01} value={volume} onChange={e => setVolume(Number(e.target.value))} className="w-20" />
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
