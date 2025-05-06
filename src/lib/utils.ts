
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatTimeToSMPTE(seconds: number, frameRate: number = 30): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const f = Math.floor((seconds % 1) * frameRate);
  
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${f.toString().padStart(2, '0')}`;
}

export function calculateBPM(audioData: number[]): number {
  // In a real implementation, this would use a BPM detection algorithm
  // For now we'll return a simulated value
  return Math.floor(Math.random() * (160 - 70) + 70);
}

export function detectKey(audioData: number[]): string {
  // In a real implementation, this would use a key detection algorithm
  // For now we'll return a simulated value
  const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const modes = ['maj', 'min'];
  
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  const randomMode = modes[Math.floor(Math.random() * modes.length)];
  
  return `${randomKey} ${randomMode}`;
}

export function detectArrangement(audioData: number[], duration: number): { time: number, label: string, type: string }[] {
  // In a real implementation, this would analyze the audio for structural changes
  // For now we'll generate simulated cue points based on duration
  
  // Simple percentage-based arrangement for demo purposes
  return [
    { time: 0, label: 'Intro', type: 'intro' },
    { time: duration * 0.2, label: 'Verse 1', type: 'verse' },
    { time: duration * 0.4, label: 'Chorus', type: 'chorus' },
    { time: duration * 0.6, label: 'Verse 2', type: 'verse' },
    { time: duration * 0.8, label: 'Outro', type: 'outro' }
  ];
}
