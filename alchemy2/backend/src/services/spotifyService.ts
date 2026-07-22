/**
 * Spotify Service
 *
 * @module services/spotifyService
 * @description Service layer for Spotify API interactions
 * @author Sound Forge Alchemy Team
 * @version 2.0.0
 * @license MIT
 *
 * TDD Refactoring: Extracted from routes/spotify.ts for better separation of concerns
 */

import SpotifyWebApi from 'spotify-web-api-node';
import { Logger } from 'winston';

/**
 * Spotify Item Type
 */
export type SpotifyItemType = 'track' | 'album' | 'playlist';

/**
 * Spotify Item Metadata Interface
 */
export interface SpotifyItemMetadata {
  id: string;
  type: SpotifyItemType;
  name: string;
  artists?: string[];
  album?: string;
  albumArt?: string;
  duration?: number;
  url: string;
  previewUrl?: string | null;
  description?: string;
  owner?: string;
  totalTracks?: number;
  releaseDate?: string;
}

/**
 * Extract Spotify ID and Type from URL
 */
export interface SpotifyURLInfo {
  type: SpotifyItemType;
  id: string;
}

/**
 * Spotify Service Class
 */
export class SpotifyService {
  private spotifyApi: SpotifyWebApi;
  private accessToken: string | null = null;
  private tokenExpirationTime: number = 0;
  private logger?: Logger;

  constructor(logger?: Logger) {
    this.logger = logger;
    this.spotifyApi = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET
    });
  }

  /**
   * Extract Spotify ID and type from URL
   */
  extractSpotifyInfo(url: string): SpotifyURLInfo | null {
    const urlPattern = /spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/;
    const match = url.match(urlPattern);

    if (!match) {
      return null;
    }

    return {
      type: match[1] as SpotifyItemType,
      id: match[2]
    };
  }

  /**
   * Ensure Spotify access token is valid
   */
  async ensureToken(): Promise<void> {
    const now = Date.now();

    if (!this.accessToken || now >= this.tokenExpirationTime) {
      this.logger?.info('Refreshing Spotify access token...');

      try {
        const data = await this.spotifyApi.clientCredentialsGrant();
        this.accessToken = data.body.access_token;
        this.tokenExpirationTime = now + (data.body.expires_in * 1000) - 60000; // Refresh 1 min early
        this.spotifyApi.setAccessToken(this.accessToken);

        this.logger?.info('Spotify access token refreshed');
      } catch (error) {
        this.logger?.error('Failed to refresh Spotify token:', error);
        throw new Error('Spotify authentication failed');
      }
    }
  }

  /**
   * Fetch track metadata
   */
  async fetchTrackMetadata(trackId: string): Promise<SpotifyItemMetadata> {
    await this.ensureToken();

    const trackData = await this.spotifyApi.getTrack(trackId);

    return {
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
  }

  /**
   * Fetch album metadata
   */
  async fetchAlbumMetadata(albumId: string): Promise<SpotifyItemMetadata> {
    await this.ensureToken();

    const albumData = await this.spotifyApi.getAlbum(albumId);

    return {
      id: albumData.body.id,
      type: 'album',
      name: albumData.body.name,
      artists: albumData.body.artists.map(a => a.name),
      albumArt: albumData.body.images[0]?.url,
      totalTracks: albumData.body.total_tracks,
      releaseDate: albumData.body.release_date,
      url: albumData.body.external_urls.spotify
    };
  }

  /**
   * Fetch playlist metadata
   */
  async fetchPlaylistMetadata(playlistId: string): Promise<SpotifyItemMetadata> {
    await this.ensureToken();

    const playlistData = await this.spotifyApi.getPlaylist(playlistId);

    return {
      id: playlistData.body.id,
      type: 'playlist',
      name: playlistData.body.name,
      description: playlistData.body.description || undefined,
      owner: playlistData.body.owner.display_name,
      totalTracks: playlistData.body.tracks.total,
      url: playlistData.body.external_urls.spotify
    };
  }

  /**
   * Fetch metadata by URL
   */
  async fetchMetadataByURL(url: string): Promise<SpotifyItemMetadata> {
    const info = this.extractSpotifyInfo(url);

    if (!info) {
      throw new Error('Invalid Spotify URL');
    }

    switch (info.type) {
      case 'track':
        return this.fetchTrackMetadata(info.id);
      case 'album':
        return this.fetchAlbumMetadata(info.id);
      case 'playlist':
        return this.fetchPlaylistMetadata(info.id);
      default:
        throw new Error(`Unsupported Spotify type: ${info.type}`);
    }
  }

  /**
   * Get current token status
   */
  getTokenStatus(): { hasToken: boolean; tokenExpires: string | null } {
    return {
      hasToken: !!this.accessToken,
      tokenExpires: this.tokenExpirationTime
        ? new Date(this.tokenExpirationTime).toISOString()
        : null
    };
  }
}

/**
 * Create Spotify Service instance
 */
export function createSpotifyService(logger?: Logger): SpotifyService {
  return new SpotifyService(logger);
}
