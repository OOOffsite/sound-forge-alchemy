import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Module Types
export enum ModuleType {
  PLAYER = 'player',
  STEMS = 'stems',
  NOTIFICATION = 'notification',
  DEBUG = 'debug',
  ANALYSIS = 'analysis',
  PLAYLIST = 'playlist',
  PROCESSING = 'processing',
  CUSTOM = 'custom'
}

// Module Size Types
export enum ModuleSize {
  SMALL = 'small',   // 1/4 of the available space
  MEDIUM = 'medium', // 1/2 of the available space
  LARGE = 'large',   // Full width, half height
  FULLSCREEN = 'fullscreen' // Full container
}

// Module Position Options
export enum ModulePosition {
  FIXED = 'fixed',   // Fixed position (for player, always-visible modules)
  OVERLAY = 'overlay', // Overlaid window
  MAIN = 'main',     // Main content area
  RIGHT = 'right',   // Right panel
  LEFT = 'left'      // Left panel
}

// Module interface
export interface Module {
  id: string;
  type: ModuleType;
  title: string;
  description?: string;
  component: React.ComponentType<any>;
  position: ModulePosition;
  size: ModuleSize;
  initialProps?: Record<string, any>;
  dependencies?: string[]; // IDs of modules this module depends on
  isVisible?: boolean;
  isMinimized?: boolean;
  icon?: React.ReactNode;
}

// Module registry context
interface ModuleRegistryContextType {
  modules: Record<string, Module>;
  visibleModules: string[];
  overlayModules: string[];
  mainModules: string[];
  rightPanelModules: string[];
  leftPanelModules: string[];
  registerModule: (module: Module) => void;
  unregisterModule: (id: string) => void;
  showModule: (id: string) => void;
  hideModule: (id: string) => void;
  minimizeModule: (id: string) => void;
  maximizeModule: (id: string) => void;
  updateModuleProps: (id: string, props: Record<string, any>) => void;
  getModulePosition: (id: string) => { x: number, y: number } | null;
  setModulePosition: (id: string, position: { x: number, y: number }) => void;
}

const ModuleRegistryContext = createContext<ModuleRegistryContextType>({
  modules: {},
  visibleModules: [],
  overlayModules: [],
  mainModules: [],
  rightPanelModules: [],
  leftPanelModules: [],
  registerModule: () => {},
  unregisterModule: () => {},
  showModule: () => {},
  hideModule: () => {},
  minimizeModule: () => {},
  maximizeModule: () => {},
  updateModuleProps: () => {},
  getModulePosition: () => null,
  setModulePosition: () => {},
});

// Module registry provider
export function ModuleRegistryProvider({ children }: { children: ReactNode }) {
  const [modules, setModules] = useState<Record<string, Module>>({});
  const [visibleModules, setVisibleModules] = useState<string[]>([]);
  const [modulePositions, setModulePositions] = useState<Record<string, { x: number, y: number }>>({});
  
  // Filter modules by position
  const overlayModules = visibleModules.filter(id => modules[id]?.position === ModulePosition.OVERLAY);
  const mainModules = visibleModules.filter(id => modules[id]?.position === ModulePosition.MAIN);
  const rightPanelModules = visibleModules.filter(id => modules[id]?.position === ModulePosition.RIGHT);
  const leftPanelModules = visibleModules.filter(id => modules[id]?.position === ModulePosition.LEFT);
  
  // Register module
  const registerModule = (module: Module) => {
    setModules(prev => ({
      ...prev,
      [module.id]: {
        ...module,
        isVisible: module.isVisible ?? (module.position === ModulePosition.FIXED || module.position === ModulePosition.MAIN),
        isMinimized: module.isMinimized ?? false
      }
    }));
    
    // Auto-show modules that should be visible
    if (module.isVisible ?? (module.position === ModulePosition.FIXED || module.position === ModulePosition.MAIN)) {
      setVisibleModules(prev => {
        if (prev.includes(module.id)) return prev;
        return [...prev, module.id];
      });
    }
  };
  
  // Unregister module
  const unregisterModule = (id: string) => {
    setModules(prev => {
      const newModules = { ...prev };
      delete newModules[id];
      return newModules;
    });
    
    setVisibleModules(prev => prev.filter(moduleId => moduleId !== id));
  };
  
  // Show module
  const showModule = (id: string) => {
    if (!modules[id]) return;
    
    // Check if all dependencies are visible
    const dependencies = modules[id].dependencies || [];
    dependencies.forEach(depId => {
      if (modules[depId] && !visibleModules.includes(depId)) {
        showModule(depId);
      }
    });
    
    setVisibleModules(prev => {
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });
    
    // Update module isVisible flag
    setModules(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        isVisible: true
      }
    }));
  };
  
  // Hide module
  const hideModule = (id: string) => {
    setVisibleModules(prev => prev.filter(moduleId => moduleId !== id));
    
    // Update module isVisible flag
    setModules(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        isVisible: false
      }
    }));
    
    // Check for dependent modules that should be hidden
    Object.entries(modules).forEach(([moduleId, module]) => {
      if (
        module.dependencies?.includes(id) && 
        visibleModules.includes(moduleId)
      ) {
        hideModule(moduleId);
      }
    });
  };
  
  // Minimize module
  const minimizeModule = (id: string) => {
    setModules(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        isMinimized: true
      }
    }));
  };
  
  // Maximize module
  const maximizeModule = (id: string) => {
    setModules(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        isMinimized: false
      }
    }));
  };
  
  // Update module props
  const updateModuleProps = (id: string, props: Record<string, any>) => {
    setModules(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        initialProps: {
          ...(prev[id].initialProps || {}),
          ...props
        }
      }
    }));
  };
  
  // Get module position
  const getModulePosition = (id: string) => {
    return modulePositions[id] || null;
  };
  
  // Set module position
  const setModulePosition = (id: string, position: { x: number, y: number }) => {
    setModulePositions(prev => ({
      ...prev,
      [id]: position
    }));
  };
  
  // Provide context
  const contextValue: ModuleRegistryContextType = {
    modules,
    visibleModules,
    overlayModules,
    mainModules,
    rightPanelModules,
    leftPanelModules,
    registerModule,
    unregisterModule,
    showModule,
    hideModule,
    minimizeModule,
    maximizeModule,
    updateModuleProps,
    getModulePosition,
    setModulePosition
  };
  
  return (
    <ModuleRegistryContext.Provider value={contextValue}>
      {children}
    </ModuleRegistryContext.Provider>
  );
}

// Hook to use the module registry
export function useModuleRegistry() {
  return useContext(ModuleRegistryContext);
}

// Hook to register a module
export function useRegisterModule(module: Module) {
  const { registerModule, unregisterModule } = useModuleRegistry();
  
  useEffect(() => {
    registerModule(module);
    
    return () => {
      unregisterModule(module.id);
    };
  }, [module.id]); // Re-register only if ID changes
}

// Hook to use a module's dependencies
export function useModuleDependencies(moduleId: string) {
  const { modules, visibleModules } = useModuleRegistry();
  
  const module = modules[moduleId];
  const dependencies = module?.dependencies || [];
  
  const dependencyModules = dependencies.map(id => modules[id]).filter(Boolean);
  const areDependenciesMet = dependencies.every(id => visibleModules.includes(id));
  
  return {
    dependencyModules,
    areDependenciesMet
  };
}
