import React from 'react';
import { Button } from '../components/ui/button';
import { Server, Zap, Settings, Database } from 'lucide-react';

const features = [
  {
    icon: <Server className="h-8 w-8 text-primary" />, title: 'Microservices',
    description: 'Backend services for download, separation, and analysis are orchestrated with Docker Compose.'
  },
  {
    icon: <Zap className="h-8 w-8 text-primary" />, title: 'Real-Time Updates',
    description: 'WebSocket connections deliver live progress and results to the frontend.'
  },
  {
    icon: <Settings className="h-8 w-8 text-primary" />, title: 'Server-Side Processing',
    description: 'All heavy computation is performed on dedicated backend infrastructure.'
  },
  {
    icon: <Database className="h-8 w-8 text-primary" />, title: 'Persistent Storage',
    description: 'Redis and PostgreSQL manage caching and persistent data.'
  },
];

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-background/80 border-b border-border shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">SoundForge</h1>
          <nav className="flex gap-6">
            <a href="/home" className="font-medium hover:text-primary transition-colors">Home</a>
            <a href="/" className="font-medium hover:text-primary transition-colors">Forge</a>
            <a href="/about" className="font-medium hover:text-primary transition-colors">About</a>
          </nav>
        </div>
      </header>
      {/* Hero section */}
      <section className="container mx-auto px-4 py-24 flex flex-col items-center text-center gap-8">
        <h2 className="text-4xl md:text-5xl font-extrabold mb-4">AI-Powered Music Source Separation</h2>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
          Instantly separate vocals, drums, bass, and more from any song. Built for producers, DJs, and music lovers.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="text-lg px-8 py-4" asChild>
            <a href="/" tabIndex={0}>Try the App</a>
          </Button>
          <Button size="lg" variant="outline" className="text-lg px-8 py-4" asChild>
            <a href="/about" tabIndex={0}>Learn More</a>
          </Button>
        </div>
      </section>
      {/* Features section */}
      <section className="container mx-auto px-4 py-16">
        <h3 className="text-2xl font-bold mb-8 text-center">Production Architecture</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {features.map((feature) => (
            <div key={feature.title} className="flex items-start gap-4 p-6 rounded-xl bg-card border border-border shadow-sm">
              <div className="flex items-center justify-center rounded-full h-14 w-14 bg-primary/10">
                {feature.icon}
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-1">{feature.title}</h4>
                <p className="text-base text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      {/* Add more landing-page style sections here as needed */}
    </div>
  );
};

export default Home;
