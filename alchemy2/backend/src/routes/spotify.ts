/**
 * Spotify Routes
 *
 * @module routes/spotify
 * @description Spotify metadata fetching and URL parsing
 * @migrated_from backend/spotify/src/index.js
 * @refactored TDD Phase: Extracted service layer for better separation of concerns
 *
 * Endpoints:
 * - POST /api/spotify/fetch - Fetch track metadata from Spotify URL
 * - GET /api/spotify/health - Health check endpoint
 *
 * @author Sound Forge Alchemy Team
 * @version 2.0.0
 * @license MIT
 */

import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { createSpotifyService, SpotifyService } from '../services/spotifyService';

const router = Router();

// Validation schemas
const fetchSchema = Joi.object({
  url: Joi.string().uri().required(),
  type: Joi.string().valid('track', 'playlist', 'album').optional()
});

// Initialize Spotify service (singleton per module)
let spotifyService: SpotifyService | null = null;

/**
 * Get or create Spotify service instance
 */
function getSpotifyService(req: Request): SpotifyService {
  if (!spotifyService) {
    const logger = req.app.locals.logger;
    spotifyService = createSpotifyService(logger);
  }
  return spotifyService;
}

/**
 * POST /api/spotify/fetch
 * Fetch track metadata from Spotify URL
 */
router.post('/fetch', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const supabase = req.app.locals.supabase;
  const service = getSpotifyService(req);

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

    // Validate Spotify URL format
    const spotifyInfo = service.extractSpotifyInfo(url);
    if (!spotifyInfo) {
      return res.status(400).json({
        error: 'Invalid Spotify URL',
        message: 'URL must be a valid Spotify track, album, or playlist URL'
      });
    }

    // Fetch metadata using service
    const metadata = await service.fetchMetadataByURL(url);

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

    logger.info(`Successfully fetched metadata for ${metadata.type}: ${metadata.name}`);

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
  const service = getSpotifyService(req);
  const tokenStatus = service.getTokenStatus();

  res.json({
    status: 'ok',
    service: 'spotify',
    ...tokenStatus
  });
});

export default router;
