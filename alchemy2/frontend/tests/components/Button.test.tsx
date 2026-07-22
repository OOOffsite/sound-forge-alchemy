/**
 * Button Component Test Suite
 *
 * @module tests/components/Button
 * @description Sample test to verify Vitest configuration
 * @author Sound Forge Alchemy Team - TDD Agent
 * @version 2.0.0
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

// Simple test component for configuration verification
const SimpleButton = ({ children }: { children: React.ReactNode }) => {
  return <button>{children}</button>;
};

describe('Button Component - Configuration Test', () => {
  it('should render button text', () => {
    render(<SimpleButton>Click me</SimpleButton>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should render as a button element', () => {
    render(<SimpleButton>Test</SimpleButton>);
    const button = screen.getByText('Test');
    expect(button.tagName).toBe('BUTTON');
  });

  it('should render children correctly', () => {
    const { container } = render(<SimpleButton>Hello World</SimpleButton>);
    expect(container.textContent).toBe('Hello World');
  });
});
