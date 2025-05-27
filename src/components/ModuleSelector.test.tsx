import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import ModuleSelector from './ModuleSelector';

describe('ModuleSelector', () => {
  it('renders selector button', () => {
    const { getByRole } = render(<ModuleSelector />);
    expect(getByRole('button')).toBeInTheDocument();
  });
});
