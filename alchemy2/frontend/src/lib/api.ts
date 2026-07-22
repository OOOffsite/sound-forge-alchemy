/**
 * API Client Library
 *
 * @description HTTP client for Alchemy2 backend API services
 * @author Sound Forge Alchemy Team
 * @license MIT
 * @version 2.0.0
 *
 * TDD Phase: GREEN - Implementation to make tests pass
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

// Type definitions
export interface FetchPlaylistResult {
  success: boolean;
  type: string;
  id: string;
  name?: string;
  tracks: Array<{
    id: string;
    title: string;
    artist: string;
  }>;
}

export interface DownloadTrackResult {
  success: boolean;
  jobId: string;
  status: string;
}

export interface SeparateStemsResult {
  success: boolean;
  jobId: string;
  model: string;
  status: string;
}

export interface AnalyzeAudioResult {
  success: boolean;
  jobId: string;
  status: string;
}

export interface AnalysisResults {
  success: boolean;
  jobId: string;
  results: {
    tempo: number;
    key: string;
    scale: string;
    energy: number;
    danceability: number;
    valence: number;
  };
  status: string;
}

export interface RequestOptions {
  timeout?: number;
  retries?: number;
}

export interface SeparateStemsOptions {
  model?: 'htdemucs' | 'htdemucs_ft' | 'htdemucs_6s' | 'mdx_extra';
}

/**
 * Custom error class for API errors
 */
export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Sleep utility for retry logic
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = 30000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new APIError('Request timeout', 408);
    }
    throw error;
  }
}

/**
 * Fetch with retry logic
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit & RequestOptions = {}
): Promise<Response> {
  const { retries = 0, timeout, ...fetchOptions } = options;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, {
        ...fetchOptions,
        timeout,
      });

      // If response is ok or non-retryable error, return it
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }

      // For 5xx errors, retry
      if (attempt < retries) {
        await sleep(Math.pow(2, attempt) * 100); // Exponential backoff
        continue;
      }

      return response;
    } catch (error: any) {
      lastError = error;

      // Retry on network errors or timeouts
      if (attempt < retries) {
        await sleep(Math.pow(2, attempt) * 100);
        continue;
      }
    }
  }

  throw lastError || new APIError('Request failed after retries');
}

/**
 * Generic request handler
 */
async function request<T>(
  endpoint: string,
  options: RequestInit & RequestOptions = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  try {
    const response = await fetchWithRetry(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new APIError(
        data.error || 'Request failed',
        response.status,
        data
      );
    }

    return data as T;
  } catch (error: any) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(error.message || 'Network error');
  }
}

/**
 * API Client
 */
export const api = {
  /**
   * Fetch playlist from Spotify URL
   */
  async fetchPlaylist(
    url: string,
    options?: RequestOptions
  ): Promise<FetchPlaylistResult> {
    if (!url || url.trim() === '') {
      throw new APIError('URL is required', 400);
    }

    return request<FetchPlaylistResult>('/api/spotify/fetch', {
      method: 'POST',
      body: JSON.stringify({ url }),
      ...options,
    });
  },

  /**
   * Download a track by ID
   */
  async downloadTrack(
    trackId: string,
    options?: RequestOptions
  ): Promise<DownloadTrackResult> {
    if (!trackId || trackId.trim() === '') {
      throw new APIError('Track ID is required', 400);
    }

    return request<DownloadTrackResult>('/api/download/track', {
      method: 'POST',
      body: JSON.stringify({ trackId }),
      ...options,
    });
  },

  /**
   * Separate audio into stems
   */
  async separateStems(
    audioId: string,
    stemOptions?: SeparateStemsOptions,
    requestOptions?: RequestOptions
  ): Promise<SeparateStemsResult> {
    if (!audioId || audioId.trim() === '') {
      throw new APIError('Audio ID is required', 400);
    }

    const model = stemOptions?.model || 'htdemucs';

    return request<SeparateStemsResult>('/api/processing/separate', {
      method: 'POST',
      body: JSON.stringify({ audioId, model }),
      ...requestOptions,
    });
  },

  /**
   * Analyze audio features
   */
  async analyzeAudio(
    audioId: string,
    options?: RequestOptions
  ): Promise<AnalyzeAudioResult> {
    if (!audioId || audioId.trim() === '') {
      throw new APIError('Audio ID is required', 400);
    }

    return request<AnalyzeAudioResult>('/api/analysis/analyze', {
      method: 'POST',
      body: JSON.stringify({ audioId }),
      ...options,
    });
  },

  /**
   * Get analysis results
   */
  async getAnalysisResults(
    jobId: string,
    options?: RequestOptions
  ): Promise<AnalysisResults> {
    if (!jobId || jobId.trim() === '') {
      throw new APIError('Job ID is required', 400);
    }

    return request<AnalysisResults>(`/api/analysis/results/${jobId}`, {
      method: 'GET',
      ...options,
    });
  },
};
