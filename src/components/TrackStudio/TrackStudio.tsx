import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import StemViewer, { Stem, Loop, CuePoint, ArrangementSection } from '../StemViewer/StemViewer';
import ArrangementDetector from '../ArrangementDetector/ArrangementDetector';

interface Track {
  id: string;
  name: string;
  artist: string;
  album: string;
  coverUrl: string;
  bpm: number;
  key: string;
  duration: number;
  audioUrl: string;
  stems: Stem[];
}

const TrackStudio: React.FC = () => {
  const { trackId } = useParams<{ trackId: string }>();
  const [track, setTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [loops, setLoops] = useState<Loop[]>([]);
  const [cuePoints, setCuePoints] = useState<CuePoint[]>([]);
  const [arrangement, setArrangement] = useState<ArrangementSection[]>([]);
  const [activeTab, setActiveTab] = useState<string>('stems');

  // Load track data
  useEffect(() => {
    if (!trackId) return;

    const fetchTrack = async () => {
      setLoading(true);
      try {
        // Fetch track data from API
        const response = await fetch(`/api/tracks/${trackId}`);
        if (!response.ok) {
          throw new Error('Failed to load track data');
        }
        
        const trackData = await response.json();
        setTrack(trackData);
        
        // Load additional data
        await Promise.all([
          fetchLoops(),
          fetchCuePoints(),
          fetchArrangement()
        ]);
      } catch (err) {
        console.error('Error loading track:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    const fetchLoops = async () => {
      try {
        const response = await fetch(`/api/tracks/${trackId}/loops`);
        if (response.ok) {
          const data = await response.json();
          setLoops(data.loops);
        }
      } catch (err) {
        console.error('Error fetching loops:', err);
      }
    };

    const fetchCuePoints = async () => {
      try {
        const response = await fetch(`/api/tracks/${trackId}/cue-points`);
        if (response.ok) {
          const data = await response.json();
          setCuePoints(data.cuePoints);
        }
      } catch (err) {
        console.error('Error fetching cue points:', err);
      }
    };

    const fetchArrangement = async () => {
      try {
        const response = await fetch(`/api/tracks/${trackId}/arrangement`);
        if (response.ok) {
          const data = await response.json();
          setArrangement(data.arrangement);
        }
      } catch (err) {
        console.error('Error fetching arrangement:', err);
      }
    };

    fetchTrack();
  }, [trackId]);

  // Handle saving a new loop
  const handleSaveLoop = async (loop: Loop) => {
    try {
      const response = await fetch(`/api/tracks/${trackId}/loops`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loop),
      });
      
      if (response.ok) {
        const savedLoop = await response.json();
        setLoops(prevLoops => [...prevLoops, savedLoop]);
      }
    } catch (err) {
      console.error('Error saving loop:', err);
    }
  };

  // Handle adding a new cue point
  const handleAddCuePoint = async (cuePoint: CuePoint) => {
    try {
      const response = await fetch(`/api/tracks/${trackId}/cue-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cuePoint),
      });
      
      if (response.ok) {
        const savedCuePoint = await response.json();
        setCuePoints(prevCuePoints => [...prevCuePoints, savedCuePoint]);
      }
    } catch (err) {
      console.error('Error adding cue point:', err);
    }
  };

  // Handle updating arrangement
  const handleArrangementDetected = (newArrangement: ArrangementSection[]) => {
    setArrangement(newArrangement);
    
    // Save arrangement to API
    saveArrangement(newArrangement);
  };

  // Save arrangement to API
  const saveArrangement = async (newArrangement: ArrangementSection[]) => {
    try {
      await fetch(`/api/tracks/${trackId}/arrangement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ arrangement: newArrangement }),
      });
    } catch (err) {
      console.error('Error saving arrangement:', err);
    }
  };

  // Handle saving arrangement template
  const handleSaveArrangementTemplate = async (name: string, templateArrangement: ArrangementSection[]) => {
    try {
      await fetch('/api/arrangement-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          arrangement: templateArrangement
        }),
      });
    } catch (err) {
      console.error('Error saving arrangement template:', err);
    }
  };

  // Handle exporting stems
  const handleExportStems = async (stemsToExport: Stem[]) => {
    try {
      // Call the backend API to export stems
      const response = await fetch(`/api/tracks/${trackId}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stems: stemsToExport.map(s => s.id)
        }),
      });
      
      if (response.ok) {
        const { exportUrl } = await response.json();
        
        // Create download link
        const a = document.createElement('a');
        a.href = exportUrl;
        a.download = `${track?.name || 'track'}_stems.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Error exporting stems:', err);
    }
  };

  if (loading) {
    return <div className="p-4">Loading track...</div>;
  }

  if (error || !track) {
    return <div className="p-4 text-red-500">Error: {error || 'Failed to load track'}</div>;
  }

  return (
    <div className="track-studio p-4">
      <div className="mb-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src={track.coverUrl} 
                alt={`${track.name} cover`}
                className="w-16 h-16 rounded"
              />
              <div>
                <CardTitle>{track.name}</CardTitle>
                <div className="text-md text-muted-foreground">{track.artist}</div>
                <div className="flex gap-2 mt-1">
                  <Badge>{track.bpm} BPM</Badge>
                  <Badge variant="outline">{track.key}</Badge>
                  <Badge variant="secondary">{Math.floor(track.duration / 60)}:{Math.floor(track.duration % 60).toString().padStart(2, '0')}</Badge>
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={() => window.history.back()}>
              Back to Library
            </Button>
          </CardHeader>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="stems">Stem Editor</TabsTrigger>
          <TabsTrigger value="arrangement">Arrangement</TabsTrigger>
          <TabsTrigger value="loops">
            Loops 
            <Badge variant="secondary" className="ml-2">{loops.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="cuepoints">
            Cue Points
            <Badge variant="secondary" className="ml-2">{cuePoints.length}</Badge>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="stems">
          <StemViewer
            trackId={track.id}
            trackName={track.name}
            bpm={track.bpm}
            stems={track.stems}
            loops={loops}
            cuePoints={cuePoints}
            arrangement={arrangement}
            onSaveLoop={handleSaveLoop}
            onAddCuePoint={handleAddCuePoint}
            onExportStems={handleExportStems}
          />
        </TabsContent>
        
        <TabsContent value="arrangement">
          <ArrangementDetector
            trackId={track.id}
            audioUrl={track.audioUrl}
            bpm={track.bpm}
            duration={track.duration}
            onArrangementDetected={handleArrangementDetected}
            onSaveArrangementTemplate={handleSaveArrangementTemplate}
          />
        </TabsContent>
        
        <TabsContent value="loops">
          <Card>
            <CardHeader>
              <CardTitle>Loop Library</CardTitle>
            </CardHeader>
            <CardContent>
              {loops.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {loops.map(loop => (
                    <Card key={loop.id}>
                      <CardHeader>
                        <CardTitle className="text-lg">{loop.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="mb-2">
                          <span className="text-sm text-muted-foreground">
                            {formatTime(loop.start)} - {formatTime(loop.end)}
                          </span>
                        </div>
                        <div className="mb-4">
                          <span className="text-sm font-medium">Included stems:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {loop.stems.map(stemId => {
                              const stem = track.stems.find(s => s.id === stemId);
                              return stem ? (
                                <Badge 
                                  key={stemId}
                                  style={{ 
                                    backgroundColor: stem.color || '#808080',
                                    color: 'white'
                                  }}
                                >
                                  {stem.name}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm">Play</Button>
                          <Button size="sm" variant="outline">Export</Button>
                          <Button size="sm" variant="destructive">Delete</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No loops created yet.</p>
                  <p className="mt-2">Use the Stem Editor to create loops from this track.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="cuepoints">
          <Card>
            <CardHeader>
              <CardTitle>Cue Points</CardTitle>
            </CardHeader>
            <CardContent>
              {cuePoints.length > 0 ? (
                <div className="space-y-2">
                  {cuePoints.map(cuePoint => (
                    <div 
                      key={cuePoint.id}
                      className="flex items-center justify-between p-2 border rounded hover:bg-accent/50"
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: cuePoint.color }}
                        />
                        <span>{cuePoint.label}</span>
                        <Badge variant="outline">
                          {cuePoint.type}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatTime(cuePoint.time)}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">Jump To</Button>
                        <Button size="sm" variant="destructive">Delete</Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No cue points added yet.</p>
                  <p className="mt-2">Use the Stem Editor to add cue points to this track.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Helper function to format time in MM:SS format
const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export default TrackStudio;