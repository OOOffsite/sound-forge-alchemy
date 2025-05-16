import React from 'react';
import SpotifyInput from './SpotifyInput';

interface InputPanelProps {
  onFetchPlaylist: (url: string) => void;
  isLoading: boolean;
}

const InputPanel: React.FC<InputPanelProps> = ({ onFetchPlaylist, isLoading }) => {
  return (
    <div className="sticky top-0 z-20 bg-background border-b border-border p-4 shadow-sm">
      <SpotifyInput onFetchPlaylist={onFetchPlaylist} isLoading={isLoading} />
    </div>
  );
};

export default InputPanel;
