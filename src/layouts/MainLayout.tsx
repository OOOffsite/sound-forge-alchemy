import React from 'react';
import { Toaster } from "../components/ui/toaster";
import { Toaster as Sonner } from "../components/ui/sonner";
import { TooltipProvider } from "../components/ui/tooltip";

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
  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <header className="border-b border-border">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
              SoundForge
            </h1>
            <nav>
              <ul className="flex gap-4">
                <NavigationLink href="/" label="Home" />
                <NavigationLink href="/about" label="About" />
              </ul>
            </nav>
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
