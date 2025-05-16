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
import { NavLink, useLocation } from 'react-router-dom';

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

// Reusable component for rendering navigation links with active highlighting
const NavigationLink = ({ to, label }: { to: string; label: string }) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to === '/' && location.pathname === '/home');
  return (
    <li>
      <NavLink
        to={to}
        className={({ isActive }) =>
          `text-foreground hover:text-primary transition-colors px-2 py-1 rounded ${isActive ? 'bg-primary/10 text-primary font-semibold' : ''}`
        }
        aria-current={isActive ? 'page' : undefined}
      >
        {label}
      </NavLink>
    </li>
  );
};

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
        <header className="border-b border-border w-full bg-gradient-to-r from-background via-primary/5 to-accent/10">
          <div className="flex w-full items-center justify-between px-8 py-4">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent truncate text-left">
              SoundForge
            </h1>
            <nav className="flex items-center gap-4">
              <ul className="flex gap-4">
                <NavigationLink to="/" label="Home" />
                <NavigationLink to="/alchemy/session" label="Forge" />
                <NavigationLink to="/about" label="About" />
              </ul>
              <button
                className="ml-4 relative bg-primary/10 hover:bg-primary/20 rounded p-1 transition-colors"
                onClick={() => handleExpandPane('notifications')}
                aria-label="Show notifications"
              >
                <BellIcon className="h-6 w-6 text-primary" />
              </button>
              <button
                className="ml-2 relative bg-accent/10 hover:bg-accent/20 rounded p-1 transition-colors"
                onClick={() => setShowSettings((v) => !v)}
                aria-label="Show settings"
              >
                <Settings className="h-6 w-6 text-accent" />
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
        <main className="flex-grow w-full max-w-8xl mx-auto flex flex-row px-0 py-0">
          {/* Left sticky panel column and main content are now controlled by the page, not MainLayout */}
          {children}
        </main>
        <footer className="border-t border-border">
          <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} SoundForge. All rights reserved.</p>
          </div>
        </footer>
        <OverlayGrid
          panes={overlayPanes}
          onUpdatePane={handleUpdatePane}
          stickyPlayerActive={!!currentTrack}
          stickyPlayerHeight={72}
        />
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
