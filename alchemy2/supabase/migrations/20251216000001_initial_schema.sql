-- Sound Forge Alchemy - Initial Supabase Schema Migration
-- Replaces Redis job storage + PostgreSQL with unified Supabase schema
-- Migration Date: 2025-12-16
-- Version: 1.0.0

-- ============================================================================
-- TABLES
-- ============================================================================

-- Tracks table: stores Spotify track metadata
CREATE TABLE tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spotify_id TEXT UNIQUE,
  spotify_url TEXT,
  title TEXT NOT NULL,
  artist TEXT,
  album TEXT,
  album_art_url TEXT,
  duration INTEGER, -- in seconds
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Download jobs: tracks audio download progress
CREATE TABLE download_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'error')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  output_path TEXT,
  file_size BIGINT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Processing jobs: tracks Demucs stem separation progress
CREATE TABLE processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
  model TEXT DEFAULT 'htdemucs', -- Demucs model name
  status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'error')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  output_path TEXT,
  options JSONB DEFAULT '{}'::jsonb, -- Demucs CLI options
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analysis jobs: tracks librosa audio analysis progress
CREATE TABLE analysis_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'error')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  results JSONB, -- Analysis results (tempo, key, energy, features)
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stems: separated audio files (vocals, drums, bass, other)
CREATE TABLE stems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processing_job_id UUID REFERENCES processing_jobs(id) ON DELETE CASCADE,
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
  stem_type TEXT NOT NULL CHECK (stem_type IN ('vocals', 'drums', 'bass', 'other')),
  file_path TEXT, -- Local file path (for download)
  storage_url TEXT, -- Supabase Storage URL
  file_size BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analysis results: detailed librosa analysis output
CREATE TABLE analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
  analysis_job_id UUID REFERENCES analysis_jobs(id) ON DELETE CASCADE,
  tempo FLOAT,
  key TEXT,
  energy FLOAT,
  spectral_centroid FLOAT,
  spectral_rolloff FLOAT,
  zero_crossing_rate FLOAT,
  features JSONB, -- Full librosa feature extraction
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Tracks indexes
CREATE INDEX idx_tracks_spotify_id ON tracks(spotify_id);
CREATE INDEX idx_tracks_created_at ON tracks(created_at DESC);

-- Download jobs indexes
CREATE INDEX idx_download_jobs_track_id ON download_jobs(track_id);
CREATE INDEX idx_download_jobs_status ON download_jobs(status);
CREATE INDEX idx_download_jobs_created_at ON download_jobs(created_at DESC);

-- Processing jobs indexes
CREATE INDEX idx_processing_jobs_track_id ON processing_jobs(track_id);
CREATE INDEX idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX idx_processing_jobs_created_at ON processing_jobs(created_at DESC);

-- Analysis jobs indexes
CREATE INDEX idx_analysis_jobs_track_id ON analysis_jobs(track_id);
CREATE INDEX idx_analysis_jobs_status ON analysis_jobs(status);
CREATE INDEX idx_analysis_jobs_created_at ON analysis_jobs(created_at DESC);

-- Stems indexes
CREATE INDEX idx_stems_track_id ON stems(track_id);
CREATE INDEX idx_stems_processing_job_id ON stems(processing_job_id);
CREATE INDEX idx_stems_stem_type ON stems(stem_type);

-- Analysis results indexes
CREATE INDEX idx_analysis_results_track_id ON analysis_results(track_id);
CREATE INDEX idx_analysis_results_analysis_job_id ON analysis_results(analysis_job_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function: Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate job completion percentage across all jobs for a track
CREATE OR REPLACE FUNCTION get_track_progress(track_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    total_progress INTEGER;
    job_count INTEGER;
BEGIN
    SELECT
        COALESCE(SUM(progress), 0),
        COUNT(*)
    INTO total_progress, job_count
    FROM (
        SELECT progress FROM download_jobs WHERE track_id = track_uuid
        UNION ALL
        SELECT progress FROM processing_jobs WHERE track_id = track_uuid
        UNION ALL
        SELECT progress FROM analysis_jobs WHERE track_id = track_uuid
    ) AS all_jobs;

    IF job_count = 0 THEN
        RETURN 0;
    END IF;

    RETURN total_progress / job_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at on tracks
CREATE TRIGGER update_tracks_updated_at
BEFORE UPDATE ON tracks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at on download_jobs
CREATE TRIGGER update_download_jobs_updated_at
BEFORE UPDATE ON download_jobs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at on processing_jobs
CREATE TRIGGER update_processing_jobs_updated_at
BEFORE UPDATE ON processing_jobs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at on analysis_jobs
CREATE TRIGGER update_analysis_jobs_updated_at
BEFORE UPDATE ON analysis_jobs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stems ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (refine later with auth)
-- Tracks policies
CREATE POLICY "Public read access on tracks"
ON tracks FOR SELECT
USING (true);

CREATE POLICY "Public insert access on tracks"
ON tracks FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public update access on tracks"
ON tracks FOR UPDATE
USING (true);

-- Download jobs policies
CREATE POLICY "Public read access on download_jobs"
ON download_jobs FOR SELECT
USING (true);

CREATE POLICY "Public insert access on download_jobs"
ON download_jobs FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public update access on download_jobs"
ON download_jobs FOR UPDATE
USING (true);

-- Processing jobs policies
CREATE POLICY "Public read access on processing_jobs"
ON processing_jobs FOR SELECT
USING (true);

CREATE POLICY "Public insert access on processing_jobs"
ON processing_jobs FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public update access on processing_jobs"
ON processing_jobs FOR UPDATE
USING (true);

-- Analysis jobs policies
CREATE POLICY "Public read access on analysis_jobs"
ON analysis_jobs FOR SELECT
USING (true);

CREATE POLICY "Public insert access on analysis_jobs"
ON analysis_jobs FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public update access on analysis_jobs"
ON analysis_jobs FOR UPDATE
USING (true);

-- Stems policies
CREATE POLICY "Public read access on stems"
ON stems FOR SELECT
USING (true);

CREATE POLICY "Public insert access on stems"
ON stems FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public update access on stems"
ON stems FOR UPDATE
USING (true);

-- Analysis results policies
CREATE POLICY "Public read access on analysis_results"
ON analysis_results FOR SELECT
USING (true);

CREATE POLICY "Public insert access on analysis_results"
ON analysis_results FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public update access on analysis_results"
ON analysis_results FOR UPDATE
USING (true);

-- ============================================================================
-- REALTIME PUBLICATION
-- ============================================================================

-- Enable Realtime for job tables (replaces Redis pub/sub)
ALTER PUBLICATION supabase_realtime ADD TABLE download_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE processing_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE analysis_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE stems;

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE tracks IS 'Spotify track metadata';
COMMENT ON TABLE download_jobs IS 'Audio download job queue (spotdl)';
COMMENT ON TABLE processing_jobs IS 'Stem separation job queue (Demucs)';
COMMENT ON TABLE analysis_jobs IS 'Audio analysis job queue (librosa)';
COMMENT ON TABLE stems IS 'Separated audio stem files';
COMMENT ON TABLE analysis_results IS 'Detailed audio analysis results';

COMMENT ON COLUMN tracks.spotify_id IS 'Spotify track ID (unique identifier)';
COMMENT ON COLUMN download_jobs.status IS 'Job status: queued, processing, completed, error';
COMMENT ON COLUMN processing_jobs.model IS 'Demucs model name (e.g., htdemucs)';
COMMENT ON COLUMN stems.stem_type IS 'Stem type: vocals, drums, bass, other';
COMMENT ON COLUMN analysis_results.features IS 'Full librosa feature extraction (JSONB)';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
