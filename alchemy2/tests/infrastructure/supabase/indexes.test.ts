/**
 * Supabase Index Tests
 *
 * TDD RED Phase: Write failing tests FIRST
 * Tests validate database indexes for performance optimization
 *
 * @module tests/infrastructure/supabase/indexes.test
 * @author Claude Code
 * @license MIT
 * @version 1.0.0
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  getTableIndexes,
  cleanupDatabase,
  insertTestTrack,
  insertTestJob,
  getPgClient
} from '../helpers/supabase';

describe('Supabase Indexes', () => {
  beforeAll(async () => {
    await cleanupDatabase();
  });

  afterAll(async () => {
    await cleanupDatabase();
  });

  it('should create index on tracks.spotify_id', async () => {
    const indexes = await getTableIndexes('tracks');

    const spotifyIdIndex = indexes.find(i => i.indexname === 'idx_tracks_spotify_id');
    expect(spotifyIdIndex).toBeDefined();
    expect(spotifyIdIndex?.indexdef).toContain('spotify_id');
  });

  it('should create index on tracks.created_at', async () => {
    const indexes = await getTableIndexes('tracks');

    const createdAtIndex = indexes.find(i => i.indexname === 'idx_tracks_created_at');
    expect(createdAtIndex).toBeDefined();
    expect(createdAtIndex?.indexdef).toContain('created_at');
    expect(createdAtIndex?.indexdef).toContain('DESC'); // Should be descending for recent tracks
  });

  it('should create indexes on job tables status columns', async () => {
    const jobTables = [
      { name: 'download_jobs', indexName: 'idx_download_jobs_status' },
      { name: 'processing_jobs', indexName: 'idx_processing_jobs_status' },
      { name: 'analysis_jobs', indexName: 'idx_analysis_jobs_status' }
    ];

    for (const table of jobTables) {
      const indexes = await getTableIndexes(table.name);

      const statusIndex = indexes.find(i => i.indexname === table.indexName);
      expect(statusIndex, `${table.name} should have status index`).toBeDefined();
      expect(statusIndex?.indexdef).toContain('status');
    }
  });

  it('should create indexes on job tables track_id columns', async () => {
    const jobTables = [
      { name: 'download_jobs', indexName: 'idx_download_jobs_track_id' },
      { name: 'processing_jobs', indexName: 'idx_processing_jobs_track_id' },
      { name: 'analysis_jobs', indexName: 'idx_analysis_jobs_track_id' }
    ];

    for (const table of jobTables) {
      const indexes = await getTableIndexes(table.name);

      const trackIdIndex = indexes.find(i => i.indexname === table.indexName);
      expect(trackIdIndex, `${table.name} should have track_id index`).toBeDefined();
      expect(trackIdIndex?.indexdef).toContain('track_id');
    }
  });

  it('should create indexes on stems table', async () => {
    const indexes = await getTableIndexes('stems');

    // stems.track_id index
    const trackIdIndex = indexes.find(i => i.indexname === 'idx_stems_track_id');
    expect(trackIdIndex).toBeDefined();
    expect(trackIdIndex?.indexdef).toContain('track_id');

    // stems.processing_job_id index
    const processingJobIdIndex = indexes.find(i => i.indexname === 'idx_stems_processing_job_id');
    expect(processingJobIdIndex).toBeDefined();
    expect(processingJobIdIndex?.indexdef).toContain('processing_job_id');

    // stems.stem_type index
    const stemTypeIndex = indexes.find(i => i.indexname === 'idx_stems_stem_type');
    expect(stemTypeIndex).toBeDefined();
    expect(stemTypeIndex?.indexdef).toContain('stem_type');
  });

  it('should create indexes on analysis_results table', async () => {
    const indexes = await getTableIndexes('analysis_results');

    // analysis_results.track_id index
    const trackIdIndex = indexes.find(i => i.indexname === 'idx_analysis_results_track_id');
    expect(trackIdIndex).toBeDefined();
    expect(trackIdIndex?.indexdef).toContain('track_id');

    // analysis_results.analysis_job_id index
    const analysisJobIdIndex = indexes.find(i => i.indexname === 'idx_analysis_results_analysis_job_id');
    expect(analysisJobIdIndex).toBeDefined();
    expect(analysisJobIdIndex?.indexdef).toContain('analysis_job_id');
  });

  it('should verify index performance on queries', async () => {
    // Insert test data
    const track = await insertTestTrack({
      spotify_id: 'test_performance_123',
      title: 'Performance Test Track'
    });

    await insertTestJob('download_jobs', track.id, { status: 'completed' });

    const client = await getPgClient();
    try {
      // Query by spotify_id - should use idx_tracks_spotify_id
      const spotifyIdExplain = await client.query(`
        EXPLAIN (FORMAT JSON)
        SELECT * FROM tracks WHERE spotify_id = 'test_performance_123'
      `);

      const spotifyIdPlan = JSON.stringify(spotifyIdExplain.rows[0]);
      expect(spotifyIdPlan).toContain('Index Scan');
      expect(spotifyIdPlan).toContain('idx_tracks_spotify_id');

      // Query by status - should use idx_download_jobs_status
      const statusExplain = await client.query(`
        EXPLAIN (FORMAT JSON)
        SELECT * FROM download_jobs WHERE status = 'completed'
      `);

      const statusPlan = JSON.stringify(statusExplain.rows[0]);
      // Should use index (either Index Scan or Bitmap Index Scan)
      expect(
        statusPlan.includes('Index Scan') || statusPlan.includes('Bitmap Index Scan')
      ).toBe(true);

      // Query by track_id - should use idx_download_jobs_track_id
      const trackIdExplain = await client.query(`
        EXPLAIN (FORMAT JSON)
        SELECT * FROM download_jobs WHERE track_id = $1
      `, [track.id]);

      const trackIdPlan = JSON.stringify(trackIdExplain.rows[0]);
      expect(
        trackIdPlan.includes('Index Scan') || trackIdPlan.includes('Bitmap Index Scan')
      ).toBe(true);
    } finally {
      await client.end();
    }
  });

  it('should verify all expected indexes exist', async () => {
    const expectedIndexes = [
      // Tracks indexes
      { table: 'tracks', index: 'idx_tracks_spotify_id' },
      { table: 'tracks', index: 'idx_tracks_created_at' },

      // Download jobs indexes
      { table: 'download_jobs', index: 'idx_download_jobs_track_id' },
      { table: 'download_jobs', index: 'idx_download_jobs_status' },
      { table: 'download_jobs', index: 'idx_download_jobs_created_at' },

      // Processing jobs indexes
      { table: 'processing_jobs', index: 'idx_processing_jobs_track_id' },
      { table: 'processing_jobs', index: 'idx_processing_jobs_status' },
      { table: 'processing_jobs', index: 'idx_processing_jobs_created_at' },

      // Analysis jobs indexes
      { table: 'analysis_jobs', index: 'idx_analysis_jobs_track_id' },
      { table: 'analysis_jobs', index: 'idx_analysis_jobs_status' },
      { table: 'analysis_jobs', index: 'idx_analysis_jobs_created_at' },

      // Stems indexes
      { table: 'stems', index: 'idx_stems_track_id' },
      { table: 'stems', index: 'idx_stems_processing_job_id' },
      { table: 'stems', index: 'idx_stems_stem_type' },

      // Analysis results indexes
      { table: 'analysis_results', index: 'idx_analysis_results_track_id' },
      { table: 'analysis_results', index: 'idx_analysis_results_analysis_job_id' }
    ];

    for (const { table, index } of expectedIndexes) {
      const indexes = await getTableIndexes(table);
      const foundIndex = indexes.find(i => i.indexname === index);
      expect(foundIndex, `${table}.${index} should exist`).toBeDefined();
    }

    // Should have exactly 16 custom indexes (not counting primary keys and unique constraints)
    const totalCustomIndexes = expectedIndexes.length;
    expect(totalCustomIndexes).toBe(16);
  });

  it('should verify created_at indexes are descending for performance', async () => {
    const tablesWithCreatedAt = [
      { table: 'tracks', index: 'idx_tracks_created_at' },
      { table: 'download_jobs', index: 'idx_download_jobs_created_at' },
      { table: 'processing_jobs', index: 'idx_processing_jobs_created_at' },
      { table: 'analysis_jobs', index: 'idx_analysis_jobs_created_at' }
    ];

    for (const { table, index } of tablesWithCreatedAt) {
      const indexes = await getTableIndexes(table);
      const createdAtIndex = indexes.find(i => i.indexname === index);

      expect(createdAtIndex).toBeDefined();
      // DESC is important for "ORDER BY created_at DESC" queries (most recent first)
      expect(createdAtIndex?.indexdef).toContain('DESC');
    }
  });
});
