import React from 'react';
import { render } from '@testing-library/react';
import DebugConsoleModule from './DebugConsoleModule';

describe('DebugConsoleModule', () => {
  it('renders without crashing', () => {
    render(<DebugConsoleModule />);
  });
});
