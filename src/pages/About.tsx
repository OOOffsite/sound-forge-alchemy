
import React from 'react';
import MainLayout from '@/layouts/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Music2, Headphones, Download, FileMusic } from 'lucide-react';

const About = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-4">About SoundForge</h1>
          <p className="text-muted-foreground">
            SoundForge is a powerful web application for music source separation and analysis.
          </p>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <div className="prose dark:prose-invert max-w-none">
              <p>SoundForge allows you to:</p>
              <ul>
                <li>Retrieve tracks from Spotify playlists</li>
                <li>Separate songs into individual stems (vocals, drums, bass, other)</li>
                <li>Analyze tracks for BPM, key, and frequency distribution</li>
                <li>Export high-quality audio stems for your production needs</li>
              </ul>
              
              <h2>How It Works</h2>
              <p>
                SoundForge uses advanced AI-powered audio processing techniques to analyze and separate music tracks. 
                The application leverages several technologies:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose mt-6">
                <div className="border p-4 rounded-md flex">
                  <div className="mr-4">
                    <Download className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">Track Retrieval</h3>
                    <p className="text-sm text-muted-foreground">
                      We use spotdl to efficiently download high-quality audio tracks from Spotify playlists.
                    </p>
                  </div>
                </div>
                
                <div className="border p-4 rounded-md flex">
                  <div className="mr-4">
                    <Music2 className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">Source Separation</h3>
                    <p className="text-sm text-muted-foreground">
                      Demucs, a state-of-the-art AI model, separates mixed audio into individual components.
                    </p>
                  </div>
                </div>
                
                <div className="border p-4 rounded-md flex">
                  <div className="mr-4">
                    <FileMusic className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">Audio Analysis</h3>
                    <p className="text-sm text-muted-foreground">
                      We employ specialized algorithms to detect BPM, key, and frequency characteristics.
                    </p>
                  </div>
                </div>
                
                <div className="border p-4 rounded-md flex">
                  <div className="mr-4">
                    <Headphones className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">High-Quality Export</h3>
                    <p className="text-sm text-muted-foreground">
                      Export stems in various formats with configurable quality settings for your production needs.
                    </p>
                  </div>
                </div>
              </div>
              
              <h2 className="mt-6">Technical Notes</h2>
              <p>
                This web application is a frontend demonstration. In a production environment, the heavy processing tasks 
                like audio separation would be handled by a backend service. The Demucs and other ML models would run 
                server-side due to their computational requirements.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default About;
