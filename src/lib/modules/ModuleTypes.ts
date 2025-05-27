// Module system interface definitions

/**
 * Module Dependency Type
 * Used to define dependencies between modules
 */
export enum ModuleDependency {
  // Core dependencies
  TRACK_SELECTION = "track-selection",
  MEDIA_PLAYER = "media-player",
  PROCESS_STATUS = "process-status",
  STEM_DATA = "stem-data",

  // Messaging systems
  WEBSOCKET = "websocket",
  NOTIFICATIONS = "notifications",
  DEBUG = "debug",

  // UI Systems
  OVERLAY_SYSTEM = "overlay-system",
}

/**
 * Module type for the Alchemy system
 */
export enum ModuleType {
  PLAYER = "player",
  STEM_VISUALIZER = "stem-visualizer",
  NOTIFICATION = "notification",
  DEBUG_CONSOLE = "debug-console",
  TRACK_ANALYZER = "track-analyzer",
  PROCESS_MONITOR = "process-monitor",
}

/**
 * Module status
 */
export enum ModuleStatus {
  IDLE = "idle",
  LOADING = "loading",
  ACTIVE = "active",
  ERROR = "error",
  DISABLED = "disabled",
}

/**
 * Module definition interface
 */
export interface AlchemyModule {
  id: string;
  type: ModuleType;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  dependencies: ModuleDependency[];
  status: ModuleStatus;
  component: React.ComponentType<any>;
  componentProps?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Message interface for module communication
 */
export interface ModuleMessage {
  id: string;
  type: string;
  source: string;
  target?: string;
  timestamp: number;
  data: any;
  priority?: "low" | "medium" | "high";
}

/**
 * Module registry interface
 */
export interface ModuleRegistry {
  registerModule: (module: AlchemyModule) => void;
  unregisterModule: (moduleId: string) => void;
  getModule: (moduleId: string) => AlchemyModule | undefined;
  getAllModules: () => AlchemyModule[];
  getModulesByType: (type: ModuleType) => AlchemyModule[];
  getModulesByDependency: (dependency: ModuleDependency) => AlchemyModule[];
}

/**
 * Module messaging interface
 */
export interface ModuleMessaging {
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
