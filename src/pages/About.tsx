import React from 'react';
import MainLayout from '../layouts/MainLayout';
import { Card, CardContent } from '../components/ui/card';
import { Music2, Headphones, Download, FileMusic } from 'lucide-react';

const featureList = [
  {
    icon: <Download className="h-8 w-8 text-primary" />, 
    title: 'Track Retrieval',
    description: 'Retrieve tracks from Spotify playlists',
    bg: 'bg-blue-100'
  },
  {
    icon: <Music2 className="h-8 w-8 text-primary" />, 
    title: 'Source Separation',
    description: 'Separate songs into individual stems (vocals, drums, bass, other)',
    bg: 'bg-green-100'
  },
  {
    icon: <FileMusic className="h-8 w-8 text-primary" />, 
    title: 'Audio Analysis',
    description: 'Analyze tracks for BPM, key, and frequency distribution',
    bg: 'bg-yellow-100'
  },
  {
    icon: <Headphones className="h-8 w-8 text-primary" />, 
    title: 'High-Quality Export',
    description: 'Export high-quality audio stems for your production needs',
    bg: 'bg-purple-100'
  },
];

const About = () => {
  return (
    <MainLayout>
      <div className="space-y-10 max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold mb-3 tracking-tight">About <span className="text-primary">SoundForge</span></h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            SoundForge is a production-grade web application for music source separation and analysis, designed to operate with robust backend services.
          </p>
        </div>

        <Card className="shadow-lg border-0 bg-zinc-900/60">
          <CardContent className="pt-8 pb-10 px-6 md:px-12">
            <div className="max-w-none text-center">
              <h2 className="text-2xl font-bold mb-4">What can you do with SoundForge?</h2>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 mb-10 text-left">
                {featureList.map((feature) => (
                  <li key={feature.title} className="flex items-center gap-2 text-base">
                    <span className="inline-block h-5 w-5 rounded-full bg-primary/80 flex items-center justify-center mr-2">
                      <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </span>
                    {feature.description}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-zinc-700 my-8"></div>

            <h2 className="text-xl font-semibold mb-6 text-center">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {featureList.map((feature, idx) => (
                <div key={feature.title} className={`flex items-center gap-4 p-5 rounded-lg bg-zinc-800/80 border border-zinc-700 shadow-sm`}> 
                  <div className={`flex items-center justify-center rounded-full h-14 w-14 ${feature.bg} bg-opacity-30`}> 
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1 text-white">{feature.title}</h3>
                    <p className="text-sm text-zinc-300 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-zinc-700 my-8"></div>

            <h2 className="text-xl font-semibold mb-3 text-center">Production Architecture</h2>
            <div className="bg-zinc-800/70 rounded-lg p-5 max-w-2xl mx-auto mb-2">
              <p className="text-base text-zinc-300 mb-3 text-center">
                This deployment is fully integrated with backend microservices for audio processing, analysis, and data management. The frontend communicates with these services via secure APIs and WebSockets, ensuring scalability and reliability for demanding production workloads.
              </p>
              <ul className="list-disc pl-5 text-zinc-300 text-left space-y-1">
                <li>All heavy computation is performed server-side</li>
                <li>Backend services are orchestrated using Docker Compose</li>
                <li>Real-time updates and progress are delivered via WebSocket connections</li>
                <li>Persistent storage and caching are managed by dedicated infrastructure (e.g., Redis, PostgreSQL)</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default About;
