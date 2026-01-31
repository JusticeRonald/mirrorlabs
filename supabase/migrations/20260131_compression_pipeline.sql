-- Migration: Add compression tracking columns to scans table
-- These columns track the progress and results of PLY → SOG compression

-- Add compression progress column (0-100 percentage)
ALTER TABLE scans ADD COLUMN IF NOT EXISTS compression_progress INTEGER DEFAULT NULL;
COMMENT ON COLUMN scans.compression_progress IS 'Compression progress percentage (0-100), null when not applicable';

-- Add original file size tracking (before compression)
ALTER TABLE scans ADD COLUMN IF NOT EXISTS original_file_size BIGINT DEFAULT NULL;
COMMENT ON COLUMN scans.original_file_size IS 'Original file size in bytes before compression';

-- Add compressed file size tracking (after compression)
ALTER TABLE scans ADD COLUMN IF NOT EXISTS compressed_file_size BIGINT DEFAULT NULL;
COMMENT ON COLUMN scans.compressed_file_size IS 'Compressed file size in bytes after SOG conversion';

-- Add compression ratio column
ALTER TABLE scans ADD COLUMN IF NOT EXISTS compression_ratio REAL DEFAULT NULL;
COMMENT ON COLUMN scans.compression_ratio IS 'Compression ratio (original_size / compressed_size)';

-- Add constraint to ensure compression_progress is between 0 and 100
ALTER TABLE scans ADD CONSTRAINT scans_compression_progress_range
  CHECK (compression_progress IS NULL OR (compression_progress >= 0 AND compression_progress <= 100));

-- Add index for querying scans by status (useful for monitoring processing scans)
CREATE INDEX IF NOT EXISTS idx_scans_status ON scans(status);
