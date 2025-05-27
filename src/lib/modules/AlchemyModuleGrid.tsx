import React, { useEffect, useState } from 'react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { 
  AlchemyModule, 
  ModuleStatus, 
  ModuleType 
} from './ModuleTypes';
import { useModuleRegistry } from './ModuleRegistry';
import { useModuleMessaging } from './ModuleMessaging';

// Adapted from existing OverlayGrid but enhanced for the module system
interface AlchemyModuleGridProps {
  layout?: 'tiling' | 'overlapping' | 'stacked';
  defaultModules?: ModuleType[];
  onModuleActivate?: (moduleId: string) => void;
  onModuleDeactivate?: (moduleId: string) => void;
}

export const AlchemyModuleGrid: React.FC<AlchemyModuleGridProps> = ({
  layout = 'tiling',
  defaultModules = [],
  onModuleActivate,
  onModuleDeactivate
}) => {
  const registry = useModuleRegistry();
  const messaging = useModuleMessaging();
  
  // State for tracking active modules and their positions
  const [activeModules, setActiveModules] = useState<string[]>([]);
  const [positions, setPositions] = useState<Record<string, { x: number, y: number }>>({});
  const [minimizedModules, setMinimizedModules] = useState<string[]>([]);
  
  // Initialize with default modules
  useEffect(() => {
    if (defaultModules.length > 0) {
      const modulesToActivate: string[] = [];
      
      defaultModules.forEach(moduleType => {
        const modules = registry.getModulesByType(moduleType);
        if (modules.length > 0) {
          modulesToActivate.push(modules[0].id);
        }
      });
      
      setActiveModules(modulesToActivate);
    }
  }, [defaultModules, registry]);
  
  // Calculate default positions for tiling layout
  useEffect(() => {
    if (layout === 'tiling' && activeModules.length > 0) {
      const newPositions: Record<string, { x: number, y: number }> = {};
      const gap = 16;
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const moduleWidth = 400;
      const moduleHeight = 350;
      
      // Simple grid layout
      const moduleCount = activeModules.length;
      const cols = Math.ceil(Math.sqrt(moduleCount));
      const rows = Math.ceil(moduleCount / cols);
      
      activeModules.forEach((moduleId, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        
        newPositions[moduleId] = {
          x: screenWidth - (col + 1) * (moduleWidth + gap),
          y: (row + 1) * (moduleHeight + gap) + 60 // Add offset for top bar
        };
      });
      
      setPositions(prev => ({ ...prev, ...newPositions }));
    }
  }, [activeModules, layout]);
  
  // Handle module activation
  const activateModule = (moduleId: string) => {
    if (!activeModules.includes(moduleId)) {
      setActiveModules(prev => [...prev, moduleId]);
      onModuleActivate?.(moduleId);
      
      // Send message that module was activated
      messaging.sendMessage({
        id: `activate-${Date.now()}`,
        type: 'module:activated',
        source: 'module-grid',
        timestamp: Date.now(),
        data: { moduleId }
      });
    }
  };
  
  // Handle module deactivation
  const deactivateModule = (moduleId: string) => {
    setActiveModules(prev => prev.filter(id => id !== moduleId));
    onModuleDeactivate?.(moduleId);
    
    // Send message that module was deactivated
    messaging.sendMessage({
      id: `deactivate-${Date.now()}`,
      type: 'module:deactivated',
      source: 'module-grid',
      timestamp: Date.now(),
      data: { moduleId }
    });
  };
  
  // Handle module minimization
  const minimizeModule = (moduleId: string) => {
    if (!minimizedModules.includes(moduleId)) {
      setMinimizedModules(prev => [...prev, moduleId]);
    }
  };
  
  // Handle module restoration
  const restoreModule = (moduleId: string) => {
    setMinimizedModules(prev => prev.filter(id => id !== moduleId));
  };
  
  // Handle drag end event
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    const moduleId = active.id as string;
    
    setPositions(prev => {
      const oldPosition = prev[moduleId] || { x: 0, y: 0 };
      return {
        ...prev,
        [moduleId]: {
          x: oldPosition.x + delta.x,
          y: oldPosition.y + delta.y
        }
      };
    });
  };
  
  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="fixed inset-0 pointer-events-none">
        {/* Active modules */}
        {activeModules.map(moduleId => {
          const module = registry.getModule(moduleId);
          if (!module) return null;
          
          const isMinimized = minimizedModules.includes(moduleId);
          const position = positions[moduleId] || { x: 0, y: 0 };
          const Module = module.component;
          
          return (
            <div
              key={moduleId}
              className="absolute pointer-events-auto"
              style={{
                left: position.x,
                top: position.y,
                width: isMinimized ? 220 : 400,
                zIndex: isMinimized ? 800 : 900
              }}
            >
              <div className="rounded-lg border shadow-md bg-background overflow-hidden">
                {/* Module header */}
                <div className="flex items-center justify-between p-2 bg-muted cursor-move">
                  <div className="flex items-center gap-2">
                    {module.icon && <span>{module.icon}</span>}
                    <h3 className="text-sm font-medium">{module.title}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    {isMinimized ? (
                      <button 
                        onClick={() => restoreModule(moduleId)}
                        className="p-1 rounded hover:bg-background/20 text-muted-foreground"
                      >
                        <span>⤢</span>
                      </button>
                    ) : (
                      <button 
                        onClick={() => minimizeModule(moduleId)}
                        className="p-1 rounded hover:bg-background/20 text-muted-foreground"
                      >
                        <span>⤓</span>
                      </button>
                    )}
                    <button 
                      onClick={() => deactivateModule(moduleId)}
                      className="p-1 rounded hover:bg-background/20 text-muted-foreground"
                    >
                      <span>×</span>
                    </button>
                  </div>
                </div>
                
                {/* Module content */}
                {!isMinimized && (
                  <div className="p-3">
                    <Module {...module.componentProps} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        {/* Module launcher button */}
        <div className="fixed bottom-20 right-4 pointer-events-auto">
          <button
            onClick={() => {
              // Show module selection menu
              console.log("Show module selection menu");
            }}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg"
          >
            <span>+</span>
          </button>
        </div>
      </div>
    </DndContext>
  );
};
