
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
    
    // Check if it's a valid Spotify URL
    if (!playlistUrl.includes('spotify.com/playlist/')) {
      toast.error('Please enter a valid Spotify playlist URL');
      return;
    }
    
    onFetchPlaylist(playlistUrl);
  };

  return (
    <div className="w-full">
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
    </div>
  );
}
