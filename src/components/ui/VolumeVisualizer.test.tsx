import React from 'react';
import { render } from '@testing-library/react';
import VolumeVisualizer from './VolumeVisualizer';

describe('VolumeVisualizer', () => {
  it('renders without crashing', () => {
    const audioRef = { current: null };
    render(
      <VolumeVisualizer
        audioRef={audioRef as any}
        playing={false}
        volume={0.5}
        width={100}
        height={20}
      />
    );
  });
});
