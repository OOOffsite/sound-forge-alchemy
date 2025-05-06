
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from '@/components/ui/sonner';

interface SpotifyInputProps {
  onFetchPlaylist: (url: string) => void;
  isLoading: boolean;
}

export default function SpotifyInput({ onFetchPlaylist, isLoading }: SpotifyInputProps) {
  const [playlistUrl, setPlaylistUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!playlistUrl.trim()) {
      toast.error('Please enter a Spotify playlist URL');
      return;
    }
    
    // More comprehensive URL validation
    const spotifyRegex = /^(https?:\/\/)?(open\.)?spotify\.com\/(playlist|album|track)\/([a-zA-Z0-9]+)(.*)$/;
    if (!spotifyRegex.test(playlistUrl)) {
      toast.error('Please enter a valid Spotify URL (playlist, album, or track)');
      return;
    }

    // Extract cleaned URL to pass to the handler
    const match = playlistUrl.match(spotifyRegex);
    if (match) {
      const type = match[3]; // playlist, album, or track
      const id = match[4]; // the actual ID
      
      toast.info(`Fetching ${type}: ${id}`);
      onFetchPlaylist(playlistUrl);
    }
  };

  // Example URLs to help users
  const handleExampleClick = () => {
    setPlaylistUrl('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M');
    toast.info('Example playlist URL added. Click "Fetch Playlist" to load it.');
  };

  return (
    <div className="w-full space-y-2">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <Input
          type="text"
          placeholder="Enter Spotify playlist URL"
          value={playlistUrl}
          onChange={(e) => setPlaylistUrl(e.target.value)}
          className="flex-grow border-secondary"
          disabled={isLoading}
        />
        <Button 
          type="submit" 
          disabled={isLoading}
          className="bg-primary hover:bg-primary/90 text-white"
        >
          {isLoading ? 'Loading...' : 'Fetch Playlist'}
        </Button>
      </form>
      <div className="text-xs text-muted-foreground">
        <button 
          type="button" 
          onClick={handleExampleClick}
          className="underline text-primary hover:text-primary/90"
        >
          Use example
        </button>
        <span> • Accepts Spotify playlist, album, or track URLs</span>
      </div>
    </div>
  );
}
