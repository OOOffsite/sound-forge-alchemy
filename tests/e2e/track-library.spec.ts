/**
 * E2E Tests: Track Library Workflow
 *
 * @author Claude Code E2E Tests Agent
 * @license MIT
 * @version 1.0.0
 *
 * TDD Phase: RED - Write failing tests FIRST
 * Priority: 5
 *
 * Tests the complete user flow for track library management:
 * 1. Navigate to library
 * 2. Search tracks
 * 3. Filter by metadata
 * 4. Sort tracks
 * 5. Pagination
 * 6. Grid/List view toggle
 * 7. Track selection and bulk actions
 * 8. Track details and editing
 */

import { test, expect } from '@playwright/test';

test.describe('Track Library Workflow', () => {
  /**
   * Test: Search functionality
   *
   * TDD Expectation: This test SHOULD FAIL until search is implemented
   */
  test('should search tracks by title, artist, and album', async ({ page }) => {
    // 1. Navigate to library
    await page.goto('/library');
    await expect(page).toHaveTitle(/Alchemy.*Library|Library.*Alchemy/i);

    // Verify tracks are loaded
    const trackItems = page.locator('[data-testid="track-item"]');
    const initialCount = await trackItems.count();
    expect(initialCount).toBeGreaterThan(0);

    // 2. Search by title
    const searchInput = page.locator('[data-testid="search-input"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Test Track');

    // Verify results filtered
    await page.waitForTimeout(500); // Debounce
    const titleResults = await trackItems.count();
    expect(titleResults).toBeLessThanOrEqual(initialCount);
    expect(titleResults).toBeGreaterThan(0);

    // Verify results contain search term
    const firstResult = trackItems.first();
    await expect(firstResult).toContainText(/test track/i);

    // 3. Clear search
    await searchInput.clear();
    await page.waitForTimeout(500);
    const clearedCount = await trackItems.count();
    expect(clearedCount).toEqual(initialCount);

    // 4. Search by artist
    await searchInput.fill('Test Artist');
    await page.waitForTimeout(500);
    const artistResults = await trackItems.count();
    expect(artistResults).toBeGreaterThan(0);

    const firstArtistResult = trackItems.first();
    const artistName = firstArtistResult.locator('[data-testid="track-artist"]');
    await expect(artistName).toContainText(/test artist/i);

    // 5. Search with no results
    await searchInput.clear();
    await searchInput.fill('NonExistentTrack12345');
    await page.waitForTimeout(500);

    const noResults = page.locator('[data-testid="no-results"]');
    await expect(noResults).toBeVisible();
    await expect(noResults).toContainText(/no.*found|no.*results/i);
  });

  /**
   * Test: Filter functionality
   *
   * TDD Expectation: This test SHOULD FAIL until filters are implemented
   */
  test('should filter tracks by metadata', async ({ page }) => {
    await page.goto('/library');

    const trackItems = page.locator('[data-testid="track-item"]');

    // 1. Filter by artist
    const artistFilter = page.locator('[data-testid="artist-filter"]');
    await expect(artistFilter).toBeVisible();
    await artistFilter.selectOption({ index: 1 }); // Select first artist

    await page.waitForTimeout(500);
    const artistFilteredCount = await trackItems.count();

    // Verify all results have same artist
    const firstTrack = trackItems.first();
    const selectedArtist = await firstTrack.locator('[data-testid="track-artist"]').textContent();

    for (let i = 0; i < artistFilteredCount; i++) {
      const trackArtist = await trackItems.nth(i).locator('[data-testid="track-artist"]').textContent();
      expect(trackArtist).toEqual(selectedArtist);
    }

    // 2. Filter by album
    const albumFilter = page.locator('[data-testid="album-filter"]');
    await albumFilter.selectOption({ index: 1 });

    await page.waitForTimeout(500);
    const albumFilteredCount = await trackItems.count();
    expect(albumFilteredCount).toBeLessThanOrEqual(artistFilteredCount);

    // 3. Filter by genre
    const genreFilter = page.locator('[data-testid="genre-filter"]');
    await genreFilter.selectOption('Electronic');

    await page.waitForTimeout(500);

    // Verify genre tag displayed
    const genreTag = trackItems.first().locator('[data-testid="genre-tag"]');
    await expect(genreTag).toContainText(/electronic/i);

    // 4. Filter by BPM range
    const bpmMinInput = page.locator('[data-testid="bpm-min"]');
    const bpmMaxInput = page.locator('[data-testid="bpm-max"]');

    await bpmMinInput.fill('120');
    await bpmMaxInput.fill('140');

    await page.waitForTimeout(500);

    // Verify BPM in range
    const bpmValue = trackItems.first().locator('[data-testid="track-bpm"]');
    const bpm = parseFloat(await bpmValue.textContent() || '0');
    expect(bpm).toBeGreaterThanOrEqual(120);
    expect(bpm).toBeLessThanOrEqual(140);

    // 5. Clear all filters
    const clearFiltersButton = page.locator('[data-testid="clear-filters"]');
    await clearFiltersButton.click();

    await page.waitForTimeout(500);
    const clearedCount = await trackItems.count();
    expect(clearedCount).toBeGreaterThan(albumFilteredCount);
  });

  /**
   * Test: Sort functionality
   *
   * TDD Expectation: This test SHOULD FAIL until sorting is implemented
   */
  test('should sort tracks by various criteria', async ({ page }) => {
    await page.goto('/library');

    const trackItems = page.locator('[data-testid="track-item"]');

    // 1. Sort by title (ascending)
    const sortSelect = page.locator('[data-testid="sort-select"]');
    await expect(sortSelect).toBeVisible();
    await sortSelect.selectOption('title-asc');

    await page.waitForTimeout(500);

    const firstTitle = await trackItems.first().locator('[data-testid="track-title"]').textContent();
    const secondTitle = await trackItems.nth(1).locator('[data-testid="track-title"]').textContent();

    // Verify alphabetical order
    expect(firstTitle?.localeCompare(secondTitle || '')).toBeLessThanOrEqual(0);

    // 2. Sort by title (descending)
    await sortSelect.selectOption('title-desc');
    await page.waitForTimeout(500);

    const firstTitleDesc = await trackItems.first().locator('[data-testid="track-title"]').textContent();
    const secondTitleDesc = await trackItems.nth(1).locator('[data-testid="track-title"]').textContent();

    expect(firstTitleDesc?.localeCompare(secondTitleDesc || '')).toBeGreaterThanOrEqual(0);

    // 3. Sort by date added (newest first)
    await sortSelect.selectOption('date-desc');
    await page.waitForTimeout(500);

    const firstDate = await trackItems.first().locator('[data-testid="track-date"]').textContent();
    const secondDate = await trackItems.nth(1).locator('[data-testid="track-date"]').textContent();

    const date1 = new Date(firstDate || '');
    const date2 = new Date(secondDate || '');
    expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());

    // 4. Sort by BPM
    await sortSelect.selectOption('bpm-asc');
    await page.waitForTimeout(500);

    const firstBpm = parseFloat(await trackItems.first().locator('[data-testid="track-bpm"]').textContent() || '0');
    const secondBpm = parseFloat(await trackItems.nth(1).locator('[data-testid="track-bpm"]').textContent() || '0');

    expect(firstBpm).toBeLessThanOrEqual(secondBpm);

    // 5. Sort by duration
    await sortSelect.selectOption('duration-desc');
    await page.waitForTimeout(500);

    const firstDuration = await trackItems.first().locator('[data-testid="track-duration"]').getAttribute('data-seconds');
    const secondDuration = await trackItems.nth(1).locator('[data-testid="track-duration"]').getAttribute('data-seconds');

    expect(parseInt(firstDuration || '0')).toBeGreaterThanOrEqual(parseInt(secondDuration || '0'));
  });

  /**
   * Test: Pagination
   *
   * TDD Expectation: This test SHOULD FAIL until pagination is implemented
   */
  test('should paginate track results', async ({ page }) => {
    await page.goto('/library');

    // 1. Verify pagination controls
    const pagination = page.locator('[data-testid="pagination"]');
    await expect(pagination).toBeVisible();

    const currentPage = page.locator('[data-testid="current-page"]');
    await expect(currentPage).toContainText('1');

    const totalPages = page.locator('[data-testid="total-pages"]');
    const total = await totalPages.textContent();
    expect(parseInt(total || '0')).toBeGreaterThan(0);

    // 2. Navigate to next page
    const nextButton = page.locator('[data-testid="next-page"]');
    await expect(nextButton).toBeEnabled();
    await nextButton.click();

    await page.waitForTimeout(500);
    await expect(currentPage).toContainText('2');

    // 3. Navigate to previous page
    const previousButton = page.locator('[data-testid="previous-page"]');
    await expect(previousButton).toBeEnabled();
    await previousButton.click();

    await page.waitForTimeout(500);
    await expect(currentPage).toContainText('1');

    // 4. Jump to specific page
    const pageInput = page.locator('[data-testid="page-input"]');
    await pageInput.fill('3');
    await pageInput.press('Enter');

    await page.waitForTimeout(500);
    await expect(currentPage).toContainText('3');

    // 5. Change page size
    const pageSizeSelect = page.locator('[data-testid="page-size"]');
    await pageSizeSelect.selectOption('50');

    await page.waitForTimeout(500);

    const trackItems = page.locator('[data-testid="track-item"]');
    const itemCount = await trackItems.count();
    expect(itemCount).toBeLessThanOrEqual(50);

    // 6. First/Last page buttons
    const lastPageButton = page.locator('[data-testid="last-page"]');
    await lastPageButton.click();
    await page.waitForTimeout(500);

    const lastPageNumber = await currentPage.textContent();
    expect(lastPageNumber).toEqual(total);

    const firstPageButton = page.locator('[data-testid="first-page"]');
    await firstPageButton.click();
    await page.waitForTimeout(500);
    await expect(currentPage).toContainText('1');
  });

  /**
   * Test: View mode toggle (Grid/List)
   *
   * TDD Expectation: This test SHOULD FAIL until view modes are implemented
   */
  test('should toggle between grid and list views', async ({ page }) => {
    await page.goto('/library');

    const trackContainer = page.locator('[data-testid="track-container"]');

    // 1. Default view (assume grid)
    await expect(trackContainer).toHaveAttribute('data-view', 'grid');

    // Verify grid layout
    const gridItem = page.locator('[data-testid="track-item"]').first();
    await expect(gridItem).toHaveClass(/grid-item|card/);

    // 2. Switch to list view
    const listViewButton = page.locator('[data-testid="list-view-button"]');
    await expect(listViewButton).toBeVisible();
    await listViewButton.click();

    await expect(trackContainer).toHaveAttribute('data-view', 'list');

    // Verify list layout
    const listItem = page.locator('[data-testid="track-item"]').first();
    await expect(listItem).toHaveClass(/list-item|row/);

    // 3. Switch back to grid
    const gridViewButton = page.locator('[data-testid="grid-view-button"]');
    await gridViewButton.click();

    await expect(trackContainer).toHaveAttribute('data-view', 'grid');

    // 4. Compact list view
    const compactViewButton = page.locator('[data-testid="compact-view-button"]');
    await compactViewButton.click();

    await expect(trackContainer).toHaveAttribute('data-view', 'compact');
  });

  /**
   * Test: Bulk selection and actions
   *
   * TDD Expectation: This test SHOULD FAIL until bulk actions are implemented
   */
  test('should select multiple tracks and perform bulk actions', async ({ page }) => {
    await page.goto('/library');

    const trackItems = page.locator('[data-testid="track-item"]');

    // 1. Select individual tracks
    const firstTrack = trackItems.first();
    const checkbox1 = firstTrack.locator('[data-testid="track-checkbox"]');
    await checkbox1.check();
    await expect(checkbox1).toBeChecked();

    const secondTrack = trackItems.nth(1);
    const checkbox2 = secondTrack.locator('[data-testid="track-checkbox"]');
    await checkbox2.check();

    // Verify selection count
    const selectionCount = page.locator('[data-testid="selection-count"]');
    await expect(selectionCount).toContainText('2');

    // 2. Select all
    const selectAllCheckbox = page.locator('[data-testid="select-all"]');
    await selectAllCheckbox.check();

    const trackCount = await trackItems.count();
    await expect(selectionCount).toContainText(trackCount.toString());

    // 3. Deselect all
    await selectAllCheckbox.uncheck();
    await expect(selectionCount).toContainText('0');

    // 4. Select range (Shift+Click)
    await checkbox1.check();
    await page.keyboard.down('Shift');
    await trackItems.nth(4).locator('[data-testid="track-checkbox"]').check();
    await page.keyboard.up('Shift');

    await expect(selectionCount).toContainText('5'); // Selected 5 tracks

    // 5. Bulk add to playlist
    const bulkActionsButton = page.locator('[data-testid="bulk-actions"]');
    await bulkActionsButton.click();

    const addToPlaylistOption = page.locator('[data-testid="bulk-add-playlist"]');
    await addToPlaylistOption.click();

    const playlistSelect = page.locator('[data-testid="playlist-select"]');
    await playlistSelect.selectOption({ index: 0 });

    const confirmButton = page.locator('[data-testid="confirm-add-playlist"]');
    await confirmButton.click();

    // Verify success message
    const toast = page.locator('[data-testid="toast"]');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText(/added.*playlist/i);

    // 6. Bulk delete
    await bulkActionsButton.click();
    const deleteOption = page.locator('[data-testid="bulk-delete"]');
    await deleteOption.click();

    const confirmDeleteButton = page.locator('[data-testid="confirm-delete"]');
    await confirmDeleteButton.click();

    // Verify tracks removed
    await page.waitForTimeout(1000);
    const newTrackCount = await trackItems.count();
    expect(newTrackCount).toBeLessThan(trackCount);
  });

  /**
   * Test: Track details modal
   *
   * TDD Expectation: This test SHOULD FAIL until details modal is implemented
   */
  test('should display track details in modal', async ({ page }) => {
    await page.goto('/library');

    const trackItem = page.locator('[data-testid="track-item"]').first();

    // 1. Open details modal
    const detailsButton = trackItem.locator('[data-testid="track-details-button"]');
    await detailsButton.click();

    const detailsModal = page.locator('[data-testid="track-details-modal"]');
    await expect(detailsModal).toBeVisible();

    // 2. Verify comprehensive metadata
    await expect(detailsModal.locator('[data-testid="modal-track-title"]')).toBeVisible();
    await expect(detailsModal.locator('[data-testid="modal-track-artist"]')).toBeVisible();
    await expect(detailsModal.locator('[data-testid="modal-track-album"]')).toBeVisible();
    await expect(detailsModal.locator('[data-testid="modal-album-art"]')).toBeVisible();

    // Technical details
    await expect(detailsModal.locator('[data-testid="modal-duration"]')).toBeVisible();
    await expect(detailsModal.locator('[data-testid="modal-bitrate"]')).toBeVisible();
    await expect(detailsModal.locator('[data-testid="modal-sample-rate"]')).toBeVisible();
    await expect(detailsModal.locator('[data-testid="modal-file-size"]')).toBeVisible();

    // Audio features
    await expect(detailsModal.locator('[data-testid="modal-bpm"]')).toBeVisible();
    await expect(detailsModal.locator('[data-testid="modal-key"]')).toBeVisible();
    await expect(detailsModal.locator('[data-testid="modal-energy"]')).toBeVisible();

    // 3. Navigate between tracks
    const nextTrackButton = detailsModal.locator('[data-testid="modal-next-track"]');
    const prevTrackButton = detailsModal.locator('[data-testid="modal-prev-track"]');

    const firstTitle = await detailsModal.locator('[data-testid="modal-track-title"]').textContent();

    await nextTrackButton.click();
    await page.waitForTimeout(500);

    const secondTitle = await detailsModal.locator('[data-testid="modal-track-title"]').textContent();
    expect(secondTitle).not.toEqual(firstTitle);

    await prevTrackButton.click();
    await page.waitForTimeout(500);

    const backToFirst = await detailsModal.locator('[data-testid="modal-track-title"]').textContent();
    expect(backToFirst).toEqual(firstTitle);

    // 4. Close modal
    const closeButton = detailsModal.locator('[data-testid="modal-close"]');
    await closeButton.click();

    await expect(detailsModal).not.toBeVisible();
  });

  /**
   * Test: Edit track metadata
   *
   * TDD Expectation: This test SHOULD FAIL until metadata editing is implemented
   */
  test('should edit track metadata', async ({ page }) => {
    await page.goto('/library');

    const trackItem = page.locator('[data-testid="track-item"]').first();

    // 1. Open edit modal
    const editButton = trackItem.locator('[data-testid="edit-track-button"]');
    await editButton.click();

    const editModal = page.locator('[data-testid="edit-track-modal"]');
    await expect(editModal).toBeVisible();

    // 2. Edit title
    const titleInput = editModal.locator('[data-testid="edit-title"]');
    await titleInput.clear();
    await titleInput.fill('Updated Track Title');

    // 3. Edit artist
    const artistInput = editModal.locator('[data-testid="edit-artist"]');
    await artistInput.clear();
    await artistInput.fill('Updated Artist');

    // 4. Edit album
    const albumInput = editModal.locator('[data-testid="edit-album"]');
    await albumInput.clear();
    await albumInput.fill('Updated Album');

    // 5. Edit genre
    const genreInput = editModal.locator('[data-testid="edit-genre"]');
    await genreInput.selectOption('Electronic');

    // 6. Save changes
    const saveButton = editModal.locator('[data-testid="save-metadata"]');
    await saveButton.click();

    // Verify modal closed
    await expect(editModal).not.toBeVisible();

    // Verify changes applied
    await expect(trackItem.locator('[data-testid="track-title"]')).toContainText('Updated Track Title');
    await expect(trackItem.locator('[data-testid="track-artist"]')).toContainText('Updated Artist');
  });

  /**
   * Test: Drag and drop to playlist
   *
   * TDD Expectation: This test SHOULD FAIL until drag-drop is implemented
   */
  test('should drag tracks to playlist', async ({ page }) => {
    await page.goto('/library');

    // 1. Show playlists sidebar
    const playlistSidebar = page.locator('[data-testid="playlist-sidebar"]');
    await expect(playlistSidebar).toBeVisible();

    const targetPlaylist = playlistSidebar.locator('[data-testid="playlist-item"]').first();

    // 2. Drag track to playlist
    const trackItem = page.locator('[data-testid="track-item"]').first();
    await trackItem.dragTo(targetPlaylist);

    // Verify success feedback
    const toast = page.locator('[data-testid="toast"]');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText(/added.*playlist/i);

    // 3. Verify in playlist
    await targetPlaylist.click();

    const playlistTracks = page.locator('[data-testid="playlist-track"]');
    const playlistCount = await playlistTracks.count();
    expect(playlistCount).toBeGreaterThan(0);
  });

  /**
   * Test: Recently played section
   *
   * TDD Expectation: This test SHOULD FAIL until recent tracks are implemented
   */
  test('should show recently played tracks', async ({ page }) => {
    await page.goto('/library');

    // 1. Navigate to recently played
    const recentTab = page.locator('[data-testid="recent-tab"]');
    await recentTab.click();

    const recentSection = page.locator('[data-testid="recent-section"]');
    await expect(recentSection).toBeVisible();

    // 2. Verify tracks ordered by play time
    const recentTracks = page.locator('[data-testid="recent-track"]');
    const recentCount = await recentTracks.count();

    if (recentCount > 0) {
      const firstTrack = recentTracks.first();
      const lastPlayedTime = firstTrack.locator('[data-testid="last-played"]');
      await expect(lastPlayedTime).toBeVisible();
      await expect(lastPlayedTime).toContainText(/ago|today|yesterday/i);

      // Verify chronological order
      const firstTime = await firstTrack.locator('[data-testid="last-played"]').getAttribute('data-timestamp');
      const secondTime = await recentTracks.nth(1).locator('[data-testid="last-played"]').getAttribute('data-timestamp');

      expect(parseInt(firstTime || '0')).toBeGreaterThanOrEqual(parseInt(secondTime || '0'));
    }

    // 3. Clear history
    const clearHistoryButton = page.locator('[data-testid="clear-history"]');
    await clearHistoryButton.click();

    const confirmButton = page.locator('[data-testid="confirm-clear-history"]');
    await confirmButton.click();

    await page.waitForTimeout(500);

    const emptyMessage = page.locator('[data-testid="empty-history"]');
    await expect(emptyMessage).toBeVisible();
  });

  /**
   * Test: Import tracks from file system
   *
   * TDD Expectation: This test SHOULD FAIL until import is implemented
   */
  test('should import tracks from file system', async ({ page }) => {
    await page.goto('/library');

    // 1. Open import dialog
    const importButton = page.locator('[data-testid="import-button"]');
    await expect(importButton).toBeVisible();
    await importButton.click();

    const importDialog = page.locator('[data-testid="import-dialog"]');
    await expect(importDialog).toBeVisible();

    // 2. Select files
    const fileInput = importDialog.locator('input[type="file"]');
    await fileInput.setInputFiles([
      '/path/to/test-audio-1.mp3',
      '/path/to/test-audio-2.mp3',
      '/path/to/test-audio-3.mp3',
    ]);

    // 3. Verify files listed
    const fileList = page.locator('[data-testid="import-file-item"]');
    await expect(fileList).toHaveCount(3);

    // 4. Start import
    const startImportButton = page.locator('[data-testid="start-import"]');
    await startImportButton.click();

    // 5. Monitor progress
    const importProgress = page.locator('[data-testid="import-progress"]');
    await expect(importProgress).toBeVisible();

    // Wait for completion
    await expect(importProgress).toContainText('3 / 3', { timeout: 60000 });

    // 6. Verify tracks in library
    const trackItems = page.locator('[data-testid="track-item"]');
    const finalCount = await trackItems.count();
    expect(finalCount).toBeGreaterThanOrEqual(3);
  });
});
