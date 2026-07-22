/**
 * E2E Tests: Audio Analysis Workflow
 *
 * @author Claude Code E2E Tests Agent
 * @license MIT
 * @version 1.0.0
 *
 * TDD Phase: RED - Write failing tests FIRST
 * Priority: 3
 *
 * Tests the complete user flow for audio analysis:
 * 1. Navigate to analysis page
 * 2. Upload audio file
 * 3. Start analysis
 * 4. Monitor progress (Realtime)
 * 5. Verify analysis results
 * 6. Verify visualizations
 * 7. Export analysis data
 */

import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Audio Analysis Workflow', () => {
  const testAudioPath = path.join(__dirname, '../fixtures/test-audio.mp3');

  /**
   * Test: Complete audio analysis flow
   *
   * TDD Expectation: This test SHOULD FAIL until analysis is implemented
   */
  test('should analyze audio and display features', async ({ page }) => {
    // 1. Navigate to analysis page
    await page.goto('/analysis');
    await expect(page).toHaveTitle(/Alchemy.*Analy|Analy.*Alchemy/i);

    // 2. Upload audio file
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();
    await fileInput.setInputFiles(testAudioPath);

    // Verify file upload
    const fileName = page.locator('[data-testid="uploaded-file-name"]');
    await expect(fileName).toBeVisible({ timeout: 5000 });
    await expect(fileName).toContainText(/test-audio\.mp3/i);

    // 3. Start analysis
    const analyzeButton = page.locator('[data-testid="analyze-button"]');
    await expect(analyzeButton).toBeVisible();
    await expect(analyzeButton).toBeEnabled();
    await analyzeButton.click();

    // 4. Wait for analysis job
    const analysisProgress = page.locator('[data-testid="analysis-progress"]');
    await expect(analysisProgress).toBeVisible({ timeout: 5000 });

    const statusText = page.locator('[data-testid="analysis-status"]');
    await expect(statusText).toBeVisible();
    await expect(statusText).toContainText(/analyz/i);

    // 5. Wait for completion (Realtime updates)
    const progressBar = page.locator('[data-testid="progress-bar"]');
    await expect(progressBar).toBeVisible();
    await expect(progressBar).toHaveAttribute('aria-valuenow', '100', { timeout: 60000 });

    // 6. Verify analysis results displayed
    // Tempo
    const tempo = page.locator('[data-testid="tempo"]');
    await expect(tempo).toBeVisible();
    const tempoValue = await tempo.textContent();
    expect(parseFloat(tempoValue || '0')).toBeGreaterThan(0);
    expect(parseFloat(tempoValue || '0')).toBeLessThan(300); // Reasonable BPM range

    // Key
    const key = page.locator('[data-testid="key"]');
    await expect(key).toBeVisible();
    await expect(key).toContainText(/[A-G](#|b)?.*((maj|min)or)?/i);

    // Time Signature
    const timeSignature = page.locator('[data-testid="time-signature"]');
    await expect(timeSignature).toBeVisible();
    await expect(timeSignature).toContainText(/\d+\/\d+/);

    // Energy
    const energy = page.locator('[data-testid="energy"]');
    await expect(energy).toBeVisible();
    const energyValue = await energy.textContent();
    expect(parseFloat(energyValue || '0')).toBeGreaterThanOrEqual(0);
    expect(parseFloat(energyValue || '0')).toBeLessThanOrEqual(1);

    // Danceability
    const danceability = page.locator('[data-testid="danceability"]');
    await expect(danceability).toBeVisible();
    const danceabilityValue = await danceability.textContent();
    expect(parseFloat(danceabilityValue || '0')).toBeGreaterThanOrEqual(0);
    expect(parseFloat(danceabilityValue || '0')).toBeLessThanOrEqual(1);

    // Valence (mood)
    const valence = page.locator('[data-testid="valence"]');
    await expect(valence).toBeVisible();
    const valenceValue = await valence.textContent();
    expect(parseFloat(valenceValue || '0')).toBeGreaterThanOrEqual(0);
    expect(parseFloat(valenceValue || '0')).toBeLessThanOrEqual(1);

    // 7. Verify visualizations
    const waveformChart = page.locator('[data-testid="waveform-chart"]');
    await expect(waveformChart).toBeVisible();

    const spectrumChart = page.locator('[data-testid="spectrum-chart"]');
    await expect(spectrumChart).toBeVisible();

    const chromagramChart = page.locator('[data-testid="chromagram-chart"]');
    await expect(chromagramChart).toBeVisible();

    const beatGrid = page.locator('[data-testid="beat-grid"]');
    await expect(beatGrid).toBeVisible();
  });

  /**
   * Test: Beat detection and grid visualization
   *
   * TDD Expectation: This test SHOULD FAIL until beat detection is implemented
   */
  test('should detect beats and display beat grid', async ({ page }) => {
    await page.goto('/analysis');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testAudioPath);

    const analyzeButton = page.locator('[data-testid="analyze-button"]');
    await analyzeButton.click();

    // Wait for completion
    const progressBar = page.locator('[data-testid="progress-bar"]');
    await expect(progressBar).toHaveAttribute('aria-valuenow', '100', { timeout: 60000 });

    // Verify beat grid
    const beatGrid = page.locator('[data-testid="beat-grid"]');
    await expect(beatGrid).toBeVisible();

    // Verify beat markers
    const beatMarkers = page.locator('[data-testid="beat-marker"]');
    const markerCount = await beatMarkers.count();
    expect(markerCount).toBeGreaterThan(0);

    // Verify downbeats highlighted
    const downbeatMarkers = page.locator('[data-testid="downbeat-marker"]');
    const downbeatCount = await downbeatMarkers.count();
    expect(downbeatCount).toBeGreaterThan(0);

    // Click on beat marker
    await beatMarkers.first().click();

    // Verify playback starts at that beat
    const audioPlayer = page.locator('[data-testid="audio-player"]');
    await expect(audioPlayer).toHaveAttribute('data-playing', 'true');

    const currentTime = page.locator('[data-testid="current-time"]');
    await expect(currentTime).not.toContainText('0:00');
  });

  /**
   * Test: Chord detection
   *
   * TDD Expectation: This test SHOULD FAIL until chord detection is implemented
   */
  test('should detect chords and display chord progression', async ({ page }) => {
    await page.goto('/analysis');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testAudioPath);

    const analyzeButton = page.locator('[data-testid="analyze-button"]');
    await analyzeButton.click();

    // Wait for completion
    const progressBar = page.locator('[data-testid="progress-bar"]');
    await expect(progressBar).toHaveAttribute('aria-valuenow', '100', { timeout: 60000 });

    // Verify chord progression section
    const chordProgression = page.locator('[data-testid="chord-progression"]');
    await expect(chordProgression).toBeVisible();

    // Verify chord labels
    const chordLabels = page.locator('[data-testid="chord-label"]');
    const chordCount = await chordLabels.count();
    expect(chordCount).toBeGreaterThan(0);

    // Verify chord duration
    const firstChord = chordLabels.first();
    await expect(firstChord).toContainText(/[A-G](#|b)?.*((maj|min|dim|aug|sus|7|9)?)/i);

    // Click on chord
    await firstChord.click();

    // Verify playback starts at that chord
    const audioPlayer = page.locator('[data-testid="audio-player"]');
    await expect(audioPlayer).toHaveAttribute('data-playing', 'true');
  });

  /**
   * Test: Spectral analysis
   *
   * TDD Expectation: This test SHOULD FAIL until spectral analysis is implemented
   */
  test('should perform spectral analysis and display spectrum', async ({ page }) => {
    await page.goto('/analysis');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testAudioPath);

    const analyzeButton = page.locator('[data-testid="analyze-button"]');
    await analyzeButton.click();

    // Wait for completion
    const progressBar = page.locator('[data-testid="progress-bar"]');
    await expect(progressBar).toHaveAttribute('aria-valuenow', '100', { timeout: 60000 });

    // Verify spectrum analyzer
    const spectrumChart = page.locator('[data-testid="spectrum-chart"]');
    await expect(spectrumChart).toBeVisible();

    // Verify frequency bands
    const frequencyBands = page.locator('[data-testid="frequency-band"]');
    const bandCount = await frequencyBands.count();
    expect(bandCount).toBeGreaterThan(0);

    // Verify spectral centroid
    const spectralCentroid = page.locator('[data-testid="spectral-centroid"]');
    await expect(spectralCentroid).toBeVisible();

    // Verify spectral rolloff
    const spectralRolloff = page.locator('[data-testid="spectral-rolloff"]');
    await expect(spectralRolloff).toBeVisible();

    // Toggle between different spectrum views
    const linearView = page.locator('[data-testid="spectrum-linear"]');
    const logView = page.locator('[data-testid="spectrum-log"]');
    const melView = page.locator('[data-testid="spectrum-mel"]');

    await linearView.click();
    await expect(spectrumChart).toHaveAttribute('data-scale', 'linear');

    await logView.click();
    await expect(spectrumChart).toHaveAttribute('data-scale', 'log');

    await melView.click();
    await expect(spectrumChart).toHaveAttribute('data-scale', 'mel');
  });

  /**
   * Test: Export analysis data
   *
   * TDD Expectation: This test SHOULD FAIL until export is implemented
   */
  test('should export analysis data in multiple formats', async ({ page }) => {
    await page.goto('/analysis');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testAudioPath);

    const analyzeButton = page.locator('[data-testid="analyze-button"]');
    await analyzeButton.click();

    // Wait for completion
    const progressBar = page.locator('[data-testid="progress-bar"]');
    await expect(progressBar).toHaveAttribute('aria-valuenow', '100', { timeout: 60000 });

    // Export as JSON
    const downloadJsonPromise = page.waitForEvent('download');
    const exportJsonButton = page.locator('[data-testid="export-json"]');
    await exportJsonButton.click();
    const jsonDownload = await downloadJsonPromise;
    expect(jsonDownload.suggestedFilename()).toMatch(/\.json$/i);

    // Export as CSV
    const downloadCsvPromise = page.waitForEvent('download');
    const exportCsvButton = page.locator('[data-testid="export-csv"]');
    await exportCsvButton.click();
    const csvDownload = await downloadCsvPromise;
    expect(csvDownload.suggestedFilename()).toMatch(/\.csv$/i);

    // Export as MIDI (for chord progression)
    const downloadMidiPromise = page.waitForEvent('download');
    const exportMidiButton = page.locator('[data-testid="export-midi"]');
    await exportMidiButton.click();
    const midiDownload = await downloadMidiPromise;
    expect(midiDownload.suggestedFilename()).toMatch(/\.mid$/i);
  });

  /**
   * Test: Real-time analysis during playback
   *
   * TDD Expectation: This test SHOULD FAIL until real-time analysis is implemented
   */
  test('should show real-time analysis during playback', async ({ page }) => {
    await page.goto('/analysis');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testAudioPath);

    const analyzeButton = page.locator('[data-testid="analyze-button"]');
    await analyzeButton.click();

    // Wait for completion
    const progressBar = page.locator('[data-testid="progress-bar"]');
    await expect(progressBar).toHaveAttribute('aria-valuenow', '100', { timeout: 60000 });

    // Start playback
    const playButton = page.locator('[data-testid="play-button"]');
    await playButton.click();

    // Verify real-time spectrum updates
    const spectrumChart = page.locator('[data-testid="spectrum-chart"]');
    await expect(spectrumChart).toBeVisible();

    // Wait and verify spectrum is updating
    await page.waitForTimeout(1000);
    const spectrumData1 = await spectrumChart.getAttribute('data-spectrum');

    await page.waitForTimeout(1000);
    const spectrumData2 = await spectrumChart.getAttribute('data-spectrum');

    // Spectrum should be different as playback progresses
    expect(spectrumData1).not.toEqual(spectrumData2);

    // Verify current beat/chord highlight
    const currentBeat = page.locator('[data-testid="current-beat"]');
    await expect(currentBeat).toBeVisible();
    await expect(currentBeat).toHaveClass(/highlight|active/);

    const currentChord = page.locator('[data-testid="current-chord"]');
    await expect(currentChord).toBeVisible();
    await expect(currentChord).toHaveClass(/highlight|active/);
  });

  /**
   * Test: Comparison with Spotify features
   *
   * TDD Expectation: This test SHOULD FAIL until Spotify integration is implemented
   */
  test('should compare analysis with Spotify audio features', async ({ page }) => {
    await page.goto('/analysis');

    // Upload from Spotify
    const spotifyUrlInput = page.locator('[data-testid="spotify-url-input"]');
    await spotifyUrlInput.fill('https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp');

    const fetchButton = page.locator('[data-testid="fetch-button"]');
    await fetchButton.click();

    // Wait for track metadata
    await page.waitForTimeout(2000);

    // Analyze
    const analyzeButton = page.locator('[data-testid="analyze-button"]');
    await analyzeButton.click();

    // Wait for completion
    const progressBar = page.locator('[data-testid="progress-bar"]');
    await expect(progressBar).toHaveAttribute('aria-valuenow', '100', { timeout: 60000 });

    // Show comparison
    const compareButton = page.locator('[data-testid="compare-spotify"]');
    await compareButton.click();

    // Verify comparison view
    const comparisonView = page.locator('[data-testid="comparison-view"]');
    await expect(comparisonView).toBeVisible();

    // Verify Alchemy analysis
    const alchemyTempo = page.locator('[data-testid="alchemy-tempo"]');
    await expect(alchemyTempo).toBeVisible();

    // Verify Spotify analysis
    const spotifyTempo = page.locator('[data-testid="spotify-tempo"]');
    await expect(spotifyTempo).toBeVisible();

    // Verify difference
    const tempoDifference = page.locator('[data-testid="tempo-difference"]');
    await expect(tempoDifference).toBeVisible();

    // Verify accuracy metrics
    const accuracyScore = page.locator('[data-testid="accuracy-score"]');
    await expect(accuracyScore).toBeVisible();
  });

  /**
   * Test: Batch analysis
   *
   * TDD Expectation: This test SHOULD FAIL until batch processing is implemented
   */
  test('should analyze multiple tracks in batch', async ({ page }) => {
    await page.goto('/analysis');

    // Enable batch mode
    const batchModeToggle = page.locator('[data-testid="batch-mode"]');
    await batchModeToggle.click();

    // Upload multiple files
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([
      testAudioPath,
      path.join(__dirname, '../fixtures/test-audio-2.mp3'),
      path.join(__dirname, '../fixtures/test-audio-3.mp3'),
    ]);

    // Verify files queued
    const queuedFiles = page.locator('[data-testid="queued-file"]');
    await expect(queuedFiles).toHaveCount(3);

    // Start batch analysis
    const analyzeBatchButton = page.locator('[data-testid="analyze-batch"]');
    await analyzeBatchButton.click();

    // Verify batch progress
    const batchProgress = page.locator('[data-testid="batch-progress"]');
    await expect(batchProgress).toBeVisible();

    // Wait for all to complete
    await expect(batchProgress).toContainText('3 / 3', { timeout: 180000 });

    // Verify results table
    const resultsTable = page.locator('[data-testid="batch-results-table"]');
    await expect(resultsTable).toBeVisible();

    const resultRows = page.locator('[data-testid="result-row"]');
    await expect(resultRows).toHaveCount(3);

    // Export batch results
    const downloadPromise = page.waitForEvent('download');
    const exportBatchButton = page.locator('[data-testid="export-batch-csv"]');
    await exportBatchButton.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/batch.*\.csv$/i);
  });

  /**
   * Test: Error handling for corrupted files
   *
   * TDD Expectation: This test SHOULD FAIL until error handling is implemented
   */
  test('should handle corrupted audio files gracefully', async ({ page }) => {
    await page.goto('/analysis');

    const fileInput = page.locator('input[type="file"]');
    const corruptedFile = path.join(__dirname, '../fixtures/corrupted-audio.mp3');
    await fileInput.setInputFiles(corruptedFile);

    const analyzeButton = page.locator('[data-testid="analyze-button"]');
    await analyzeButton.click();

    // Verify error message
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
    await expect(errorMessage).toContainText(/corrupt|invalid|error/i);

    // Verify no results displayed
    const tempo = page.locator('[data-testid="tempo"]');
    await expect(tempo).not.toBeVisible();
  });
});
