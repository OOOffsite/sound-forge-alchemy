// require('dotenv').config();
const express = require("express");
const cors = require("cors");
const SpotifyWebApi = require("spotify-web-api-node");
const Redis = require("ioredis");
const { exec, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const util = require("util");
const logger = require("../config/logging");

const { format } = require("winston");

// Promisify exec
const execPromise = util.promisify(exec);

// Initialize Redis client
const redis = new Redis(process.env.REDIS_URL);

const app = express();
const PORT = process.env.PORT || 3001;

// Determine the API mode
const API_MODE = process.env.SPOTIFY_API_MODE || "default"; // 'spotifyapi', 'default', 'spotdl'

// Spotify API credentials
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

// Middleware
app.use(cors());
app.use(express.json());

// Create a temp directory for spotdl info output
const TMP_DIR = path.join(__dirname, "tmp");
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

// Refresh Spotify access token
async function refreshSpotifyToken() {
  logger.debug("Called refreshSpotifyToken", { kwargs: {} });
  if (API_MODE === "spotdl") {
    // Skip token refresh if using spotdl only
    return;
  }

  try {
    const data = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(data.body["access_token"]);
    logger.info("Spotify token refreshed successfully", {
      kwargs: { function: "refreshSpotifyToken" },
    });

    // Set token expiration for 1 hour
    setTimeout(
      refreshSpotifyToken,
      data.body["expires_in"] * 1000 - 5 * 60 * 1000
    );
    return true;
  } catch (error) {
    logger.error("Error refreshing Spotify token", {
      kwargs: { function: "refreshSpotifyToken", error: error.message },
    });

    // Retry after 1 minute in case of failure
    setTimeout(refreshSpotifyToken, 60 * 1000);
    return false;
  }
}

// Initial token refresh
if (API_MODE !== "spotdl") {
  refreshSpotifyToken();
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).send({ status: "ok", mode: API_MODE });
});

// Streaming endpoint for EventSource (GET request)
app.get("/fetch/stream", async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    const spotifyItem = extractSpotifyId(url);

    if (!spotifyItem) {
      return res.status(400).json({ error: "Invalid Spotify URL" });
    }

    // Check if we should use Spotify API or spotdl
    const useSpotifyApi = await isSpotifyApiAccessible();

    if (useSpotifyApi) {
      // For Spotify API, we can return quickly without streaming
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      const sendEvent = (eventType, data) => {
        const eventData = JSON.stringify({ type: eventType, ...data });
        res.write(`data: ${eventData}\n\n`);
      };

      try {
        sendEvent('fetch_started', { message: 'Using Spotify API...', progress: 0 });
        const response = await fetchFromSpotifyApi(spotifyItem, url);
        sendEvent('fetch_completed', { result: response, progress: 100 });
        res.end();
      } catch (error) {
        sendEvent('fetch_error', { error: error.message });
        res.end();
      }
    } else {
      // Use streaming for spotdl
      await streamSpotdlFetch(url, spotifyItem, res);
    }
  } catch (error) {
    logger.error("Error in streaming fetch", {
      kwargs: { function: "GET /fetch-stream", error: error.message },
    });
    res.status(500).json({ error: "Failed to fetch data", details: error.message });
  }
});

// Server-Sent Events endpoint for streaming progress
app.get("/fetch/stream", async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: "URL query parameter is required" });
    }

    const spotifyItem = extractSpotifyId(url);

    if (!spotifyItem) {
      return res.status(400).json({ error: "Invalid Spotify URL" });
    }

    // Force spotdl for streaming
    logger.debug("Using SSE streaming endpoint with spotdl", {
      kwargs: { url, spotifyItem },
    });

    await streamSpotdlFetch(url, spotifyItem, res);
  } catch (error) {
    logger.error("Error in streaming fetch", {
      kwargs: { function: "GET /fetch/stream", error: error.message },
    });
    
    // Send error event if headers not sent yet
    if (!res.headersSent) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });
      
      const errorEvent = JSON.stringify({
        type: 'fetch_error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      res.write(`data: ${errorEvent}\n\n`);
    }
    res.end();
  }
});

// Check if Spotify API is accessible
async function isSpotifyApiAccessible() {
  if (API_MODE === "spotdl") {
    return false; // Always use spotdl if mode is set to 'spotdl'
  }

  if (API_MODE === "spotifyapi") {
    return true; // Always use Spotify API if mode is set to 'spotifyapi'
  }

  // Check if we have valid credentials
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    return false;
  }

  try {
    // Try to refresh the token as a test
    return await refreshSpotifyToken();
  } catch (error) {
    logger.error("Spotify API not accessible", {
      kwargs: { function: "isSpotifyApiAccessible", error: error.message },
    });
    return false;
  }
}

// Extract Spotify ID from a playlist/album/track URL
function extractSpotifyId(url) {
  const regex = /spotify\.com\/(playlist|album|track)\/([a-zA-Z0-9]+)/;
  const match = url.match(regex);

  if (match && match.length >= 3) {
    return {
      type: match[1],
      id: match[2],
    };
  }
  return null;
}

// Function to get info from spotdl with streaming updates
async function getInfoFromSpotdl(url, progressCallback = null) {
  logger.debug("Called getInfoFromSpotdl", { kwargs: { url } });
  try {
    logger.info(`Getting info from spotdl for URL: ${url}`, {
      kwargs: { function: "getInfoFromSpotdl", url },
    });

    const outputFile = path.join(TMP_DIR, `${Date.now()}.json.spotdl`);

    if (progressCallback) {
      progressCallback({ stage: 'starting', message: 'Initializing spotdl...', progress: 0 });
    }

    // Run spotdl meta command (correct for spotdl v4+)
    const spotdlProcess = exec(
      `python3 -m spotdl save "${url}" --save-file ${outputFile} --log-level DEBUG`
    );

    let trackCount = 0;
    let totalTracks = 0;

    // Track progress through stdout/stderr
    if (progressCallback) {
      spotdlProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        logger.debug(`spotdl stdout: ${output}`);
        
        // Parse different progress indicators from spotdl output
        if (output.includes('Found') && output.includes('songs')) {
          const match = output.match(/Found (\d+) songs/);
          if (match) {
            totalTracks = parseInt(match[1]);
            progressCallback({ 
              stage: 'discovery', 
              message: `Found ${totalTracks} tracks`, 
              progress: 10,
              totalTracks 
            });
          }
        }
        
        if (output.includes('Processing') || output.includes('Getting')) {
          trackCount++;
          const progress = totalTracks > 0 ? Math.min(90, 10 + (trackCount / totalTracks) * 80) : 50;
          progressCallback({ 
            stage: 'processing', 
            message: `Processing track ${trackCount}${totalTracks > 0 ? ` of ${totalTracks}` : ''}...`, 
            progress,
            currentTrack: trackCount,
            totalTracks 
          });
        }
      });

      spotdlProcess.stderr?.on('data', (data) => {
        const output = data.toString();
        logger.debug(`spotdl stderr: ${output}`);
        
        // Handle error messages
        if (output.includes('ERROR') || output.includes('Failed')) {
          progressCallback({ 
            stage: 'error', 
            message: `Error: ${output.trim()}`, 
            progress: -1 
          });
        }
      });
    }

    // Wait for process to complete
    const { stdout, stderr } = await new Promise((resolve, reject) => {
      spotdlProcess.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout: '', stderr: '' });
        } else {
          reject(new Error(`spotdl process exited with code ${code}`));
        }
      });
      
      spotdlProcess.on('error', (error) => {
        reject(error);
      });
    });

    if (progressCallback) {
      progressCallback({ stage: 'finalizing', message: 'Processing results...', progress: 95 });
    }

    // Check if the output file exists
    if (!fs.existsSync(outputFile)) {
      throw new Error("spotdl did not generate output file");
    }

    // Read the output file
    const infoData = JSON.parse(fs.readFileSync(outputFile, "utf8"));

    // Clean up the file
    fs.unlinkSync(outputFile);

    // Format the data to match our API response
    const spotifyItem = extractSpotifyId(url);
    let result;

    if (!spotifyItem) {
      throw new Error("Invalid Spotify URL");
    }

    switch (spotifyItem.type) {
      case "playlist":
        // spotdl returns an array of tracks for playlists
        if (Array.isArray(infoData) && infoData.length > 0) {
          const first = infoData[0];
          result = {
            type: "playlist",
            id: spotifyItem.id,
            name: first.list_name || "Unknown Playlist",
            description: "",
            tracks: infoData.map((song) => ({
              id:
                song.song_id ||
                `spotdl_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
              title: song.name,
              artist:
                song.artists && Array.isArray(song.artists)
                  ? song.artists.join(", ")
                  : song.artist || "",
              albumArt: song.cover_url,
              duration: msToMinSec(
                song.duration_ms !== undefined
                  ? song.duration_ms
                  : song.duration
                  ? song.duration * 1000
                  : 0
              ),
              albumName: song.album_name,
              releaseDate: song.date || "",
              previewUrl: null,
            })),
          };
        } else {
          // fallback to old structure if not array
          result = {
            type: "playlist",
            id: spotifyItem.id,
            name: infoData.title || "Unknown Playlist",
            description: infoData.description || "",
            tracks: infoData.songs
              ? infoData.songs.map((song) => ({
                  id:
                    song.song_id ||
                    `spotdl_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                  title: song.name,
                  artist: song.artists.join(", "),
                  albumArt: song.cover_url,
                  duration: msToMinSec(song.duration_ms || 0),
                  albumName: song.album_name,
                  releaseDate: song.date || "",
                  previewUrl: null,
                }))
              : [],
          };
        }
        break;

      case "album":
        result = {
          type: "album",
          id: spotifyItem.id,
          name: infoData.title || "Unknown Album",
          description: "",
          tracks: infoData.songs.map((song) => ({
            id:
              song.song_id ||
              `spotdl_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            title: song.name,
            artist: song.artists.join(", "),
            albumArt: song.cover_url,
            duration: msToMinSec(song.duration_ms || 0),
            albumName: song.album_name,
            releaseDate: song.date || "",
            previewUrl: null,
          })),
        };
        break;

      case "track":
        result = {
          type: "track",
          id: spotifyItem.id,
          name: infoData.name || "Unknown Track",
          description: "",
          tracks: [
            {
              id:
                infoData.song_id ||
                `spotdl_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
              title: infoData.name,
              artist: infoData.artists.join(", "),
              albumArt: infoData.cover_url,
              duration: msToMinSec(infoData.duration_ms || 0),
              albumName: infoData.album_name,
              releaseDate: infoData.date || "",
              previewUrl: null,
            },
          ],
        };
        break;

      default:
        throw new Error("Unsupported Spotify item type");
    }

    if (progressCallback) {
      progressCallback({ 
        stage: 'completed', 
        message: `Successfully processed ${result.tracks.length} tracks`, 
        progress: 100 
      });
    }

    return result;
  } catch (error) {
    logger.error("Error getting info from spotdl", {
      kwargs: { function: "getInfoFromSpotdl", error: error.message },
    });
    throw error;
  }
}

// Endpoint to fetch playlist/album/track details
app.post("/fetch", async (req, res) => {
  try {
    const { url, stream = false } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    const spotifyItem = extractSpotifyId(url);

    if (!spotifyItem) {
      return res.status(400).json({ error: "Invalid Spotify URL" });
    }

    // Check cache first (only for non-streaming requests)
    if (!stream) {
      const cacheKey = `spotify:${spotifyItem.type}:${spotifyItem.id}`;
      const cachedData = await redis.get(cacheKey);

      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }
    }

    // Determine whether to use Spotify API or spotdl
    const useSpotifyApi = await isSpotifyApiAccessible();

    let response;

    if (useSpotifyApi) {
      logger.debug("Using Spotify API path", {
        kwargs: { useSpotifyApi: true },
      });
      response = await fetchFromSpotifyApi(spotifyItem, url);
      
      if (!stream) {
        // Cache the response for 1 hour
        const cacheKey = `spotify:${spotifyItem.type}:${spotifyItem.id}`;
        await redis.set(cacheKey, JSON.stringify(response), "EX", 3600);
      }
      
      res.json(response);
    } else {
      logger.debug("Using spotdl fallback path", {
        kwargs: { useSpotifyApi: false, stream },
      });
      
      if (stream) {
        // Use streaming for spotdl
        await streamSpotdlFetch(url, spotifyItem, res);
      } else {
        response = await getInfoFromSpotdl(url);
        
        // Cache the response for 1 hour
        const cacheKey = `spotify:${spotifyItem.type}:${spotifyItem.id}`;
        await redis.set(cacheKey, JSON.stringify(response), "EX", 3600);
        
        res.json(response);
      }
    }
  } catch (error) {
    logger.error("Error fetching data", {
      kwargs: { function: "POST /fetch", error: error.message },
    });
    res
      .status(500)
      .json({ error: "Failed to fetch data", details: error.message });
  }
});

// Fetch data from Spotify API
async function fetchFromSpotifyApi(spotifyItem, url) {
  logger.debug("Called fetchFromSpotifyApi", { kwargs: { spotifyItem, url } });
  let results;
  let tracks = [];

  switch (spotifyItem.type) {
    case "playlist":
      results = await spotifyApi.getPlaylist(spotifyItem.id);
      tracks = results.body.tracks.items.map((item) => ({
        id: item.track.id,
        title: item.track.name,
        artist: item.track.artists.map((artist) => artist.name).join(", "),
        albumArt: item.track.album.images[0]?.url,
        duration: msToMinSec(item.track.duration_ms),
        albumName: item.track.album.name,
        releaseDate: item.track.album.release_date,
        previewUrl: item.track.preview_url,
      }));
      break;

    case "album":
      results = await spotifyApi.getAlbum(spotifyItem.id);
      const albumTracks = await spotifyApi.getAlbumTracks(spotifyItem.id);
      tracks = albumTracks.body.items.map((track) => ({
        id: track.id,
        title: track.name,
        artist: track.artists.map((artist) => artist.name).join(", "),
        albumArt: results.body.images[0]?.url,
        duration: msToMinSec(track.duration_ms),
        albumName: results.body.name,
        releaseDate: results.body.release_date,
        previewUrl: track.preview_url,
      }));
      break;

    case "track":
      results = await spotifyApi.getTrack(spotifyItem.id);
      tracks = [
        {
          id: results.body.id,
          title: results.body.name,
          artist: results.body.artists.map((artist) => artist.name).join(", "),
          albumArt: results.body.album.images[0]?.url,
          duration: msToMinSec(results.body.duration_ms),
          albumName: results.body.album.name,
          releaseDate: results.body.album.release_date,
          previewUrl: results.body.preview_url,
        },
      ];
      break;
  }

  return {
    type: spotifyItem.type,
    id: spotifyItem.id,
    name: results.body.name,
    description: results.body.description,
    tracks: tracks,
  };
}

// Helper function to convert milliseconds to MM:SS format
function msToMinSec(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}

// Progress event types
const PROGRESS_EVENTS = {
  FETCH_STARTED: 'fetch_started',
  TRACK_FOUND: 'track_found',
  TRACK_PROCESSED: 'track_processed',
  FETCH_COMPLETED: 'fetch_completed',
  FETCH_ERROR: 'fetch_error',
  PROGRESS_UPDATE: 'progress_update'
};

// Streaming spotdl fetch function
async function streamSpotdlFetch(url, spotifyItem, res) {
  logger.debug("Called streamSpotdlFetch", { kwargs: { url, spotifyItem } });
  
  // Set up Server-Sent Events headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  const sendEvent = (eventType, data) => {
    const eventData = JSON.stringify({ 
      type: eventType, 
      spotifyId: spotifyItem.id,
      url,
      ...data 
    });
    res.write(`data: ${eventData}\n\n`);
    
    // Also publish to Redis for WebSocket broadcasting
    redis.publish('spotify:progress', eventData);
  };

  try {
    sendEvent(PROGRESS_EVENTS.FETCH_STARTED, {
      url,
      spotifyType: spotifyItem.type,
      spotifyId: spotifyItem.id,
      timestamp: new Date().toISOString()
    });

    const outputFile = path.join(TMP_DIR, `${Date.now()}.json.spotdl`);
    
    // Spawn spotdl process
    const spotdlArgs = ['save', url, '--save-file', outputFile, '--log-level', 'DEBUG'];
    const spotdlProcess = spawn('python3', ['-m', 'spotdl', ...spotdlArgs]);
    
    let stdout = '';
    let stderr = '';
    let tracksFound = 0;
    let tracksProcessed = 0;
    let currentTrack = '';

    // Process stdout for progress updates
    spotdlProcess.stdout.on('data', (data) => {
      const chunk = data.toString();
      stdout += chunk;
      
      const lines = chunk.split('\n').filter(line => line.trim());
      
      lines.forEach(line => {
        logger.debug(`spotdl stdout: ${line}`);
        
        // Parse different types of output
        if (line.includes('Found') && line.includes('songs')) {
          const match = line.match(/Found (\d+) songs/);
          if (match) {
            tracksFound = parseInt(match[1]);
            sendEvent(PROGRESS_EVENTS.TRACK_FOUND, {
              totalTracks: tracksFound,
              message: line.trim()
            });
          }
        } else if (line.includes('Searching') || line.includes('Processing')) {
          // Extract track name if possible
          const trackMatch = line.match(/(?:Searching|Processing)\s+(.+)/);
          if (trackMatch) {
            currentTrack = trackMatch[1].trim();
          }
          
          sendEvent(PROGRESS_EVENTS.PROGRESS_UPDATE, {
            message: line.trim(),
            currentTrack,
            progress: tracksFound > 0 ? Math.round((tracksProcessed / tracksFound) * 100) : 0
          });
        } else if (line.includes('Downloaded') || line.includes('Saved')) {
          tracksProcessed++;
          sendEvent(PROGRESS_EVENTS.TRACK_PROCESSED, {
            tracksProcessed,
            totalTracks: tracksFound,
            currentTrack,
            percentage: tracksFound > 0 ? Math.round((tracksProcessed / tracksFound) * 100) : 0,
            message: line.trim()
          });
        }
      });
    });

    // Process stderr for warnings/errors
    spotdlProcess.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;
      
      const lines = chunk.split('\n').filter(line => line.trim());
      lines.forEach(line => {
        logger.warn(`spotdl stderr: ${line}`);
        
        // Send warning/error updates
        sendEvent(PROGRESS_EVENTS.PROGRESS_UPDATE, {
          level: 'warning',
          message: line.trim()
        });
      });
    });

    // Handle process completion
    spotdlProcess.on('close', async (code) => {
      try {
        if (code === 0) {
          // Check if the output file exists
          if (!fs.existsSync(outputFile)) {
            throw new Error('spotdl did not generate output file');
          }

          // Read and parse the output file
          const infoData = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
          
          // Format the data
          const result = formatSpotdlData(infoData, spotifyItem, url);
          
          // Clean up the file
          fs.unlinkSync(outputFile);
          
          // Cache the result
          const cacheKey = `spotify:${spotifyItem.type}:${spotifyItem.id}`;
          await redis.set(cacheKey, JSON.stringify(result), 'EX', 3600);

          sendEvent(PROGRESS_EVENTS.FETCH_COMPLETED, {
            result,
            totalTracks: tracksFound,
            tracksProcessed,
            timestamp: new Date().toISOString()
          });
        } else {
          throw new Error(`spotdl process exited with code ${code}`);
        }
      } catch (error) {
        logger.error('Error in spotdl process completion', {
          kwargs: { error: error.message, code }
        });
        
        sendEvent(PROGRESS_EVENTS.FETCH_ERROR, {
          error: error.message,
          code,
          stdout: stdout.slice(-1000), // Last 1000 chars
          stderr: stderr.slice(-1000),
          timestamp: new Date().toISOString()
        });
      } finally {
        res.end();
      }
    });

    // Handle process errors
    spotdlProcess.on('error', (error) => {
      logger.error('spotdl process error', {
        kwargs: { error: error.message }
      });
      
      sendEvent(PROGRESS_EVENTS.FETCH_ERROR, {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      res.end();
    });

    // Handle client disconnect
    res.on('close', () => {
      logger.info('Client disconnected, killing spotdl process');
      spotdlProcess.kill();
    });

  } catch (error) {
    logger.error('Error in streamSpotdlFetch', {
      kwargs: { error: error.message }
    });
    
    sendEvent(PROGRESS_EVENTS.FETCH_ERROR, {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    res.end();
  }
}

// Helper function to format spotdl data (extracted from getInfoFromSpotdl)
function formatSpotdlData(infoData, spotifyItem, url) {
  let result;

  switch (spotifyItem.type) {
    case "playlist":
      // spotdl returns an array of tracks for playlists
      if (Array.isArray(infoData) && infoData.length > 0) {
        const first = infoData[0];
        result = {
          type: "playlist",
          id: spotifyItem.id,
          name: first.list_name || "Unknown Playlist",
          description: "",
          tracks: infoData.map((song) => ({
            id:
              song.song_id ||
              `spotdl_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            title: song.name,
            artist:
              song.artists && Array.isArray(song.artists)
                ? song.artists.join(", ")
                : song.artist || "",
            albumArt: song.cover_url,
            duration: msToMinSec(
              song.duration_ms !== undefined
                ? song.duration_ms
                : song.duration
                ? song.duration * 1000
                : 0
            ),
            albumName: song.album_name,
            releaseDate: song.date || "",
            previewUrl: null,
          })),
        };
      } else {
        // fallback to old structure if not array
        result = {
          type: "playlist",
          id: spotifyItem.id,
          name: infoData.title || "Unknown Playlist",
          description: infoData.description || "",
          tracks: infoData.songs
            ? infoData.songs.map((song) => ({
                id:
                  song.song_id ||
                  `spotdl_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                title: song.name,
                artist: song.artists.join(", "),
                albumArt: song.cover_url,
                duration: msToMinSec(song.duration_ms || 0),
                albumName: song.album_name,
                releaseDate: song.date || "",
                previewUrl: null,
              }))
            : [],
        };
      }
      break;

    case "album":
      result = {
        type: "album",
        id: spotifyItem.id,
        name: infoData.title || "Unknown Album",
        description: "",
        tracks: infoData.songs.map((song) => ({
          id:
            song.song_id ||
            `spotdl_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          title: song.name,
          artist: song.artists.join(", "),
          albumArt: song.cover_url,
          duration: msToMinSec(song.duration_ms || 0),
          albumName: song.album_name,
          releaseDate: song.date || "",
          previewUrl: null,
        })),
      };
      break;

    case "track":
      result = {
        type: "track",
        id: spotifyItem.id,
        name: infoData.name || "Unknown Track",
        description: "",
        tracks: [
          {
            id:
              infoData.song_id ||
              `spotdl_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            title: infoData.name,
            artist: infoData.artists.join(", "),
            albumArt: infoData.cover_url,
            duration: msToMinSec(infoData.duration_ms || 0),
            albumName: infoData.album_name,
            releaseDate: infoData.date || "",
            previewUrl: null,
          },
        ],
      };
      break;

    default:
      throw new Error("Unsupported Spotify item type");
  }

  return result;
}

// Start the server
app.listen(PORT, () => {
  logger.info(`Spotify service listening`, {
    kwargs: { port: PORT, mode: API_MODE },
  });
});
