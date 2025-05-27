import React from 'react';
import { render } from '@testing-library/react';
import StickyPlayerModule from './StickyPlayerModule';

describe('StickyPlayerModule', () => {
  it('renders without crashing', () => {
    render(<StickyPlayerModule />);
  });
});
