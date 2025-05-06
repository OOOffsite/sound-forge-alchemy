
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Download, FileMusic } from 'lucide-react';
import TrackWaveform from './TrackWaveform';

export interface Track {
  id: string;
  title: string;
  artist: string;
  albumArt?: string;
  duration: string;
}

interface TrackListProps {
  tracks: Track[];
  onSelectTrack: (track: Track) => void;
  onDownloadTrack: (track: Track) => void;
  selectedTrackId?: string;
  isProcessing: boolean;
}

export default function TrackList({
  tracks,
  onSelectTrack,
  onDownloadTrack,
  selectedTrackId,
  isProcessing
}: TrackListProps) {
  if (!tracks.length) {
    return (
      <div className="mt-8 text-center py-12">
        <FileMusic className="mx-auto h-16 w-16 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">No tracks found</h2>
        <p className="mt-2 text-muted-foreground">Enter a Spotify playlist URL to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-6">
      <h2 className="text-2xl font-bold">Playlist Tracks</h2>
      <div className="grid gap-4">
        {tracks.map((track) => (
          <Card key={track.id} className={`overflow-hidden ${selectedTrackId === track.id ? 'border-primary' : ''}`}>
            <CardContent className="p-0">
              <div className="flex items-center p-4">
                <div className="w-12 h-12 mr-4 flex-shrink-0 bg-secondary flex items-center justify-center rounded overflow-hidden">
                  {track.albumArt ? (
                    <img src={track.albumArt} alt={`${track.title} album art`} className="w-full h-full object-cover" />
                  ) : (
                    <FileMusic className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-grow min-w-0">
                  <h3 className="font-medium truncate">{track.title}</h3>
                  <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
                  {selectedTrackId === track.id && (
                    <div className="mt-2">
                      <TrackWaveform />
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0 ml-4 flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onSelectTrack(track)}
                    disabled={isProcessing}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Select</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDownloadTrack(track)}
                    disabled={isProcessing}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Download</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
