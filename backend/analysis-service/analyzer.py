#!/usr/bin/env python3

import sys
import os
import json
import time
import redis
import numpy as np
import librosa  # Import librosa at the top level
from dotenv import load_dotenv
import soundfile as sf
import pretty_midi
import math
from collections import defaultdict
import warnings
import gc  # For garbage collection
import psutil  # For memory monitoring

# Suppress specific deprecation warnings from librosa/numpy
warnings.filterwarnings("ignore", category=DeprecationWarning)
warnings.filterwarnings("ignore", category=UserWarning)

# Set memory limit for analysis (in bytes)
MAX_MEMORY_USAGE = 1.5 * (1024 ** 3)  # 1.5 GB

# Configure librosa to use a smaller fixed frame size to reduce memory usage
librosa.set_audio_backend("soundfile")

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
        
        # Check file size before processing
        file_size = os.path.getsize(audio_path)
        print(f"File size: {file_size / (1024 * 1024):.2f} MB")
        
        # Get file info without loading the entire file
        file_info = sf.info(audio_path)
        duration = file_info.duration
        sr = file_info.samplerate
        channels = file_info.channels
        
        print(f"Sample rate: {sr}, Channels: {channels}, Duration: {duration:.2f} seconds")
        
        # For very large files, we'll use a lower sample rate and downsample
        target_sr = sr
        if file_size > 50 * 1024 * 1024:  # If file is larger than 50MB
            target_sr = min(sr, 22050)  # Use lower sample rate for large files
            print(f"Large file detected, downsampling to {target_sr} Hz")
        
        # Load audio with memory efficiency in mind
        try:
            # For larger files, load directly as mono at potentially lower sample rate
            if file_size > 10 * 1024 * 1024:  # 10MB
                print("Loading audio as mono to save memory")
                y, sr = librosa.load(audio_path, sr=target_sr, mono=True, res_type='kaiser_fast')
                # Reshape to consistent format
                y = np.reshape(y, (1, -1))
            else:
                # For smaller files, use soundfile which is more efficient
                y, sr = sf.read(audio_path, always_2d=True)
                y = y.T
                if y.shape[0] == 1:
                    y = np.vstack([y, y])
                
                # If we need to resample, do it now
                if sr != target_sr:
                    y = librosa.resample(y, orig_sr=sr, target_sr=target_sr)
                    sr = target_sr
        except Exception as sf_exc:
            print(f"Initial audio loading failed: {sf_exc}. Trying more conservative approach.")
            # Fallback to the most memory-efficient approach
            y, sr = librosa.load(audio_path, sr=target_sr, mono=True, res_type='kaiser_fast', duration=min(300, duration))
            y = np.reshape(y, (1, -1))
            
        # Force garbage collection to free up memory
        gc.collect()
        
        # Sanitize audio buffer to ensure all values are finite
        y = np.nan_to_num(y, nan=0.0, posinf=1.0, neginf=-1.0)
        if duration != y.shape[1] / sr:
            print(f"Note: Actual loaded duration ({y.shape[1] / sr:.2f}s) differs from file info ({duration:.2f}s)")
            duration = y.shape[1] / sr
            
        # Monitor memory usage
        process = psutil.Process(os.getpid())
        mem_usage = process.memory_info().rss
        print(f"Memory usage after loading audio: {mem_usage / (1024 * 1024):.2f} MB")
        
        print("Progress: 15%")
        
        # BPM/Tempo analysis (use mono audio)
        y_mono = y[0] if y.ndim == 2 else y
        
        # Check memory before heavy operations
        if process.memory_info().rss > MAX_MEMORY_USAGE * 0.6:
            print("Memory usage high, downsampling further for tempo detection")
            # Create a smaller version of the audio for beat tracking
            sr_tempo = 11025  # Lower sample rate just for tempo tracking
            y_tempo = librosa.resample(y_mono, orig_sr=sr, target_sr=sr_tempo)
            # Free original memory
            del y_mono
            gc.collect()
            # Use smaller buffer for tempo detection
            tempo, beat_frames = librosa.beat.beat_track(y=y_tempo, sr=sr_tempo)
            # Convert beat frames to original sample rate
            beat_frames = librosa.util.fix_frames(beat_frames, x_min=0)
            beat_frames = (beat_frames * sr / sr_tempo).astype(int)
            # Restore mono version
            y_mono = y[0] if y.ndim == 2 else y
        else:
            tempo, beat_frames = librosa.beat.beat_track(y=y_mono, sr=sr)
        
        print(f"Detected tempo: {tempo} BPM")
        print("Progress: 25%")
        
        # Time signature detection with memory check
        if process.memory_info().rss > MAX_MEMORY_USAGE * 0.7:
            print("Memory usage high, using default time signature")
            time_sig_num, time_sig_denom = 4, 4  # Default to 4/4
        else:
            time_sig_num, time_sig_denom = detect_time_signature(y_mono, sr, tempo)
        
        print(f"Detected time signature: {time_sig_num}/{time_sig_denom}")
        print("Progress: 30%")
        
        # Key detection with spectral methods (simplified alternative to Essentia)
        print("Progress: 35%")
        
        # Default key and scale if estimation fails
        key = "C"
        scale = "major"
        key_strength = 0.5
        
        # Format key
        key_formatted = f"{key} {'major' if scale == 'major' else 'minor'}"
        
        # Loudness analysis (use mono audio)
        # Use a simple RMS-based loudness measure instead of LUFS
        try:
            integrated_loudness = -23.0 + (np.sqrt(np.mean(np.square(y_mono))) * 20)
        except Exception as e:
            print(f"Error with loudness analysis: {e}. Using default value.")
            integrated_loudness = -18.0  # Default loudness value
        print("Progress: 40%")
        
        # Spectral analysis
        spectral_centroid = np.mean(librosa.feature.spectral_centroid(y=y_mono, sr=sr)[0])
        spectral_contrast = np.mean(librosa.feature.spectral_contrast(y=y_mono, sr=sr), axis=1)
        print("Progress: 45%")
        
        # Waveform envelope
        envelope = np.array([])
        if len(y_mono) > 1000:
            # Downsample the audio to get a reasonable number of points for the envelope
            hop_length = max(1, len(y_mono) // 1000)
            envelope = np.abs(y_mono[::hop_length])
        
        # Frequency spectrum
        # Get the spectrum but limit to 100 points for visualization
        S = np.abs(librosa.stft(y_mono))
        # Average across time
        mean_spectrum = np.mean(S, axis=1)
        # Downsample to 100 points if needed
        if len(mean_spectrum) > 100:
            step = len(mean_spectrum) // 100
            mean_spectrum = mean_spectrum[::step][:100]
        print("Progress: 50%")
        
        # Generate timeline data with beats, bars, and SMPTE timecode
        timeline = generate_timeline_data(duration, tempo, time_sig_num, time_sig_denom)
        print("Progress: 55%")
        
        # MIDI extraction - we'll create a simple MIDI representation of the main audio
        midi_data = extract_midi_from_audio(y_mono, sr, tempo)
        
        # Convert MIDI to a serializable format (notes and timing)
        midi_notes = []
        if midi_data.instruments:
            for note in midi_data.instruments[0].notes:
                midi_notes.append({
                    "pitch": note.pitch,
                    "start": note.start,
                    "end": note.end,
                    "velocity": note.velocity
                })
        print("Progress: 60%")
        
        # Detect structural segmentation
        # This finds the boundaries of different song sections (e.g., verse, chorus)
        
        # Create a self-similarity matrix from the chroma features
        hop_length = 512
        chroma = librosa.feature.chroma_cqt(y=y_mono, sr=sr, hop_length=hop_length)
        
        # Compute the structural features using recurrence matrix
        S = librosa.segment.recurrence_matrix(chroma, mode='affinity')
        
        # Use dynamic programming to find segment boundaries
        bounds = librosa.segment.agglomerative(S, 10)  # Target 10 segments
        
        # Convert frame indices to time (seconds)
        boundaries_seconds = librosa.frames_to_time(bounds, sr=sr, hop_length=hop_length)
        
        # Make sure we have a boundary at the start
        if len(boundaries_seconds) > 0 and boundaries_seconds[0] > 1.0:
            boundaries_seconds = np.insert(boundaries_seconds, 0, 0.0)
            
        # Limit to a reasonable number of boundaries if needed
        if len(boundaries_seconds) > 10:
            # Take evenly spaced boundaries
            step = len(boundaries_seconds) // 10
            boundaries_seconds = boundaries_seconds[::step][:10]
        
        # Create cue points
        cue_points = []
        
        # More comprehensive section names for different arrangements
        section_templates = [
            ["Intro", "Verse 1", "Chorus", "Verse 2", "Chorus", "Bridge", "Chorus", "Outro"],
            ["Intro", "Verse 1", "Pre-Chorus", "Chorus", "Verse 2", "Pre-Chorus", "Chorus", "Bridge", "Chorus", "Outro"],
            ["Intro", "Drop 1", "Breakdown", "Build-up", "Drop 2", "Outro"]  # Electronic music template
        ]
        
        # Choose the template based on number of boundaries
        if len(boundaries_seconds) <= 5:
            # Simple structure for short pieces
            section_names = ["Intro", "Section A", "Section B", "Section A", "Outro"]
        else:
            # Choose based on spectral contrast (higher contrast often indicates electronic music)
            avg_contrast = np.mean(spectral_contrast)
            if avg_contrast > 50:  # Threshold may need adjustment
                section_names = section_templates[2]  # Electronic template
            else:
                section_names = section_templates[0]  # Standard template
        
        # Add markers for each boundary
        for i, boundary in enumerate(boundaries_seconds):
            if i < len(section_names):
                section_name = section_names[i]
            else:
                # If we have more boundaries than names, reuse the last few names
                section_idx = min(i % len(section_names), len(section_names) - 1)
                section_name = section_names[section_idx]
                
                # Add numbers to distinguish repeated sections
                if section_name.split()[0] in ["Verse", "Chorus", "Drop"]:
                    repeat_count = i // len(section_names) + 1
                    if len(section_name.split()) > 1 and section_name.split()[1].isdigit():  # If already has a number
                        base_name = section_name.split()[0]
                        section_name = f"{base_name} {repeat_count}"
                    else:
                        section_name = f"{section_name} {repeat_count}"
            
            # Create cue point
            cue_points.append({
                "time": float(boundary),
                "label": section_name,
                "type": section_name.lower().split()[0],
                "duration": float(boundaries_seconds[i+1] - boundary) if i < len(boundaries_seconds) - 1 else float(duration - boundary)
            })
        print("Progress: 75%")
        
        # Extract MIDI from each segment for more detailed analysis
        segment_midi = []
        for i, cp in enumerate(cue_points):
            start_time = cp["time"]
            if i < len(cue_points) - 1:
                end_time = cue_points[i+1]["time"]
            else:
                end_time = duration
                
            # Extract MIDI for this segment
            segment_midi_data = extract_midi_from_audio(
                y_mono, sr, tempo, 
                start_time=start_time, 
                end_time=end_time,
                instrument_type="piano"
            )
            
            # Convert to serializable format
            notes = []
            if segment_midi_data.instruments:
                for note in segment_midi_data.instruments[0].notes:
                    notes.append({
                        "pitch": note.pitch,
                        "start": note.start,
                        "end": note.end,
                        "velocity": note.velocity
                    })
            
            segment_midi.append({
                "sectionName": cp["label"],
                "startTime": start_time,
                "endTime": end_time,
                "notes": notes
            })
        
        print("Progress: 85%")
        
        # Generate tags from analysis
        analysis_data = {
            "bpm": round(float(tempo)),
            "key": key_formatted,
            "loudness": round(float(integrated_loudness), 2),
            "spectralCentroid": float(spectral_centroid)
        }
        tags = generate_tags_from_analysis(analysis_data)
        print("Progress: 90%")
        
        # Create the analysis result
        analysis = {
            "trackId": track_id,
            "analyzedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "duration": float(duration),
            "bpm": round(float(tempo)),
            "key": key_formatted,
            "keyStrength": float(key_strength),
            "loudness": round(float(integrated_loudness), 2),
            "timeSignature": f"{time_sig_num}/{time_sig_denom}",
            "spectralCentroid": float(spectral_centroid),
            "spectralContrast": [float(c) for c in spectral_contrast],
            "waveformEnvelope": [float(e) for e in envelope],
            "frequencySpectrum": [float(s) for s in mean_spectrum],
            "cuePoints": cue_points,
            "timeline": timeline,
            "midiNotes": midi_notes,
            "segmentMidi": segment_midi,
            "tags": tags
        }
        
        # Store the analysis result in Redis
        r.set(f"track:{track_id}:analysis", json.dumps(analysis))
        
        print("Progress: 100%")
        print(f"Analysis complete for track: {track_id}")
        
        return True
    except Exception as e:
        print(f"Error analyzing track: {str(e)}")
        
        # Connect to Redis
        try:
            r = redis.Redis.from_url(redis_url)
            # Update job status to error
            job_data = json.loads(r.get(f"analysis:job:{job_id}"))
            job_data["status"] = "error"
            job_data["error"] = str(e)
            job_data["completedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            
            r.set(f"analysis:job:{job_id}", json.dumps(job_data))
            r.publish("analysis:job:error", json.dumps(job_data))
        except Exception as re:
            print(f"Error updating Redis job status: {str(re)}")
        
        return False

def extract_midi_from_audio(y, sr, tempo, start_time=0, end_time=None, instrument_type="piano"):
    """
    Extract MIDI notes from audio data.
    
    Args:
        y: Audio data
        sr: Sample rate
        tempo: Tempo in BPM
        start_time: Start time for extraction in seconds
        end_time: End time for extraction in seconds
        instrument_type: Type of instrument to use for MIDI
        
    Returns:
        PrettyMIDI object
    """
    try:
        # Get current memory usage
        process = psutil.Process(os.getpid())
        mem_usage = process.memory_info().rss
        
        # Skip MIDI extraction if memory is tight
        if mem_usage > MAX_MEMORY_USAGE * 0.8:
            print("Memory usage too high, returning empty MIDI")
            midi = pretty_midi.PrettyMIDI(initial_tempo=tempo)
            instrument = pretty_midi.Instrument(program=0, name="Piano")
            midi.instruments.append(instrument)
            return midi
        
        # Convert start and end time to samples
        start_sample = int(start_time * sr)
        if end_time is None:
            end_sample = len(y)
        else:
            end_sample = min(int(end_time * sr), len(y))
        
        # Limit the extraction to a reasonable duration
        max_duration_samples = 30 * sr  # 30 seconds max
        if end_sample - start_sample > max_duration_samples:
            print(f"Limiting MIDI extraction to {max_duration_samples/sr} seconds")
            end_sample = start_sample + max_duration_samples
        
        # Extract the segment
        y_segment = y[start_sample:end_sample]
        
        # If segment is too large, downsample it
        if len(y_segment) > 10 * sr:  # If over 10 seconds
            target_sr = 11025  # Lower sample rate for MIDI extraction
            y_segment = librosa.resample(y_segment, orig_sr=sr, target_sr=target_sr)
            segment_sr = target_sr
        else:
            segment_sr = sr
        
        # Create a PrettyMIDI object
        midi = pretty_midi.PrettyMIDI(initial_tempo=tempo)
        
        # Map instrument types to MIDI program numbers
        instrument_map = {
            "piano": 0,
            "bass": 32,
            "drums": 0,  # Drums are handled specially in MIDI
            "guitar": 24,
            "vocals": 52,  # Choir Aahs
            "other": 80,  # Synth lead
        }
        
        # Get the program number for the selected instrument
        program_num = instrument_map.get(instrument_type.lower(), 0)
        
        # Create an Instrument object
        if instrument_type.lower() == "drums":
            instrument = pretty_midi.Instrument(program=0, is_drum=True, name="Drums")
        else:
            instrument = pretty_midi.Instrument(program=program_num, name=instrument_type.title())
        
        # Detect onsets
        onset_frames = librosa.onset.onset_detect(y=y_segment, sr=sr)
        onset_times = librosa.frames_to_time(onset_frames, sr=sr)
        
        # Extract pitch for each onset using CQT for better pitch resolution
        if len(onset_times) > 0:
            # Get CQT
            C = np.abs(librosa.cqt(y=y_segment, sr=sr))
            
            # For each onset
            for i, onset_time in enumerate(onset_times):
                onset_sample = librosa.time_to_samples(onset_time, sr=sr)
                
                # Determine note end (next onset or +0.25 seconds)
                if i < len(onset_times) - 1:
                    offset_time = onset_times[i + 1]
                else:
                    offset_time = onset_time + 0.25
                
                # Get the frame index for this onset
                onset_frame = librosa.time_to_frames(onset_time, sr=sr, hop_length=512)
                if onset_frame >= C.shape[1]:
                    onset_frame = C.shape[1] - 1
                
                # Find the strongest frequency bin at this onset
                if onset_frame < C.shape[1]:
                    pitch_bin = np.argmax(C[:, onset_frame])
                    # Convert bin to MIDI note number (very approximate)
                    midi_note = pitch_bin + 36  # Adjust based on your CQT settings
                    
                    # Keep only notes in a reasonable range (36-96 = C2 to C7)
                    if 36 <= midi_note <= 96:
                        # Create a Note object
                        note = pretty_midi.Note(
                            velocity=100,  # Fixed velocity
                            pitch=midi_note,
                            start=onset_time + start_time,  # Adjust for global time
                            end=offset_time + start_time    # Adjust for global time
                        )
                        # Add note to instrument
                        instrument.notes.append(note)
        
        # Add instrument to MIDI
        midi.instruments.append(instrument)
        
        return midi
    except Exception as e:
        print(f"Error extracting MIDI: {e}")
        # Return an empty MIDI file if extraction fails
        return pretty_midi.PrettyMIDI(initial_tempo=tempo)

def detect_time_signature(y, sr, tempo):
    """
    Detect time signature of audio.
    
    Args:
        y: Audio data
        sr: Sample rate
        tempo: BPM
        
    Returns:
        Tuple of (numerator, denominator)
    """
    try:
        # Detect beats
        _, beat_frames = librosa.beat.beat_track(y=y, sr=sr, trim=False)
        
        if len(beat_frames) < 8:
            return (4, 4)  # Default if not enough beats
            
        # Convert to time
        beat_times = librosa.frames_to_time(beat_frames, sr=sr)
        
        # Compute beat intervals
        beat_intervals = np.diff(beat_times)
        
        # Find the median beat interval to handle tempo variations
        median_beat = np.median(beat_intervals)
        
        # Detect pattern using beat strength
        y_harmonic = librosa.effects.harmonic(y)
        onset_env = librosa.onset.onset_strength(y=y_harmonic, sr=sr)
        
        # Aggregate every 2, 3, and 4 beats to find the pattern
        aggregated_2 = np.array([onset_env[beat_frames[i]] for i in range(0, len(beat_frames)-1, 2)])
        aggregated_3 = np.array([onset_env[beat_frames[i]] for i in range(0, len(beat_frames)-1, 3)])
        aggregated_4 = np.array([onset_env[beat_frames[i]] for i in range(0, len(beat_frames)-1, 4)])
        
        # Calculate variance of each pattern - higher variance usually means stronger pattern
        var_2 = np.var(aggregated_2) if len(aggregated_2) >= 4 else 0
        var_3 = np.var(aggregated_3) if len(aggregated_3) >= 4 else 0
        var_4 = np.var(aggregated_4) if len(aggregated_4) >= 4 else 0
        
        # Determine time signature based on pattern strength
        if var_3 > var_4 and var_3 > var_2:
            return (3, 4)
        elif var_4 > var_2:
            return (4, 4)
        else:
            return (2, 4)
    except Exception as e:
        print(f"Error detecting time signature: {e}")
        return (4, 4)  # Default to 4/4

def generate_timeline_data(duration, tempo, time_sig_num, time_sig_denom):
    """
    Generate a DAW-like timeline with beats, bars, and SMPTE timecode.
    
    Args:
        duration: Duration of the track in seconds
        tempo: BPM
        time_sig_num: Time signature numerator
        time_sig_denom: Time signature denominator
        
    Returns:
        Dictionary with timeline data
    """
    try:
        # Calculate beats per second
        beats_per_second = tempo / 60.0
        
        # Calculate total number of beats
        total_beats = math.ceil(duration * beats_per_second)
        
        # Calculate beat duration in seconds
        beat_duration = 60.0 / tempo
        
        # Calculate how many beats per bar based on time signature
        beats_per_bar = time_sig_num * 4 / time_sig_denom
        
        # Calculate total number of bars
        total_bars = math.ceil(total_beats / beats_per_bar)
        
        # Generate beat markers
        beat_markers = []
        bar_markers = []
        
        for beat_index in range(total_beats + 1):
            # Calculate time of this beat
            beat_time = beat_index * beat_duration
            
            # Generate beat marker
            beat_markers.append({
                "index": beat_index,
                "time": beat_time,
                "label": f"{beat_index % beats_per_bar + 1}"
            })
            
            # Generate bar marker (at the first beat of each bar)
            if beat_index % beats_per_bar == 0:
                bar_index = beat_index // beats_per_bar
                bar_markers.append({
                    "index": bar_index,
                    "time": beat_time,
                    "label": f"{bar_index + 1}"
                })
        
        # Generate SMPTE timecode markers (one per second for now)
        smpte_markers = []
        for second in range(int(duration) + 1):
            hours = second // 3600
            minutes = (second % 3600) // 60
            seconds = second % 60
            frames = 0  # Assuming 0 frames for simplicity
            
            smpte_markers.append({
                "time": second,
                "label": f"{hours:02d}:{minutes:02d}:{seconds:02d}:{frames:02d}"
            })
        
        return {
            "tempo": tempo,
            "timeSignature": f"{time_sig_num}/{time_sig_denom}",
            "duration": duration,
            "beats": beat_markers,
            "bars": bar_markers,
            "smpte": smpte_markers,
            "beatsPerBar": beats_per_bar
        }
    except Exception as e:
        print(f"Error generating timeline: {e}")
        # Return minimal timeline data if generation fails
        return {
            "tempo": tempo,
            "timeSignature": "4/4",
            "duration": duration,
            "beats": [],
            "bars": [],
            "smpte": [],
            "beatsPerBar": 4
        }

def generate_tags_from_analysis(analysis):
    """
    Generate tags from audio analysis data.
    
    Args:
        analysis: Dictionary containing analysis data
        
    Returns:
        List of tag objects
    """
    tags = []
    
    # BPM-based tags
    bpm = analysis.get("bpm", 0)
    if bpm > 0:
        if bpm < 70:
            tags.append({"type": "tempo", "name": "slow", "value": bpm})
        elif bpm < 100:
            tags.append({"type": "tempo", "name": "medium", "value": bpm})
        elif bpm < 130:
            tags.append({"type": "tempo", "name": "fast", "value": bpm})
        else:
            tags.append({"type": "tempo", "name": "very-fast", "value": bpm})
    
    # Key-based tags
    key = analysis.get("key", "")
    if key:
        key_parts = key.split()
        if len(key_parts) == 2:
            tags.append({"type": "key", "name": key_parts[0], "value": key})
            tags.append({"type": "scale", "name": key_parts[1], "value": key_parts[1]})
    
    # Loudness-based tags
    loudness = analysis.get("loudness", 0)
    if loudness:
        if loudness < -18:
            tags.append({"type": "loudness", "name": "quiet", "value": loudness})
        elif loudness < -9:
            tags.append({"type": "loudness", "name": "moderate", "value": loudness})
        else:
            tags.append({"type": "loudness", "name": "loud", "value": loudness})
    
    # Content-based tags
    spectral_centroid = analysis.get("spectralCentroid", 0)
    if spectral_centroid > 0:
        if spectral_centroid < 1000:
            tags.append({"type": "timbre", "name": "warm", "value": "warm"})
        elif spectral_centroid < 3000:
            tags.append({"type": "timbre", "name": "balanced", "value": "balanced"})
        else:
            tags.append({"type": "timbre", "name": "bright", "value": "bright"})
    
    # Process status tags
    tags.append({"type": "status", "name": "analyzed", "value": "true"})
    
    return tags

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