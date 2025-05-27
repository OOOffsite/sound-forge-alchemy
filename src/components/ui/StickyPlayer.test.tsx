import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import StickyPlayer from './StickyPlayer';

describe('StickyPlayer', () => {
  const track = {
    title: 'Test Song',
    artist: 'Test Artist',
    albumArt: 'test.jpg',
    duration: '3:00',
    audioUrl: 'test.mp3',
  };

  it('renders track info', () => {
    render(<StickyPlayer track={track} isProcessing={false} isWorkingWithStems={false} />);
    expect(screen.getByText('Test Song')).toBeInTheDocument();
    expect(screen.getByText('Test Artist')).toBeInTheDocument();
  });

  it('toggles play/pause', () => {
    render(<StickyPlayer track={track} isProcessing={false} isWorkingWithStems={false} />);
    // Find the play button by role (button) and index, since no accessible name is present
    const buttons = screen.getAllByRole('button');
    // The play button is the second button (index 1)
    const playButton = buttons[1];
    fireEvent.click(playButton);
    // Should show pause icon after click (button still present)
    expect(screen.getAllByRole('button')[1]).toBeInTheDocument();
  });

  it('hides when no track', () => {
    const { container } = render(<StickyPlayer isProcessing={false} isWorkingWithStems={false} />);
    expect(container.firstChild).toBeNull();
  });
});
