
import React, { useState } from 'react';
import MainLayout from '@/layouts/MainLayout';
import SpotifyInput from '@/components/SpotifyInput';
import TrackList, { Track } from '@/components/TrackList';
import AudioProcessor, { SeparationOptions } from '@/components/AudioProcessor';
import ExportStemsPanel, { ExportOptions } from '@/components/ExportStemsPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/sonner';

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [separatedStems, setSeparatedStems] = useState<
    { id: string; type: 'vocals' | 'bass' | 'drums' | 'other'; name: string; }[]
  >([]);

  const handleFetchPlaylist = async (url: string) => {
    setIsLoading(true);
    
    // In a real app, this would call a backend API that uses spotdl
    // For now, let's simulate the API call and return some mock data
    try {
      // Simulating API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock data
      const mockTracks: Track[] = [
        { 
          id: '1', 
          title: 'Blinding Lights', 
          artist: 'The Weeknd',
          albumArt: 'https://i.scdn.co/image/ab67616d0000b273c5649add07ed3720be9d5526',
          duration: '3:22'
        },
        { 
          id: '2', 
          title: 'Save Your Tears', 
          artist: 'The Weeknd',
          albumArt: 'https://i.scdn.co/image/ab67616d0000b273c5649add07ed3720be9d5526', 
          duration: '3:35'
        },
        { 
          id: '3', 
          title: 'Water', 
          artist: 'Tyla',
          albumArt: 'https://i.scdn.co/image/ab67616d0000b273032f804d1080be64a6aa7376',
          duration: '3:49'
        },
        { 
          id: '4', 
          title: 'Dance The Night', 
          artist: 'Dua Lipa',
          albumArt: 'https://i.scdn.co/image/ab67616d0000b273bd9d3094d35bd542be15aa20', 
          duration: '2:57'
        },
        { 
          id: '5', 
          title: 'I Remember Everything', 
          artist: 'Zach Bryan, Kacey Musgraves',
          albumArt: 'https://i.scdn.co/image/ab67616d0000b273a7ee5451c61b93c67516722d', 
          duration: '3:11'
        }
      ];
      
      setTracks(mockTracks);
      toast.success(`Successfully fetched playlist with ${mockTracks.length} tracks`);
    } catch (error) {
      toast.error('Failed to fetch playlist');
      console.error('Error fetching playlist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTrack = (track: Track) => {
    setSelectedTrack(track);
    setSeparatedStems([]);
  };

  const handleDownloadTrack = (track: Track) => {
    // In a real app, this would trigger the download of the audio file
    toast.info(`Downloading "${track.title}" by ${track.artist}...`);
    // Simulate download (would be handled by backend in real implementation)
    setTimeout(() => {
      toast.success(`Downloaded "${track.title}"`);
    }, 2000);
  };

  const handleSeparate = async (options: SeparationOptions) => {
    if (!selectedTrack) return;
    
    setIsProcessing(true);
    
    // In a real app, this would call a backend API with Demucs
    // For now, let's simulate the process and return some mock stems
    try {
      // Simulating processing time
      toast.info(`Starting audio separation for "${selectedTrack.title}"...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Create stems based on selected options
      const stems: { id: string; type: 'vocals' | 'bass' | 'drums' | 'other'; name: string; }[] = [];
      
      if (options.extractVocals) {
        stems.push({ id: '1', type: 'vocals', name: `${selectedTrack.title} - Vocals` });
      }
      if (options.extractBass) {
        stems.push({ id: '2', type: 'bass', name: `${selectedTrack.title} - Bass` });
      }
      if (options.extractDrums) {
        stems.push({ id: '3', type: 'drums', name: `${selectedTrack.title} - Drums` });
      }
      if (options.extractOther) {
        stems.push({ id: '4', type: 'other', name: `${selectedTrack.title} - Other` });
      }
      
      setSeparatedStems(stems);
      toast.success(`Successfully separated "${selectedTrack.title}" into ${stems.length} stems`);
    } catch (error) {
      toast.error('Failed to separate audio');
      console.error('Error separating audio:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = (options: ExportOptions) => {
    setIsExporting(true);
    
    // In a real app, this would generate the export files
    // For now, let's simulate the export process
    toast.info(`Preparing ${options.stems.length} stems for export in ${options.format.toUpperCase()} format...`);
    
    setTimeout(() => {
      setIsExporting(false);
      toast.success(`${options.stems.length} stems exported successfully!`);
    }, 2000);
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
            />
            
            {separatedStems.length > 0 && (
              <ExportStemsPanel 
                stems={separatedStems}
                isExporting={isExporting}
                onExport={handleExport}
              />
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
