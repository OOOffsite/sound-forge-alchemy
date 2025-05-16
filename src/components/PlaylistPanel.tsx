import React from 'react';
import TrackList, { Track } from './TrackList';

interface PlaylistPanelProps {
  tracks: Track[];
  onSelectTrack: (track: Track) => void;
  onDownloadTrack: (track: Track) => void;
  selectedTrackId?: string;
  isProcessing: boolean;
}

const PlaylistPanel: React.FC<PlaylistPanelProps> = ({ tracks, onSelectTrack, onDownloadTrack, selectedTrackId, isProcessing }) => {
  return (
    <div className="sticky top-[72px] z-10 bg-background border-r border-border h-[calc(100vh-72px)] overflow-y-auto p-2 min-w-[320px] max-w-[400px]">
      <TrackList
        tracks={tracks}
        onSelectTrack={onSelectTrack}
        onDownloadTrack={onDownloadTrack}
        selectedTrackId={selectedTrackId}
        isProcessing={isProcessing}
      />
    </div>
  );
};

export default PlaylistPanel;
