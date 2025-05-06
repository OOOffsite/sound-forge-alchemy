
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Play, Pause, SkipBack, SkipForward, Clock } from 'lucide-react';
import { Track } from './TrackList';
import { formatTime } from '@/lib/utils';

interface StemVisualizerProps {
  track: Track | null;
  stems: StemTrack[];
  isPlaying?: boolean;
  onPlayPause?: () => void;
}

export interface StemTrack {
  id: string;
  type: 'vocals' | 'bass' | 'drums' | 'other';
  name: string;
  active: boolean;
  color: string;
}

export interface CuePoint {
  id: string;
  time: number;
  label: string;
  type: 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro' | 'custom';
}

const StemVisualizer: React.FC<StemVisualizerProps> = ({ 
  track, 
  stems, 
  isPlaying = false, 
  onPlayPause = () => {} 
}) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(120); // Default 2 minutes in seconds
  const [activeStems, setActiveStems] = useState<string[]>(stems.map(stem => stem.id));
  const [cuePoints, setCuePoints] = useState<CuePoint[]>([
    { id: '1', time: 0, label: 'Intro', type: 'intro' },
    { id: '2', time: 30, label: 'Verse', type: 'verse' },
    { id: '3', time: 60, label: 'Chorus', type: 'chorus' },
    { id: '4', time: 90, label: 'Bridge', type: 'bridge' },
    { id: '5', time: 110, label: 'Outro', type: 'outro' }
  ]);

  useEffect(() => {
    // Parse duration from string format like "3:22" to seconds
    if (track?.duration) {
      const [minutes, seconds] = track.duration.split(':').map(Number);
      setDuration(minutes * 60 + seconds);
    }
  }, [track]);

  // Simulate playback progression when isPlaying is true
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime(prevTime => {
          const newTime = prevTime + 0.1;
          return newTime >= duration ? 0 : newTime;
        });
      }, 100);
    }
    
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  const handleStemToggle = (stemId: string) => {
    setActiveStems(prev => 
      prev.includes(stemId) 
        ? prev.filter(id => id !== stemId) 
        : [...prev, stemId]
    );
  };

  const handleSeek = (newPosition: number[]) => {
    setCurrentTime(newPosition[0]);
  };
  
  const addCuePoint = () => {
    if (cuePoints.length >= 5) return;
    
    const newId = `cue-${Date.now()}`;
    setCuePoints([...cuePoints, { 
      id: newId, 
      time: currentTime, 
      label: `Cue ${cuePoints.length + 1}`, 
      type: 'custom' 
    }]);
  };

  if (!track) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Stem Visualizer</span>
          <div className="text-sm font-normal flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            <span>{formatTime(currentTime)}</span>
            <span className="mx-1">/</span>
            <span>{track.duration}</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Waveform and timeline */}
        <div className="relative h-32 bg-secondary/20 rounded-md">
          {/* Stem layers */}
          {stems.map((stem, index) => (
            <div 
              key={stem.id}
              className={`absolute w-full h-8 bottom-0 transition-opacity duration-300`}
              style={{
                height: `${100 / stems.length}%`,
                bottom: `${(index / stems.length) * 100}%`,
                backgroundColor: stem.color,
                opacity: activeStems.includes(stem.id) ? 0.5 : 0.1,
              }}
            />
          ))}
          
          {/* Cue points */}
          {cuePoints.map(cue => (
            <div
              key={cue.id}
              className="absolute top-0 h-full w-0.5 bg-white z-10"
              style={{
                left: `${(cue.time / duration) * 100}%`,
              }}
            >
              <div className="absolute -top-6 -translate-x-1/2 text-xs px-1 py-0.5 bg-primary text-primary-foreground rounded">
                {cue.label}
              </div>
            </div>
          ))}
          
          {/* Playhead */}
          <div 
            className="absolute top-0 h-full w-0.5 bg-primary z-20" 
            style={{ left: `${(currentTime / duration) * 100}%` }}
          />
          
          {/* Time markers */}
          <div className="absolute bottom-0 w-full flex justify-between text-xs text-muted-foreground px-2">
            <span>00:00</span>
            <span>{formatTime(duration / 2)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        
        {/* Playback controls */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Slider 
              min={0} 
              max={duration} 
              step={0.1} 
              value={[currentTime]} 
              onValueChange={handleSeek} 
              className="flex-grow"
            />
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button size="icon" variant="outline">
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button size="icon" onClick={onPlayPause}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button size="icon" variant="outline">
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>
            
            <Button size="sm" variant="outline" onClick={addCuePoint} disabled={cuePoints.length >= 5}>
              Add Cue Point
            </Button>
          </div>
        </div>
        
        {/* Stem Controls */}
        <div className="grid grid-cols-2 gap-4">
          {stems.map(stem => (
            <div key={stem.id} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: stem.color }} 
                />
                <Label htmlFor={`stem-${stem.id}`}>{stem.name}</Label>
              </div>
              <Switch
                id={`stem-${stem.id}`}
                checked={activeStems.includes(stem.id)}
                onCheckedChange={() => handleStemToggle(stem.id)}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default StemVisualizer;
