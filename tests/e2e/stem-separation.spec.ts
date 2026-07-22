/**
 * E2E Tests: Stem Separation Workflow
 *
 * @author Claude Code E2E Tests Agent
 * @license MIT
 * @version 1.0.0
 *
 * TDD Phase: RED - Write failing tests FIRST
 * Priority: 2
 *
 * Tests the complete user flow for stem separation:
 * 1. Navigate to processing page
 * 2. Upload audio file
 * 3. Select Demucs model
 * 4. Select stems to extract
 * 5. Start separation
 * 6. Monitor progress (Realtime)
 * 7. Verify stems available
 * 8. Play and switch between stems
 */

import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Stem Separation Workflow', () => {
  const testAudioPath = path.join(__dirname, '../fixtures/test-audio.mp3');

  /**
   * Test: Complete stem separation flow
   *
   * TDD Expectation: This test SHOULD FAIL until stem separation is implemented
   */
  test('should separate stems from uploaded audio', async ({ page }) => {
    // 1. Navigate to processing page
    await page.goto('/processing');
    await expect(page).toHaveTitle(/Alchemy.*Process|Process.*Alchemy/i);

    // 2. Upload audio file
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();
    await fileInput.setInputFiles(testAudioPath);

    // Verify file upload success
    const fileName = page.locator('[data-testid="uploaded-file-name"]');
    await expect(fileName).toBeVisible({ timeout: 5000 });
    await expect(fileName).toContainText(/test-audio\.mp3/i);

    // 3. Select Demucs model
    const modelSelect = page.locator('[data-testid="model-select"]');
    await expect(modelSelect).toBeVisible();
    await modelSelect.selectOption('htdemucs');

    // Verify model description is shown
    const modelDescription = page.locator('[data-testid="model-description"]');
    await expect(modelDescription).toBeVisible();

    // 4. Select stems to extract
    const stemVocals = page.locator('[data-testid="stem-checkbox-vocals"]');
    const stemDrums = page.locator('[data-testid="stem-checkbox-drums"]');
    const stemBass = page.locator('[data-testid="stem-checkbox-bass"]');
    const stemOther = page.locator('[data-testid="stem-checkbox-other"]');

    await expect(stemVocals).toBeVisible();
    await stemVocals.check();
    await expect(stemVocals).toBeChecked();

    await expect(stemDrums).toBeVisible();
    await stemDrums.check();
    await expect(stemDrums).toBeChecked();

    await expect(stemBass).toBeVisible();
    await stemBass.check();
    await expect(stemBass).toBeChecked();

    await expect(stemOther).toBeVisible();
    await stemOther.check();
    await expect(stemOther).toBeChecked();

    // 5. Start separation
    const separateButton = page.locator('[data-testid="separate-button"]');
    await expect(separateButton).toBeVisible();
    await expect(separateButton).toBeEnabled();
    await separateButton.click();

    // 6. Wait for processing job progress
    const processingProgress = page.locator('[data-testid="processing-progress"]');
    await expect(processingProgress).toBeVisible({ timeout: 5000 });

    const statusText = page.locator('[data-testid="processing-status"]');
    await expect(statusText).toBeVisible();
    await expect(statusText).toContainText(/processing|separating/i);

    // 7. Wait for completion (Realtime updates via WebSocket)
    const progressBar = page.locator('[data-testid="progress-bar"]');
    await expect(progressBar).toBeVisible();

    // Wait for progress to start
    await expect(progressBar).toHaveAttribute('aria-valuenow', /[1-9]/, { timeout: 15000 });

    // Wait for completion (100%) - stem separation can take 1-2 minutes
    await expect(progressBar).toHaveAttribute('aria-valuenow', '100', { timeout: 120000 });

    // 8. Verify stems are available
    const stemVocalsResult = page.locator('[data-testid="stem-result-vocals"]');
    const stemDrumsResult = page.locator('[data-testid="stem-result-drums"]');
    const stemBassResult = page.locator('[data-testid="stem-result-bass"]');
    const stemOtherResult = page.locator('[data-testid="stem-result-other"]');

    await expect(stemVocalsResult).toBeVisible();
    await expect(stemDrumsResult).toBeVisible();
    await expect(stemBassResult).toBeVisible();
    await expect(stemOtherResult).toBeVisible();

    // Verify stem file sizes are shown
    const stemVocalsSize = stemVocalsResult.locator('[data-testid="stem-size"]');
    await expect(stemVocalsSize).toBeVisible();
    await expect(stemVocalsSize).toContainText(/MB|KB/);

    // 9. Play vocals stem
    const playVocalsButton = page.locator('[data-testid="play-stem-vocals"]');
    await expect(playVocalsButton).toBeVisible();
    await expect(playVocalsButton).toBeEnabled();
    await playVocalsButton.click();

    // Verify audio player is playing
    const audioPlayer = page.locator('[data-testid="audio-player"]');
    await expect(audioPlayer).toHaveAttribute('data-playing', 'true', { timeout: 3000 });

    // Verify waveform is displayed
    const waveform = page.locator('[data-testid="stem-waveform"]');
    await expect(waveform).toBeVisible();
  });

  /**
   * Test: Switch between stems during playback
   *
   * TDD Expectation: This test SHOULD FAIL until stem switching is implemented
   */
  test('should allow switching between stems during playback', async ({ page }) => {
    // Assume stems already separated from previous test
    await page.goto('/player');

    // Select track with stems
    const trackWithStems = page.locator('[data-testid="track-item-with-stems"]').first();
    await trackWithStems.click();

    // Play vocals stem
    const stemSwitchVocals = page.locator('[data-testid="stem-switch-vocals"]');
    await expect(stemSwitchVocals).toBeVisible();
    await stemSwitchVocals.click();

    const playButton = page.locator('[data-testid="play-button"]');
    await playButton.click();

    // Verify vocals is playing
    const currentStem = page.locator('[data-testid="current-stem"]');
    await expect(currentStem).toContainText(/vocals/i);

    const audioPlayer = page.locator('[data-testid="audio-player"]');
    await expect(audioPlayer).toHaveAttribute('data-playing', 'true');

    // Wait a moment for playback to start
    await page.waitForTimeout(1000);

    // Switch to drums while playing
    const stemSwitchDrums = page.locator('[data-testid="stem-switch-drums"]');
    await stemSwitchDrums.click();

    // Verify drums now playing
    await expect(currentStem).toContainText(/drums/i, { timeout: 3000 });

    // Verify playback continues
    await expect(audioPlayer).toHaveAttribute('data-playing', 'true');

    // Switch to bass
    const stemSwitchBass = page.locator('[data-testid="stem-switch-bass"]');
    await stemSwitchBass.click();
    await expect(currentStem).toContainText(/bass/i);

    // Switch to other
    const stemSwitchOther = page.locator('[data-testid="stem-switch-other"]');
    await stemSwitchOther.click();
    await expect(currentStem).toContainText(/other/i);
  });

  /**
   * Test: Solo and mute stems
   *
   * TDD Expectation: This test SHOULD FAIL until solo/mute features are implemented
   */
  test('should allow solo and mute of individual stems', async ({ page }) => {
    await page.goto('/player');

    // Select track with stems
    const trackWithStems = page.locator('[data-testid="track-item-with-stems"]').first();
    await trackWithStems.click();

    // Start playback with all stems
    const playButton = page.locator('[data-testid="play-button"]');
    await playButton.click();

    // Mute vocals
    const muteVocals = page.locator('[data-testid="mute-vocals"]');
    await expect(muteVocals).toBeVisible();
    await muteVocals.click();
    await expect(muteVocals).toHaveAttribute('data-muted', 'true');

    // Verify vocals stem is muted
    const vocalsVolume = page.locator('[data-testid="vocals-volume"]');
    await expect(vocalsVolume).toHaveValue('0');

    // Solo drums
    const soloDrums = page.locator('[data-testid="solo-drums"]');
    await expect(soloDrums).toBeVisible();
    await soloDrums.click();
    await expect(soloDrums).toHaveAttribute('data-solo', 'true');

    // Verify only drums is audible
    const muteVocalsCheck = page.locator('[data-testid="mute-vocals"]');
    const muteBass = page.locator('[data-testid="mute-bass"]');
    const muteOther = page.locator('[data-testid="mute-other"]');

    await expect(muteVocalsCheck).toHaveAttribute('data-muted', 'true');
    await expect(muteBass).toHaveAttribute('data-muted', 'true');
    await expect(muteOther).toHaveAttribute('data-muted', 'true');

    // Unsolo drums
    await soloDrums.click();
    await expect(soloDrums).toHaveAttribute('data-solo', 'false');

    // Verify all stems unmuted (except vocals which we manually muted)
    await expect(muteBass).toHaveAttribute('data-muted', 'false');
    await expect(muteOther).toHaveAttribute('data-muted', 'false');
  });

  /**
   * Test: Download individual stems
   *
   * TDD Expectation: This test SHOULD FAIL until stem download is implemented
   */
  test('should allow downloading individual stems', async ({ page }) => {
    await page.goto('/processing');

    // Upload and process (abbreviated for test)
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testAudioPath);

    const modelSelect = page.locator('[data-testid="model-select"]');
    await modelSelect.selectOption('htdemucs');

    const stemVocals = page.locator('[data-testid="stem-checkbox-vocals"]');
    await stemVocals.check();

    const separateButton = page.locator('[data-testid="separate-button"]');
    await separateButton.click();

    // Wait for completion
    const progressBar = page.locator('[data-testid="progress-bar"]');
    await expect(progressBar).toHaveAttribute('aria-valuenow', '100', { timeout: 120000 });

    // Download vocals stem
    const downloadPromise = page.waitForEvent('download');
    const downloadVocals = page.locator('[data-testid="download-stem-vocals"]');
    await downloadVocals.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/vocals.*\.(wav|mp3)/i);
  });

  /**
   * Test: Model comparison
   *
   * TDD Expectation: This test SHOULD FAIL until model comparison is implemented
   */
  test('should allow comparing different Demucs models', async ({ page }) => {
    await page.goto('/processing');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testAudioPath);

    // Process with htdemucs
    let modelSelect = page.locator('[data-testid="model-select"]');
    await modelSelect.selectOption('htdemucs');

    const stemVocals = page.locator('[data-testid="stem-checkbox-vocals"]');
    await stemVocals.check();

    let separateButton = page.locator('[data-testid="separate-button"]');
    await separateButton.click();

    // Wait for completion
    let progressBar = page.locator('[data-testid="progress-bar"]');
    await expect(progressBar).toHaveAttribute('aria-valuenow', '100', { timeout: 120000 });

    // Save htdemucs result
    const saveResult = page.locator('[data-testid="save-result"]');
    await saveResult.click();

    // Process with htdemucs_ft
    await page.goto('/processing');
    await fileInput.setInputFiles(testAudioPath);

    modelSelect = page.locator('[data-testid="model-select"]');
    await modelSelect.selectOption('htdemucs_ft');

    await stemVocals.check();
    separateButton = page.locator('[data-testid="separate-button"]');
    await separateButton.click();

    progressBar = page.locator('[data-testid="progress-bar"]');
    await expect(progressBar).toHaveAttribute('aria-valuenow', '100', { timeout: 120000 });

    // Compare results
    const compareButton = page.locator('[data-testid="compare-button"]');
    await compareButton.click();

    // Verify comparison view
    const comparisonView = page.locator('[data-testid="comparison-view"]');
    await expect(comparisonView).toBeVisible();

    const htdemucsResult = page.locator('[data-testid="result-htdemucs"]');
    const htdemucsFtResult = page.locator('[data-testid="result-htdemucs_ft"]');

    await expect(htdemucsResult).toBeVisible();
    await expect(htdemucsFtResult).toBeVisible();
  });

  /**
   * Test: Error handling for unsupported file formats
   *
   * TDD Expectation: This test SHOULD FAIL until format validation is implemented
   */
  test('should show error for unsupported audio formats', async ({ page }) => {
    await page.goto('/processing');

    // Try to upload unsupported file
    const fileInput = page.locator('input[type="file"]');
    const unsupportedFile = path.join(__dirname, '../fixtures/test-document.pdf');
    await fileInput.setInputFiles(unsupportedFile);

    // Verify error message
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    await expect(errorMessage).toContainText(/unsupported|invalid|format/i);

    // Verify separate button is disabled
    const separateButton = page.locator('[data-testid="separate-button"]');
    await expect(separateButton).toBeDisabled();
  });

  /**
   * Test: Progress cancellation
   *
   * TDD Expectation: This test SHOULD FAIL until cancellation is implemented
   */
  test('should allow canceling stem separation', async ({ page }) => {
    await page.goto('/processing');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testAudioPath);

    const modelSelect = page.locator('[data-testid="model-select"]');
    await modelSelect.selectOption('htdemucs');

    const stemVocals = page.locator('[data-testid="stem-checkbox-vocals"]');
    await stemVocals.check();

    const separateButton = page.locator('[data-testid="separate-button"]');
    await separateButton.click();

    // Wait for processing to start
    const progressBar = page.locator('[data-testid="progress-bar"]');
    await expect(progressBar).toHaveAttribute('aria-valuenow', /[1-9]/, { timeout: 10000 });

    // Cancel processing
    const cancelButton = page.locator('[data-testid="cancel-processing"]');
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();

    // Verify cancellation
    const statusText = page.locator('[data-testid="processing-status"]');
    await expect(statusText).toContainText(/cancel|stopped/i, { timeout: 5000 });

    // Verify progress stopped
    const progressValue = await progressBar.getAttribute('aria-valuenow');
    expect(parseInt(progressValue || '0')).toBeLessThan(100);
  });
});
