require('dotenv').config();
const express = require('express');
const cors = require('cors');
const SpotifyWebApi = require('spotify-web-api-node');
const Redis = require('ioredis');

// Initialize Redis client
const redis = new Redis(process.env.REDIS_URL);

const app = express();
const PORT = process.env.PORT || 3001;

// Spotify API credentials
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET
});

// Middleware
app.use(cors());
app.use(express.json());

// Refresh Spotify access token
async function refreshSpotifyToken() {
  try {
    const data = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(data.body['access_token']);
    console.log('Spotify token refreshed successfully');
    
    // Set token expiration for 1 hour
    setTimeout(refreshSpotifyToken, data.body['expires_in'] * 1000 - 5 * 60 * 1000);
  } catch (error) {
    console.error('Error refreshing Spotify token:', error);
    
    // Retry after 1 minute in case of failure
    setTimeout(refreshSpotifyToken, 60 * 1000);
  }
}

// Initial token refresh
refreshSpotifyToken();

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send({ status: 'ok' });
});

// Extract Spotify ID from a playlist/album/track URL
function extractSpotifyId(url) {
  const regex = /spotify\.com\/(playlist|album|track)\/([a-zA-Z0-9]+)/;
  const match = url.match(regex);
  
  if (match && match.length >= 3) {
    return {
      type: match[1],
      id: match[2]
    };
  }
  return null;
}

// Endpoint to fetch playlist/album/track details
app.post('/fetch', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    const spotifyItem = extractSpotifyId(url);
    
    if (!spotifyItem) {
      return res.status(400).json({ error: 'Invalid Spotify URL' });
    }
    
    // Check cache first
    const cacheKey = `spotify:${spotifyItem.type}:${spotifyItem.id}`;
    const cachedData = await redis.get(cacheKey);
    
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }
    
    let results;
    let tracks = [];
    
    switch (spotifyItem.type) {
      case 'playlist':
        results = await spotifyApi.getPlaylist(spotifyItem.id);
        tracks = results.body.tracks.items.map(item => ({
          id: item.track.id,
          title: item.track.name,
          artist: item.track.artists.map(artist => artist.name).join(', '),
          albumArt: item.track.album.images[0]?.url,
          duration: msToMinSec(item.track.duration_ms),
          albumName: item.track.album.name,
          releaseDate: item.track.album.release_date,
          previewUrl: item.track.preview_url
        }));
        break;
        
      case 'album':
        results = await spotifyApi.getAlbum(spotifyItem.id);
        const albumTracks = await spotifyApi.getAlbumTracks(spotifyItem.id);
        tracks = albumTracks.body.items.map(track => ({
          id: track.id,
          title: track.name,
          artist: track.artists.map(artist => artist.name).join(', '),
          albumArt: results.body.images[0]?.url,
          duration: msToMinSec(track.duration_ms),
          albumName: results.body.name,
          releaseDate: results.body.release_date,
          previewUrl: track.preview_url
        }));
        break;
        
      case 'track':
        results = await spotifyApi.getTrack(spotifyItem.id);
        tracks = [{
          id: results.body.id,
          title: results.body.name,
          artist: results.body.artists.map(artist => artist.name).join(', '),
          albumArt: results.body.album.images[0]?.url,
          duration: msToMinSec(results.body.duration_ms),
          albumName: results.body.album.name,
          releaseDate: results.body.album.release_date,
          previewUrl: results.body.preview_url
        }];
        break;
    }
    
    const response = {
      type: spotifyItem.type,
      id: spotifyItem.id,
      name: results.body.name,
      description: results.body.description,
      tracks: tracks
    };
    
    // Cache the response for 1 hour
    await redis.set(cacheKey, JSON.stringify(response), 'EX', 3600);
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching Spotify data:', error);
    res.status(500).json({ error: 'Failed to fetch data from Spotify' });
  }
});

// Helper function to convert milliseconds to MM:SS format
function msToMinSec(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

// Start the server
app.listen(PORT, () => {
  console.log(`Spotify service listening on port ${PORT}`);
});