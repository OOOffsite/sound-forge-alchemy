/**
 * Supabase Functions and Triggers Tests
 *
 * TDD RED Phase: Write failing tests FIRST
 * Tests validate database functions and triggers for automated updates
 *
 * @module tests/infrastructure/supabase/functions.test
 * @author Claude Code
 * @license MIT
 * @version 1.0.0
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  functionExists,
  getTableTriggers,
  cleanupDatabase,
  insertTestTrack,
  insertTestJob,
  supabase,
  getPgClient
} from '../helpers/supabase';

describe('Supabase Functions', () => {
  beforeAll(async () => {
    await cleanupDatabase();
  });

  afterAll(async () => {
    await cleanupDatabase();
  });

  it('should create update_updated_at_column function', async () => {
    const exists = await functionExists('update_updated_at_column');
    expect(exists, 'update_updated_at_column function should exist').toBe(true);
  });

  it('should create get_track_progress function', async () => {
    const exists = await functionExists('get_track_progress');
    expect(exists, 'get_track_progress function should exist').toBe(true);
  });

  it('should have triggers on tables with updated_at column', async () => {
    const tablesWithUpdatedAt = [
      { table: 'tracks', trigger: 'update_tracks_updated_at' },
      { table: 'download_jobs', trigger: 'update_download_jobs_updated_at' },
      { table: 'processing_jobs', trigger: 'update_processing_jobs_updated_at' },
      { table: 'analysis_jobs', trigger: 'update_analysis_jobs_updated_at' }
    ];

    for (const { table, trigger } of tablesWithUpdatedAt) {
      const triggers = await getTableTriggers(table);

      const foundTrigger = triggers.find(t => t.trigger_name === trigger);
      expect(foundTrigger, `${table} should have ${trigger} trigger`).toBeDefined();

      // Trigger should be BEFORE UPDATE
      expect(foundTrigger?.action_timing).toBe('BEFORE');
      expect(foundTrigger?.event_manipulation).toBe('UPDATE');

      // Should execute update_updated_at_column function
      expect(foundTrigger?.action_statement).toContain('update_updated_at_column');
    }
  });

  it('should trigger on UPDATE and update updated_at timestamp', async () => {
    const track = await insertTestTrack({
      spotify_id: 'test_trigger_update',
      title: 'Trigger Update Test'
    });

    // Get initial updated_at
    const { data: initialTrack } = await supabase
      .from('tracks')
      .select('updated_at')
      .eq('id', track.id)
      .single();

    const initialUpdatedAt = new Date(initialTrack!.updated_at);

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update the track
    await supabase
      .from('tracks')
      .update({ title: 'Updated Trigger Test' })
      .eq('id', track.id);

    // Get updated_at after update
    const { data: updatedTrack } = await supabase
      .from('tracks')
      .select('updated_at')
      .eq('id', track.id)
      .single();

    const newUpdatedAt = new Date(updatedTrack!.updated_at);

    // updated_at should be greater than initial value
    expect(newUpdatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
  });

  it('should NOT trigger on INSERT (updated_at should match created_at)', async () => {
    const track = await insertTestTrack({
      spotify_id: 'test_trigger_insert',
      title: 'Trigger Insert Test'
    });

    const { data } = await supabase
      .from('tracks')
      .select('created_at, updated_at')
      .eq('id', track.id)
      .single();

    const createdAt = new Date(data!.created_at);
    const updatedAt = new Date(data!.updated_at);

    // On INSERT, updated_at should be very close to created_at (within 1 second)
    const timeDiff = Math.abs(updatedAt.getTime() - createdAt.getTime());
    expect(timeDiff).toBeLessThan(1000);
  });

  it('should test get_track_progress function with multiple jobs', async () => {
    const track = await insertTestTrack({
      spotify_id: 'test_progress_function',
      title: 'Progress Function Test'
    });

    // Create jobs with different progress values
    await insertTestJob('download_jobs', track.id, { status: 'completed', progress: 100 });
    await insertTestJob('processing_jobs', track.id, { status: 'processing', progress: 50 });
    await insertTestJob('analysis_jobs', track.id, { status: 'queued', progress: 0 });

    const client = await getPgClient();
    try {
      // Call get_track_progress function
      const result = await client.query(
        'SELECT get_track_progress($1) as progress',
        [track.id]
      );

      const progress = result.rows[0]?.progress;

      // Average progress: (100 + 50 + 0) / 3 = 50
      expect(progress).toBe(50);
    } finally {
      await client.end();
    }
  });

  it('should test get_track_progress function with no jobs', async () => {
    const track = await insertTestTrack({
      spotify_id: 'test_progress_no_jobs',
      title: 'Progress No Jobs Test'
    });

    const client = await getPgClient();
    try {
      // Call get_track_progress function
      const result = await client.query(
        'SELECT get_track_progress($1) as progress',
        [track.id]
      );

      const progress = result.rows[0]?.progress;

      // No jobs = 0% progress
      expect(progress).toBe(0);
    } finally {
      await client.end();
    }
  });

  it('should test get_track_progress function with all completed jobs', async () => {
    const track = await insertTestTrack({
      spotify_id: 'test_progress_completed',
      title: 'Progress All Completed Test'
    });

    // Create all completed jobs
    await insertTestJob('download_jobs', track.id, { status: 'completed', progress: 100 });
    await insertTestJob('processing_jobs', track.id, { status: 'completed', progress: 100 });
    await insertTestJob('analysis_jobs', track.id, { status: 'completed', progress: 100 });

    const client = await getPgClient();
    try {
      // Call get_track_progress function
      const result = await client.query(
        'SELECT get_track_progress($1) as progress',
        [track.id]
      );

      const progress = result.rows[0]?.progress;

      // All jobs complete = 100% progress
      expect(progress).toBe(100);
    } finally {
      await client.end();
    }
  });

  it('should verify trigger updates updated_at on all job tables', async () => {
    const track = await insertTestTrack({
      spotify_id: 'test_job_triggers',
      title: 'Job Triggers Test'
    });

    const jobTables = [
      { table: 'download_jobs', job: null as any },
      { table: 'processing_jobs', job: null as any },
      { table: 'analysis_jobs', job: null as any }
    ];

    // Create jobs and verify trigger behavior
    for (const jobTable of jobTables) {
      const job = await insertTestJob(
        jobTable.table as 'download_jobs' | 'processing_jobs' | 'analysis_jobs',
        track.id,
        { status: 'queued', progress: 0 }
      );

      jobTable.job = job;

      // Get initial updated_at
      const { data: initialJob } = await supabase
        .from(jobTable.table)
        .select('updated_at')
        .eq('id', job.id)
        .single();

      const initialUpdatedAt = new Date(initialJob!.updated_at);

      // Wait
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update job
      await supabase
        .from(jobTable.table)
        .update({ status: 'processing', progress: 50 })
        .eq('id', job.id);

      // Get new updated_at
      const { data: updatedJob } = await supabase
        .from(jobTable.table)
        .select('updated_at')
        .eq('id', job.id)
        .single();

      const newUpdatedAt = new Date(updatedJob!.updated_at);

      // Should be updated
      expect(
        newUpdatedAt.getTime(),
        `${jobTable.table} updated_at should be updated`
      ).toBeGreaterThan(initialUpdatedAt.getTime());
    }
  });

  it('should verify exactly 2 functions and 4 triggers exist', async () => {
    // Check functions
    const updateFunctionExists = await functionExists('update_updated_at_column');
    const progressFunctionExists = await functionExists('get_track_progress');

    expect(updateFunctionExists).toBe(true);
    expect(progressFunctionExists).toBe(true);

    // Check triggers count
    const tablesWithTriggers = ['tracks', 'download_jobs', 'processing_jobs', 'analysis_jobs'];
    let totalTriggers = 0;

    for (const table of tablesWithTriggers) {
      const triggers = await getTableTriggers(table);
      // Each table should have exactly 1 trigger
      expect(triggers.length, `${table} should have 1 trigger`).toBe(1);
      totalTriggers += triggers.length;
    }

    // Should have exactly 4 triggers total
    expect(totalTriggers).toBe(4);
  });
});
