import { create } from "zustand";

// Message categories
export enum MessageCategory {
  PLAYER = "player",
  STEMS = "stems",
  PROCESSING = "processing",
  ANALYSIS = "analysis",
  SYSTEM = "system",
  DEBUG = "debug",
  UI = "ui",
}

// Message severity levels
export enum MessageSeverity {
  INFO = "info",
  SUCCESS = "success",
  WARNING = "warning",
  ERROR = "error",
  DEBUG = "debug",
}

// Message interface
export interface Message {
  id: string;
  timestamp: number;
  category: MessageCategory;
  severity: MessageSeverity;
  title: string;
  content: string;
  source?: string;
  actions?: MessageAction[];
  metadata?: Record<string, any>;
  read?: boolean;
  dismissed?: boolean;
}

// Message action interface
export interface MessageAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  action: () => void;
  primary?: boolean;
}

// Store state interface
interface MessageBusState {
  messages: Message[];
  listeners: Record<string, ((message: Message) => void)[]>;

  // Methods
  postMessage: (message: Omit<Message, "id" | "timestamp">) => string;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  removeMessage: (id: string) => void;
  markAsRead: (id: string) => void;
  dismissMessage: (id: string) => void;
  clearMessages: (category?: MessageCategory) => void;
  getMessages: (category?: MessageCategory, limit?: number) => Message[];
  subscribe: (
    category: MessageCategory | "all",
    callback: (message: Message) => void
  ) => () => void;
}

// Create the message bus store
export const useMessageBus = create<MessageBusState>((set, get) => ({
  messages: [],
  listeners: {},

  postMessage: (message) => {
    const id = `msg_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    const timestamp = Date.now();
    const fullMessage: Message = {
      ...message,
      id,
      timestamp,
      read: false,
      dismissed: false,
    };

    set((state) => ({
      messages: [fullMessage, ...state.messages],
    }));

    // Notify all relevant listeners
    const { listeners } = get();
    const categoryListeners = listeners[message.category] || [];
    const allListeners = listeners["all"] || [];

    [...categoryListeners, ...allListeners].forEach((listener) => {
      try {
        listener(fullMessage);
      } catch (error) {
        console.error("Error in message listener:", error);
      }
    });

    return id;
  },

  updateMessage: (id, updates) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, ...updates } : msg
      ),
    }));
  },

  removeMessage: (id) => {
    set((state) => ({
      messages: state.messages.filter((msg) => msg.id !== id),
    }));
  },

  markAsRead: (id) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, read: true } : msg
      ),
    }));
  },

  dismissMessage: (id) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, dismissed: true } : msg
      ),
    }));
  },

  clearMessages: (category) => {
    set((state) => ({
      messages: category
        ? state.messages.filter((msg) => msg.category !== category)
        : [],
    }));
  },

  getMessages: (category, limit = 50) => {
    const { messages } = get();
    const filteredMessages = category
      ? messages.filter((msg) => msg.category === category)
      : messages;

    return filteredMessages.slice(0, limit);
  },

  subscribe: (category, callback) => {
    const listenerId = `listener_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    set((state) => {
      const categoryKey = category === "all" ? "all" : category;
      const existingListeners = state.listeners[categoryKey] || [];
      return {
        listeners: {
          ...state.listeners,
          [categoryKey]: [...existingListeners, callback],
        },
      };
    });

    // Return unsubscribe function
    return () => {
      set((state) => {
        const categoryKey = category === "all" ? "all" : category;
        const existingListeners = state.listeners[categoryKey] || [];
        return {
          listeners: {
            ...state.listeners,
            [categoryKey]: existingListeners.filter(
              (listener) => listener !== callback
            ),
          },
        };
      });
    };
  },
}));
