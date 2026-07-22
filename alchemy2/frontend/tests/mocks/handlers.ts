/**
 * MSW Request Handlers
 *
 * @description Mock Service Worker handlers for API integration testing
 * @author Sound Forge Alchemy Team
 * @license MIT
 * @version 2.0.0
 */

import { http, HttpResponse } from 'msw';

const API_BASE = 'http://localhost:3000';

export const handlers = [
  // Spotify API handlers
  http.post(`${API_BASE}/api/spotify/fetch`, async ({ request }) => {
    const body = await request.json() as { url: string };

    if (!body.url) {
      return HttpResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    if (body.url.includes('invalid')) {
      return HttpResponse.json(
        { error: 'Invalid Spotify URL' },
        { status: 400 }
      );
    }

    return HttpResponse.json({
      success: true,
      type: 'playlist',
      id: 'test-playlist-123',
      name: 'Test Playlist',
      tracks: [
        { id: 'track-1', title: 'Test Track 1', artist: 'Test Artist 1' },
        { id: 'track-2', title: 'Test Track 2', artist: 'Test Artist 2' },
      ],
    });
  }),

  // Download API handlers
  http.post(`${API_BASE}/api/download/track`, async ({ request }) => {
    const body = await request.json() as { trackId: string };

    if (!body.trackId) {
      return HttpResponse.json(
        { error: 'Track ID is required' },
        { status: 400 }
      );
    }

    if (body.trackId === 'invalid-track') {
      return HttpResponse.json(
        { error: 'Track not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      success: true,
      jobId: `job-${body.trackId}-${Date.now()}`,
      status: 'pending',
    });
  }),

  // Processing API handlers
  http.post(`${API_BASE}/api/processing/separate`, async ({ request }) => {
    const body = await request.json() as { audioId: string; model?: string };

    if (!body.audioId) {
      return HttpResponse.json(
        { error: 'Audio ID is required' },
        { status: 400 }
      );
    }

    const model = body.model || 'htdemucs';
    const validModels = ['htdemucs', 'htdemucs_ft', 'htdemucs_6s', 'mdx_extra'];

    if (!validModels.includes(model)) {
      return HttpResponse.json(
        { error: 'Invalid model' },
        { status: 400 }
      );
    }

    return HttpResponse.json({
      success: true,
      jobId: `separation-job-${body.audioId}-${Date.now()}`,
      model,
      status: 'processing',
    });
  }),

  // Analysis API handlers
  http.post(`${API_BASE}/api/analysis/analyze`, async ({ request }) => {
    const body = await request.json() as { audioId: string };

    if (!body.audioId) {
      return HttpResponse.json(
        { error: 'Audio ID is required' },
        { status: 400 }
      );
    }

    return HttpResponse.json({
      success: true,
      jobId: `analysis-job-${body.audioId}-${Date.now()}`,
      status: 'analyzing',
    });
  }),

  http.get(`${API_BASE}/api/analysis/results/:jobId`, ({ params }) => {
    const { jobId } = params;

    return HttpResponse.json({
      success: true,
      jobId,
      results: {
        tempo: 120.5,
        key: 'C',
        scale: 'major',
        energy: 0.75,
        danceability: 0.68,
        valence: 0.82,
      },
      status: 'complete',
    });
  }),

  // Network error simulation
  http.post(`${API_BASE}/api/network-error`, () => {
    return HttpResponse.error();
  }),

  // Timeout simulation
  http.post(`${API_BASE}/api/timeout`, () => {
    return new Promise(() => {
      // Never resolve to simulate timeout
    });
  }),
];
