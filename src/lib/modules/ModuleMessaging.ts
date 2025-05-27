import { create } from "zustand";
import { ModuleMessage } from "./ModuleTypes";

interface MessagingState {
  messages: ModuleMessage[];
  sendMessage: (message: ModuleMessage) => void;
  subscribe: (
    type: string,
    callback: (message: ModuleMessage) => void
  ) => () => void;
  subscribeToSource: (
    source: string,
    callback: (message: ModuleMessage) => void
  ) => () => void;
}

/**
 * Registry for messages to be consumed by modules
 */
export const useModuleMessaging = create<MessagingState>((set, get) => {
  // Subscription management
  type SubscriptionCallback = (message: ModuleMessage) => void;
  const typeSubscriptions: Record<string, Set<SubscriptionCallback>> = {};
  const sourceSubscriptions: Record<string, Set<SubscriptionCallback>> = {};

  return {
    messages: [],

    sendMessage: (message: ModuleMessage) => {
      // Add timestamp if not provided
      if (!message.timestamp) {
        message.timestamp = Date.now();
      }

      // Store message
      set((state) => ({
        messages: [...state.messages.slice(-999), message],
      }));

      // Notify type subscribers
      if (message.type && typeSubscriptions[message.type]) {
        typeSubscriptions[message.type].forEach((callback) => {
          try {
            callback(message);
          } catch (error) {
            console.error("Error in message type subscriber:", error);
          }
        });
      }

      // Notify source subscribers
      if (message.source && sourceSubscriptions[message.source]) {
        sourceSubscriptions[message.source].forEach((callback) => {
          try {
            callback(message);
          } catch (error) {
            console.error("Error in message source subscriber:", error);
          }
        });
      }
    },

    subscribe: (type: string, callback: SubscriptionCallback) => {
      if (!typeSubscriptions[type]) {
        typeSubscriptions[type] = new Set();
      }

      typeSubscriptions[type].add(callback);

      return () => {
        if (typeSubscriptions[type]) {
          typeSubscriptions[type].delete(callback);

          if (typeSubscriptions[type].size === 0) {
            delete typeSubscriptions[type];
          }
        }
      };
    },

    subscribeToSource: (source: string, callback: SubscriptionCallback) => {
      if (!sourceSubscriptions[source]) {
        sourceSubscriptions[source] = new Set();
      }

      sourceSubscriptions[source].add(callback);

      return () => {
        if (sourceSubscriptions[source]) {
          sourceSubscriptions[source].delete(callback);

          if (sourceSubscriptions[source].size === 0) {
            delete sourceSubscriptions[source];
          }
        }
      };
    },
  };
});

/**
 * Bridge for WebSocket messages to module messaging
 */
export function setupWebSocketBridge(socketRef: any, messaging: any) {
  if (!socketRef || !socketRef.current) return;

  const socket = socketRef.current;

  // Listen for WebSocket events and relay them to the module messaging system
  const handleMessage = (event: any) => {
    try {
      const eventType = event.type;
      const socketData = event.data;

      messaging.sendMessage({
        id: `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: `websocket:${eventType}`,
        source: "websocket",
        timestamp: Date.now(),
        data: socketData,
      });
    } catch (error) {
      console.error("Error processing WebSocket message:", error);
    }
  };

  // Generic listener for all socket events
  socket.onAny(handleMessage);

  return () => {
    socket.offAny(handleMessage);
  };
}
