import React from 'react';
import { useModuleRegistry, ModuleType } from '../context/ModuleRegistry';
import { Button } from '../components/ui/button';
import { 
  LayoutGrid, 
  Plus, 
  X,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

const ModuleSelector: React.FC = () => {
  const { 
    modules, 
    visibleModules, 
    showModule,
    hideModule
  } = useModuleRegistry();
  
  // Group modules by type
  const modulesByType: Record<ModuleType, typeof modules> = {
    [ModuleType.PLAYER]: {},
    [ModuleType.STEMS]: {},
    [ModuleType.NOTIFICATION]: {},
    [ModuleType.DEBUG]: {},
    [ModuleType.ANALYSIS]: {},
    [ModuleType.PLAYLIST]: {},
    [ModuleType.PROCESSING]: {},
    [ModuleType.CUSTOM]: {},
  };
  
  Object.entries(modules).forEach(([id, module]) => {
    modulesByType[module.type] = {
      ...modulesByType[module.type],
      [id]: module
    };
  });
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <LayoutGrid size={18} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <div className="p-2 text-sm font-medium">Alchemy Modules</div>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        
        {/* Player Modules */}
        {Object.keys(modulesByType[ModuleType.PLAYER]).length > 0 && (
          <>
            <DropdownMenuGroup>
              <div className="p-2 text-xs text-muted-foreground">Player</div>
              {Object.entries(modulesByType[ModuleType.PLAYER]).map(([id, module]) => (
                <DropdownMenuItem key={id} onClick={() => visibleModules.includes(id) ? hideModule(id) : showModule(id)}>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center">
                      {module.icon && <span className="mr-2">{module.icon}</span>}
                      <span>{module.title}</span>
                    </div>
                    {visibleModules.includes(id) ? (
                      <X size={14} className="text-muted-foreground" />
                    ) : (
                      <Plus size={14} className="text-muted-foreground" />
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        )}
        
        {/* Stem Modules */}
        {Object.keys(modulesByType[ModuleType.STEMS]).length > 0 && (
          <>
            <DropdownMenuGroup>
              <div className="p-2 text-xs text-muted-foreground">Stems</div>
              {Object.entries(modulesByType[ModuleType.STEMS]).map(([id, module]) => (
                <DropdownMenuItem key={id} onClick={() => visibleModules.includes(id) ? hideModule(id) : showModule(id)}>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center">
                      {module.icon && <span className="mr-2">{module.icon}</span>}
                      <span>{module.title}</span>
                    </div>
                    {visibleModules.includes(id) ? (
                      <X size={14} className="text-muted-foreground" />
                    ) : (
                      <Plus size={14} className="text-muted-foreground" />
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        )}
        
        {/* Analysis Modules */}
        {Object.keys(modulesByType[ModuleType.ANALYSIS]).length > 0 && (
          <>
            <DropdownMenuGroup>
              <div className="p-2 text-xs text-muted-foreground">Analysis</div>
              {Object.entries(modulesByType[ModuleType.ANALYSIS]).map(([id, module]) => (
                <DropdownMenuItem key={id} onClick={() => visibleModules.includes(id) ? hideModule(id) : showModule(id)}>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center">
                      {module.icon && <span className="mr-2">{module.icon}</span>}
                      <span>{module.title}</span>
                    </div>
                    {visibleModules.includes(id) ? (
                      <X size={14} className="text-muted-foreground" />
                    ) : (
                      <Plus size={14} className="text-muted-foreground" />
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        )}
        
        {/* System Modules */}
        <DropdownMenuGroup>
          <div className="p-2 text-xs text-muted-foreground">System</div>
          {Object.entries({
            ...modulesByType[ModuleType.NOTIFICATION],
            ...modulesByType[ModuleType.DEBUG]
          }).map(([id, module]) => (
            <DropdownMenuItem key={id} onClick={() => visibleModules.includes(id) ? hideModule(id) : showModule(id)}>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                  {module.icon && <span className="mr-2">{module.icon}</span>}
                  <span>{module.title}</span>
                </div>
                {visibleModules.includes(id) ? (
                  <X size={14} className="text-muted-foreground" />
                ) : (
                  <Plus size={14} className="text-muted-foreground" />
                )}
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        
        {/* Other Module Types could be added here */}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ModuleSelector;
