import React, { useEffect, useState } from 'react';
import { getSocket } from './socketUtils';
import { WebSocketContext } from './WebSocketContext';
// Added missing import for Socket type
import { Socket } from 'socket.io-client';

export const WebSocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketInstance = getSocket();
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    return () => {
      socketInstance.off('connect');
      socketInstance.off('disconnect');
    };
  }, []);

  const subscribe = (trackId: string) => {
    if (socket && isConnected) {
      console.log(`Subscribing to track: ${trackId}`);
      socket.emit('subscribe:track', trackId);
    }
  };

  const unsubscribe = (trackId: string) => {
    if (socket && isConnected) {
      console.log(`Unsubscribing from track: ${trackId}`);
      socket.emit('unsubscribe:track', trackId);
    }
  };

  return (
    <WebSocketContext.Provider
      value={{
        socket: socket ?? null,
        isConnected,
        subscribe,
        unsubscribe,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};