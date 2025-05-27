import React from 'react';
import { 
  ModuleType, 
  ModulePosition, 
  ModuleSize, 
  useRegisterModule 
} from '../context/ModuleRegistry';
import StemVisualizer, { StemVisualizerProps } from '../components/StemVisualizer';
import { Music4 } from 'lucide-react';

interface StemVisualizerModuleProps extends StemVisualizerProps {
  // Additional module-specific props can be added here
}

const StemVisualizerModule: React.FC<StemVisualizerModuleProps> = (props) => {
  // Register this component as a module
  useRegisterModule({
    id: 'stem-visualizer',
    type: ModuleType.STEMS,
    title: 'Stem Visualizer',
    description: 'Visualize and control individual stems of a track',
    component: StemVisualizerInner,
    position: ModulePosition.RIGHT,
    size: ModuleSize.LARGE,
    initialProps: props,
    dependencies: ['audio-player'], // Depends on audio player module
    icon: <Music4 size={18} />,
  });
  
  // This component doesn't render anything itself
  return null;
};

// Inner component that will be rendered within the module container
const StemVisualizerInner: React.FC<StemVisualizerProps> = (props) => {
  return <StemVisualizer {...props} />;
};

export default StemVisualizerModule;
