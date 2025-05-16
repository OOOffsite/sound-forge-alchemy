import React from 'react';
import TrackList, { Track } from './TrackList';
import * as Collapsible from '@radix-ui/react-collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Label } from './ui/label';

interface PlaylistPanelProps {
  tracks: Track[];
  onSelectTrack: (track: Track) => void;
  onDownloadTrack: (track: Track) => void;
  selectedTrackId?: string;
  isProcessing: boolean;
}

const PlaylistPanel: React.FC<PlaylistPanelProps> = ({ tracks, onSelectTrack, onDownloadTrack, selectedTrackId, isProcessing }) => {
  const [open, setOpen] = React.useState(true);
  return (
    <aside className="sticky top-[72px] z-10 bg-background border-r border-border h-[calc(100vh-72px)] overflow-y-auto p-2 min-w-[320px] max-w-[400px]">
      <Collapsible.Root open={open} onOpenChange={setOpen}>
        <div className="flex items-center justify-between mb-2 px-2">
          <Label className="text-lg font-semibold">Playlist Tracks</Label>
          <Collapsible.Trigger asChild>
            <button
              aria-label={open ? 'Collapse playlist' : 'Expand playlist'}
              className="ml-2 p-1 rounded hover:bg-accent/30 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          </Collapsible.Trigger>
        </div>
        <Collapsible.Content forceMount>
          {open && (
            <TrackList
              tracks={tracks}
              onSelectTrack={onSelectTrack}
              onDownloadTrack={onDownloadTrack}
              selectedTrackId={selectedTrackId}
              isProcessing={isProcessing}
            />
          )}
        </Collapsible.Content>
      </Collapsible.Root>
    </aside>
  );
};

export default PlaylistPanel;
