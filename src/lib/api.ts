import axios from 'axios';

// Get API URL from environment
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Spotify endpoints
export const spotifyApi = {
  fetchPlaylist: async (url: string) => {
    const response = await api.post('/api/spotify/fetch', { url });
    return response.data;
  },
};

// Download endpoints
export const downloadApi = {
  downloadTrack: async (trackId: string, spotifyUrl: string, trackInfo?: any) => {
    const response = await api.post('/api/download/track', {
      trackId,
      spotifyUrl,
      trackInfo,
    });
    return response.data;
  },
  getJobStatus: async (jobId: string) => {
    const response = await api.get(`/api/download/job/${jobId}`);
    return response.data;
  },
  getTrackStatus: async (trackId: string) => {
    const response = await api.get(`/api/download/track/${trackId}`);
    return response.data;
  },
};

// Processing endpoints
export const processingApi = {
  separateTrack: async (trackId: string, options: any) => {
    const response = await api.post('/api/process/separate', {
      trackId,
      options,
    });
    return response.data;
  },
  getJobStatus: async (jobId: string) => {
    const response = await api.get(`/api/process/job/${jobId}`);
    return response.data;
  },
  getTrackStatus: async (trackId: string) => {
    const response = await api.get(`/api/process/track/${trackId}`);
    return response.data;
  },
};

// Analysis endpoints
export const analysisApi = {
  analyzeTrack: async (trackId: string) => {
    const response = await api.post('/api/analyze/analyze', {
      trackId,
    });
    return response.data;
  },
  getJobStatus: async (jobId: string) => {
    const response = await api.get(`/api/analyze/job/${jobId}`);
    return response.data;
  },
  getTrackAnalysis: async (trackId: string) => {
    const response = await api.get(`/api/analyze/track/${trackId}`);
    return response.data;
  },
};

export default api;