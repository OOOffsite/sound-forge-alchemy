// OverlayGrid.integration.test.tsx
// Integration test for OverlayGrid: render panes, update pane
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import OverlayGrid from './OverlayGrid';

describe('OverlayGrid integration', () => {
  it('renders overlay panes', () => {
    const panes = [
      { id: 'debug', title: 'Debug Console', content: <div>Debug Content</div> },
      { id: 'notifications', title: 'Notifications', content: <div>Notifications Content</div> },
    ];
    render(
      <OverlayGrid
        panes={panes}
        onUpdatePane={() => {}}
        stickyPlayerActive={false}
        stickyPlayerHeight={72}
      />
    );
    expect(screen.getByText('Debug Console')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });
});
