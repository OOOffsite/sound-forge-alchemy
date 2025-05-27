import React from 'react';
import { ModuleRegistryProvider, ModulePosition } from '../context/ModuleRegistry';
import ModuleContainer from '../components/ModuleContainer';
import StickyPlayer from '../components/ui/StickyPlayer';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <ModuleRegistryProvider>
      <div className="app-layout">
        {/* Main content area */}
        <div className="main-content">
          {/* Left panel (sidebar) */}
          <ModuleContainer 
            position={ModulePosition.LEFT} 
            className="w-64 border-r border-border h-[calc(100vh-70px)] overflow-auto"
          />
          
          {/* Center content area */}
          <div className="center-content flex-1">
            {/* App main content */}
            {children}
            
            {/* Main module area */}
            <ModuleContainer 
              position={ModulePosition.MAIN} 
              className="flex-1"
            />
          </div>
          
          {/* Right panel (audio separation, stem visualizer, etc.) */}
          <ModuleContainer 
            position={ModulePosition.RIGHT} 
            className="w-96 border-l border-border h-[calc(100vh-70px)] overflow-auto"
          />
        </div>
        
        {/* Fixed modules (player, etc.) */}
        <div className="fixed-modules">
          {/* StickyPlayer will be handled separately */}
          {/* Other fixed modules handled via ModuleRegistry */}
        </div>
        
        {/* Overlay modules */}
        <ModuleContainer position={ModulePosition.OVERLAY} />
      </div>
    </ModuleRegistryProvider>
  );
};

export default AppLayout;
