// InputPanel.integration.test.tsx
// Integration test for InputPanel: render, fetch playlist
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import InputPanel from './InputPanel';

describe('InputPanel integration', () => {
  it('renders and allows playlist fetch', () => {
    const onFetchPlaylist = vi.fn();
    render(<InputPanel onFetchPlaylist={onFetchPlaylist} isLoading={false} />);
    // Enter a playlist URL
    const input = screen.getByPlaceholderText(/spotify playlist url/i);
    fireEvent.change(input, { target: { value: 'https://open.spotify.com/playlist/123' } });
    // Click fetch button
    fireEvent.click(screen.getByRole('button', { name: /fetch/i }));
    expect(onFetchPlaylist).toHaveBeenCalled();
  });
});
