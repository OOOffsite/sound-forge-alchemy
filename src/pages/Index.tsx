import React, { useState, useEffect } from 'react';
import MainLayout from '@/layouts/MainLayout';
import SpotifyInput from '@/components/SpotifyInput';
import TrackList, { Track } from '@/components/TrackList';
import AudioProcessor, { SeparationOptions, AnalysisResult } from '@/components/AudioProcessor';
import ExportStemsPanel, { ExportOptions } from '@/components/ExportStemsPanel';
import StemVisualizer, { StemTrack } from '@/components/StemVisualizer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/sonner';
import { spotifyApi, downloadApi, processingApi, analysisApi } from '@/lib/api';
import { useWebSocket } from '@/lib/socket';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

  // Set up WebSocket listeners
  useEffect(() => {
    if (socket && isConnected && selectedTrack) {
      // Subscribe to events for the selected track
      subscribe(selectedTrack.id);

      // Processing events
      socket.on('processing:update', (data) => {
        if (data.trackId === selectedTrack.id) {
          toast.info(`Processing: ${data.progress}%`);
          // Update processing status in the UI
          setIsProcessing(true);
        }
      });

      socket.on('processing:completed', (data) => {
        if (data.trackId === selectedTrack.id) {
          toast.success('Processing completed successfully!');
          setIsProcessing(false);
          // Refetch the processed stems
          fetchProcessedStems(selectedTrack.id);
        }
      });

      socket.on('processing:error', (data) => {
        if (data.trackId === selectedTrack.id) {
          toast.error(`Processing error: ${data.error}`);
          setIsProcessing(false);
        }
      });

      // Analysis events
      socket.on('analysis:completed', (data) => {
        if (data.trackId === selectedTrack.id) {
          toast.success('Analysis completed successfully!');
          // Refetch the analysis results
          fetchAnalysis(selectedTrack.id);
        }
      });

      // Clean up on unmount or track change
      return () => {
        unsubscribe(selectedTrack.id);
        socket.off('processing:update');
        socket.off('processing:completed');
        socket.off('processing:error');
        socket.off('analysis:completed');
      };
    }
  }, [socket, isConnected, selectedTrack]);

  // Fetch playlist mutation
  const fetchPlaylistMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await spotifyApi.fetchPlaylist(url);
      return response;
    },
    onSuccess: (data) => {
      setTracks(data.tracks);
      toast.success(`Successfully fetched ${data.type} with ${data.tracks.length} tracks`);
    },
    onError: (error: any) => {
      toast.error(`Failed to fetch playlist: ${error.message}`);
      console.error('Error fetching playlist:', error);
    },
    onSettled: () => {
      setIsLoading(false);
    }
  });

  // Download track mutation
  const downloadTrackMutation = useMutation({
    mutationFn: async (track: Track) => {
      const response = await downloadApi.downloadTrack(
        track.id,
        `https://open.spotify.com/track/${track.id}`,
        track
      );
      return response;
    },
    onSuccess: (data) => {
      toast.success(`Download job created: ${data.jobId}`);
      // Start polling for the job status
      pollDownloadStatus(data.jobId, data.trackId);
    },
    onError: (error: any) => {
      toast.error(`Failed to download track: ${error.message}`);
    }
  });

  // Process track mutation
  const processTrackMutation = useMutation({
    mutationFn: async ({ trackId, options }: { trackId: string, options: SeparationOptions }) => {
      const response = await processingApi.separateTrack(trackId, options);
      return response;
    },
    onSuccess: (data) => {
      toast.success(`Processing job created: ${data.jobId}`);
      setIsProcessing(true);
      // WebSocket events will handle updates
    },
    onError: (error: any) => {
      toast.error(`Failed to process track: ${error.message}`);
      setIsProcessing(false);
    }
  });

  // Analyze track mutation
  const analyzeTrackMutation = useMutation({
    mutationFn: async (trackId: string) => {
      const response = await analysisApi.analyzeTrack(trackId);
      return response;
    },
    onSuccess: (data) => {
      toast.success(`Analysis job created: ${data.jobId}`);
      // WebSocket events will handle updates
    },
    onError: (error: any) => {
      toast.error(`Failed to analyze track: ${error.message}`);
    }
  });

  // Poll for download status
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
      
      // Continue polling if not completed or errored
      setTimeout(() => pollDownloadStatus(jobId, trackId), 2000);
    } catch (error) {
      console.error('Error polling download status:', error);
    }
  };

  // Fetch processed stems
  const fetchProcessedStems = async (trackId: string) => {
    try {
      const response = await processingApi.getTrackStatus(trackId);
      
      if (response.status === 'completed' && response.stems) {
        // Convert to StemTrack format
        const stems: StemTrack[] = response.stems.map((stem: any) => ({
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
  };

  // Fetch analysis results
  const fetchAnalysis = async (trackId: string) => {
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
  };

  const handleFetchPlaylist = async (url: string) => {
    setIsLoading(true);
    fetchPlaylistMutation.mutate(url);
  };

  const handleSelectTrack = (track: Track) => {
    setSelectedTrack(track);
    setSeparatedStems([]);
    setAnalysisResult(null);
    
    // Check if this track has already been processed
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
    
    // In a real app, this would generate the export files via the backend
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