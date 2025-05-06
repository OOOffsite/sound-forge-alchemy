import { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// Get WebSocket URL from environment
const WEBSOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:3006';

// Create a socket instance
let socket: Socket;

export const getSocket = () => {
  if (!socket) {
    socket = io(WEBSOCKET_URL);
  }
  return socket;
};

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  subscribe: (trackId: string) => void;
  unsubscribe: (trackId: string) => void;
}

export const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  isConnected: false,
  subscribe: () => {},
  unsubscribe: () => {},
});

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    const socketInstance = getSocket();
    setSocket(socketInstance);

    // Set up event listeners
    socketInstance.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    // Cleanup on unmount
    return () => {
      socketInstance.off('connect');
      socketInstance.off('disconnect');
    };
  }, []);

  // Subscribe to track events
  const subscribe = (trackId: string) => {
    if (socket && isConnected) {
      console.log(`Subscribing to track: ${trackId}`);
      socket.emit('subscribe:track', trackId);
    }
  };

  // Unsubscribe from track events
  const unsubscribe = (trackId: string) => {
    if (socket && isConnected) {
      console.log(`Unsubscribing from track: ${trackId}`);
      socket.emit('unsubscribe:track', trackId);
    }
  };

  return (
    <WebSocketContext.Provider value={{ socket, isConnected, subscribe, unsubscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
};