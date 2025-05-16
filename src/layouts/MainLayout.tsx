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
        <header className="border-b border-border w-full">
          <div className="flex w-full items-center justify-between px-8 py-4">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent truncate text-left">
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
        <main className="flex-grow w-full max-w-7xl mx-auto flex flex-row px-0 py-0">
          {/* Left sticky panel column and main content are now controlled by the page, not MainLayout */}
          {children}
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
