/**
 * E2E Test Helper Utilities
 *
 * @author Claude Code E2E Tests Agent
 * @license MIT
 * @version 1.0.0
 *
 * Shared helper functions for Playwright E2E tests
 */

import { Page, expect } from '@playwright/test';

/**
 * Wait for WebSocket connection to be established
 */
export async function waitForWebSocket(page: Page, timeout = 10000): Promise<void> {
  await page.waitForFunction(
    () => {
      return (window as any).wsConnected === true;
    },
    { timeout }
  );
}

/**
 * Wait for job to complete with realtime updates
 */
export async function waitForJobCompletion(
  page: Page,
  jobType: 'download' | 'processing' | 'analysis',
  timeout = 120000
): Promise<void> {
  const progressBar = page.locator('[data-testid="progress-bar"]');
  await expect(progressBar).toBeVisible();

  // Wait for progress to reach 100%
  await expect(progressBar).toHaveAttribute('aria-valuenow', '100', { timeout });

  // Wait for completion message
  const completionMessage = page.locator(`[data-testid="${jobType}-complete"]`);
  await expect(completionMessage).toBeVisible({ timeout: 5000 });
}

/**
 * Upload file and wait for it to be processed
 */
export async function uploadFile(
  page: Page,
  filePath: string
): Promise<void> {
  const fileInput = page.locator('input[type="file"]');
  await expect(fileInput).toBeAttached();
  await fileInput.setInputFiles(filePath);

  // Wait for file name to appear
  const fileName = page.locator('[data-testid="uploaded-file-name"]');
  await expect(fileName).toBeVisible({ timeout: 5000 });
}

/**
 * Navigate to a page and verify it loaded
 */
export async function navigateAndVerify(
  page: Page,
  path: string,
  titlePattern: RegExp
): Promise<void> {
  await page.goto(path);
  await expect(page).toHaveTitle(titlePattern);
}

/**
 * Select a track from the library
 */
export async function selectTrack(
  page: Page,
  trackIndex = 0
): Promise<string> {
  const trackItem = page.locator('[data-testid="track-item"]').nth(trackIndex);
  await expect(trackItem).toBeVisible({ timeout: 5000 });

  const trackTitle = await trackItem.locator('[data-testid="track-title"]').textContent();
  await trackItem.click();

  return trackTitle || '';
}

/**
 * Start playback and verify it's playing
 */
export async function startPlayback(page: Page): Promise<void> {
  const playButton = page.locator('[data-testid="play-button"]');
  await expect(playButton).toBeVisible();
  await expect(playButton).toBeEnabled();
  await playButton.click();

  const audioPlayer = page.locator('[data-testid="audio-player"]');
  await expect(audioPlayer).toHaveAttribute('data-playing', 'true', { timeout: 3000 });
}

/**
 * Pause playback and verify it's paused
 */
export async function pausePlayback(page: Page): Promise<void> {
  const pauseButton = page.locator('[data-testid="pause-button"]');
  await expect(pauseButton).toBeVisible();
  await pauseButton.click();

  const audioPlayer = page.locator('[data-testid="audio-player"]');
  await expect(audioPlayer).toHaveAttribute('data-playing', 'false', { timeout: 2000 });
}

/**
 * Seek to a specific position (0-1 range)
 */
export async function seekToPosition(
  page: Page,
  position: number
): Promise<void> {
  const progressBar = page.locator('[data-testid="progress-bar"]');
  const progressBarBox = await progressBar.boundingBox();

  if (!progressBarBox) {
    throw new Error('Progress bar not found');
  }

  await progressBar.click({
    position: {
      x: progressBarBox.width * position,
      y: progressBarBox.height / 2
    }
  });

  // Wait for seek to complete
  await page.waitForTimeout(500);
}

/**
 * Set volume level (0-100)
 */
export async function setVolume(
  page: Page,
  volume: number
): Promise<void> {
  const volumeSlider = page.locator('[data-testid="volume-slider"]');
  await expect(volumeSlider).toBeVisible();
  await volumeSlider.fill(volume.toString());
  await expect(volumeSlider).toHaveValue(volume.toString());
}

/**
 * Wait for toast notification
 */
export async function waitForToast(
  page: Page,
  messagePattern?: RegExp,
  timeout = 5000
): Promise<void> {
  const toast = page.locator('[data-testid="toast"]');
  await expect(toast).toBeVisible({ timeout });

  if (messagePattern) {
    await expect(toast).toContainText(messagePattern);
  }
}

/**
 * Dismiss all toast notifications
 */
export async function dismissToasts(page: Page): Promise<void> {
  const toasts = page.locator('[data-testid="toast"]');
  const count = await toasts.count();

  for (let i = 0; i < count; i++) {
    const closeButton = toasts.nth(i).locator('[data-testid="toast-close"]');
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
  }
}

/**
 * Wait for error message
 */
export async function waitForError(
  page: Page,
  messagePattern?: RegExp,
  timeout = 5000
): Promise<void> {
  const errorMessage = page.locator('[data-testid="error-message"]');
  await expect(errorMessage).toBeVisible({ timeout });

  if (messagePattern) {
    await expect(errorMessage).toContainText(messagePattern);
  }
}

/**
 * Clear all filters in library
 */
export async function clearAllFilters(page: Page): Promise<void> {
  const clearButton = page.locator('[data-testid="clear-filters"]');
  if (await clearButton.isVisible()) {
    await clearButton.click();
    await page.waitForTimeout(500);
  }
}

/**
 * Search in library
 */
export async function searchLibrary(
  page: Page,
  query: string
): Promise<void> {
  const searchInput = page.locator('[data-testid="search-input"]');
  await expect(searchInput).toBeVisible();
  await searchInput.clear();
  await searchInput.fill(query);
  await page.waitForTimeout(500); // Debounce
}

/**
 * Select multiple tracks (bulk selection)
 */
export async function selectMultipleTracks(
  page: Page,
  indices: number[]
): Promise<void> {
  for (const index of indices) {
    const trackItem = page.locator('[data-testid="track-item"]').nth(index);
    const checkbox = trackItem.locator('[data-testid="track-checkbox"]');
    await checkbox.check();
  }
}

/**
 * Wait for download to start
 */
export async function waitForDownload(page: Page): Promise<void> {
  await page.waitForEvent('download', { timeout: 10000 });
}

/**
 * Mock network response
 */
export async function mockApiResponse(
  page: Page,
  urlPattern: string,
  response: any
): Promise<void> {
  await page.route(urlPattern, route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response)
    });
  });
}

/**
 * Mock network failure
 */
export async function mockNetworkFailure(
  page: Page,
  urlPattern: string
): Promise<void> {
  await page.route(urlPattern, route => route.abort());
}

/**
 * Get track count in library
 */
export async function getTrackCount(page: Page): Promise<number> {
  const trackItems = page.locator('[data-testid="track-item"]');
  return await trackItems.count();
}

/**
 * Verify audio is playing (time progressing)
 */
export async function verifyAudioPlaying(page: Page): Promise<void> {
  const currentTime = page.locator('[data-testid="current-time"]');
  const time1 = await currentTime.textContent();
  await page.waitForTimeout(2000);
  const time2 = await currentTime.textContent();
  expect(time1).not.toEqual(time2);
}

/**
 * Open modal and verify visibility
 */
export async function openModal(
  page: Page,
  triggerSelector: string,
  modalSelector: string
): Promise<void> {
  const trigger = page.locator(triggerSelector);
  await trigger.click();

  const modal = page.locator(modalSelector);
  await expect(modal).toBeVisible({ timeout: 3000 });
}

/**
 * Close modal and verify it's closed
 */
export async function closeModal(
  page: Page,
  modalSelector: string
): Promise<void> {
  const modal = page.locator(modalSelector);
  const closeButton = modal.locator('[data-testid="modal-close"]');
  await closeButton.click();

  await expect(modal).not.toBeVisible({ timeout: 2000 });
}

/**
 * Fill Spotify URL and fetch metadata
 */
export async function fetchSpotifyTrack(
  page: Page,
  url: string
): Promise<void> {
  const urlInput = page.locator('[data-testid="spotify-url-input"]');
  await expect(urlInput).toBeVisible();
  await urlInput.fill(url);

  const fetchButton = page.locator('[data-testid="fetch-button"]');
  await fetchButton.click();

  // Wait for metadata to load
  const trackTitle = page.locator('[data-testid="track-title"]');
  await expect(trackTitle).toBeVisible({ timeout: 10000 });
}

/**
 * Start download job
 */
export async function startDownload(page: Page): Promise<void> {
  const downloadButton = page.locator('[data-testid="download-button"]');
  await expect(downloadButton).toBeVisible();
  await expect(downloadButton).toBeEnabled();
  await downloadButton.click();

  // Wait for job to be created
  const jobProgress = page.locator('[data-testid="job-progress"]');
  await expect(jobProgress).toBeVisible({ timeout: 5000 });
}

/**
 * Select Demucs model
 */
export async function selectDemucsModel(
  page: Page,
  model: 'htdemucs' | 'htdemucs_ft' | 'htdemucs_6s'
): Promise<void> {
  const modelSelect = page.locator('[data-testid="model-select"]');
  await expect(modelSelect).toBeVisible();
  await modelSelect.selectOption(model);
}

/**
 * Select stems for separation
 */
export async function selectStems(
  page: Page,
  stems: ('vocals' | 'drums' | 'bass' | 'other')[]
): Promise<void> {
  for (const stem of stems) {
    const checkbox = page.locator(`[data-testid="stem-checkbox-${stem}"]`);
    await expect(checkbox).toBeVisible();
    await checkbox.check();
    await expect(checkbox).toBeChecked();
  }
}

/**
 * Start stem separation
 */
export async function startStemSeparation(page: Page): Promise<void> {
  const separateButton = page.locator('[data-testid="separate-button"]');
  await expect(separateButton).toBeVisible();
  await expect(separateButton).toBeEnabled();
  await separateButton.click();

  // Wait for processing to start
  const processingProgress = page.locator('[data-testid="processing-progress"]');
  await expect(processingProgress).toBeVisible({ timeout: 5000 });
}

/**
 * Start audio analysis
 */
export async function startAnalysis(page: Page): Promise<void> {
  const analyzeButton = page.locator('[data-testid="analyze-button"]');
  await expect(analyzeButton).toBeVisible();
  await expect(analyzeButton).toBeEnabled();
  await analyzeButton.click();

  // Wait for analysis to start
  const analysisProgress = page.locator('[data-testid="analysis-progress"]');
  await expect(analysisProgress).toBeVisible({ timeout: 5000 });
}

/**
 * Verify analysis results are displayed
 */
export async function verifyAnalysisResults(page: Page): Promise<void> {
  // Verify key metrics
  const tempo = page.locator('[data-testid="tempo"]');
  await expect(tempo).toBeVisible();

  const key = page.locator('[data-testid="key"]');
  await expect(key).toBeVisible();

  const energy = page.locator('[data-testid="energy"]');
  await expect(energy).toBeVisible();

  // Verify visualizations
  const waveform = page.locator('[data-testid="waveform-chart"]');
  await expect(waveform).toBeVisible();

  const spectrum = page.locator('[data-testid="spectrum-chart"]');
  await expect(spectrum).toBeVisible();
}

/**
 * Get current playback time in seconds
 */
export async function getCurrentTime(page: Page): Promise<number> {
  const audioPlayer = page.locator('[data-testid="audio-player"]');
  return await audioPlayer.evaluate((el: any) => el.currentTime);
}

/**
 * Get total duration in seconds
 */
export async function getDuration(page: Page): Promise<number> {
  const audioPlayer = page.locator('[data-testid="audio-player"]');
  return await audioPlayer.evaluate((el: any) => el.duration);
}

/**
 * Wait for element with retry
 */
export async function waitForElementWithRetry(
  page: Page,
  selector: string,
  retries = 3,
  timeout = 5000
): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      const element = page.locator(selector);
      await expect(element).toBeVisible({ timeout });
      return;
    } catch (error) {
      if (i === retries - 1) throw error;
      await page.waitForTimeout(1000);
    }
  }
}
