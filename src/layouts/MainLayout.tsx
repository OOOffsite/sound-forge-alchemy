import React, { useState } from 'react';
import { Bell, Settings } from 'lucide-react';
import { Terminal, Bell as BellIcon } from 'lucide-react';
import { Toaster } from "../components/ui/toaster";
import { Toaster as Sonner } from "../components/ui/sonner";
import { TooltipProvider } from "../components/ui/tooltip";
import NotificationLog from '../components/ui/NotificationLog.tsx';
import SettingsDropdown from '../components/ui/SettingsDropdown.tsx';
import DebugConsoleOverlay from '../components/ui/DebugConsoleOverlay';
import StickyPlayer from '../components/ui/StickyPlayer';
import OverlayGrid, { OverlayPane } from '../components/ui/OverlayGrid';
import InputPanel from '../components/InputPanel';
import PlaylistPanel from '../components/PlaylistPanel';
import type { Track } from '../components/TrackList';

type MainLayoutProps = {
  children: React.ReactNode;
  currentTrack?: {
    title: string;
    artist: string;
    albumArt?: string;
    duration: string;
    audioUrl?: string;
  };
  isProcessing?: boolean;
  isWorkingWithStems?: boolean;
};

// Reusable component for rendering navigation links
const NavigationLink = ({ href, label }: { href: string; label: string }) => (
  <li>
    <a href={href} className="text-foreground hover:text-primary transition-colors">
      {label}
    </a>
  </li>
);

export default function MainLayout({ children, currentTrack, isProcessing = false, isWorkingWithStems = false }: MainLayoutProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [overlayPanes, setOverlayPanes] = useState<OverlayPane[]>([
    {
      id: 'debug',
      title: 'Debug Console',
      icon: <Terminal className="h-5 w-5 text-primary" />,
      minimized: false,
      content: (
        <DebugConsoleOverlay
          minimized={false}
          onClose={() => handleClosePane('debug')}
          onMinimize={() => handleMinimizePane('debug')}
        />
      ),
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: <BellIcon className="h-5 w-5 text-yellow-500" />,
      minimized: false,
      content: (
        <NotificationLog
          minimized={false}
          onClose={() => handleClosePane('notifications')}
          onMinimize={() => handleMinimizePane('notifications')}
        />
      ),
    },
  ]);

  // Example placeholder data and handlers for demo purposes
  const [tracks, setTracks] = useState<Track[]>([]); // Use Track type
  const [selectedTrackId, setSelectedTrackId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const handleFetchPlaylist = (url: string) => {
    setIsLoading(true);
    // TODO: Fetch playlist and update tracks
    setTimeout(() => {
      setTracks([
        { id: '1', title: 'Track 1', artist: 'Artist 1', duration: '3:45' },
        { id: '2', title: 'Track 2', artist: 'Artist 2', duration: '4:12' },
      ]);
      setIsLoading(false);
    }, 1000);
  };
  const handleSelectTrack = (track: Track) => setSelectedTrackId(track.id);
  const handleDownloadTrack = (track: Track) => {/* TODO */};

  // Helper functions for pane state
  function handleMinimizePane(id: string) {
    setOverlayPanes((panes) => panes.map(p => p.id === id ? { ...p, minimized: true } : p));
  }
  function handleClosePane(id: string) {
    setOverlayPanes((panes) => panes.filter(p => p.id !== id));
  }
  function handleExpandPane(id: string) {
    setOverlayPanes((panes) => panes.map(p => p.id === id ? { ...p, minimized: false } : p));
  }
  function handleUpdatePane(id: string, updates: Partial<OverlayPane>) {
    setOverlayPanes((panes) => panes.map(p => p.id === id ? { ...p, ...updates } : p));
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <header className="border-b border-border">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
              SoundForge
            </h1>
            <nav className="flex items-center gap-4">
              <ul className="flex gap-4">
                <NavigationLink href="/" label="Home" />
                <NavigationLink href="/about" label="About" />
              </ul>
              <button
                className="ml-4 relative"
                onClick={() => handleExpandPane('notifications')}
                aria-label="Show notifications"
              >
                <BellIcon className="h-6 w-6" />
              </button>
              <button
                className="ml-2 relative"
                onClick={() => setShowSettings((v) => !v)}
                aria-label="Show settings"
              >
                <Settings className="h-6 w-6" />
              </button>
            </nav>
            {showSettings && (
              <SettingsDropdown
                onClose={() => setShowSettings(false)}
                debugConsoleEnabled={overlayPanes.some(p => p.id === 'debug' && !p.minimized)}
                onToggleDebugConsole={(enabled) => {
                  if (enabled) {
                    if (!overlayPanes.some(p => p.id === 'debug')) {
                      setOverlayPanes((panes) => [
                        ...panes,
                        {
                          id: 'debug',
                          title: 'Debug Console',
                          icon: <Terminal className="h-5 w-5 text-primary" />,
                          minimized: false,
                          content: (
                            <DebugConsoleOverlay
                              minimized={false}
                              onClose={() => handleClosePane('debug')}
                              onMinimize={() => handleMinimizePane('debug')}
                            />
                          ),
                        },
                      ]);
                    } else {
                      handleExpandPane('debug');
                    }
                  } else {
                    handleClosePane('debug');
                  }
                }}
              />
            )}
          </div>
        </header>
        <main className="flex-grow w-full max-w-full flex flex-row container mx-auto px-0 py-0">
          {/* Left sticky panel column */}
          <aside className="flex flex-col w-full max-w-xs min-w-[320px] border-r border-border bg-background sticky top-0 h-[calc(100vh-0px)] z-10">
            <InputPanel onFetchPlaylist={handleFetchPlaylist} isLoading={isLoading} />
            <div className="flex-1 overflow-y-auto">
              <PlaylistPanel
                tracks={tracks}
                onSelectTrack={handleSelectTrack}
                onDownloadTrack={handleDownloadTrack}
                selectedTrackId={selectedTrackId}
                isProcessing={isProcessing}
              />
            </div>
          </aside>
          {/* Main content area */}
          <section className="flex-1 min-w-0 max-w-full px-8 py-8">
            {children}
          </section>
        </main>
        <footer className="border-t border-border">
          <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} SoundForge. All rights reserved.</p>
          </div>
        </footer>
        <OverlayGrid panes={overlayPanes} onUpdatePane={handleUpdatePane} />
        <StickyPlayer
          track={currentTrack}
          isProcessing={isProcessing}
          isWorkingWithStems={isWorkingWithStems}
        />
        <Toaster />
        <Sonner />
      </div>
    </TooltipProvider>
  );
}
