// require('dotenv').config();
const express = require("express");
const cors = require("cors");
const SpotifyWebApi = require("spotify-web-api-node");
const Redis = require("ioredis");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const util = require("util");
const logger = require("./config/logging");

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

// Function to get info from spotdl
async function getInfoFromSpotdl(url) {
  logger.debug("Called getInfoFromSpotdl", { kwargs: { url } });
  try {
    logger.info(`Getting info from spotdl for URL: ${url}`, {
      kwargs: { function: "getInfoFromSpotdl", url },
    });

    const outputFile = path.join(TMP_DIR, `${Date.now()}.json.spotdl`);

    // Run spotdl meta command (correct for spotdl v4+)
    const { stdout, stderr } = await execPromise(
      `python3 -m spotdl save "${url}" --save-file ${outputFile} --log-level DEBUG`
    );

    if (stderr) {
      logger.warn(`spotdl stderr: ${stderr}`, {
        kwargs: { function: "getInfoFromSpotdl" },
      });
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
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    const spotifyItem = extractSpotifyId(url);

    if (!spotifyItem) {
      return res.status(400).json({ error: "Invalid Spotify URL" });
    }

    // Check cache first
    const cacheKey = `spotify:${spotifyItem.type}:${spotifyItem.id}`;
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    // Determine whether to use Spotify API or spotdl
    const useSpotifyApi = await isSpotifyApiAccessible();

    let response;

    if (useSpotifyApi) {
      logger.debug("Using Spotify API path", {
        kwargs: { useSpotifyApi: true },
      });
      response = await fetchFromSpotifyApi(spotifyItem, url);
    } else {
      logger.debug("Using spotdl fallback path", {
        kwargs: { useSpotifyApi: false },
      });
      response = await getInfoFromSpotdl(url);
    }

    // Cache the response for 1 hour
    await redis.set(cacheKey, JSON.stringify(response), "EX", 3600);

    res.json(response);
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

// Start the server
app.listen(PORT, () => {
  logger.info(`Spotify service listening`, {
    kwargs: { port: PORT, mode: API_MODE },
  });
});
