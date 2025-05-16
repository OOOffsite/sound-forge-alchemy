import React from 'react';
import SpotifyInput from './SpotifyInput';

interface InputPanelProps {
  onFetchPlaylist: (url: string) => void;
  isLoading: boolean;
}

const InputPanel: React.FC<InputPanelProps> = ({ onFetchPlaylist, isLoading }) => {
  return (
    <section
      className="sticky top-0 z-20 bg-background border-b border-border p-4 shadow-sm"
      role="region"
      aria-label="Spotify input panel"
    >
      <SpotifyInput onFetchPlaylist={onFetchPlaylist} isLoading={isLoading} />
    </section>
  );
};

export default InputPanel;
