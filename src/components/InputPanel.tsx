import React from 'react';
import SpotifyInput from './SpotifyInput';
import * as Collapsible from '@radix-ui/react-collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Label } from './ui/label';

interface InputPanelProps {
  onFetchPlaylist: (url: string) => void;
  isLoading: boolean;
}

const InputPanel: React.FC<InputPanelProps> = ({ onFetchPlaylist, isLoading }) => {
  const [open, setOpen] = React.useState(true);
  return (
    <section
      className="sticky top-0 z-20 bg-background border-b border-border p-4 shadow-sm"
      role="region"
      aria-label="Spotify input panel"
    >
      <Collapsible.Root open={open} onOpenChange={setOpen}>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-lg font-semibold">Playlist Input</Label>
          <Collapsible.Trigger asChild>
            <button
              aria-label={open ? 'Collapse input' : 'Expand input'}
              className="ml-2 p-1 rounded hover:bg-accent/30 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          </Collapsible.Trigger>
        </div>
        <Collapsible.Content forceMount>
          {open && <SpotifyInput onFetchPlaylist={onFetchPlaylist} isLoading={isLoading} />}
        </Collapsible.Content>
      </Collapsible.Root>
    </section>
  );
};

export default InputPanel;
