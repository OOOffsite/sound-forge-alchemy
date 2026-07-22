/**
 * Supabase Schema Migration Tests
 *
 * TDD RED Phase: Write failing tests FIRST
 * Tests validate schema migrations, table structure, columns, types, constraints
 *
 * @module tests/infrastructure/supabase/schema.test
 * @author Claude Code
 * @license MIT
 * @version 1.0.0
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  checkTablesExist,
  getTableSchema,
  getTableConstraints,
  cleanupDatabase,
  getPgClient
} from '../helpers/supabase';

describe('Supabase Schema Migration', () => {
  beforeAll(async () => {
    // Clean database before tests
    await cleanupDatabase();
  });

  afterAll(async () => {
    // Clean up after tests
    await cleanupDatabase();
  });

  it('should create all required tables', async () => {
    const expectedTables = [
      'tracks',
      'download_jobs',
      'processing_jobs',
      'analysis_jobs',
      'stems',
      'analysis_results'
    ];

    const results = await checkTablesExist(expectedTables);

    // All tables should exist
    for (const result of results) {
      expect(result.exists).toBe(true);
    }

    // Should have exactly 6 tables
    expect(results.length).toBe(6);
  });

  it('should create correct columns for tracks table', async () => {
    const schema = await getTableSchema('tracks');

    // Expected columns
    const expectedColumns = [
      { name: 'id', type: 'uuid' },
      { name: 'spotify_id', type: 'text' },
      { name: 'spotify_url', type: 'text' },
      { name: 'title', type: 'text' },
      { name: 'artist', type: 'text' },
      { name: 'album', type: 'text' },
      { name: 'album_art_url', type: 'text' },
      { name: 'duration', type: 'integer' },
      { name: 'created_at', type: 'timestamp with time zone' },
      { name: 'updated_at', type: 'timestamp with time zone' }
    ];

    expect(schema.length).toBe(expectedColumns.length);

    for (const expected of expectedColumns) {
      const column = schema.find(c => c.column_name === expected.name);
      expect(column, `Column ${expected.name} should exist`).toBeDefined();
      expect(column?.data_type).toBe(expected.type);
    }

    // title should be NOT NULL
    const titleColumn = schema.find(c => c.column_name === 'title');
    expect(titleColumn?.is_nullable).toBe('NO');
  });

  it('should create correct columns for jobs tables', async () => {
    const jobTables = ['download_jobs', 'processing_jobs', 'analysis_jobs'];

    for (const tableName of jobTables) {
      const schema = await getTableSchema(tableName);

      // Common job columns
      const commonColumns = ['id', 'track_id', 'status', 'progress', 'error', 'created_at', 'updated_at'];

      for (const columnName of commonColumns) {
        const column = schema.find(c => c.column_name === columnName);
        expect(column, `${tableName}.${columnName} should exist`).toBeDefined();
      }

      // status and id should be NOT NULL
      const statusColumn = schema.find(c => c.column_name === 'status');
      expect(statusColumn?.is_nullable).toBe('NO');

      const idColumn = schema.find(c => c.column_name === 'id');
      expect(idColumn?.is_nullable).toBe('NO');
    }
  });

  it('should set proper column types', async () => {
    // Check tracks table types
    const tracksSchema = await getTableSchema('tracks');

    const idColumn = tracksSchema.find(c => c.column_name === 'id');
    expect(idColumn?.data_type).toBe('uuid');

    const spotifyIdColumn = tracksSchema.find(c => c.column_name === 'spotify_id');
    expect(spotifyIdColumn?.data_type).toBe('text');

    const durationColumn = tracksSchema.find(c => c.column_name === 'duration');
    expect(durationColumn?.data_type).toBe('integer');

    const createdAtColumn = tracksSchema.find(c => c.column_name === 'created_at');
    expect(createdAtColumn?.data_type).toBe('timestamp with time zone');

    // Check download_jobs table types
    const downloadJobsSchema = await getTableSchema('download_jobs');

    const trackIdColumn = downloadJobsSchema.find(c => c.column_name === 'track_id');
    expect(trackIdColumn?.data_type).toBe('uuid');

    const progressColumn = downloadJobsSchema.find(c => c.column_name === 'progress');
    expect(progressColumn?.data_type).toBe('integer');

    const fileSizeColumn = downloadJobsSchema.find(c => c.column_name === 'file_size');
    expect(fileSizeColumn?.data_type).toBe('bigint');

    // Check processing_jobs JSONB column
    const processingJobsSchema = await getTableSchema('processing_jobs');
    const optionsColumn = processingJobsSchema.find(c => c.column_name === 'options');
    expect(optionsColumn?.data_type).toBe('jsonb');

    // Check analysis_jobs JSONB column
    const analysisJobsSchema = await getTableSchema('analysis_jobs');
    const resultsColumn = analysisJobsSchema.find(c => c.column_name === 'results');
    expect(resultsColumn?.data_type).toBe('jsonb');
  });

  it('should create primary keys', async () => {
    const tables = [
      'tracks',
      'download_jobs',
      'processing_jobs',
      'analysis_jobs',
      'stems',
      'analysis_results'
    ];

    for (const tableName of tables) {
      const constraints = await getTableConstraints(tableName);

      const primaryKey = constraints.find(c => c.constraint_type === 'PRIMARY KEY');
      expect(primaryKey, `${tableName} should have PRIMARY KEY`).toBeDefined();
      expect(primaryKey?.column_name).toBe('id');
    }
  });

  it('should create foreign keys', async () => {
    // download_jobs.track_id -> tracks.id
    const downloadJobsConstraints = await getTableConstraints('download_jobs');
    const downloadJobsFK = downloadJobsConstraints.find(
      c => c.constraint_type === 'FOREIGN KEY' && c.column_name === 'track_id'
    );
    expect(downloadJobsFK).toBeDefined();
    expect(downloadJobsFK?.foreign_table_name).toBe('tracks');
    expect(downloadJobsFK?.foreign_column_name).toBe('id');

    // processing_jobs.track_id -> tracks.id
    const processingJobsConstraints = await getTableConstraints('processing_jobs');
    const processingJobsFK = processingJobsConstraints.find(
      c => c.constraint_type === 'FOREIGN KEY' && c.column_name === 'track_id'
    );
    expect(processingJobsFK).toBeDefined();
    expect(processingJobsFK?.foreign_table_name).toBe('tracks');
    expect(processingJobsFK?.foreign_column_name).toBe('id');

    // analysis_jobs.track_id -> tracks.id
    const analysisJobsConstraints = await getTableConstraints('analysis_jobs');
    const analysisJobsFK = analysisJobsConstraints.find(
      c => c.constraint_type === 'FOREIGN KEY' && c.column_name === 'track_id'
    );
    expect(analysisJobsFK).toBeDefined();
    expect(analysisJobsFK?.foreign_table_name).toBe('tracks');
    expect(analysisJobsFK?.foreign_column_name).toBe('id');

    // stems.track_id -> tracks.id
    const stemsConstraints = await getTableConstraints('stems');
    const stemsTrackFK = stemsConstraints.find(
      c => c.constraint_type === 'FOREIGN KEY' && c.column_name === 'track_id'
    );
    expect(stemsTrackFK).toBeDefined();
    expect(stemsTrackFK?.foreign_table_name).toBe('tracks');

    // stems.processing_job_id -> processing_jobs.id
    const stemsProcessingFK = stemsConstraints.find(
      c => c.constraint_type === 'FOREIGN KEY' && c.column_name === 'processing_job_id'
    );
    expect(stemsProcessingFK).toBeDefined();
    expect(stemsProcessingFK?.foreign_table_name).toBe('processing_jobs');

    // analysis_results.track_id -> tracks.id
    const analysisResultsConstraints = await getTableConstraints('analysis_results');
    const analysisResultsTrackFK = analysisResultsConstraints.find(
      c => c.constraint_type === 'FOREIGN KEY' && c.column_name === 'track_id'
    );
    expect(analysisResultsTrackFK).toBeDefined();
    expect(analysisResultsTrackFK?.foreign_table_name).toBe('tracks');

    // analysis_results.analysis_job_id -> analysis_jobs.id
    const analysisResultsJobFK = analysisResultsConstraints.find(
      c => c.constraint_type === 'FOREIGN KEY' && c.column_name === 'analysis_job_id'
    );
    expect(analysisResultsJobFK).toBeDefined();
    expect(analysisResultsJobFK?.foreign_table_name).toBe('analysis_jobs');
  });

  it('should create unique constraints', async () => {
    // tracks.spotify_id should be UNIQUE
    const tracksConstraints = await getTableConstraints('tracks');
    const uniqueConstraint = tracksConstraints.find(
      c => c.constraint_type === 'UNIQUE' && c.column_name === 'spotify_id'
    );
    expect(uniqueConstraint).toBeDefined();
  });

  it('should set default values', async () => {
    // Check tracks table defaults
    const tracksSchema = await getTableSchema('tracks');

    const idColumn = tracksSchema.find(c => c.column_name === 'id');
    expect(idColumn?.column_default).toContain('gen_random_uuid()');

    const createdAtColumn = tracksSchema.find(c => c.column_name === 'created_at');
    expect(createdAtColumn?.column_default).toContain('now()');

    const updatedAtColumn = tracksSchema.find(c => c.column_name === 'updated_at');
    expect(updatedAtColumn?.column_default).toContain('now()');

    // Check download_jobs defaults
    const downloadJobsSchema = await getTableSchema('download_jobs');

    const progressColumn = downloadJobsSchema.find(c => c.column_name === 'progress');
    expect(progressColumn?.column_default).toBe('0');

    // Check processing_jobs JSONB default
    const processingJobsSchema = await getTableSchema('processing_jobs');
    const optionsColumn = processingJobsSchema.find(c => c.column_name === 'options');
    expect(optionsColumn?.column_default).toContain("'{}'::jsonb");
  });

  it('should create CHECK constraints on status columns', async () => {
    const jobTables = ['download_jobs', 'processing_jobs', 'analysis_jobs'];

    for (const tableName of jobTables) {
      const constraints = await getTableConstraints(tableName);

      // Should have CHECK constraint on status
      const statusCheck = constraints.find(
        c => c.constraint_type === 'CHECK' && c.check_clause?.includes('status')
      );
      expect(statusCheck, `${tableName} should have status CHECK constraint`).toBeDefined();

      // Status should allow: queued, processing, completed, error
      expect(statusCheck?.check_clause).toContain('queued');
      expect(statusCheck?.check_clause).toContain('processing');
      expect(statusCheck?.check_clause).toContain('completed');
      expect(statusCheck?.check_clause).toContain('error');

      // Should have CHECK constraint on progress (0-100)
      const progressCheck = constraints.find(
        c => c.constraint_type === 'CHECK' && c.check_clause?.includes('progress')
      );
      expect(progressCheck, `${tableName} should have progress CHECK constraint`).toBeDefined();
    }

    // stems should have CHECK on stem_type
    const stemsConstraints = await getTableConstraints('stems');
    const stemTypeCheck = stemsConstraints.find(
      c => c.constraint_type === 'CHECK' && c.check_clause?.includes('stem_type')
    );
    expect(stemTypeCheck).toBeDefined();
    expect(stemTypeCheck?.check_clause).toContain('vocals');
    expect(stemTypeCheck?.check_clause).toContain('drums');
    expect(stemTypeCheck?.check_clause).toContain('bass');
    expect(stemTypeCheck?.check_clause).toContain('other');
  });

  it('should verify CASCADE delete behavior', async () => {
    const client = await getPgClient();
    try {
      // Get foreign key constraints with ON DELETE action
      const result = await client.query(`
        SELECT
          tc.table_name,
          kcu.column_name,
          rc.delete_rule
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.referential_constraints rc
          ON tc.constraint_name = rc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
        ORDER BY tc.table_name
      `);

      // All foreign keys should have CASCADE delete
      for (const row of result.rows) {
        expect(row.delete_rule).toBe('CASCADE');
      }
    } finally {
      await client.end();
    }
  });
});
