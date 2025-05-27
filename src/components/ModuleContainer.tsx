import React from 'react';
import { useModuleRegistry, ModulePosition } from '../context/ModuleRegistry';
import OverlayGrid from '../components/ui/OverlayGrid';

interface ModuleContainerProps {
  position: ModulePosition;
  className?: string;
}

const ModuleContainer: React.FC<ModuleContainerProps> = ({ position, className = '' }) => {
  const { 
    modules, 
    overlayModules, 
    mainModules,
    rightPanelModules,
    leftPanelModules,
    visibleModules,
    minimizeModule,
    maximizeModule,
    hideModule,
    getModulePosition,
    setModulePosition
  } = useModuleRegistry();

  // Render modules based on position
  if (position === ModulePosition.OVERLAY) {
    // Convert modules to overlay panes format
    const overlayPanes = overlayModules
      .filter(id => modules[id]?.isVisible)
      .map(id => {
        const module = modules[id];
        return {
          id,
          title: module.title,
          icon: module.icon,
          content: <module.component {...(module.initialProps || {})} />,
          minimized: module.isMinimized,
          onClose: () => hideModule(id),
          onMinimize: () => minimizeModule(id),
          onExpand: () => maximizeModule(id)
        };
      });

    // Use existing OverlayGrid component to display modules
    return (
      <OverlayGrid 
        panes={overlayPanes}
        onUpdatePane={(id, updates) => {
          if (updates.minimized !== undefined) {
            updates.minimized ? minimizeModule(id) : maximizeModule(id);
          }
        }}
        stickyPlayerActive={visibleModules.some(id => 
          modules[id]?.position === ModulePosition.FIXED
        )}
        stickyPlayerHeight={70} // Approximate height of sticky player
      />
    );
  }

  // Filter modules by position
  let positionModules: string[] = [];
  if (position === ModulePosition.MAIN) {
    positionModules = mainModules;
  } else if (position === ModulePosition.RIGHT) {
    positionModules = rightPanelModules;
  } else if (position === ModulePosition.LEFT) {
    positionModules = leftPanelModules;
  }

  return (
    <div className={`module-container module-container-${position} ${className}`}>
      {positionModules
        .filter(id => modules[id]?.isVisible && !modules[id]?.isMinimized)
        .map(id => {
          const module = modules[id];
          return (
            <div 
              key={id}
              className={`module module-${module.size} module-${id}`}
            >
              <div className="module-header">
                <h3>{module.title}</h3>
                <div className="module-controls">
                  <button onClick={() => minimizeModule(id)}>_</button>
                  <button onClick={() => hideModule(id)}>✕</button>
                </div>
              </div>
              <div className="module-content">
                <module.component {...(module.initialProps || {})} />
              </div>
            </div>
          );
        })}
    </div>
  );
};

export default ModuleContainer;
