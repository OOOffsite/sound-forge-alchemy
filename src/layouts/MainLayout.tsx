import React, { useState } from 'react';
import { Bell, Settings } from 'lucide-react';
import { Toaster } from "../components/ui/toaster";
import { Toaster as Sonner } from "../components/ui/sonner";
import { TooltipProvider } from "../components/ui/tooltip";
import NotificationLog from '../components/ui/NotificationLog';
import SettingsDropdown from '../components/ui/SettingsDropdown';

type MainLayoutProps = {
  children: React.ReactNode;
};

// Reusable component for rendering navigation links
const NavigationLink = ({ href, label }: { href: string; label: string }) => (
  <li>
    <a href={href} className="text-foreground hover:text-primary transition-colors">
      {label}
    </a>
  </li>
);

export default function MainLayout({ children }: MainLayoutProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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
                onClick={() => setShowNotifications((v) => !v)}
                aria-label="Show notifications"
              >
                <Bell className="h-6 w-6" />
              </button>
              <button
                className="ml-2 relative"
                onClick={() => setShowSettings((v) => !v)}
                aria-label="Show settings"
              >
                <Settings className="h-6 w-6" />
              </button>
            </nav>
            {showNotifications && <NotificationLog onClose={() => setShowNotifications(false)} />}
            {showSettings && <SettingsDropdown onClose={() => setShowSettings(false)} />}
          </div>
        </header>
        <main className="flex-grow container mx-auto px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-border">
          <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} SoundForge. All rights reserved.</p>
          </div>
        </footer>
      </div>
      <Toaster />
      <Sonner />
    </TooltipProvider>
  );
}
