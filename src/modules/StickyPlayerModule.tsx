import React from 'react';
import { 
  ModuleType, 
  ModulePosition, 
  ModuleSize, 
  useRegisterModule 
} from '../context/ModuleRegistry';
import StickyPlayer, { StickyPlayerProps } from '../components/ui/StickyPlayer';
import { Music } from 'lucide-react';

interface StickyPlayerModuleProps extends StickyPlayerProps {
  // Additional module-specific props
}

const StickyPlayerModule: React.FC<StickyPlayerModuleProps> = (props) => {
  // Register this component as a module
  useRegisterModule({
    id: 'audio-player',
    type: ModuleType.PLAYER,
    title: 'Audio Player',
    description: 'Play and control audio tracks',
    component: StickyPlayerInner,
    position: ModulePosition.FIXED,
    size: ModuleSize.LARGE,
    initialProps: props,
    icon: <Music size={18} />,
    isVisible: true, // Always visible by default
  });
  
  // The StickyPlayer is a special case since it has a fixed position at the bottom
  // We'll render it directly here instead of in a module container
  return <StickyPlayer {...props} />;
};

// Inner component (not used for StickyPlayer since it renders directly)
const StickyPlayerInner: React.FC<StickyPlayerProps> = (props) => {
  // This won't typically be used since StickyPlayer renders directly
  return null;
};

export default StickyPlayerModule;
