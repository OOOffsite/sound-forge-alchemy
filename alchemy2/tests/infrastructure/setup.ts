/**
 * Vitest Setup for Supabase Infrastructure Tests
 *
 * @module tests/infrastructure/setup
 * @author Claude Code
 * @license MIT
 * @version 1.0.0
 */

import { beforeAll, afterAll } from 'vitest';

beforeAll(async () => {
  // Verify Supabase is running
  console.log('🔧 Setting up Supabase infrastructure tests...');
  console.log(`📍 SUPABASE_URL: ${process.env.SUPABASE_URL || 'http://127.0.0.1:54321'}`);
  console.log(`📍 DATABASE_URL: ${process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'}`);

  // You could add a health check here
  try {
    const response = await fetch(
      `${process.env.SUPABASE_URL || 'http://127.0.0.1:54321'}/rest/v1/`,
      {
        headers: {
          apikey: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
        }
      }
    );

    if (response.ok) {
      console.log('✅ Supabase is running');
    } else {
      console.warn('⚠️  Supabase health check failed - tests may fail');
    }
  } catch (error) {
    console.error('❌ Cannot connect to Supabase - is it running?');
    console.error('   Run: cd alchemy2 && supabase start');
    throw new Error('Supabase is not running. Please start it before running tests.');
  }
});

afterAll(async () => {
  console.log('✅ Infrastructure tests complete');
});
