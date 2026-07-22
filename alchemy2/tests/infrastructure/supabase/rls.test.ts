/**
 * Supabase Row Level Security (RLS) Tests
 *
 * TDD RED Phase: Write failing tests FIRST
 * Tests validate RLS policies for access control and data security
 *
 * @module tests/infrastructure/supabase/rls.test
 * @author Claude Code
 * @license MIT
 * @version 1.0.0
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  isRLSEnabled,
  getRLSPolicies,
  cleanupDatabase,
  supabase,
  insertTestTrack
} from '../helpers/supabase';

describe('Supabase RLS Policies', () => {
  beforeAll(async () => {
    await cleanupDatabase();
  });

  afterAll(async () => {
    await cleanupDatabase();
  });

  it('should enable RLS on all tables', async () => {
    const tables = [
      'tracks',
      'download_jobs',
      'processing_jobs',
      'analysis_jobs',
      'stems',
      'analysis_results'
    ];

    for (const tableName of tables) {
      const rlsEnabled = await isRLSEnabled(tableName);
      expect(rlsEnabled, `RLS should be enabled on ${tableName}`).toBe(true);
    }
  });

  it('should allow public read on tracks', async () => {
    const policies = await getRLSPolicies('tracks');

    // Should have a SELECT policy
    const selectPolicy = policies.find(p => p.cmd === 'SELECT');
    expect(selectPolicy, 'tracks should have SELECT policy').toBeDefined();
    expect(selectPolicy?.policyname).toContain('read');

    // Test actual read access
    const { data, error } = await supabase.from('tracks').select('*');
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('should allow public write on tracks', async () => {
    const policies = await getRLSPolicies('tracks');

    // Should have INSERT policy
    const insertPolicy = policies.find(p => p.cmd === 'INSERT');
    expect(insertPolicy, 'tracks should have INSERT policy').toBeDefined();
    expect(insertPolicy?.policyname).toContain('insert');

    // Should have UPDATE policy
    const updatePolicy = policies.find(p => p.cmd === 'UPDATE');
    expect(updatePolicy, 'tracks should have UPDATE policy').toBeDefined();
    expect(updatePolicy?.policyname).toContain('update');

    // Test actual write access
    const { data: insertData, error: insertError } = await supabase
      .from('tracks')
      .insert({
        spotify_id: 'test_rls_123',
        title: 'RLS Test Track',
        artist: 'Test Artist'
      })
      .select()
      .single();

    expect(insertError).toBeNull();
    expect(insertData).toBeDefined();

    // Test update access
    const { error: updateError } = await supabase
      .from('tracks')
      .update({ title: 'Updated RLS Test Track' })
      .eq('id', insertData.id);

    expect(updateError).toBeNull();
  });

  it('should have RLS policies on all job tables', async () => {
    const jobTables = ['download_jobs', 'processing_jobs', 'analysis_jobs'];

    for (const tableName of jobTables) {
      const policies = await getRLSPolicies(tableName);

      // Each job table should have SELECT, INSERT, UPDATE policies
      const selectPolicy = policies.find(p => p.cmd === 'SELECT');
      expect(selectPolicy, `${tableName} should have SELECT policy`).toBeDefined();

      const insertPolicy = policies.find(p => p.cmd === 'INSERT');
      expect(insertPolicy, `${tableName} should have INSERT policy`).toBeDefined();

      const updatePolicy = policies.find(p => p.cmd === 'UPDATE');
      expect(updatePolicy, `${tableName} should have UPDATE policy`).toBeDefined();

      // Should have at least 3 policies (SELECT, INSERT, UPDATE)
      expect(policies.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('should allow job creation and updates', async () => {
    // Create test track first
    const track = await insertTestTrack({
      spotify_id: 'test_job_rls_123',
      title: 'Job RLS Test Track'
    });

    // Test download_jobs
    const { data: downloadJob, error: downloadError } = await supabase
      .from('download_jobs')
      .insert({
        track_id: track.id,
        status: 'queued',
        progress: 0
      })
      .select()
      .single();

    expect(downloadError).toBeNull();
    expect(downloadJob).toBeDefined();

    // Test update
    const { error: updateError } = await supabase
      .from('download_jobs')
      .update({ status: 'processing', progress: 50 })
      .eq('id', downloadJob.id);

    expect(updateError).toBeNull();

    // Test processing_jobs
    const { data: processingJob, error: processingError } = await supabase
      .from('processing_jobs')
      .insert({
        track_id: track.id,
        status: 'queued',
        progress: 0,
        model: 'htdemucs'
      })
      .select()
      .single();

    expect(processingError).toBeNull();
    expect(processingJob).toBeDefined();

    // Test analysis_jobs
    const { data: analysisJob, error: analysisError } = await supabase
      .from('analysis_jobs')
      .insert({
        track_id: track.id,
        status: 'queued',
        progress: 0
      })
      .select()
      .single();

    expect(analysisError).toBeNull();
    expect(analysisJob).toBeDefined();
  });

  it('should have RLS policies on stems and analysis_results', async () => {
    // Check stems policies
    const stemsPolicies = await getRLSPolicies('stems');
    expect(stemsPolicies.find(p => p.cmd === 'SELECT')).toBeDefined();
    expect(stemsPolicies.find(p => p.cmd === 'INSERT')).toBeDefined();
    expect(stemsPolicies.find(p => p.cmd === 'UPDATE')).toBeDefined();

    // Check analysis_results policies
    const analysisPolicies = await getRLSPolicies('analysis_results');
    expect(analysisPolicies.find(p => p.cmd === 'SELECT')).toBeDefined();
    expect(analysisPolicies.find(p => p.cmd === 'INSERT')).toBeDefined();
    expect(analysisPolicies.find(p => p.cmd === 'UPDATE')).toBeDefined();
  });

  it('should verify all tables have exactly 3 RLS policies (SELECT, INSERT, UPDATE)', async () => {
    const tables = [
      'tracks',
      'download_jobs',
      'processing_jobs',
      'analysis_jobs',
      'stems',
      'analysis_results'
    ];

    let totalPolicies = 0;

    for (const tableName of tables) {
      const policies = await getRLSPolicies(tableName);

      // Each table should have exactly 3 policies
      expect(policies.length, `${tableName} should have 3 RLS policies`).toBe(3);

      // Verify the specific policies
      const commands = policies.map(p => p.cmd).sort();
      expect(commands).toEqual(['INSERT', 'SELECT', 'UPDATE']);

      totalPolicies += policies.length;
    }

    // 6 tables × 3 policies = 18 total policies
    expect(totalPolicies).toBe(18);
  });

  it('should verify public access policies use (true) condition', async () => {
    const tables = [
      'tracks',
      'download_jobs',
      'processing_jobs',
      'analysis_jobs',
      'stems',
      'analysis_results'
    ];

    for (const tableName of tables) {
      const policies = await getRLSPolicies(tableName);

      for (const policy of policies) {
        // SELECT policies should use USING (true)
        if (policy.cmd === 'SELECT') {
          expect(policy.qual).toBe('true');
        }

        // INSERT/UPDATE policies should use WITH CHECK (true)
        if (policy.cmd === 'INSERT' || policy.cmd === 'UPDATE') {
          if (policy.cmd === 'UPDATE') {
            expect(policy.qual).toBe('true'); // USING clause
          }
          expect(policy.with_check).toBe('true'); // WITH CHECK clause
        }
      }
    }
  });

  it('should allow reading data without authentication', async () => {
    // Create test data
    const track = await insertTestTrack({
      spotify_id: 'test_unauth_read',
      title: 'Unauthenticated Read Test'
    });

    // Try to read without auth (using anon key, no session)
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .eq('id', track.id)
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.title).toBe('Unauthenticated Read Test');
  });
});
