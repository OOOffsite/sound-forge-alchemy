# E2E Tests for Alchemy2

## Overview

Comprehensive end-to-end tests for Alchemy2 Phase 5, implemented following **strict TDD methodology** using Playwright.

**Current Phase**: RED (All tests written BEFORE implementation)

## TDD Methodology

### RED Phase (Current)
- ✅ All E2E tests written FIRST
- ✅ Tests EXPECTED to fail until features are implemented
- ✅ Tests serve as comprehensive specification

### GREEN Phase (Next)
- Implement features to make tests pass
- Minimal code to pass tests
- One workflow at a time

### REFACTOR Phase (Final)
- Optimize code while keeping tests green
- Improve performance and maintainability

## Test Coverage

### Coverage Target: 85% (E2E)

### User Flows Tested

#### 1. Track Download Workflow (Priority 1)
**File**: `download-workflow.spec.ts`
**Tests**: 5

- Complete download flow (URL → Library)
- Invalid URL error handling
- Network error handling
- Concurrent downloads
- Download cancellation

**Key Features**:
- Spotify URL validation
- Track metadata fetching
- Download job system
- Realtime progress updates (WebSocket)
- Library integration

#### 2. Stem Separation Workflow (Priority 2)
**File**: `stem-separation.spec.ts`
**Tests**: 8

- Complete stem separation
- Stem switching during playback
- Solo/mute controls
- Individual stem download
- Model comparison
- File format validation
- Cancellation

**Key Features**:
- File upload
- Demucs model selection
- Stem extraction
- Realtime processing updates
- Stem playback

#### 3. Audio Analysis Workflow (Priority 3)
**File**: `audio-analysis.spec.ts`
**Tests**: 9

- Complete audio analysis
- Beat detection and grid
- Chord detection
- Spectral analysis
- Export (JSON, CSV, MIDI)
- Real-time analysis during playback
- Spotify comparison
- Batch analysis
- Error handling

**Key Features**:
- Feature extraction (tempo, key, energy, etc.)
- Beat/chord detection
- Visualization
- Export functionality

#### 4. Audio Player Workflow (Priority 4)
**File**: `audio-player.spec.ts`
**Tests**: 11

- Play/pause/seek controls
- Volume and mute
- Loop and shuffle
- Track navigation
- Waveform visualization
- Keyboard shortcuts
- Playback speed
- Queue management
- Audio device selection
- Auto-play
- Metadata display

**Key Features**:
- Full playback controls
- Waveform integration
- Queue system
- Keyboard shortcuts

#### 5. Track Library Workflow (Priority 5)
**File**: `track-library.spec.ts`
**Tests**: 11

- Search functionality
- Filter by metadata
- Sort by various criteria
- Pagination
- Grid/list view toggle
- Bulk selection and actions
- Track details modal
- Metadata editing
- Drag-and-drop to playlist
- Recently played
- File import

**Key Features**:
- Search and filter
- Multiple view modes
- Bulk operations
- Metadata management

## Test Files Structure

```
tests/e2e/
├── README.md                      # This file
├── download-workflow.spec.ts      # Track download tests
├── stem-separation.spec.ts        # Stem separation tests
├── audio-analysis.spec.ts         # Audio analysis tests
├── audio-player.spec.ts           # Audio player tests
├── track-library.spec.ts          # Track library tests
└── helpers/
    └── test-helpers.ts            # Shared helper functions
```

## Fixtures

```
tests/fixtures/
├── README.md                      # Fixture documentation
├── test-audio.mp3                 # Primary test audio (needs to be added)
├── test-audio-2.mp3              # Secondary test audio (needs to be added)
├── test-audio-3.mp3              # Tertiary test audio (needs to be added)
├── corrupted-audio.mp3           # Corrupted file for error testing
└── test-document.pdf             # Invalid file format for validation
```

## TDD Checkpoints

```
.claude/checkpoints/tdd/
├── e2e-tdd-download-workflow.json
├── e2e-tdd-stem-separation.json
├── e2e-tdd-audio-analysis.json
├── e2e-tdd-audio-player.json
└── e2e-tdd-track-library.json
```

Each checkpoint tracks:
- Workflow priority
- Current phase (RED/GREEN/REFACTOR)
- Tests written
- Expected failures
- Dependencies
- Next steps

## Running Tests

### Prerequisites

1. Install Playwright:
```bash
npm run playwright:install
```

2. Start dev server:
```bash
npm run dev
```

3. Add test fixtures to `tests/fixtures/`

### Run All E2E Tests
```bash
npm run test:e2e
```

### Run Specific Browser
```bash
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit
```

### Debug Mode
```bash
npm run test:e2e:debug
```

### UI Mode
```bash
npm run test:e2e:ui
```

### Headed Mode (See Browser)
```bash
npm run test:e2e:headed
```

### View Report
```bash
npm run test:e2e:report
```

### Record New Tests
```bash
npm run test:e2e:codegen
```

## Expected Test Results (RED Phase)

**All tests should FAIL** until implementation is complete.

Expected failures:
- Missing components
- Missing routes
- Missing API endpoints
- Missing WebSocket handlers
- Missing data-testid attributes

## Helper Functions

Located in `helpers/test-helpers.ts`:

### Navigation
- `navigateAndVerify(page, path, titlePattern)`

### Player Controls
- `startPlayback(page)`
- `pausePlayback(page)`
- `seekToPosition(page, position)`
- `setVolume(page, volume)`

### Job Management
- `waitForJobCompletion(page, jobType, timeout)`

### File Operations
- `uploadFile(page, filePath)`

### Library Operations
- `searchLibrary(page, query)`
- `selectMultipleTracks(page, indices)`

### Spotify Integration
- `fetchSpotifyTrack(page, url)`
- `startDownload(page)`

### Processing
- `selectDemucsModel(page, model)`
- `selectStems(page, stems)`
- `startStemSeparation(page)`

### Analysis
- `startAnalysis(page)`
- `verifyAnalysisResults(page)`

### UI Interactions
- `waitForToast(page, messagePattern)`
- `waitForError(page, messagePattern)`
- `openModal(page, trigger, modal)`
- `closeModal(page, modal)`

## Test Data Requirements

### Audio Files
- Format: MP3
- Duration: 30-60 seconds
- Quality: 128-320 kbps
- Sample Rate: 44.1kHz
- Content: Musical with clear beat/tempo

### Spotify URLs
Use valid Spotify track URLs for testing:
```
https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp
```

## Playwright Configuration

See `playwright.config.ts` for:
- Browser configurations
- Test timeout settings
- Screenshot/video capture
- Dev server setup
- Reporter configuration

## Success Criteria

### RED Phase (Current)
- ✅ 42+ E2E tests written
- ✅ All critical user flows covered
- ✅ All tests expected to fail
- ✅ Comprehensive test helpers
- ✅ TDD checkpoints created

### GREEN Phase (Next)
- [ ] All tests passing
- [ ] 85%+ E2E coverage
- [ ] Cross-browser compatibility
- [ ] Realtime updates verified

### REFACTOR Phase (Final)
- [ ] Tests still passing
- [ ] Performance optimized
- [ ] Code maintainability improved

## Integration Points

### Components to Implement
- SpotifyInput
- JobProgress
- AudioPlayer
- TrackWaveform
- StemViewer
- ArrangementDetector
- TrackLibrary
- PlaylistPanel

### Services to Implement
- spotify-service
- download-service
- processing-service
- analysis-service
- websocket-service

### Features to Implement
- Realtime progress updates (WebSocket)
- Job queue management
- Stem separation (Demucs)
- Audio analysis
- Beat/chord detection
- Waveform visualization
- Metadata management

## Notes

- **IMPORTANT**: These tests follow TDD methodology - they were written BEFORE implementation
- All tests are EXPECTED to fail until features are implemented
- Tests serve as comprehensive specification for implementation
- Each test includes clear expectations and failure reasons
- Checkpoints track progress through TDD phases

## Next Steps

1. **Install Dependencies**
   ```bash
   npm install
   npm run playwright:install
   ```

2. **Add Test Fixtures**
   - Add audio files to `tests/fixtures/`

3. **Verify RED Phase**
   ```bash
   npm run test:e2e
   ```
   - Confirm all tests fail as expected

4. **Begin GREEN Phase**
   - Implement features one workflow at a time
   - Start with Priority 1 (Download Workflow)
   - Run tests continuously to track progress

5. **Track Progress**
   - Update TDD checkpoints as tests pass
   - Monitor coverage metrics
   - Document any issues or blockers

## Contact

**Author**: Claude Code E2E Tests Agent
**License**: MIT
**Version**: 1.0.0
**Date**: 2025-12-16
