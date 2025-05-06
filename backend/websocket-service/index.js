require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const Redis = require('ioredis');

// Initialize Redis clients
const redis = new Redis(process.env.REDIS_URL);
const sub = new Redis(process.env.REDIS_URL);

// Constants
const PORT = process.env.PORT || 3006;

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Socket.IO events
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  // Handle client subscriptions to track events
  socket.on('subscribe:track', (trackId) => {
    console.log(`Client ${socket.id} subscribed to track: ${trackId}`);
    socket.join(`track:${trackId}`);
  });
  
  // Handle client unsubscriptions
  socket.on('unsubscribe:track', (trackId) => {
    console.log(`Client ${socket.id} unsubscribed from track: ${trackId}`);
    socket.leave(`track:${trackId}`);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Subscribe to Redis channels
const channels = [
  'download:job:created',
  'download:job:updated',
  'download:job:completed',
  'download:job:error',
  'processing:job:created',
  'processing:job:updated',
  'processing:job:completed',
  'processing:job:error',
  'analysis:job:created',
  'analysis:job:updated',
  'analysis:job:completed',
  'analysis:job:error'
];

channels.forEach(channel => sub.subscribe(channel));

// Handle Redis messages
sub.on('message', (channel, message) => {
  try {
    const data = JSON.parse(message);
    
    if (data.trackId) {
      // Emit to the track's room
      io.to(`track:${data.trackId}`).emit(channel, data);
      
      console.log(`Emitted ${channel} event for track: ${data.trackId}`);
    }
  } catch (error) {
    console.error(`Error handling Redis message: ${error.message}`);
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send({ status: 'ok' });
});

// Notify endpoint for other services to send messages to clients
app.post('/notify', (req, res) => {
  try {
    const { event, data } = req.body;
    
    if (!event || !data || !data.trackId) {
      return res.status(400).json({ error: 'Event, data, and trackId are required' });
    }
    
    // Emit to the track's room
    io.to(`track:${data.trackId}`).emit(event, data);
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error(`Error in notify endpoint: ${error.message}`);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Start the server
server.listen(PORT, () => {
  console.log(`WebSocket service listening on port ${PORT}`);
});