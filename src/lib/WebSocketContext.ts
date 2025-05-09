import { createContext } from "react";
import { Socket } from "socket.io-client";

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
