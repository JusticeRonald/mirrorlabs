-- Migration: Add orientation_json column to scans table
-- This column stores scan orientation as { x: number, y: number, z: number } in radians
-- Required for annotation placement and proper 3D positioning

-- Add the column if it doesn't exist
ALTER TABLE scans ADD COLUMN IF NOT EXISTS orientation_json JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN scans.orientation_json IS 'Scan orientation in radians as JSON: { x: number, y: number, z: number }';
