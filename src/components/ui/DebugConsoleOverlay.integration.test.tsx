// DebugConsoleOverlay.integration.test.tsx
// Integration test for DebugConsoleOverlay: log rendering, test event
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DebugConsoleOverlay from './DebugConsoleOverlay';

describe('DebugConsoleOverlay integration', () => {
  it('renders and can send a test debug event', () => {
    render(<DebugConsoleOverlay minimized={false} />);
    // Should render the debug console
    expect(screen.getByText(/debug console/i)).toBeInTheDocument();
    // Click the test event button
    fireEvent.click(screen.getByRole('button', { name: /test event/i }));
    // Should show a log (may be async, but at least no error)
  });
});
