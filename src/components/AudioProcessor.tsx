import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Music, Headphones, FileMusic, Volume2 } from 'lucide-react';
import { Track } from './TrackList';
import { toast } from '@/components/ui/sonner';
import StepDisplay from './StepDisplay';
import { calculateBPM, detectKey } from '@/lib/utils';

interface AudioProcessorProps {
  selectedTrack: Track | null;
  isProcessing: boolean;
  onSeparate: (options: SeparationOptions) => void;
}

export interface SeparationOptions {
  model: string;
  extractVocals: boolean;
  extractBass: boolean;
  extractDrums: boolean;
  extractOther: boolean;
}

export interface AnalysisResult {
  bpm: number;
  key: string;
  loudness: number;
  cuePoints: {
    time: number;
    label: string;
    type: string;
  }[];
}

export default function AudioProcessor({ selectedTrack, isProcessing, onSeparate }: AudioProcessorProps) {
  const [separationOptions, setSeparationOptions] = useState<SeparationOptions>({
    model: 'demucs',
    extractVocals: true,
    extractBass: true,
    extractDrums: true,
    extractOther: true,
  });
  
  const [volume, setVolume] = useState<number[]>([75]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const handleSeparate = () => {
    if (!selectedTrack) {
      toast.error('Please select a track first');
      return;
    }
    
    if (!separationOptions.extractVocals && 
        !separationOptions.extractBass && 
        !separationOptions.extractDrums && 
        !separationOptions.extractOther) {
      toast.error('Please select at least one stem to extract');
      return;
    }
    
    onSeparate(separationOptions);
  };

  const handleAnalyzeTrack = async () => {
    if (!selectedTrack) {
      toast.error('Please select a track first');
      return;
    }
    
    setIsAnalyzing(true);
    toast.info(`Analyzing "${selectedTrack.title}"...`);
    
    // In a real app, this would call a backend API for audio analysis
    // For now, let's simulate the analysis with a delay and random data
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Parse duration from string format like "3:22" to seconds
      const [minutes, seconds] = selectedTrack.duration.split(':').map(Number);
      const duration = minutes * 60 + seconds;
      
      // Generate simulated analysis result
      const result: AnalysisResult = {
        bpm: calculateBPM([]),
        key: detectKey([]),
        loudness: Math.floor(Math.random() * -20) - 3, // Random value between -23 and -3 dB
        cuePoints: [
          { time: 0, label: 'Intro', type: 'intro' },
          { time: Math.floor(duration * 0.2), label: 'Verse 1', type: 'verse' },
          { time: Math.floor(duration * 0.4), label: 'Chorus', type: 'chorus' },
          { time: Math.floor(duration * 0.6), label: 'Verse 2', type: 'verse' },
          { time: Math.floor(duration * 0.8), label: 'Outro', type: 'outro' }
        ]
      };
      
      setAnalysisResult(result);
      toast.success(`Analysis complete for "${selectedTrack.title}"`);
    } catch (error) {
      toast.error('Failed to analyze track');
      console.error('Error analyzing track:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!selectedTrack) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6 text-center py-10">
          <FileMusic className="mx-auto h-16 w-16 text-muted-foreground" />
          <h3 className="text-xl font-medium mt-4">No Track Selected</h3>
          <p className="text-muted-foreground mt-2">Select a track to begin processing</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Headphones className="mr-2 h-5 w-5" />
          Audio Processing
        </CardTitle>
        <CardDescription>
          Separate and analyze "{selectedTrack.title}" by {selectedTrack.artist}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="separate" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="separate">Separate</TabsTrigger>
            <TabsTrigger value="analyze">Analyze</TabsTrigger>
          </TabsList>
          <TabsContent value="separate" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <Label>Separation Model</Label>
                <div className="flex gap-2 mt-2">
                  <Button 
                    variant={separationOptions.model === 'demucs' ? "default" : "outline"}
                    onClick={() => setSeparationOptions({...separationOptions, model: 'demucs'})}
                    className="flex-1"
                  >
                    Demucs
                  </Button>
                  <Button 
                    variant={separationOptions.model === 'htdemucs' ? "default" : "outline"}
                    onClick={() => setSeparationOptions({...separationOptions, model: 'htdemucs'})}
                    className="flex-1"
                  >
                    HTDemucs
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label>Select Stems to Extract</Label>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="vocals" className="flex items-center gap-2">
                    <Music className="h-4 w-4" /> Vocals
                  </Label>
                  <Switch 
                    id="vocals" 
                    checked={separationOptions.extractVocals} 
                    onCheckedChange={(checked) => 
                      setSeparationOptions({...separationOptions, extractVocals: checked})
                    } 
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="bass" className="flex items-center gap-2">
                    <Music className="h-4 w-4" /> Bass
                  </Label>
                  <Switch 
                    id="bass" 
                    checked={separationOptions.extractBass} 
                    onCheckedChange={(checked) => 
                      setSeparationOptions({...separationOptions, extractBass: checked})
                    } 
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="drums" className="flex items-center gap-2">
                    <Music className="h-4 w-4" /> Drums
                  </Label>
                  <Switch 
                    id="drums" 
                    checked={separationOptions.extractDrums} 
                    onCheckedChange={(checked) => 
                      setSeparationOptions({...separationOptions, extractDrums: checked})
                    } 
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="other" className="flex items-center gap-2">
                    <Music className="h-4 w-4" /> Other
                  </Label>
                  <Switch 
                    id="other" 
                    checked={separationOptions.extractOther} 
                    onCheckedChange={(checked) => 
                      setSeparationOptions({...separationOptions, extractOther: checked})
                    } 
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="volume" className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4" /> Playback Volume
                  </Label>
                  <span className="text-sm text-muted-foreground">{volume}%</span>
                </div>
                <Slider
                  id="volume"
                  min={0}
                  max={100}
                  step={1}
                  value={volume}
                  onValueChange={setVolume}
                />
              </div>

              <div className="space-y-2 mt-6">
                <Label>Processing Status</Label>
                <StepDisplay 
                  steps={[
                    { id: 'download', label: 'Download Track', status: 'complete' },
                    { id: 'load', label: 'Load Audio', status: isProcessing ? 'current' : 'pending' },
                    { id: 'separate', label: 'Separate Stems', status: 'pending' },
                    { id: 'export', label: 'Ready for Export', status: 'pending' }
                  ]}
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="analyze" className="mt-4">
            <div className="space-y-4">
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">BPM</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analysisResult?.bpm || 0}</div>
                    <p className="text-xs text-muted-foreground mt-1">Tempo</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Key</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analysisResult?.key || '--'}</div>
                    <p className="text-xs text-muted-foreground mt-1">Musical key</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Loudness</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analysisResult?.loudness || 0} dB</div>
                    <p className="text-xs text-muted-foreground mt-1">Integrated LUFS</p>
                  </CardContent>
                </Card>
              </div>
              
              <Card className="sm:col-span-3">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Frequency Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-32 flex items-end space-x-1">
                    {[...Array(20)].map((_, i) => (
                      <div
                        key={i}
                        className="bg-primary/30 flex-1 rounded-t"
                        style={{ height: `${Math.floor(Math.random() * 100)}%` }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>20Hz</span>
                    <span>20kHz</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Track Arrangement</CardTitle>
                </CardHeader>
                <CardContent>
                  {analysisResult?.cuePoints ? (
                    <div className="relative h-12">
                      <div className="absolute inset-0 bg-secondary/20 rounded-md" />
                      
                      {analysisResult.cuePoints.map((cue, index) => {
                        // Parse duration from string format like "3:22" to seconds
                        const [minutes, seconds] = selectedTrack.duration.split(':').map(Number);
                        const duration = minutes * 60 + seconds;
                        
                        return (
                          <div 
                            key={index}
                            className="absolute top-0 flex flex-col items-center"
                            style={{ 
                              left: `${(cue.time / duration) * 100}%`,
                              transform: 'translateX(-50%)'
                            }}
                          >
                            <div className="h-12 w-0.5 bg-primary" />
                            <div className="text-xs mt-1">{cue.label}</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-4">
                      Run analysis to detect arrangement
                    </div>
                  )}
                </CardContent>
              </Card>

              <Button 
                variant="outline" 
                className="w-full" 
                disabled={isAnalyzing || isProcessing}
                onClick={handleAnalyzeTrack}
              >
                {isAnalyzing ? 'Analyzing...' : 'Run Audio Analysis'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="justify-between pt-0 flex-col sm:flex-row gap-2">
        <Button variant="outline" disabled={isProcessing} className="w-full sm:w-auto">
          Preview Track
        </Button>
        <Button 
          onClick={handleSeparate} 
          disabled={isProcessing} 
          className="w-full sm:w-auto bg-primary hover:bg-primary/90"
        >
          {isProcessing ? 'Processing...' : 'Separate Audio'}
        </Button>
      </CardFooter>
    </Card>
  );
}
