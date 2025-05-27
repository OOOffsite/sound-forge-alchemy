// App.integration.test.tsx
// Integration test for the main App component and routing
// Covers: App, MainLayout, Home, Index, About, NotFound, and all composed UI modules
// Author: sound-forge-alchemy team
// Version: 1.10.0

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

function setLocation(path: string) {
  window.history.pushState({}, '', path);
}

describe('App integration', () => {
  it('renders Home page on /', () => {
    setLocation('/');
    render(<App />);
    // Use getByRole for heading and check for unique text
    expect(screen.getByRole('heading', { name: /ai-powered music source separation/i })).toBeInTheDocument();
    // Optionally, check for a unique nav link
    expect(screen.getByRole('link', { name: /forge/i })).toBeInTheDocument();
  });

  it('renders Index (Session) page on /alchemy/session', () => {
    setLocation('/alchemy/session');
    render(<App />);
    // Look for the main heading on the Index page
    expect(screen.getByRole('heading', { name: /audio source separation/i })).toBeInTheDocument();
    // Check for the playlist input panel
    expect(screen.getByLabelText(/spotify input panel/i)).toBeInTheDocument();
  });

  it('renders About page on /about', () => {
    setLocation('/about');
    render(<App />);
    // Use heading and unique text from About page
    expect(screen.getByRole('heading', { name: /about soundforge/i })).toBeInTheDocument();
    expect(screen.getByText(/production-grade web application/i)).toBeInTheDocument();
  });

  it('renders NotFound page on unknown route', () => {
    setLocation('/does-not-exist');
    render(<App />);
    // Use heading and unique text from NotFound page
    expect(screen.getByRole('heading', { name: /404/i })).toBeInTheDocument();
    expect(screen.getByText(/oops! page not found/i)).toBeInTheDocument();
  });
});
