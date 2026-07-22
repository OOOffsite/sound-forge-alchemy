/**
 * Supabase Realtime Configuration Tests
 *
 * TDD RED Phase: Write failing tests FIRST
 * Tests validate Realtime publication for job status updates
 *
 * @module tests/infrastructure/supabase/realtime.test
 * @author Claude Code
 * @license MIT
 * @version 1.0.0
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  isInRealtimePublication,
  cleanupDatabase,
  insertTestTrack,
  insertTestJob,
  supabase,
  waitForCondition
} from '../helpers/supabase';

describe('Supabase Realtime', () => {
  beforeAll(async () => {
    await cleanupDatabase();
  });

  afterAll(async () => {
    await cleanupDatabase();
  });

  it('should enable Realtime on job tables', async () => {
    const jobTables = [
      'download_jobs',
      'processing_jobs',
      'analysis_jobs'
    ];

    for (const tableName of jobTables) {
      const isInPublication = await isInRealtimePublication(tableName);
      expect(isInPublication, `${tableName} should be in supabase_realtime publication`).toBe(true);
    }
  });

  it('should enable Realtime on stems table', async () => {
    const isInPublication = await isInRealtimePublication('stems');
    expect(isInPublication, 'stems should be in supabase_realtime publication').toBe(true);
  });

  it('should NOT enable Realtime on tracks table', async () => {
    // tracks table should NOT be in Realtime (static metadata)
    const isInPublication = await isInRealtimePublication('tracks');
    expect(isInPublication, 'tracks should NOT be in supabase_realtime publication').toBe(false);
  });

  it('should broadcast INSERT events on job tables', async () => {
    const track = await insertTestTrack({
      spotify_id: 'test_realtime_insert',
      title: 'Realtime Insert Test'
    });

    let receivedInsert = false;
    let insertedJobId: string | null = null;

    // Subscribe to download_jobs channel
    const channel = supabase
      .channel('download_jobs_insert_test')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'download_jobs'
        },
        (payload) => {
          receivedInsert = true;
          insertedJobId = payload.new.id;
        }
      )
      .subscribe();

    // Wait for subscription to be ready
    await new Promise(resolve => setTimeout(resolve, 500));

    // Insert a job
    const { data: job } = await supabase
      .from('download_jobs')
      .insert({
        track_id: track.id,
        status: 'queued',
        progress: 0
      })
      .select()
      .single();

    // Wait for Realtime event
    const eventReceived = await waitForCondition(
      async () => receivedInsert,
      3000
    );

    expect(eventReceived, 'Should receive INSERT event via Realtime').toBe(true);
    expect(insertedJobId).toBe(job?.id);

    // Cleanup
    await supabase.removeChannel(channel);
  });

  it('should broadcast UPDATE events on job tables', async () => {
    const track = await insertTestTrack({
      spotify_id: 'test_realtime_update',
      title: 'Realtime Update Test'
    });

    const job = await insertTestJob('processing_jobs', track.id, {
      status: 'queued',
      progress: 0
    });

    let receivedUpdate = false;
    let updatedStatus: string | null = null;
    let updatedProgress: number | null = null;

    // Subscribe to processing_jobs channel
    const channel = supabase
      .channel('processing_jobs_update_test')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'processing_jobs'
        },
        (payload) => {
          receivedUpdate = true;
          updatedStatus = payload.new.status;
          updatedProgress = payload.new.progress;
        }
      )
      .subscribe();

    // Wait for subscription to be ready
    await new Promise(resolve => setTimeout(resolve, 500));

    // Update the job
    await supabase
      .from('processing_jobs')
      .update({ status: 'processing', progress: 50 })
      .eq('id', job.id);

    // Wait for Realtime event
    const eventReceived = await waitForCondition(
      async () => receivedUpdate,
      3000
    );

    expect(eventReceived, 'Should receive UPDATE event via Realtime').toBe(true);
    expect(updatedStatus).toBe('processing');
    expect(updatedProgress).toBe(50);

    // Cleanup
    await supabase.removeChannel(channel);
  });

  it('should broadcast DELETE events on job tables', async () => {
    const track = await insertTestTrack({
      spotify_id: 'test_realtime_delete',
      title: 'Realtime Delete Test'
    });

    const job = await insertTestJob('analysis_jobs', track.id, {
      status: 'error',
      progress: 0
    });

    let receivedDelete = false;
    let deletedJobId: string | null = null;

    // Subscribe to analysis_jobs channel
    const channel = supabase
      .channel('analysis_jobs_delete_test')
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'analysis_jobs'
        },
        (payload) => {
          receivedDelete = true;
          deletedJobId = payload.old.id;
        }
      )
      .subscribe();

    // Wait for subscription to be ready
    await new Promise(resolve => setTimeout(resolve, 500));

    // Delete the job
    await supabase
      .from('analysis_jobs')
      .delete()
      .eq('id', job.id);

    // Wait for Realtime event
    const eventReceived = await waitForCondition(
      async () => receivedDelete,
      3000
    );

    expect(eventReceived, 'Should receive DELETE event via Realtime').toBe(true);
    expect(deletedJobId).toBe(job.id);

    // Cleanup
    await supabase.removeChannel(channel);
  });

  it('should filter events by channel and conditions', async () => {
    const track = await insertTestTrack({
      spotify_id: 'test_realtime_filter',
      title: 'Realtime Filter Test'
    });

    let receivedMatchingEvent = false;
    let receivedNonMatchingEvent = false;

    // Subscribe to specific track_id
    const channel = supabase
      .channel('download_jobs_filter_test')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'download_jobs',
          filter: `track_id=eq.${track.id}`
        },
        (payload) => {
          receivedMatchingEvent = true;
        }
      )
      .subscribe();

    // Wait for subscription to be ready
    await new Promise(resolve => setTimeout(resolve, 500));

    // Insert matching job
    await supabase
      .from('download_jobs')
      .insert({
        track_id: track.id,
        status: 'queued',
        progress: 0
      });

    // Wait for event
    const matchingReceived = await waitForCondition(
      async () => receivedMatchingEvent,
      3000
    );

    expect(matchingReceived, 'Should receive event for matching track_id').toBe(true);

    // Insert non-matching job (different track)
    const otherTrack = await insertTestTrack({
      spotify_id: 'test_other_track',
      title: 'Other Track'
    });

    receivedNonMatchingEvent = false;

    await supabase
      .from('download_jobs')
      .insert({
        track_id: otherTrack.id,
        status: 'queued',
        progress: 0
      });

    // Wait briefly
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Should NOT receive event for different track_id
    expect(receivedNonMatchingEvent, 'Should NOT receive event for non-matching track_id').toBe(false);

    // Cleanup
    await supabase.removeChannel(channel);
  });

  it('should verify Realtime is enabled on exactly 4 tables', async () => {
    const allTables = [
      'tracks',
      'download_jobs',
      'processing_jobs',
      'analysis_jobs',
      'stems',
      'analysis_results'
    ];

    const results = await Promise.all(
      allTables.map(async (tableName) => ({
        table: tableName,
        inPublication: await isInRealtimePublication(tableName)
      }))
    );

    const realtimeTables = results.filter(r => r.inPublication);
    const expectedRealtimeTables = ['download_jobs', 'processing_jobs', 'analysis_jobs', 'stems'];

    // Should have exactly 4 tables in Realtime
    expect(realtimeTables.length).toBe(4);

    // Verify the correct tables are in Realtime
    for (const tableName of expectedRealtimeTables) {
      const result = results.find(r => r.table === tableName);
      expect(result?.inPublication, `${tableName} should be in Realtime`).toBe(true);
    }

    // Verify tracks and analysis_results are NOT in Realtime
    const tracksResult = results.find(r => r.table === 'tracks');
    expect(tracksResult?.inPublication).toBe(false);

    const analysisResultsResult = results.find(r => r.table === 'analysis_results');
    expect(analysisResultsResult?.inPublication).toBe(false);
  });
});
