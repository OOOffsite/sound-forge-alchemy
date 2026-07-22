/**
 * Supabase Test Infrastructure Helpers
 *
 * Provides utilities for testing Supabase migrations, schema, RLS policies,
 * indexes, and database integrity.
 *
 * @module tests/infrastructure/helpers/supabase
 * @author Claude Code
 * @license MIT
 * @version 1.0.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Client } from 'pg';

// Supabase client for testing
export const supabase: SupabaseClient = createClient(
  process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
  process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
);

// PostgreSQL client for direct database queries
export async function getPgClient(): Promise<Client> {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });
  await client.connect();
  return client;
}

/**
 * Get table schema information from information_schema
 */
export async function getTableSchema(tableName: string) {
  const client = await getPgClient();
  try {
    const result = await client.query(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);

    return result.rows;
  } finally {
    await client.end();
  }
}

/**
 * Get table constraints (primary keys, foreign keys, unique, check)
 */
export async function getTableConstraints(tableName: string) {
  const client = await getPgClient();
  try {
    const result = await client.query(`
      SELECT
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        cc.check_clause
      FROM information_schema.table_constraints AS tc
      LEFT JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      LEFT JOIN information_schema.check_constraints AS cc
        ON cc.constraint_name = tc.constraint_name
      WHERE tc.table_schema = 'public'
        AND tc.table_name = $1
      ORDER BY tc.constraint_type, tc.constraint_name
    `, [tableName]);

    return result.rows;
  } finally {
    await client.end();
  }
}

/**
 * Get indexes for a table
 */
export async function getTableIndexes(tableName: string) {
  const client = await getPgClient();
  try {
    const result = await client.query(`
      SELECT
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = $1
      ORDER BY indexname
    `, [tableName]);

    return result.rows;
  } finally {
    await client.end();
  }
}

/**
 * Check if RLS is enabled on a table
 */
export async function isRLSEnabled(tableName: string): Promise<boolean> {
  const client = await getPgClient();
  try {
    const result = await client.query(`
      SELECT relrowsecurity
      FROM pg_class
      WHERE relname = $1
        AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    `, [tableName]);

    return result.rows[0]?.relrowsecurity || false;
  } finally {
    await client.end();
  }
}

/**
 * Get RLS policies for a table
 */
export async function getRLSPolicies(tableName: string) {
  const client = await getPgClient();
  try {
    const result = await client.query(`
      SELECT
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = $1
      ORDER BY policyname
    `, [tableName]);

    return result.rows;
  } finally {
    await client.end();
  }
}

/**
 * Check if a function exists
 */
export async function functionExists(functionName: string): Promise<boolean> {
  const client = await getPgClient();
  try {
    const result = await client.query(`
      SELECT EXISTS(
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.proname = $1
      ) as exists
    `, [functionName]);

    return result.rows[0]?.exists || false;
  } finally {
    await client.end();
  }
}

/**
 * Get triggers for a table
 */
export async function getTableTriggers(tableName: string) {
  const client = await getPgClient();
  try {
    const result = await client.query(`
      SELECT
        trigger_name,
        event_manipulation,
        action_timing,
        action_statement
      FROM information_schema.triggers
      WHERE event_object_schema = 'public'
        AND event_object_table = $1
      ORDER BY trigger_name
    `, [tableName]);

    return result.rows;
  } finally {
    await client.end();
  }
}

/**
 * Check if table is in Realtime publication
 */
export async function isInRealtimePublication(tableName: string): Promise<boolean> {
  const client = await getPgClient();
  try {
    const result = await client.query(`
      SELECT EXISTS(
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = $1
      ) as exists
    `, [tableName]);

    return result.rows[0]?.exists || false;
  } finally {
    await client.end();
  }
}

/**
 * Get storage buckets
 */
export async function getStorageBuckets() {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  return data;
}

/**
 * Get storage bucket details
 */
export async function getStorageBucket(bucketName: string) {
  const { data, error } = await supabase.storage.getBucket(bucketName);
  if (error) throw error;
  return data;
}

/**
 * Check if all expected tables exist
 */
export async function checkTablesExist(tableNames: string[]): Promise<{ table: string; exists: boolean }[]> {
  const client = await getPgClient();
  try {
    const results = await Promise.all(
      tableNames.map(async (tableName) => {
        const result = await client.query(`
          SELECT EXISTS(
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = $1
          ) as exists
        `, [tableName]);

        return {
          table: tableName,
          exists: result.rows[0]?.exists || false
        };
      })
    );

    return results;
  } finally {
    await client.end();
  }
}

/**
 * Clean up database for test isolation
 * Truncates all tables in reverse dependency order
 */
export async function cleanupDatabase() {
  try {
    // Delete in reverse dependency order to avoid FK violations
    await supabase.from('analysis_results').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('stems').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('processing_jobs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('analysis_jobs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('download_jobs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('tracks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  } catch (error) {
    console.error('Error cleaning up database:', error);
    throw error;
  }
}

/**
 * Insert test track
 */
export async function insertTestTrack(data: {
  spotify_id?: string;
  title: string;
  artist?: string;
  album?: string;
}) {
  const { data: track, error } = await supabase
    .from('tracks')
    .insert({
      spotify_id: data.spotify_id || `test_${Date.now()}`,
      title: data.title,
      artist: data.artist || 'Test Artist',
      album: data.album || 'Test Album',
      duration: 180
    })
    .select()
    .single();

  if (error) throw error;
  return track;
}

/**
 * Insert test job
 */
export async function insertTestJob(
  tableName: 'download_jobs' | 'processing_jobs' | 'analysis_jobs',
  trackId: string,
  data: Partial<any> = {}
) {
  const defaultData = {
    track_id: trackId,
    status: 'queued',
    progress: 0,
    ...data
  };

  const { data: job, error } = await supabase
    .from(tableName)
    .insert(defaultData)
    .select()
    .single();

  if (error) throw error;
  return job;
}

/**
 * Wait for condition with timeout
 */
export async function waitForCondition(
  condition: () => Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  return false;
}
