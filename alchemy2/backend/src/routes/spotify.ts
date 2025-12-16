/**
 * Spotify Routes
 *
 * @module routes/spotify
 * @description Spotify metadata fetching and URL parsing
 * @migrated_from backend/spotify/src/index.js
 *
 * Endpoints:
 * - POST /api/spotify/fetch - Fetch track metadata from Spotify URL
 * - GET /api/spotify/fetch/stream - Stream track metadata
 *
 * @author Sound Forge Alchemy Team
 * @version 2.0.0
 */

import { Router, Request, Response, NextFunction } from 'express';
import SpotifyWebApi from 'spotify-web-api-node';
import Joi from 'joi';

const router = Router();

// Validation schemas
const fetchSchema = Joi.object({
  url: Joi.string().uri().required(),
  type: Joi.string().valid('track', 'playlist', 'album').optional()
});

// Initialize Spotify API client
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET
});

// Token refresh middleware
let accessToken: string | null = null;
let tokenExpirationTime: number = 0;

async function ensureSpotifyToken(req: Request, res: Response, next: NextFunction) {
  const logger = req.app.locals.logger;

  try {
    const now = Date.now();
    if (!accessToken || now >= tokenExpirationTime) {
      logger.info('Refreshing Spotify access token...');
      const data = await spotifyApi.clientCredentialsGrant();
      accessToken = data.body.access_token;
      tokenExpirationTime = now + (data.body.expires_in * 1000) - 60000; // Refresh 1 min early
      spotifyApi.setAccessToken(accessToken);
      logger.info('Spotify access token refreshed');
    }
    next();
  } catch (error) {
    logger.error('Failed to refresh Spotify token:', error);
    res.status(500).json({
      error: 'Spotify authentication failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * POST /api/spotify/fetch
 * Fetch track metadata from Spotify URL
 */
router.post('/fetch', ensureSpotifyToken, async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const supabase = req.app.locals.supabase;

  try {
    // Validate request
    const { error: validationError, value } = fetchSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationError.details
      });
    }

    const { url } = value;
    logger.info(`Fetching metadata for Spotify URL: ${url}`);

    // Extract Spotify ID and type from URL
    const urlPattern = /spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/;
    const match = url.match(urlPattern);

    if (!match) {
      return res.status(400).json({
        error: 'Invalid Spotify URL',
        message: 'URL must be a valid Spotify track, album, or playlist URL'
      });
    }

    const [, type, id] = match;

    // Fetch metadata based on type
    let metadata: any;
    switch (type) {
      case 'track':
        const trackData = await spotifyApi.getTrack(id);
        metadata = {
          id: trackData.body.id,
          type: 'track',
          name: trackData.body.name,
          artists: trackData.body.artists.map(a => a.name),
          album: trackData.body.album.name,
          albumArt: trackData.body.album.images[0]?.url,
          duration: trackData.body.duration_ms,
          url: trackData.body.external_urls.spotify,
          previewUrl: trackData.body.preview_url
        };
        break;

      case 'album':
        const albumData = await spotifyApi.getAlbum(id);
        metadata = {
          id: albumData.body.id,
          type: 'album',
          name: albumData.body.name,
          artists: albumData.body.artists.map(a => a.name),
          albumArt: albumData.body.images[0]?.url,
          totalTracks: albumData.body.total_tracks,
          releaseDate: albumData.body.release_date,
          url: albumData.body.external_urls.spotify
        };
        break;

      case 'playlist':
        const playlistData = await spotifyApi.getPlaylist(id);
        metadata = {
          id: playlistData.body.id,
          type: 'playlist',
          name: playlistData.body.name,
          description: playlistData.body.description,
          owner: playlistData.body.owner.display_name,
          totalTracks: playlistData.body.tracks.total,
          url: playlistData.body.external_urls.spotify
        };
        break;
    }

    // Store in Supabase
    const { data: track, error: dbError } = await supabase
      .from('tracks')
      .insert({
        spotify_id: metadata.id,
        spotify_url: url,
        type: metadata.type,
        title: metadata.name,
        artist: Array.isArray(metadata.artists) ? metadata.artists.join(', ') : metadata.artists,
        album: metadata.album,
        album_art: metadata.albumArt,
        duration: metadata.duration,
        metadata: metadata
      })
      .select()
      .single();

    if (dbError) {
      logger.error('Failed to store track metadata:', dbError);
    }

    logger.info(`Successfully fetched metadata for ${type}: ${metadata.name}`);

    res.json({
      success: true,
      metadata,
      trackId: track?.id
    });

  } catch (error) {
    logger.error('Error fetching Spotify metadata:', error);
    res.status(500).json({
      error: 'Failed to fetch metadata',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/spotify/health
 * Health check
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'spotify',
    hasToken: !!accessToken,
    tokenExpires: tokenExpirationTime ? new Date(tokenExpirationTime).toISOString() : null
  });
});

export default router;
