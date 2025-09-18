/**
 * Test setup file for Download service
 * This file is run before all tests
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.PORT = '3003';

// Increase test timeout for integration tests
jest.setTimeout(30000);

// Mock external dependencies if needed
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    publish: jest.fn(),
    subscribe: jest.fn(),
    on: jest.fn(),
    disconnect: jest.fn(),
  }));
});

// Mock child_process for spotdl execution
jest.mock('child_process', () => ({
  spawn: jest.fn(),
  exec: jest.fn(),
}));

// Global test utilities can be added here
global.testUtils = {
  // Add shared test utilities
};