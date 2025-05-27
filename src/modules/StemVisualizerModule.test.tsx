import React from 'react';
import { render } from '@testing-library/react';
import StemVisualizerModule from './StemVisualizerModule';

describe('StemVisualizerModule', () => {
  it('renders without crashing', () => {
    render(<StemVisualizerModule />);
  });
});
