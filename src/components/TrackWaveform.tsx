
import React from 'react';

interface TrackWaveformProps {
  active?: boolean;
}

export default function TrackWaveform({ active = true }: TrackWaveformProps) {
  return (
    <div className="waveform-container">
      {[...Array(20)].map((_, i) => {
        const height = Math.floor(Math.random() * 100);
        return (
          <div
            key={i}
            className={`waveform-bar ${active ? 'animate-waveform' : ''}`}
            style={{
              height: `${height}%`,
              animationDelay: `${i * 0.05}s`,
            }}
          />
        );
      })}
    </div>
  );
}
