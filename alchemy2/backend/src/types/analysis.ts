/**
 * Analysis Types
 *
 * @module types/analysis
 * @description Type definitions for audio analysis features and results
 * @author Sound Forge Alchemy Team
 * @version 2.0.0
 * @license MIT
 */

/**
 * Available audio analysis features
 */
export type AnalysisFeature =
  | 'tempo'
  | 'key'
  | 'energy'
  | 'spectral'
  | 'mfcc'
  | 'chroma'
  | 'all';

/**
 * Tempo analysis result
 */
export interface TempoResult {
  tempo: number;
  beats?: number[];
  beat_count?: number;
}

/**
 * Key analysis result
 */
export interface KeyResult {
  key: string;
  confidence?: number;
  pitch_class?: string;
  mode?: 'major' | 'minor';
}

/**
 * Energy analysis result
 */
export interface EnergyResult {
  energy: number;
  energy_variance?: number;
  energy_max?: number;
  energy_min?: number;
  zero_crossing_rate?: number;
}

/**
 * Spectral analysis result
 */
export interface SpectralResult {
  spectral_centroid: number;
  spectral_centroid_variance?: number;
  spectral_rolloff?: number;
  spectral_bandwidth?: number;
  spectral_contrast?: number[];
  spectral_flatness?: number;
}

/**
 * MFCC analysis result
 */
export interface MFCCResult {
  mfcc: number[];
  mfcc_variance?: number[];
  n_mfcc?: number;
}

/**
 * Chroma analysis result
 */
export interface ChromaResult {
  chroma_stft?: number[];
  chroma_cqt?: number[];
  chroma_cens?: number[];
}

/**
 * Complete analysis result
 */
export interface AnalysisResult {
  duration?: number;
  sample_rate?: number;
  samples?: number;
  tempo?: number;
  key?: string;
  energy?: number;
  beats?: number[];
  beat_count?: number;
  confidence?: number;
  pitch_class?: string;
  mode?: string;
  energy_variance?: number;
  energy_max?: number;
  energy_min?: number;
  zero_crossing_rate?: number;
  spectral_centroid?: number;
  spectral_centroid_variance?: number;
  spectral_rolloff?: number;
  spectral_bandwidth?: number;
  spectral_contrast?: number[];
  spectral_flatness?: number;
  mfcc?: number[];
  mfcc_variance?: number[];
  n_mfcc?: number;
  chroma_stft?: number[];
  chroma_cqt?: number[];
  chroma_cens?: number[];
  [key: string]: any; // Allow additional features
}

/**
 * Analysis request payload
 */
export interface AnalyzeRequest {
  trackId: string;
  audioFilePath: string;
  features?: AnalysisFeature[];
}

/**
 * Analysis job metadata
 */
export interface AnalysisJobMetadata {
  audioFilePath: string;
  features: AnalysisFeature[];
}

/**
 * Analysis job response
 */
export interface AnalyzeResponse {
  success: boolean;
  jobId: string;
  trackId: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
}

/**
 * Job status response
 */
export interface JobStatusResponse {
  success: boolean;
  job: {
    id: string;
    track_id: string;
    type: string;
    status: 'queued' | 'processing' | 'completed' | 'error';
    progress: number;
    metadata?: AnalysisJobMetadata;
    result?: AnalysisResult;
    error?: string;
    created_at?: string;
    updated_at?: string;
  };
}

/**
 * Analysis worker configuration
 */
export interface AnalyzerConfig {
  scriptPath: string;
  pythonExecutable: string;
  timeout?: number;
  maxRetries?: number;
}
