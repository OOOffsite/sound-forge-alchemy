/**
 * E2E Tests: Audio Player Workflow
 *
 * @author Claude Code E2E Tests Agent
 * @license MIT
 * @version 1.0.0
 *
 * TDD Phase: RED - Write failing tests FIRST
 * Priority: 4
 *
 * Tests the complete user flow for audio playback:
 * 1. Navigate to player
 * 2. Select track from library
 * 3. Play/pause audio
 * 4. Seek through track
 * 5. Adjust volume
 * 6. Loop and shuffle
 * 7. Playlist management
 * 8. Keyboard shortcuts
 */

import { test, expect } from '@playwright/test';

test.describe('Audio Player Workflow', () => {
  /**
   * Test: Basic playback controls
   *
   * TDD Expectation: This test SHOULD FAIL until player is implemented
   */
  test('should play, pause, and seek audio', async ({ page }) => {
    // 1. Navigate to player
    await page.goto('/player');
    await expect(page).toHaveTitle(/Alchemy.*Player|Player.*Alchemy/i);

    // 2. Select track from library
    const trackItem = page.locator('[data-testid="track-item"]').first();
    await expect(trackItem).toBeVisible({ timeout: 5000 });
    await trackItem.click();

    // Verify track loaded
    const trackTitle = page.locator('[data-testid="player-track-title"]');
    await expect(trackTitle).toBeVisible();
    await expect(trackTitle).not.toBeEmpty();

    // 3. Play audio
    const playButton = page.locator('[data-testid="play-button"]');
    await expect(playButton).toBeVisible();
    await expect(playButton).toBeEnabled();
    await playButton.click();

    // Verify audio is playing
    const audioPlayer = page.locator('[data-testid="audio-player"]');
    await expect(audioPlayer).toHaveAttribute('data-playing', 'true', { timeout: 2000 });

    // Verify play button changed to pause
    const pauseButton = page.locator('[data-testid="pause-button"]');
    await expect(pauseButton).toBeVisible();

    // Verify time is progressing
    const currentTime = page.locator('[data-testid="current-time"]');
    const time1 = await currentTime.textContent();
    await page.waitForTimeout(2000);
    const time2 = await currentTime.textContent();
    expect(time1).not.toEqual(time2);

    // 4. Pause audio
    await pauseButton.click();
    await expect(audioPlayer).toHaveAttribute('data-playing', 'false');
    await expect(playButton).toBeVisible();

    // 5. Seek to 50%
    const progressBar = page.locator('[data-testid="progress-bar"]');
    await expect(progressBar).toBeVisible();

    // Get progress bar dimensions
    const progressBarBox = await progressBar.boundingBox();
    expect(progressBarBox).not.toBeNull();

    // Click at 50% position
    await progressBar.click({
      position: {
        x: (progressBarBox?.width || 400) / 2,
        y: (progressBarBox?.height || 10) / 2
      }
    });

    // 6. Verify time updated
    const currentTimeAfterSeek = await currentTime.textContent();
    expect(currentTimeAfterSeek).not.toBe('0:00');
    expect(currentTimeAfterSeek).not.toEqual(time2);

    // Verify progress bar updated
    const progressValue = await progressBar.getAttribute('aria-valuenow');
    expect(parseInt(progressValue || '0')).toBeGreaterThan(30);
    expect(parseInt(progressValue || '0')).toBeLessThan(70);
  });

  /**
   * Test: Volume controls
   *
   * TDD Expectation: This test SHOULD FAIL until volume controls are implemented
   */
  test('should adjust volume and mute', async ({ page }) => {
    await page.goto('/player');

    const trackItem = page.locator('[data-testid="track-item"]').first();
    await trackItem.click();

    const playButton = page.locator('[data-testid="play-button"]');
    await playButton.click();

    // 1. Adjust volume to 50%
    const volumeSlider = page.locator('[data-testid="volume-slider"]');
    await expect(volumeSlider).toBeVisible();

    await volumeSlider.fill('50');
    await expect(volumeSlider).toHaveValue('50');

    // Verify volume icon changes
    const volumeIcon = page.locator('[data-testid="volume-icon"]');
    await expect(volumeIcon).toHaveAttribute('data-level', 'medium');

    // 2. Mute audio
    const muteButton = page.locator('[data-testid="mute-button"]');
    await expect(muteButton).toBeVisible();
    await muteButton.click();

    // Verify muted
    await expect(volumeSlider).toHaveValue('0');
    await expect(volumeIcon).toHaveAttribute('data-level', 'muted');
    await expect(muteButton).toHaveAttribute('data-muted', 'true');

    // 3. Unmute
    await muteButton.click();
    await expect(volumeSlider).toHaveValue('50'); // Should restore previous volume
    await expect(muteButton).toHaveAttribute('data-muted', 'false');

    // 4. Set volume to max
    await volumeSlider.fill('100');
    await expect(volumeIcon).toHaveAttribute('data-level', 'high');

    // 5. Set volume to low
    await volumeSlider.fill('10');
    await expect(volumeIcon).toHaveAttribute('data-level', 'low');
  });

  /**
   * Test: Loop and shuffle modes
   *
   * TDD Expectation: This test SHOULD FAIL until loop/shuffle are implemented
   */
  test('should enable loop and shuffle modes', async ({ page }) => {
    await page.goto('/player');

    const trackItem = page.locator('[data-testid="track-item"]').first();
    await trackItem.click();

    // 1. Test loop modes
    const loopButton = page.locator('[data-testid="loop-button"]');
    await expect(loopButton).toBeVisible();

    // No loop (default)
    await expect(loopButton).toHaveAttribute('data-loop-mode', 'none');

    // Loop all
    await loopButton.click();
    await expect(loopButton).toHaveAttribute('data-loop-mode', 'all');

    // Loop one
    await loopButton.click();
    await expect(loopButton).toHaveAttribute('data-loop-mode', 'one');

    // Back to no loop
    await loopButton.click();
    await expect(loopButton).toHaveAttribute('data-loop-mode', 'none');

    // 2. Test shuffle
    const shuffleButton = page.locator('[data-testid="shuffle-button"]');
    await expect(shuffleButton).toBeVisible();

    // Enable shuffle
    await shuffleButton.click();
    await expect(shuffleButton).toHaveAttribute('data-shuffle', 'true');

    // Disable shuffle
    await shuffleButton.click();
    await expect(shuffleButton).toHaveAttribute('data-shuffle', 'false');
  });

  /**
   * Test: Next/previous track navigation
   *
   * TDD Expectation: This test SHOULD FAIL until navigation is implemented
   */
  test('should navigate between tracks', async ({ page }) => {
    await page.goto('/player');

    // Select first track
    const firstTrack = page.locator('[data-testid="track-item"]').first();
    await firstTrack.click();

    const trackTitle = page.locator('[data-testid="player-track-title"]');
    const firstTrackTitle = await trackTitle.textContent();

    // Play
    const playButton = page.locator('[data-testid="play-button"]');
    await playButton.click();

    // 1. Next track
    const nextButton = page.locator('[data-testid="next-button"]');
    await expect(nextButton).toBeVisible();
    await expect(nextButton).toBeEnabled();
    await nextButton.click();

    // Verify track changed
    const secondTrackTitle = await trackTitle.textContent();
    expect(secondTrackTitle).not.toEqual(firstTrackTitle);

    // Verify still playing
    const audioPlayer = page.locator('[data-testid="audio-player"]');
    await expect(audioPlayer).toHaveAttribute('data-playing', 'true');

    // 2. Previous track
    const previousButton = page.locator('[data-testid="previous-button"]');
    await expect(previousButton).toBeVisible();
    await expect(previousButton).toBeEnabled();
    await previousButton.click();

    // Verify back to first track
    const backToFirstTitle = await trackTitle.textContent();
    expect(backToFirstTitle).toEqual(firstTrackTitle);

    // 3. Previous again (should restart current track if > 3 seconds in)
    await page.waitForTimeout(3500);
    await previousButton.click();

    const currentTime = page.locator('[data-testid="current-time"]');
    await expect(currentTime).toContainText('0:0');
  });

  /**
   * Test: Waveform visualization and interaction
   *
   * TDD Expectation: This test SHOULD FAIL until waveform is implemented
   */
  test('should display waveform and allow seeking via waveform', async ({ page }) => {
    await page.goto('/player');

    const trackItem = page.locator('[data-testid="track-item"]').first();
    await trackItem.click();

    // 1. Verify waveform displayed
    const waveform = page.locator('[data-testid="waveform"]');
    await expect(waveform).toBeVisible({ timeout: 5000 });

    // 2. Play track
    const playButton = page.locator('[data-testid="play-button"]');
    await playButton.click();

    // 3. Verify playhead moving
    const playhead = page.locator('[data-testid="waveform-playhead"]');
    await expect(playhead).toBeVisible();

    const playheadPosition1 = await playhead.getAttribute('data-position');
    await page.waitForTimeout(1000);
    const playheadPosition2 = await playhead.getAttribute('data-position');
    expect(playheadPosition1).not.toEqual(playheadPosition2);

    // 4. Click on waveform to seek
    const waveformBox = await waveform.boundingBox();
    expect(waveformBox).not.toBeNull();

    await waveform.click({
      position: {
        x: (waveformBox?.width || 800) * 0.75, // Click at 75%
        y: (waveformBox?.height || 100) / 2
      }
    });

    // 5. Verify playhead moved to clicked position
    const currentTime = page.locator('[data-testid="current-time"]');
    const progressBar = page.locator('[data-testid="progress-bar"]');
    const progressValue = await progressBar.getAttribute('aria-valuenow');
    expect(parseInt(progressValue || '0')).toBeGreaterThan(60);
  });

  /**
   * Test: Keyboard shortcuts
   *
   * TDD Expectation: This test SHOULD FAIL until keyboard shortcuts are implemented
   */
  test('should support keyboard shortcuts', async ({ page }) => {
    await page.goto('/player');

    const trackItem = page.locator('[data-testid="track-item"]').first();
    await trackItem.click();

    const audioPlayer = page.locator('[data-testid="audio-player"]');

    // 1. Space to play/pause
    await page.keyboard.press('Space');
    await expect(audioPlayer).toHaveAttribute('data-playing', 'true');

    await page.keyboard.press('Space');
    await expect(audioPlayer).toHaveAttribute('data-playing', 'false');

    // 2. Arrow keys for seeking
    await page.keyboard.press('Space'); // Play first
    await page.waitForTimeout(1000);

    const currentTime = page.locator('[data-testid="current-time"]');
    const time1 = await currentTime.textContent();

    await page.keyboard.press('ArrowRight'); // Forward 5 seconds
    await page.waitForTimeout(500);
    const time2 = await currentTime.textContent();
    expect(time2).not.toEqual(time1);

    await page.keyboard.press('ArrowLeft'); // Back 5 seconds
    await page.waitForTimeout(500);
    const time3 = await currentTime.textContent();
    expect(time3).not.toEqual(time2);

    // 3. Volume controls
    const volumeSlider = page.locator('[data-testid="volume-slider"]');
    await volumeSlider.focus();

    const volume1 = await volumeSlider.inputValue();
    await page.keyboard.press('ArrowUp');
    const volume2 = await volumeSlider.inputValue();
    expect(parseInt(volume2)).toBeGreaterThan(parseInt(volume1));

    await page.keyboard.press('ArrowDown');
    const volume3 = await volumeSlider.inputValue();
    expect(parseInt(volume3)).toBeLessThan(parseInt(volume2));

    // 4. M to mute
    await page.keyboard.press('m');
    const muteButton = page.locator('[data-testid="mute-button"]');
    await expect(muteButton).toHaveAttribute('data-muted', 'true');

    await page.keyboard.press('m');
    await expect(muteButton).toHaveAttribute('data-muted', 'false');

    // 5. L to toggle loop
    await page.keyboard.press('l');
    const loopButton = page.locator('[data-testid="loop-button"]');
    await expect(loopButton).toHaveAttribute('data-loop-mode', /all|one/);

    // 6. S to toggle shuffle
    await page.keyboard.press('s');
    const shuffleButton = page.locator('[data-testid="shuffle-button"]');
    await expect(shuffleButton).toHaveAttribute('data-shuffle', 'true');
  });

  /**
   * Test: Playback speed control
   *
   * TDD Expectation: This test SHOULD FAIL until speed control is implemented
   */
  test('should adjust playback speed', async ({ page }) => {
    await page.goto('/player');

    const trackItem = page.locator('[data-testid="track-item"]').first();
    await trackItem.click();

    const playButton = page.locator('[data-testid="play-button"]');
    await playButton.click();

    // 1. Open speed menu
    const speedButton = page.locator('[data-testid="speed-button"]');
    await expect(speedButton).toBeVisible();
    await speedButton.click();

    const speedMenu = page.locator('[data-testid="speed-menu"]');
    await expect(speedMenu).toBeVisible();

    // 2. Select 0.5x speed
    const speed05 = page.locator('[data-testid="speed-0.5"]');
    await speed05.click();
    await expect(speedButton).toContainText('0.5x');

    const audioPlayer = page.locator('[data-testid="audio-player"]');
    const playbackRate = await audioPlayer.evaluate((el: any) => el.playbackRate);
    expect(playbackRate).toBe(0.5);

    // 3. Select 1.5x speed
    await speedButton.click();
    const speed15 = page.locator('[data-testid="speed-1.5"]');
    await speed15.click();
    await expect(speedButton).toContainText('1.5x');

    // 4. Reset to normal speed (1x)
    await speedButton.click();
    const speed1 = page.locator('[data-testid="speed-1"]');
    await speed1.click();
    await expect(speedButton).toContainText('1x');
  });

  /**
   * Test: Playlist queue management
   *
   * TDD Expectation: This test SHOULD FAIL until queue is implemented
   */
  test('should manage playback queue', async ({ page }) => {
    await page.goto('/player');

    // 1. Add track to queue
    const trackItem = page.locator('[data-testid="track-item"]').first();
    await trackItem.hover();

    const addToQueueButton = trackItem.locator('[data-testid="add-to-queue"]');
    await expect(addToQueueButton).toBeVisible();
    await addToQueueButton.click();

    // 2. Verify queue panel
    const queueButton = page.locator('[data-testid="queue-button"]');
    await queueButton.click();

    const queuePanel = page.locator('[data-testid="queue-panel"]');
    await expect(queuePanel).toBeVisible();

    const queueItems = page.locator('[data-testid="queue-item"]');
    await expect(queueItems).toHaveCount(1);

    // 3. Add more tracks
    const secondTrack = page.locator('[data-testid="track-item"]').nth(1);
    await secondTrack.hover();
    await secondTrack.locator('[data-testid="add-to-queue"]').click();

    await expect(queueItems).toHaveCount(2);

    // 4. Reorder queue (drag and drop)
    const firstQueueItem = queueItems.first();
    const secondQueueItem = queueItems.nth(1);

    const firstTitle = await firstQueueItem.textContent();
    const secondTitle = await secondQueueItem.textContent();

    await firstQueueItem.dragTo(secondQueueItem);

    // Verify order changed
    const newFirstTitle = await queueItems.first().textContent();
    expect(newFirstTitle).toEqual(secondTitle);

    // 5. Remove from queue
    const removeButton = queueItems.first().locator('[data-testid="remove-from-queue"]');
    await removeButton.click();

    await expect(queueItems).toHaveCount(1);

    // 6. Clear queue
    const clearQueueButton = page.locator('[data-testid="clear-queue"]');
    await clearQueueButton.click();

    await expect(queueItems).toHaveCount(0);
  });

  /**
   * Test: Audio output device selection
   *
   * TDD Expectation: This test SHOULD FAIL until device selection is implemented
   */
  test('should allow selecting audio output device', async ({ page }) => {
    await page.goto('/player');

    const trackItem = page.locator('[data-testid="track-item"]').first();
    await trackItem.click();

    // 1. Open device menu
    const deviceButton = page.locator('[data-testid="audio-device-button"]');
    await expect(deviceButton).toBeVisible();
    await deviceButton.click();

    const deviceMenu = page.locator('[data-testid="device-menu"]');
    await expect(deviceMenu).toBeVisible();

    // 2. Verify devices listed
    const deviceItems = page.locator('[data-testid="device-item"]');
    const deviceCount = await deviceItems.count();
    expect(deviceCount).toBeGreaterThan(0);

    // 3. Select device
    const firstDevice = deviceItems.first();
    await firstDevice.click();

    // Verify selected
    await expect(firstDevice).toHaveAttribute('data-selected', 'true');
  });

  /**
   * Test: Auto-play next track on completion
   *
   * TDD Expectation: This test SHOULD FAIL until auto-play is implemented
   */
  test('should auto-play next track when current track ends', async ({ page }) => {
    await page.goto('/player');

    const firstTrack = page.locator('[data-testid="track-item"]').first();
    await firstTrack.click();

    const trackTitle = page.locator('[data-testid="player-track-title"]');
    const firstTrackTitle = await trackTitle.textContent();

    // Seek near end
    const audioPlayer = page.locator('[data-testid="audio-player"]');
    await audioPlayer.evaluate((el: any) => {
      el.currentTime = el.duration - 2; // 2 seconds before end
    });

    const playButton = page.locator('[data-testid="play-button"]');
    await playButton.click();

    // Wait for track to end
    await page.waitForTimeout(3000);

    // Verify next track started
    const newTrackTitle = await trackTitle.textContent();
    expect(newTrackTitle).not.toEqual(firstTrackTitle);

    // Verify still playing
    await expect(audioPlayer).toHaveAttribute('data-playing', 'true');
  });

  /**
   * Test: Track metadata display
   *
   * TDD Expectation: This test SHOULD FAIL until metadata display is implemented
   */
  test('should display comprehensive track metadata', async ({ page }) => {
    await page.goto('/player');

    const trackItem = page.locator('[data-testid="track-item"]').first();
    await trackItem.click();

    // Verify metadata displayed
    const trackTitle = page.locator('[data-testid="player-track-title"]');
    await expect(trackTitle).toBeVisible();

    const trackArtist = page.locator('[data-testid="player-track-artist"]');
    await expect(trackArtist).toBeVisible();

    const trackAlbum = page.locator('[data-testid="player-track-album"]');
    await expect(trackAlbum).toBeVisible();

    const albumArt = page.locator('[data-testid="album-art"]');
    await expect(albumArt).toBeVisible();

    const duration = page.locator('[data-testid="total-time"]');
    await expect(duration).toBeVisible();
    await expect(duration).toContainText(/\d+:\d+/);

    // Show more details
    const moreInfoButton = page.locator('[data-testid="more-info-button"]');
    await moreInfoButton.click();

    const infoPanel = page.locator('[data-testid="info-panel"]');
    await expect(infoPanel).toBeVisible();

    const bitrate = page.locator('[data-testid="bitrate"]');
    await expect(bitrate).toBeVisible();

    const sampleRate = page.locator('[data-testid="sample-rate"]');
    await expect(sampleRate).toBeVisible();

    const fileSize = page.locator('[data-testid="file-size"]');
    await expect(fileSize).toBeVisible();
  });
});
