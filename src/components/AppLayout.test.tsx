import React from 'react';
import { render } from '@testing-library/react';
import AppLayout from './AppLayout';

describe('AppLayout', () => {
  it('renders children', () => {
    const { getByText } = render(
      <AppLayout>
        <div>Child Content</div>
      </AppLayout>
    );
    expect(getByText('Child Content')).toBeInTheDocument();
  });
});
