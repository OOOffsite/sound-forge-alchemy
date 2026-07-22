# E2E Test Fixtures

This directory contains test fixtures used for E2E testing with Playwright.

## Audio Files

### test-audio.mp3
- **Purpose**: Primary test audio file for download, processing, and analysis workflows
- **Requirements**:
  - Duration: 30-60 seconds
  - Format: MP3
  - Bitrate: 128-320 kbps
  - Sample Rate: 44.1kHz
  - Should contain identifiable musical content with clear beat/tempo

### test-audio-2.mp3
- **Purpose**: Secondary test file for batch operations
- **Requirements**: Same as test-audio.mp3

### test-audio-3.mp3
- **Purpose**: Tertiary test file for batch operations
- **Requirements**: Same as test-audio.mp3

### corrupted-audio.mp3
- **Purpose**: Test error handling for corrupted files
- **Requirements**: Invalid/corrupted MP3 file

## Document Files

### test-document.pdf
- **Purpose**: Test file format validation (should be rejected)
- **Requirements**: Any small PDF file

## Usage

These fixtures are referenced in E2E tests using relative paths:

```typescript
import path from 'path';

const testAudioPath = path.join(__dirname, '../fixtures/test-audio.mp3');
```

## Note

**IMPORTANT**: Actual fixture files need to be added manually before running E2E tests. The tests are written following TDD methodology and expect these files to exist.

To add fixtures:
1. Place audio files in this directory
2. Ensure they meet the requirements above
3. Update this README if adding new fixtures
