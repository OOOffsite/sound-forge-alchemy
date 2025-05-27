// NotificationLog.integration.test.tsx
// Integration test for NotificationLog: render, notification display
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import NotificationLog from './NotificationLog';

describe('NotificationLog integration', () => {
  it('renders notification log UI', () => {
    render(<NotificationLog minimized={false} />);
    expect(screen.getByText(/notification log/i)).toBeInTheDocument();
  });
});
