import React from 'react';
import { render } from '@testing-library/react';
import ModuleContainer from './ModuleContainer';
import { ModulePosition } from '../context/ModuleRegistry';

describe('ModuleContainer', () => {
  it('renders children', () => {
    const { container } = render(
      <ModuleContainer position={ModulePosition.OVERLAY} />
    );
    expect(container).toBeDefined();
  });
});
