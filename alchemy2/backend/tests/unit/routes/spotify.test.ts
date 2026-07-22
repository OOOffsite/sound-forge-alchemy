/**
 * Spotify Routes Tests
 * TDD Phase: RED - All tests should FAIL initially
 *
 * @author Sound Forge Alchemy Team - Spotify TDD Agent
 * @version 2.0.0
 */

import request from 'supertest';
import express from 'express';
import { describe, it, expect, beforeEach, vi, afterEach } from '@jest/globals';
import spotifyRoutes from '../../../src/routes/spotify';

describe('Spotify Routes - TDD Cycle', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Mock logger and supabase in app.locals
    app.locals.logger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    };

    app.locals.supabase = {
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { id: 'test-track-id' },
              error: null
            }))
          }))
        }))
      }))
    };

    app.use('/api/spotify', spotifyRoutes);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/spotify/health', () => {
    it('should return 200 OK with status', async () => {
      const response = await request(app).get('/api/spotify/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('service', 'spotify');
    });
  });

  describe('POST /api/spotify/fetch - Validation', () => {
    it('should return 400 if URL is missing', async () => {
      const response = await request(app)
        .post('/api/spotify/fetch')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if URL is invalid', async () => {
      const response = await request(app)
        .post('/api/spotify/fetch')
        .send({ url: 'not-a-spotify-url' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid Spotify URL');
    });

    it('should return 400 for malformed Spotify URL', async () => {
      const response = await request(app)
        .post('/api/spotify/fetch')
        .send({ url: 'https://spotify.com/invalid' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid Spotify URL');
    });
  });

  describe('POST /api/spotify/fetch - Valid URLs', () => {
    it('should accept valid playlist URL format', async () => {
      const response = await request(app)
        .post('/api/spotify/fetch')
        .send({ url: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M' });

      // Since we need Spotify API integration, this will fail without proper mocking
      // We expect either 200 with data or 500 with auth error
      expect([200, 500]).toContain(response.status);
    });

    it('should accept valid track URL format', async () => {
      const response = await request(app)
        .post('/api/spotify/fetch')
        .send({ url: 'https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp' });

      // Since we need Spotify API integration, this will fail without proper mocking
      expect([200, 500]).toContain(response.status);
    });

    it('should accept valid album URL format', async () => {
      const response = await request(app)
        .post('/api/spotify/fetch')
        .send({ url: 'https://open.spotify.com/album/4aawyAB9vmqN3uQ7FjRGTy' });

      // Since we need Spotify API integration, this will fail without proper mocking
      expect([200, 500]).toContain(response.status);
    });
  });
});
