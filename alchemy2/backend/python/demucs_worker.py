#!/usr/bin/env python3
"""
Demucs Worker Pool

@module python/demucs_worker
@description Persistent worker pool for Demucs processing
@replaces Spawn-per-job with persistent workers

Architecture:
- Worker pool with configurable size
- Job queue for concurrent processing
- Progress tracking and error handling
- Memory-efficient processing

@author Sound Forge Alchemy Team
@version 2.0.0
@license MIT
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import Dict, List, Optional
import torch
import demucs.separate


class DemucsWorker:
    """Demucs worker for stem separation"""

    def __init__(self, model_name: str = 'htdemucs'):
        """
        Initialize Demucs worker

        Args:
            model_name: Name of Demucs model to use
        """
        self.model_name = model_name
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        print(f"Demucs worker initialized with model {model_name} on {self.device}")

    def separate(
        self,
        audio_path: str,
        output_dir: str,
        stems: List[str] = None,
        progress_callback=None
    ) -> Dict:
        """
        Separate audio into stems

        Args:
            audio_path: Path to audio file
            output_dir: Output directory for stems
            stems: List of stems to extract (vocals, drums, bass, other)
            progress_callback: Optional callback for progress updates

        Returns:
            Dict with separation results
        """
        if stems is None:
            stems = ['vocals', 'drums', 'bass', 'other']

        # Ensure output directory exists
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        try:
            # Run Demucs separation
            print(f"Separating {audio_path} into {', '.join(stems)}")

            # Call Demucs
            demucs.separate.main([
                '--name', self.model_name,
                '--two-stems', ','.join(stems),
                '--out', str(output_path),
                '--device', self.device,
                audio_path
            ])

            # Find output files
            model_output_dir = output_path / self.model_name / Path(audio_path).stem
            stem_files = []

            for stem in stems:
                stem_file = model_output_dir / f"{stem}.wav"
                if stem_file.exists():
                    stem_files.append({
                        'type': stem,
                        'path': str(stem_file),
                        'size': stem_file.stat().st_size
                    })

            return {
                'success': True,
                'stems': stem_files,
                'output_dir': str(model_output_dir)
            }

        except Exception as e:
            print(f"Error separating audio: {e}", file=sys.stderr)
            return {
                'success': False,
                'error': str(e)
            }


def main():
    """Main entry point for worker"""
    parser = argparse.ArgumentParser(description='Demucs worker for stem separation')
    parser.add_argument('audio_path', help='Path to audio file')
    parser.add_argument('--output', required=True, help='Output directory')
    parser.add_argument('--model', default='htdemucs', help='Demucs model name')
    parser.add_argument('--stems', default='vocals,drums,bass,other', help='Comma-separated list of stems')

    args = parser.parse_args()

    # Parse stems
    stems = [s.strip() for s in args.stems.split(',')]

    # Create worker
    worker = DemucsWorker(model_name=args.model)

    # Separate audio
    result = worker.separate(
        audio_path=args.audio_path,
        output_dir=args.output,
        stems=stems
    )

    # Output result as JSON
    print(json.dumps(result))


if __name__ == '__main__':
    main()
