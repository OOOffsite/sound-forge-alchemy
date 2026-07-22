/**
 * Jest Test Setup
 *
 * @description Global test configuration and mocks for Jest test suite
 * @author Sound Forge Alchemy Team
 * @license MIT
 * @version 2.0.0
 */

import { jest } from '@jest/globals';

// Mock Supabase for tests
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ data: null, error: null }),
        download: jest.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'http://example.com' } }),
      })),
    },
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: jest.fn().mockResolvedValue({ data: null, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      unsubscribe: jest.fn().mockReturnThis(),
    })),
  })),
}));

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.AUDIO_OUTPUT_DIR = '/tmp/test-audio';
process.env.SPOTIFY_CLIENT_ID = 'test-spotify-client-id';
process.env.SPOTIFY_CLIENT_SECRET = 'test-spotify-client-secret';

// Extend Jest timeout for integration tests
jest.setTimeout(10000);

// Global test utilities
global.console = {
  ...console,
  // Suppress console output during tests unless there's an error
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: console.error, // Keep errors visible
};

beforeAll(async () => {
  // Setup test database or services if needed
  console.log('🧪 Test suite initializing...');
});

afterAll(async () => {
  // Cleanup resources
  console.log('✅ Test suite complete');
});

beforeEach(() => {
  // Clear mocks before each test
  jest.clearAllMocks();
});
