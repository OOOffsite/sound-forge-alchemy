import React, { useEffect, useRef, useState, useCallback } from 'react';
// import { useTheme } from '../../hooks/useTheme';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { Toggle } from '../ui/toggle';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { WebMidi } from 'webmidi';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions';
import { formatTime } from '../../lib/utils';

export interface Stem {
  id: string;
  name: string;
  type: 'vocals' | 'drums' | 'bass' | 'other';
  url: string;
  color: string;
}

export interface Loop {
  id: string;
  name: string;
  start: number;
  end: number;
  stems: string[]; // IDs of included stems
}

export interface CuePoint {
  id: string;
  time: number;
  label: string;
  type: 'drop' | 'breakdown' | 'intro' | 'outro' | 'custom';
  color: string;
}

export interface ArrangementSection {
  id: string;
  start: number;
  end: number;
  type: 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro' | 'custom';
  color: string;
  label: string;
}

interface StemViewerProps {
  trackId: string;
  trackName: string;
  bpm: number;
  stems: Stem[];
  loops?: Loop[];
  cuePoints?: CuePoint[];
  arrangement?: ArrangementSection[];
  onSaveLoop?: (loop: Loop) => void;
  onAddCuePoint?: (cuePoint: CuePoint) => void;
  onExportStems?: (stems: Stem[]) => void;
}

const stemTypeColors = {
  vocals: '#FF5E5B',
  drums: '#4464AD',
  bass: '#7E6551',
  other: '#53B175'
};

// Reusable component for rendering individual stems
const StemRow = ({ stem, onSolo, onMute }: { stem: Stem; onSolo: (id: string) => void; onMute: (id: string) => void }) => (
  <div key={stem.id} className="stem-row mb-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div 
          className="w-3 h-3 rounded-full" 
          style={{ backgroundColor: stem.color }}
        />
        <span>{stem.name}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onSolo(stem.id)}>
          Solo
        </Button>
        <Button variant="outline" size="sm" onClick={() => onMute(stem.id)}>
          Mute
        </Button>
      </div>
    </div>
  </div>
);

const StemViewer: React.FC<StemViewerProps> = ({
  trackId,
  trackName,
  bpm,
  stems,
  loops = [],
  cuePoints = [],
  arrangement = [],
  onSaveLoop,
  onAddCuePoint,
  onExportStems
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRefs = useRef<{ [key: string]: WaveSurfer }>({});
  const [activeMIDIDevice, setActiveMIDIDevice] = useState<string | null>(null);
  const [midiDevices, setMidiDevices] = useState<string[]>([]);
  const [selectedStems, setSelectedStems] = useState<string[]>(stems.map(stem => stem.id));
  const [soloedStems, setSoloedStems] = useState<string[]>([]);
  const [mutedStems, setMutedStems] = useState<string[]>([]);
  const [volumes, setVolumes] = useState<{ [key: string]: number }>(
    Object.fromEntries(stems.map(stem => [stem.id, 1]))
  );
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loopActive, setLoopActive] = useState(false);
  const [currentLoop, setCurrentLoop] = useState<Loop | null>(null);
  const [loopStart, setLoopStart] = useState(0);
  const [loopEnd, setLoopEnd] = useState(0);
  const [showArrangement, setShowArrangement] = useState(true);
  const [showCuePoints, setShowCuePoints] = useState(true);

  const handleMIDIControlChange = (cc: number, value: number) => {
    // Convert MIDI value (0-127) to range 0-1
    const normalizedValue = value / 127;
    
    // Map CC numbers to functions
    switch (cc) {
      case 1: // CC#1 - Main volume
        setMasterVolume(normalizedValue);
        break;
      case 2: // CC#2 - First stem volume
        if (stems.length > 0) {
          updateStemVolume(stems[0].id, normalizedValue);
        }
        break;
      // Add more CC mappings as needed
    }
  };

  const handleMIDINoteOn = (note: number, velocity: number) => {
    // Map MIDI notes to functions
    switch (note) {
      case 36: // C1
        togglePlayPause();
        break;
      case 37: // C#1
        stopPlayback();
        break;
      case 38: // D1
        toggleLoopActive();
        break;
      // Add more note mappings as needed
    }
  };

  // Initialize Web MIDI API
  const initMIDI = useCallback(async () => {
    if (typeof navigator.requestMIDIAccess === 'function') {
      try {
        // Enable WebMidi
        await WebMidi.enable();
        
        // Get list of available MIDI inputs
        const inputNames = WebMidi.inputs.map(input => input.name);
        setMidiDevices(inputNames);
        
        // Set up event listeners for all inputs
        WebMidi.inputs.forEach(input => {
          // Note on events
          input.addListener('noteon', e => {
            handleMIDINoteOn(e.note.number, e.note.attack);
          });
          
          // Control change events
          input.addListener('controlchange', e => {
            handleMIDIControlChange(e.controller.number as number, e.value as number);
          });
        });
        
        console.log('MIDI enabled successfully!');
      } catch (err) {
        console.error('Failed to enable MIDI:', err);
      }
    } else {
      console.warn('Web MIDI API is not supported in this browser');
    }
  }, [handleMIDIControlChange, handleMIDINoteOn]);

  // Initialize WaveSurfer instances for each stem
  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize MIDI
    initMIDI();

    // Create a wavesurfer instance for each stem
    stems.forEach(stem => {
      const waveContainer = document.createElement('div');
      waveContainer.id = `waveform-${stem.id}`;
      waveContainer.className = 'waveform-container';
      containerRef.current?.appendChild(waveContainer);

      const wavesurfer = WaveSurfer.create({
        container: `#waveform-${stem.id}`,
        waveColor: stem.color || stemTypeColors[stem.type],
        progressColor: '#2D91EF',
        height: 80,
        normalize: true,
        minPxPerSec: 50,
        plugins: [
          new RegionsPlugin({
            regions: [
              // Add regions for arrangement sections
              ...(arrangement || []).map(section => ({
                id: section.id,
                start: section.start,
                end: section.end,
                color: `${section.color}33`, // Add transparency
                resize: false
              })),
              // Add regions for existing loops
              ...(loops || []).map(loop => ({
                id: loop.id,
                start: loop.start,
                end: loop.end,
                color: '#00FF0033',
                resize: false
              }))
            ]
          })
        ]
      });

      // Load the audio
      wavesurfer.load(stem.url);

      // Store the instance in the refs object
      wavesurferRefs.current[stem.id] = wavesurfer;

      // Add event listeners
      wavesurfer.on('ready', () => {
        // Set initial volume
        wavesurfer.setVolume(volumes[stem.id]);
        // Set duration once the first stem is loaded
        if (Object.keys(wavesurferRefs.current).length === 1) {
          setDuration(wavesurfer.getDuration());
        }
      });

      wavesurfer.on('audioprocess', (time) => {
        setCurrentTime(time);
        
        // Handle loop functionality
        if (loopActive && currentLoop) {
          if (time >= currentLoop.end) {
            // Jump back to loop start
            Object.values(wavesurferRefs.current).forEach(ws => {
              ws.seekTo(currentLoop.start / duration);
            });
          }
        }
      });
    });

    // Sync wavesurfer instances
    const primaryWavesurfer = Object.values(wavesurferRefs.current)[0];
    if (primaryWavesurfer) {
      primaryWavesurfer.on('seek', (progress: number) => {
        Object.values(wavesurferRefs.current).forEach(ws => {
          if (ws !== primaryWavesurfer) {
            ws.seekTo(progress);
          }
        });
      });
    }

    // Cleanup function
    return () => {
      Object.values(wavesurferRefs.current).forEach(wavesurfer => {
        wavesurfer.destroy();
      });
      wavesurferRefs.current = {};
    };
  }, [stems, arrangement, currentLoop, duration, initMIDI, loopActive, loops, volumes]);

  // Control playback
  const togglePlayPause = () => {
    Object.values(wavesurferRefs.current).forEach(wavesurfer => {
      wavesurfer.playPause();
    });
    setPlaying(!playing);
  };

  const stopPlayback = () => {
    Object.values(wavesurferRefs.current).forEach(wavesurfer => {
      wavesurfer.stop();
    });
    setPlaying(false);
  };

  // Set master volume
  const setMasterVolume = (value: number) => {
    Object.values(wavesurferRefs.current).forEach(wavesurfer => {
      wavesurfer.setVolume(value);
    });
  };

  // Update volume for a specific stem
  const updateStemVolume = (stemId: string, value: number) => {
    if (wavesurferRefs.current[stemId]) {
      wavesurferRefs.current[stemId].setVolume(value);
      setVolumes(prev => ({ ...prev, [stemId]: value }));
    }
  };

  // Toggle stem selection for loops
  const toggleStemSelection = (stemId: string) => {
    setSelectedStems(prev => 
      prev.includes(stemId) 
        ? prev.filter(id => id !== stemId) 
        : [...prev, stemId]
    );
  };

  // Toggle solo for a stem
  const toggleSolo = (stemId: string) => {
    // If already soloed, un-solo it
    if (soloedStems.includes(stemId)) {
      setSoloedStems(prev => prev.filter(id => id !== stemId));
    } else {
      // Solo this stem
      setSoloedStems([stemId]);
    }
    
    // Update wavesurfer instances
    Object.entries(wavesurferRefs.current).forEach(([id, wavesurfer]) => {
      const isSoloed = soloedStems.includes(stemId) ? id === stemId : true;
      wavesurfer.setMuted(!isSoloed);
    });
  };

  // Toggle mute for a stem
  const toggleMute = (stemId: string) => {
    const newMutedStems = mutedStems.includes(stemId)
      ? mutedStems.filter(id => id !== stemId)
      : [...mutedStems, stemId];
    
    setMutedStems(newMutedStems);
    
    // Update wavesurfer instance
    if (wavesurferRefs.current[stemId]) {
      wavesurferRefs.current[stemId].setMuted(newMutedStems.includes(stemId));
    }
  };

  // Set loop points
  const setLoopPoints = () => {
    // Create a new loop based on current selection
    const newLoop: Loop = {
      id: `loop-${Date.now()}`,
      name: `Loop ${loops.length + 1}`,
      start: loopStart,
      end: loopEnd,
      stems: selectedStems
    };
    
    setCurrentLoop(newLoop);
    
    // Call the save callback if provided
    if (onSaveLoop) {
      onSaveLoop(newLoop);
    }
  };

  // Toggle loop active state
  const toggleLoopActive = () => {
    setLoopActive(!loopActive);
  };

  // Add a cue point at current position
  const addCuePoint = (type: CuePoint['type'] = 'custom') => {
    const newCuePoint: CuePoint = {
      id: `cue-${Date.now()}`,
      time: currentTime,
      label: `Cue ${cuePoints.length + 1}`,
      type,
      color: type === 'drop' ? '#FF0000' : type === 'breakdown' ? '#00FF00' : '#0000FF'
    };
    
    if (onAddCuePoint) {
      onAddCuePoint(newCuePoint);
    }
  };

  // Export selected stems
  const exportSelectedStems = () => {
    if (onExportStems) {
      const stemsToExport = stems.filter(stem => selectedStems.includes(stem.id));
      onExportStems(stemsToExport);
    }
  };

  return (
    <div className="stem-viewer">
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">{trackName}</h2>
              <div className="text-sm text-muted-foreground">{bpm} BPM</div>
            </div>
            <div className="flex gap-2">
              <Button onClick={togglePlayPause}>
                {playing ? 'Pause' : 'Play'}
              </Button>
              <Button variant="outline" onClick={stopPlayback}>
                Stop
              </Button>
              <Button 
                variant={loopActive ? "default" : "outline"} 
                onClick={toggleLoopActive}
              >
                Loop
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Time display */}
          <div className="flex justify-between mb-2">
            <div>{formatTime(currentTime)}</div>
            <div>{formatTime(duration)}</div>
          </div>
          
          {/* MIDI controls */}
          <div className="flex items-center gap-2 mb-4">
            <label className="text-sm">MIDI Device:</label>
            <Select value={activeMIDIDevice || ''} onValueChange={setActiveMIDIDevice}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select MIDI device" />
              </SelectTrigger>
              <SelectContent>
                {midiDevices.map(device => (
                  <SelectItem key={device} value={device}>{device}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Toggle buttons for arrangement and cue points */}
          <div className="flex gap-2 mb-4">
            <Toggle 
              pressed={showArrangement} 
              onPressedChange={setShowArrangement}
            >
              Show Arrangement
            </Toggle>
            <Toggle 
              pressed={showCuePoints} 
              onPressedChange={setShowCuePoints}
            >
              Show Cue Points
            </Toggle>
          </div>
          
          {/* Stem controls and waveforms */}
          <div className="stems-container">
            {stems.map(stem => (
              <StemRow 
                key={stem.id}
                stem={stem}
                onSolo={(id) => setSoloedStems([id])}
                onMute={(id) => setMutedStems([...mutedStems, id])}
              />
            ))}
          </div>
          
          {/* Waveform container */}
          <div ref={containerRef} className="waveforms-container mt-4"></div>
          
          {/* Loop controls */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Loop Creator</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <div>
                  <label className="text-sm">Start</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={duration}
                      step={0.1}
                      value={loopStart}
                      onChange={(e) => setLoopStart(parseFloat(e.target.value))}
                      className="w-20 p-1 border rounded"
                    />
                    <Button size="sm" onClick={() => setLoopStart(currentTime)}>
                      Set to Current
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm">End</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={duration}
                      step={0.1}
                      value={loopEnd}
                      onChange={(e) => setLoopEnd(parseFloat(e.target.value))}
                      className="w-20 p-1 border rounded"
                    />
                    <Button size="sm" onClick={() => setLoopEnd(currentTime)}>
                      Set to Current
                    </Button>
                  </div>
                </div>
              </div>
              
              <Button onClick={setLoopPoints}>
                Create Loop
              </Button>
            </CardContent>
          </Card>
          
          {/* Export controls */}
          <div className="mt-4">
            <Button onClick={exportSelectedStems}>
              Export Selected Stems
            </Button>
            <Button variant="outline" className="ml-2" onClick={() => addCuePoint()}>
              Add Cue Point
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StemViewer;