/**
 * Global Setup for Infrastructure Tests
 * Ensures Docker is available and ready for testing
 *
 * @author Claude Code (TDD Agent)
 * @version 1.0.0
 * @license MIT
 */

import { execSync } from 'child_process';

export async function setup() {
  console.log('🐳 Setting up Docker infrastructure tests...');

  try {
    // Check if Docker is installed
    execSync('docker --version', { stdio: 'pipe' });
    console.log('✅ Docker is installed');

    // Check if Docker daemon is running
    execSync('docker info', { stdio: 'pipe' });
    console.log('✅ Docker daemon is running');

    // Check Docker Compose
    try {
      execSync('docker-compose --version', { stdio: 'pipe' });
      console.log('✅ Docker Compose is available');
    } catch {
      console.log('⚠️  Docker Compose not found, but docker compose plugin might be available');
    }

    console.log('✅ Infrastructure test setup complete\n');
  } catch (error) {
    console.error('❌ Docker is not available or not running');
    console.error('Please ensure Docker is installed and running before running infrastructure tests');
    throw new Error('Docker setup failed');
  }
}

export async function teardown() {
  console.log('\n🧹 Cleaning up infrastructure tests...');
  console.log('✅ Infrastructure test teardown complete');
}
