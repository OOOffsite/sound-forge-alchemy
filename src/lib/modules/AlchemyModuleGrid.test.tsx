import React from 'react';
import { render } from '@testing-library/react';
import { AlchemyModuleGrid } from './AlchemyModuleGrid';

describe('AlchemyModuleGrid', () => {
  it('renders without crashing', () => {
    render(<AlchemyModuleGrid />);
  });
});
