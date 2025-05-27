import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { useTheme } from '../../hooks/use-theme';

interface VolumeVisualizerProps {
  audioRef: React.RefObject<HTMLAudioElement>;
  playing: boolean;
  volume: number;
  width?: number;
  height?: number;
}

const VolumeVisualizer: React.FC<VolumeVisualizerProps> = ({
  audioRef,
  playing,
  volume,
  width = 100,
  height = 20,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const { theme } = useTheme();
  
  // Create or update WaveSurfer instance
  useEffect(() => {
    if (!containerRef.current || !audioRef.current) return;
    
    // Create WaveSurfer instance if it doesn't exist
    if (!wavesurferRef.current) {
      // Clear previous visualization if any
      containerRef.current.innerHTML = '';
      
      // Create new WaveSurfer instance
      wavesurferRef.current = WaveSurfer.create({
        container: containerRef.current,
        waveColor: theme === 'dark' ? '#8a94a8' : '#d1d5db',
        progressColor: theme === 'dark' ? '#60a5fa' : '#3b82f6',
        cursorWidth: 0,
        barWidth: 2,
        barGap: 1,
        barRadius: 1,
        height: height,
        normalize: true,
        interact: false, // Disable user interaction
        hideScrollbar: true
      });
    }
    
    return () => {
      // Clean up WaveSurfer on unmount
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
      
      // Clean up media stream
      if (mediaStreamSourceRef.current) {
        mediaStreamSourceRef.current.disconnect();
        mediaStreamSourceRef.current = null;
      }
      
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
    };
  }, [theme]);
  
  // Connect audio element to WaveSurfer
  useEffect(() => {
    if (!wavesurferRef.current || !audioRef.current) return;
    
    // Get the audio context from WaveSurfer
    const audioContext = wavesurferRef.current.getMediaElement()?.context;
    if (!audioContext) return;
    
    // Check if audio stream is already connected
    if (!mediaStreamRef.current) {
      // Create a media stream from the audio element
      try {
        // @ts-ignore
        if (audioRef.current.captureStream) {
          // For Chrome and Firefox
          // @ts-ignore
          mediaStreamRef.current = audioRef.current.captureStream();
        } else if (audioRef.current.mozCaptureStream) {
          // For Firefox (fallback)
          // @ts-ignore
          mediaStreamRef.current = audioRef.current.mozCaptureStream();
        } else {
          console.warn('Stream capture not supported in this browser');
          return;
        }
        
        // Create a source node from the stream
        if (mediaStreamRef.current) {
          mediaStreamSourceRef.current = audioContext.createMediaStreamSource(mediaStreamRef.current);
          
          // Connect to WaveSurfer
          // This method might vary based on WaveSurfer version
          if (typeof wavesurferRef.current.loadDecodedBuffer === 'function') {
            // Use a silent buffer to initialize, then we'll feed audio data directly
            const emptyBuffer = audioContext.createBuffer(2, 44100, 44100);
            wavesurferRef.current.loadDecodedBuffer(emptyBuffer);
          }
          
          // Connect to analyzer for real-time visualization
          if (wavesurferRef.current.backend?.analyser) {
            mediaStreamSourceRef.current.connect(wavesurferRef.current.backend.analyser);
          }
        }
      } catch (error) {
        console.error('Error connecting audio stream:', error);
      }
    }
  }, [audioRef.current]);
  
  // Update visualization based on playing state
  useEffect(() => {
    if (!wavesurferRef.current) return;
    
    if (playing) {
      wavesurferRef.current.play();
    } else {
      wavesurferRef.current.pause();
    }
  }, [playing]);
  
  // Update visualization based on volume
  useEffect(() => {
    if (!wavesurferRef.current) return;
    
    // Adjust visualization intensity based on volume
    if (wavesurferRef.current.backend?.analyser) {
      // Some versions of WaveSurfer allow setting gain
      // If not, we can at least adjust the visual representation
      const boost = 0.5 + volume * 0.5; // Boost visualization at lower volumes
      wavesurferRef.current.setOptions({ 
        waveColor: theme === 'dark' ? `rgba(138, 148, 168, ${volume * boost})` : `rgba(209, 213, 219, ${volume * boost})`,
        progressColor: theme === 'dark' ? `rgba(96, 165, 250, ${volume * boost})` : `rgba(59, 130, 246, ${volume * boost})`
      });
    }
  }, [volume, theme]);
  
  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: `${width}px`, 
        height: `${height}px`,
        opacity: playing ? 1 : 0.6,
        transition: 'opacity 0.3s ease'
      }}
    />
  );
};

export default VolumeVisualizer;
