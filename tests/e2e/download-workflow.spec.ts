/**
 * E2E Tests: Track Download Workflow
 *
 * @author Claude Code E2E Tests Agent
 * @license MIT
 * @version 1.0.0
 *
 * TDD Phase: RED - Write failing tests FIRST
 * Priority: 1
 *
 * Tests the complete user flow for downloading a track from Spotify:
 * 1. Navigate to app
 * 2. Enter Spotify URL
 * 3. Fetch track metadata
 * 4. Download track
 * 5. Monitor progress (Realtime)
 * 6. Verify completion
 * 7. Verify track in library
 */

import { test, expect } from '@playwright/test';

test.describe('Track Download Workflow', () => {
  /**
   * Test: Complete download flow from URL to library
   *
   * TDD Expectation: This test SHOULD FAIL until implementation is complete
   */
  test('should complete full download flow', async ({ page }) => {
    // 1. Navigate to app
    await page.goto('/');
    await expect(page).toHaveTitle(/Alchemy/);

    // 2. Enter Spotify URL
    const spotifyUrl = 'https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp';
    const urlInput = page.locator('[data-testid="spotify-url-input"]');
    await expect(urlInput).toBeVisible();
    await urlInput.fill(spotifyUrl);

    // 3. Click Fetch button
    const fetchButton = page.locator('[data-testid="fetch-button"]');
    await expect(fetchButton).toBeVisible();
    await expect(fetchButton).toBeEnabled();
    await fetchButton.click();

    // 4. Wait for track metadata to load
    const trackTitle = page.locator('[data-testid="track-title"]');
    await expect(trackTitle).toBeVisible({ timeout: 10000 });
    await expect(trackTitle).not.toBeEmpty();

    // Verify track metadata is displayed
    const trackArtist = page.locator('[data-testid="track-artist"]');
    await expect(trackArtist).toBeVisible();
    await expect(trackArtist).not.toBeEmpty();

    const trackAlbum = page.locator('[data-testid="track-album"]');
    await expect(trackAlbum).toBeVisible();

    // 5. Click Download button
    const downloadButton = page.locator('[data-testid="download-button"]');
    await expect(downloadButton).toBeVisible();
    await expect(downloadButton).toBeEnabled();
    await downloadButton.click();

    // 6. Wait for download job to be created
    const jobProgress = page.locator('[data-testid="job-progress"]');
    await expect(jobProgress).toBeVisible({ timeout: 5000 });

    // 7. Wait for progress updates (Realtime via WebSocket)
    const progressBar = page.locator('[data-testid="progress-bar"]');
    await expect(progressBar).toBeVisible();

    // Wait for progress to start (>0%)
    await expect(progressBar).toHaveAttribute('aria-valuenow', /[1-9]/, { timeout: 10000 });

    // Wait for completion (100%)
    await expect(progressBar).toHaveAttribute('aria-valuenow', '100', { timeout: 60000 });

    // 8. Verify completion message
    const completionMessage = page.locator('[data-testid="download-complete"]');
    await expect(completionMessage).toBeVisible();
    await expect(completionMessage).toContainText(/complete|success/i);

    // 9. Verify audio file in library
    const libraryButton = page.locator('[data-testid="track-library"]');
    await libraryButton.click();

    const trackItem = page.locator('[data-testid="track-item"]').first();
    await expect(trackItem).toBeVisible({ timeout: 5000 });
    await expect(trackItem).toContainText(trackTitle.textContent() || '');
  });

  /**
   * Test: Invalid URL error handling
   *
   * TDD Expectation: This test SHOULD FAIL until validation is implemented
   */
  test('should show error for invalid URL', async ({ page }) => {
    await page.goto('/');

    // Enter invalid URL
    const urlInput = page.locator('[data-testid="spotify-url-input"]');
    await urlInput.fill('invalid-url');

    // Click Fetch button
    const fetchButton = page.locator('[data-testid="fetch-button"]');
    await fetchButton.click();

    // Verify error message is shown
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    await expect(errorMessage).toContainText(/invalid|error/i);

    // Verify no track metadata is displayed
    const trackTitle = page.locator('[data-testid="track-title"]');
    await expect(trackTitle).not.toBeVisible();
  });

  /**
   * Test: Network error handling
   *
   * TDD Expectation: This test SHOULD FAIL until error handling is complete
   */
  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network failure for Spotify API
    await page.route('**/api/spotify/fetch', route => route.abort());

    await page.goto('/');

    // Enter valid Spotify URL
    const urlInput = page.locator('[data-testid="spotify-url-input"]');
    await urlInput.fill('https://open.spotify.com/track/test');

    // Click Fetch button
    const fetchButton = page.locator('[data-testid="fetch-button"]');
    await fetchButton.click();

    // Verify network error message
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    await expect(errorMessage).toContainText(/network|connection|failed/i);
  });

  /**
   * Test: Concurrent downloads
   *
   * TDD Expectation: This test SHOULD FAIL until queue management is implemented
   */
  test('should handle multiple concurrent downloads', async ({ page }) => {
    await page.goto('/');

    const urls = [
      'https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp',
      'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
      'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b',
    ];

    // Queue multiple downloads
    for (const url of urls) {
      const urlInput = page.locator('[data-testid="spotify-url-input"]');
      await urlInput.fill(url);

      const fetchButton = page.locator('[data-testid="fetch-button"]');
      await fetchButton.click();

      // Wait for metadata
      await page.waitForTimeout(1000);

      const downloadButton = page.locator('[data-testid="download-button"]');
      await downloadButton.click();
    }

    // Verify all jobs are queued
    const jobItems = page.locator('[data-testid="job-item"]');
    await expect(jobItems).toHaveCount(3, { timeout: 5000 });

    // Verify jobs complete one by one
    for (let i = 0; i < 3; i++) {
      const jobItem = jobItems.nth(i);
      const progressBar = jobItem.locator('[data-testid="progress-bar"]');
      await expect(progressBar).toHaveAttribute('aria-valuenow', '100', { timeout: 120000 });
    }
  });

  /**
   * Test: Download cancellation
   *
   * TDD Expectation: This test SHOULD FAIL until cancellation is implemented
   */
  test('should allow canceling download', async ({ page }) => {
    await page.goto('/');

    // Start download
    const urlInput = page.locator('[data-testid="spotify-url-input"]');
    await urlInput.fill('https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp');

    const fetchButton = page.locator('[data-testid="fetch-button"]');
    await fetchButton.click();

    await page.waitForTimeout(1000);

    const downloadButton = page.locator('[data-testid="download-button"]');
    await downloadButton.click();

    // Wait for job to start
    const jobProgress = page.locator('[data-testid="job-progress"]');
    await expect(jobProgress).toBeVisible();

    // Cancel download
    const cancelButton = page.locator('[data-testid="cancel-download"]');
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();

    // Verify job is canceled
    const jobStatus = page.locator('[data-testid="job-status"]');
    await expect(jobStatus).toContainText(/cancel|stopped/i, { timeout: 5000 });

    // Verify progress stopped
    const progressBar = page.locator('[data-testid="progress-bar"]');
    const progressValue = await progressBar.getAttribute('aria-valuenow');
    expect(parseInt(progressValue || '0')).toBeLessThan(100);
  });
});
