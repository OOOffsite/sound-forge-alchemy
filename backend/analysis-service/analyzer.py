#!/usr/bin/env python3

import sys
import os
import json
import time
import redis
import numpy as np
import librosa
import essentia
import essentia.standard as es
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def analyze_track(audio_path, track_id, job_id, redis_url):
    """
    Analyze a track and store the results in Redis.
    """
    try:
        # Connect to Redis
        r = redis.Redis.from_url(redis_url)
        
        print(f"Starting analysis for track: {track_id}, job: {job_id}")
        print(f"Audio path: {audio_path}")
        print("Progress: 5%")
        
        # Load the audio file
        y, sr = librosa.load(audio_path, sr=None)
        duration = librosa.get_duration(y=y, sr=sr)
        
        print("Progress: 15%")
        
        # BPM/Tempo analysis
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        
        print("Progress: 30%")
        
        # Key detection with Essentia
        audio = es.MonoLoader(filename=audio_path, sampleRate=sr)()
        key_extractor = es.KeyExtractor()
        key_results = key_extractor(audio)
        key = key_results[0]  # Key name (e.g., "C#")
        scale = key_results[1]  # Scale (major or minor)
        key_strength = key_results[2]  # Confidence
        
        print("Progress: 45%")
        
        # Format key
        key_formatted = f"{key} {'major' if scale == 'major' else 'minor'}"
        
        # Loudness analysis
        loudness = es.LoudnessEBUR128(sampleRate=sr)
        loudness_results = loudness(audio)
        integrated_loudness = loudness_results[2]  # Integrated loudness (LUFS)
        
        print("Progress: 60%")
        
        # Spectral analysis
        spectral_centroid = np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)[0])
        spectral_contrast = np.mean(librosa.feature.spectral_contrast(y=y, sr=sr), axis=1)
        
        print("Progress: 75%")
        
        # Waveform envelope
        envelope = np.array([])
        if len(y) > 1000:
            # Downsample the audio to get a reasonable number of points for the envelope
            hop_length = max(1, len(y) // 1000)
            envelope = np.abs(y[::hop_length])
        
        # Frequency spectrum
        # Get the spectrum but limit to 100 points for visualization
        S = np.abs(librosa.stft(y))
        # Average across time
        mean_spectrum = np.mean(S, axis=1)
        # Downsample to 100 points if needed
        if len(mean_spectrum) > 100:
            step = len(mean_spectrum) // 100
            mean_spectrum = mean_spectrum[::step][:100]
        
        print("Progress: 85%")
        
        # Detect structural segmentation
        # This finds the boundaries of different song sections (e.g., verse, chorus)
        boundaries = librosa.segment.detecti_beats(y, sr=sr, hop_length=512)
        
        # Convert frame indices to time (seconds)
        boundaries_seconds = librosa.frames_to_time(boundaries, sr=sr, hop_length=512)
        
        # Limit to a reasonable number of boundaries (e.g., 10 max)
        if len(boundaries_seconds) > 10:
            # Take evenly spaced boundaries
            step = len(boundaries_seconds) // 10
            boundaries_seconds = boundaries_seconds[::step][:10]
        
        # Create cue points
        cue_points = []
        section_names = ["Intro", "Verse 1", "Chorus", "Verse 2", "Bridge", "Chorus", "Outro"]
        
        for i, boundary in enumerate(boundaries_seconds):
            section_name = section_names[min(i, len(section_names) - 1)]
            cue_points.append({
                "time": float(boundary),
                "label": section_name,
                "type": section_name.lower().split()[0]
            })
        
        print("Progress: 95%")
        
        # Create the analysis result
        analysis = {
            "trackId": track_id,
            "analyzedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "duration": float(duration),
            "bpm": round(float(tempo)),
            "key": key_formatted,
            "keyStrength": float(key_strength),
            "loudness": round(float(integrated_loudness), 2),
            "spectralCentroid": float(spectral_centroid),
            "spectralContrast": [float(c) for c in spectral_contrast],
            "waveformEnvelope": [float(e) for e in envelope],
            "frequencySpectrum": [float(s) for s in mean_spectrum],
            "cuePoints": cue_points
        }
        
        # Store the analysis result in Redis
        r.set(f"track:{track_id}:analysis", json.dumps(analysis))
        
        print("Progress: 100%")
        print(f"Analysis complete for track: {track_id}")
        
        return True
    except Exception as e:
        print(f"Error analyzing track: {str(e)}")
        
        # Update job status to error
        try:
            job_data = json.loads(r.get(f"analysis:job:{job_id}"))
            job_data["status"] = "error"
            job_data["error"] = str(e)
            job_data["completedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            
            r.set(f"analysis:job:{job_id}", json.dumps(job_data))
            r.publish("analysis:job:error", json.dumps(job_data))
        except:
            pass
        
        return False

if __name__ == "__main__":
    if len(sys.argv) != 5:
        print("Usage: analyzer.py <audio_path> <track_id> <job_id> <redis_url>")
        sys.exit(1)
    
    audio_path = sys.argv[1]
    track_id = sys.argv[2]
    job_id = sys.argv[3]
    redis_url = sys.argv[4]
    
    success = analyze_track(audio_path, track_id, job_id, redis_url)
    
    if success:
        sys.exit(0)
    else:
        sys.exit(1)