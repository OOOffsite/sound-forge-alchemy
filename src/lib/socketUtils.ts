import { io, Socket } from "socket.io-client";

const WEBSOCKET_URL =
  import.meta.env.VITE_WEBSOCKET_URL || "ws://localhost:3006";

let socket: Socket;

export const getSocket = () => {
  if (!socket) {
    socket = io(WEBSOCKET_URL);
  }
  return socket;
};
