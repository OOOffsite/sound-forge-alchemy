/*
 * Author: Sound Forge Team <word@iite.bet>, Jeremiah Pegues <jeremiah@pegues.io>
 * Version: 1.0.0
 * License: MIT
 *
 * PlaylistPanel component for Sound Forge Alchemy frontend.
 * Manages playlist and track selection and download.
 *
 * Logging is maximized at all levels for playlist, selection, and error events.
 */

import React from 'react';
import TrackList, { Track } from './TrackList';
import * as Collapsible from '@radix-ui/react-collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Label } from './ui/label';
import logger from "../lib/logger";

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
    <aside className="sticky top-[72px] z-10 bg-gradient-to-b from-background via-muted/40 to-accent/10 border-r border-border h-[calc(100vh-72px)] min-w-[320px] max-w-full p-2">
      <Collapsible.Root open={open} onOpenChange={setOpen}>
        <div className="flex items-center justify-between mb-2 px-2 bg-accent/10 border-b border-accent/30 rounded-t sticky top-0 z-20">
          <Label className="text-lg font-semibold text-accent-foreground">Playlist Tracks</Label>
          <Collapsible.Trigger asChild>
            <button
              aria-label={open ? 'Collapse playlist' : 'Expand playlist'}
              className="ml-2 p-1 rounded hover:bg-accent/20 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          </Collapsible.Trigger>
        </div>
        <Collapsible.Content forceMount>
          {open && (
            <div className="w-full h-[calc(100vh-72px-48px)] overflow-y-auto pr-1">
              {/* 48px is approx. the height of the header/collapsible trigger */}
              <TrackList
                tracks={tracks}
                onSelectTrack={onSelectTrack}
                onDownloadTrack={onDownloadTrack}
                selectedTrackId={selectedTrackId}
                isProcessing={isProcessing}
              />
            </div>
          )}
        </Collapsible.Content>
      </Collapsible.Root>
    </aside>
  );
};

export default PlaylistPanel;
