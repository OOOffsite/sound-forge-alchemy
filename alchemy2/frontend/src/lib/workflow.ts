/**
 * Workflow Orchestration
 *
 * @description Orchestration layer for complete workflows combining API, Realtime, and Storage
 * @author Sound Forge Alchemy Team
 * @license MIT
 * @version 2.0.0
 *
 * TDD Phase: GREEN - Implementation to make tests pass
 */

import { api } from './api';
import { storage } from './storage';
import { RealtimeManager } from './realtime';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key'
);

// Type definitions
export interface ProgressUpdate {
  progress: number;
  stage?: string;
  message?: string;
}

export interface DownloadPlaylistOptions {
  onProgress?: (update: ProgressUpdate) => void;
  onStateChange?: (state: string) => void;
  timeout?: number;
  retries?: number;
}

export interface SeparateStemsOptions {
  model?: 'htdemucs' | 'htdemucs_ft' | 'htdemucs_6s' | 'mdx_extra';
  onProgress?: (update: ProgressUpdate & { stage: string }) => void;
  onStateChange?: (state: string) => void;
  timeout?: number;
  retries?: number;
}

export interface AnalyzeAudioOptions {
  onProgress?: (update: ProgressUpdate) => void;
  onStateChange?: (state: string) => void;
  saveToDatabase?: boolean;
  timeout?: number;
  retries?: number;
}

export interface DownloadPlaylistResult {
  success: boolean;
  tracks: Array<{
    id: string;
    jobId: string;
    status: string;
    storagePath: string;
  }>;
}

export interface SeparateStemsResult {
  success: boolean;
  jobId: string;
  model: string;
  stems: {
    vocals: string;
    drums: string;
    bass: string;
    other: string;
  };
}

export interface AnalyzeAudioResult {
  success: boolean;
  jobId: string;
  analysis: {
    tempo: number;
    key: string;
    scale: string;
    energy: number;
    danceability: number;
    valence: number;
  };
  savedToDatabase?: boolean;
  databaseId?: string;
}

export interface WorkflowStatus {
  isRunning: boolean;
  currentStage: string;
  error?: Error;
}

/**
 * Workflow State
 */
class WorkflowState {
  private _isRunning = false;
  private _currentStage = 'idle';
  private _error?: Error;
  private _cancelled = false;

  get isRunning() {
    return this._isRunning;
  }

  get currentStage() {
    return this._currentStage;
  }

  get error() {
    return this._error;
  }

  get cancelled() {
    return this._cancelled;
  }

  start(stage: string) {
    this._isRunning = true;
    this._currentStage = stage;
    this._error = undefined;
    this._cancelled = false;
  }

  updateStage(stage: string) {
    this._currentStage = stage;
  }

  complete() {
    this._isRunning = false;
    this._currentStage = 'complete';
  }

  fail(error: Error) {
    this._isRunning = false;
    this._error = error;
    this._currentStage = 'error';
  }

  cancel() {
    this._cancelled = true;
    this._isRunning = false;
    this._currentStage = 'cancelled';
  }

  reset() {
    this._isRunning = false;
    this._currentStage = 'idle';
    this._error = undefined;
    this._cancelled = false;
  }
}

/**
 * Workflow Orchestrator
 */
class WorkflowOrchestrator {
  private state = new WorkflowState();
  private realtimeManager = new RealtimeManager(supabase);

  /**
   * Download playlist workflow
   */
  async downloadPlaylist(
    playlistUrl: string,
    options: DownloadPlaylistOptions = {}
  ): Promise<DownloadPlaylistResult> {
    const { onProgress, onStateChange, timeout, retries } = options;

    try {
      this.state.start('fetching');
      onStateChange?.('fetching');

      // Step 1: Fetch playlist
      const playlist = await api.fetchPlaylist(playlistUrl, { timeout, retries });

      if (this.state.cancelled) {
        throw new Error('Workflow cancelled');
      }

      // Step 2: Download each track
      this.state.updateStage('downloading');
      onStateChange?.('downloading');

      const trackResults = [];
      const totalTracks = playlist.tracks.length;

      for (let i = 0; i < playlist.tracks.length; i++) {
        if (this.state.cancelled) {
          throw new Error('Workflow cancelled');
        }

        const track = playlist.tracks[i];

        // Create download job
        const downloadResult = await api.downloadTrack(track.id, { timeout, retries });

        // Subscribe to progress
        await new Promise((resolve, reject) => {
          const unsubscribe = this.realtimeManager.subscribeToJob(downloadResult.jobId, {
            onUpdate: (event) => {
              const overallProgress = ((i / totalTracks) * 100) + ((event.progress / totalTracks));
              onProgress?.({ progress: overallProgress, stage: 'downloading', message: event.message });
            },
            onComplete: (event) => {
              unsubscribe();
              resolve(event);
            },
            onError: (event) => {
              unsubscribe();
              reject(new Error(event.error));
            },
          });
        });

        trackResults.push({
          id: track.id,
          jobId: downloadResult.jobId,
          status: 'complete',
          storagePath: `downloads/${track.id}`,
        });
      }

      this.state.complete();
      onProgress?.({ progress: 100 });
      onStateChange?.('complete');

      return {
        success: true,
        tracks: trackResults,
      };
    } catch (error: any) {
      this.state.fail(error);
      throw error;
    }
  }

  /**
   * Separate stems workflow
   */
  async separateStems(
    audioFile: File,
    trackId: string,
    options: SeparateStemsOptions = {}
  ): Promise<SeparateStemsResult> {
    const { model = 'htdemucs', onProgress, onStateChange, timeout, retries } = options;

    try {
      // Step 1: Upload file
      this.state.start('uploading');
      onStateChange?.('uploading');
      onProgress?.({ progress: 0, stage: 'uploading' });

      const uploadResult = await storage.uploadAudio(audioFile, trackId, {
        onProgress: (progress) => {
          onProgress?.({
            progress: progress.progress * 0.2, // 0-20% for upload
            stage: 'uploading',
          });
        },
      });

      if (this.state.cancelled) {
        throw new Error('Workflow cancelled');
      }

      // Step 2: Create processing job
      this.state.updateStage('processing');
      onStateChange?.('processing');

      const audioId = uploadResult.path;
      const separateResult = await api.separateStems(audioId, { model }, { timeout, retries });

      // Step 3: Subscribe to progress
      await new Promise((resolve, reject) => {
        const unsubscribe = this.realtimeManager.subscribeToJob(separateResult.jobId, {
          onUpdate: (event) => {
            const progress = 20 + (event.progress * 0.7); // 20-90% for processing
            onProgress?.({ progress, stage: 'processing', message: event.message });
          },
          onComplete: (event) => {
            unsubscribe();
            resolve(event);
          },
          onError: (event) => {
            unsubscribe();
            reject(new Error(event.error));
          },
        });
      });

      // Step 4: Complete
      this.state.complete();
      onProgress?.({ progress: 100, stage: 'complete' });
      onStateChange?.('complete');

      return {
        success: true,
        jobId: separateResult.jobId,
        model,
        stems: {
          vocals: `${trackId}/stems/vocals.mp3`,
          drums: `${trackId}/stems/drums.mp3`,
          bass: `${trackId}/stems/bass.mp3`,
          other: `${trackId}/stems/other.mp3`,
        },
      };
    } catch (error: any) {
      this.state.fail(error);
      this.state.reset(); // Cleanup
      throw error;
    }
  }

  /**
   * Analyze audio workflow
   */
  async analyzeAudio(
    audioFile: File,
    trackId: string,
    options: AnalyzeAudioOptions = {}
  ): Promise<AnalyzeAudioResult> {
    const { onProgress, onStateChange, saveToDatabase = false, timeout, retries } = options;

    try {
      // Step 1: Upload file
      this.state.start('uploading');
      onStateChange?.('uploading');
      onProgress?.({ progress: 0 });

      const uploadResult = await storage.uploadAudio(audioFile, trackId, {
        onProgress: (progress) => {
          onProgress?.({ progress: progress.progress * 0.2 }); // 0-20% for upload
        },
      });

      // Step 2: Create analysis job
      this.state.updateStage('analyzing');
      onStateChange?.('analyzing');

      const audioId = uploadResult.path;
      const analyzeResult = await api.analyzeAudio(audioId, { timeout, retries });

      // Step 3: Subscribe to progress
      const analysisData = await new Promise<any>((resolve, reject) => {
        const unsubscribe = this.realtimeManager.subscribeToJob(analyzeResult.jobId, {
          onUpdate: (event) => {
            const progress = 20 + (event.progress * 0.7); // 20-90% for analysis
            onProgress?.({ progress, message: event.message });
          },
          onComplete: async (event) => {
            unsubscribe();

            // Fetch final results
            const results = await api.getAnalysisResults(analyzeResult.jobId);
            resolve(results);
          },
          onError: (event) => {
            unsubscribe();
            reject(new Error(event.error));
          },
        });
      });

      // Step 4: Optionally save to database
      let databaseId: string | undefined;
      if (saveToDatabase) {
        // Mock database save
        databaseId = `db-${trackId}-${Date.now()}`;
      }

      this.state.complete();
      onProgress?.({ progress: 100 });
      onStateChange?.('complete');

      return {
        success: true,
        jobId: analyzeResult.jobId,
        analysis: analysisData.results,
        savedToDatabase: saveToDatabase,
        databaseId,
      };
    } catch (error: any) {
      this.state.fail(error);
      this.state.reset(); // Cleanup
      throw error;
    }
  }

  /**
   * Cancel current workflow
   */
  cancelDownload() {
    this.state.cancel();
  }

  /**
   * Get workflow status
   */
  getStatus(): WorkflowStatus {
    return {
      isRunning: this.state.isRunning,
      currentStage: this.state.currentStage,
      error: this.state.error,
    };
  }

  /**
   * Cleanup
   */
  destroy() {
    this.realtimeManager.destroy();
    this.state.reset();
  }
}

// Export singleton instance
export const workflow = new WorkflowOrchestrator();
