import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '../layouts/MainLayout';
import SpotifyInput from '../components/SpotifyInput';
import TrackList, { Track } from '../components/TrackList';
import AudioProcessor, { SeparationOptions, AnalysisResult } from '../components/AudioProcessor';
import ExportStemsPanel, { ExportOptions } from '../components/ExportStemsPanel';
import StemVisualizer, { StemTrack } from '../components/StemVisualizer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from '../components/ui/sonner';
import { spotifyApi, downloadApi, processingApi, analysisApi } from '../lib/api';
import { useWebSocket } from '../lib/socket';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [separatedStems, setSeparatedStems] = useState<StemTrack[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const { socket, isConnected, subscribe, unsubscribe } = useWebSocket();
  const queryClient = useQueryClient();

  const stemColors = {
    vocals: '#ff7b92',
    bass: '#7b93ff',
    drums: '#ffbb7b',
    other: '#7bffb1'
  };

  const fetchProcessedStems = useCallback(async (trackId: string) => {
    try {
      const response = await processingApi.getTrackStatus(trackId);
      
      if (response.status === 'completed' && response.stems) {
        const stems: StemTrack[] = response.stems.map((stem: { name: string; type: string }) => ({
          id: stem.name,
          type: stem.type,
          name: stem.name,
          active: true,
          color: stemColors[stem.type as keyof typeof stemColors] || stemColors.other
        }));
        
        setSeparatedStems(stems);
      }
    } catch (error) {
      console.error('Error fetching processed stems:', error);
    }
  }, []);

  const fetchAnalysis = useCallback(async (trackId: string) => {
    try {
      const response = await analysisApi.getTrackAnalysis(trackId);
      
      if (response.bpm) {
        setAnalysisResult({
          bpm: response.bpm,
          key: response.key,
          loudness: response.loudness,
          cuePoints: response.cuePoints
        });
      }
    } catch (error) {
      console.error('Error fetching analysis:', error);
    }
  }, []);

  useEffect(() => {
    if (socket && isConnected && selectedTrack) {
      subscribe(selectedTrack.id);

      socket.on('processing:update', (data: { trackId: string; progress: number }) => {
        if (data.trackId === selectedTrack.id) {
          toast.info(`Processing: ${data.progress}%`);
          setIsProcessing(true);
        }
      });

      socket.on('processing:completed', (data: { trackId: string }) => {
        if (data.trackId === selectedTrack.id) {
          toast.success('Processing completed successfully!');
          setIsProcessing(false);
          fetchProcessedStems(selectedTrack.id);
        }
      });

      socket.on('processing:error', (data: { trackId: string; error: string }) => {
        if (data.trackId === selectedTrack.id) {
          toast.error(`Processing error: ${data.error}`);
          setIsProcessing(false);
        }
      });

      socket.on('analysis:completed', (data: { trackId: string }) => {
        if (data.trackId === selectedTrack.id) {
          toast.success('Analysis completed successfully!');
          fetchAnalysis(selectedTrack.id);
        }
      });

      return () => {
        unsubscribe(selectedTrack.id);
        socket.off('processing:update');
        socket.off('processing:completed');
        socket.off('processing:error');
        socket.off('analysis:completed');
      };
    }
  }, [socket, isConnected, selectedTrack, subscribe, unsubscribe, fetchProcessedStems, fetchAnalysis]);

  const fetchPlaylistMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await spotifyApi.fetchPlaylist(url);
      return response;
    },
    onSuccess: (data: { type: string; tracks: Track[] }) => {
      setTracks(data.tracks);
      toast.success(`Successfully fetched ${data.type} with ${data.tracks.length} tracks`);
    },
    onError: (error: { message: string }) => {
      toast.error(`Failed to fetch playlist: ${error.message}`);
      console.error('Error fetching playlist:', error);
    },
    onSettled: () => {
      setIsLoading(false);
    }
  });

  const downloadTrackMutation = useMutation({
    mutationFn: async (track: Track) => {
      const response = await downloadApi.downloadTrack(
        track.id,
        `https://open.spotify.com/track/${track.id}`,
        track
      );
      return response;
    },
    onSuccess: (data: { jobId: string; trackId: string }) => {
      toast.success(`Download job created: ${data.jobId}`);
      pollDownloadStatus(data.jobId, data.trackId);
    },
    onError: (error: { message: string }) => {
      toast.error(`Failed to download track: ${error.message}`);
    }
  });

  const processTrackMutation = useMutation({
    mutationFn: async ({ trackId, options }: { trackId: string; options: SeparationOptions }) => {
      const response = await processingApi.separateTrack(trackId, options);
      return response;
    },
    onSuccess: (data: { jobId: string }) => {
      toast.success(`Processing job created: ${data.jobId}`);
      setIsProcessing(true);
    },
    onError: (error: { message: string }) => {
      toast.error(`Failed to process track: ${error.message}`);
      setIsProcessing(false);
    }
  });

  const analyzeTrackMutation = useMutation({
    mutationFn: async (trackId: string) => {
      const response = await analysisApi.analyzeTrack(trackId);
      return response;
    },
    onSuccess: (data: { jobId: string }) => {
      toast.success(`Analysis job created: ${data.jobId}`);
    },
    onError: (error: { message: string }) => {
      toast.error(`Failed to analyze track: ${error.message}`);
    }
  });

  const pollDownloadStatus = async (jobId: string, trackId: string) => {
    try {
      const response = await downloadApi.getJobStatus(jobId);
      
      if (response.status === 'completed') {
        toast.success(`Download completed: ${response.outputPath}`);
        return;
      } else if (response.status === 'error') {
        toast.error(`Download error: ${response.error}`);
        return;
      }
      
      setTimeout(() => pollDownloadStatus(jobId, trackId), 2000);
    } catch (error) {
      console.error('Error polling download status:', error);
    }
  };

  const handleFetchPlaylist = async (url: string) => {
    setIsLoading(true);
    fetchPlaylistMutation.mutate(url);
  };

  const handleSelectTrack = (track: Track) => {
    setSelectedTrack(track);
    setSeparatedStems([]);
    setAnalysisResult(null);
    
    if (track) {
      fetchProcessedStems(track.id);
      fetchAnalysis(track.id);
    }
  };

  const handleDownloadTrack = (track: Track) => {
    toast.info(`Starting download for "${track.title}" by ${track.artist}...`);
    downloadTrackMutation.mutate(track);
  };

  const handleSeparate = async (options: SeparationOptions) => {
    if (!selectedTrack) {
      toast.error('Please select a track first');
      return;
    }
    
    processTrackMutation.mutate({
      trackId: selectedTrack.id,
      options
    });
  };

  const handleExport = (options: ExportOptions) => {
    setIsExporting(true);
    
    toast.info(`Preparing ${options.stems.length} stems for export in ${options.format.toUpperCase()} format...`);
    
    setTimeout(() => {
      setIsExporting(false);
      toast.success(`${options.stems.length} stems exported successfully!`);
    }, 2000);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      toast.info('Playing audio...');
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-4">Audio Source Separation</h1>
          <p className="text-muted-foreground">
            Enter a Spotify playlist URL to get started. We'll retrieve the tracks and then you can separate them into stems.
          </p>
        </div>
        
        <SpotifyInput onFetchPlaylist={handleFetchPlaylist} isLoading={isLoading} />
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            <TrackList 
              tracks={tracks} 
              onSelectTrack={handleSelectTrack} 
              onDownloadTrack={handleDownloadTrack}
              selectedTrackId={selectedTrack?.id}
              isProcessing={isProcessing}
            />
          </div>
          
          <div className="lg:col-span-3 space-y-6">
            <AudioProcessor 
              selectedTrack={selectedTrack}
              isProcessing={isProcessing}
              onSeparate={handleSeparate}
              analysisResult={analysisResult}
              onAnalyze={(trackId) => analyzeTrackMutation.mutate(trackId)}
            />
            
            {separatedStems.length > 0 && (
              <>
                <StemVisualizer 
                  track={selectedTrack}
                  stems={separatedStems}
                  isPlaying={isPlaying}
                  onPlayPause={handlePlayPause}
                />
                
                <ExportStemsPanel 
                  stems={separatedStems.map(stem => ({
                    id: stem.id,
                    type: stem.type,
                    name: stem.name
                  }))}
                  isExporting={isExporting}
                  onExport={handleExport}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;