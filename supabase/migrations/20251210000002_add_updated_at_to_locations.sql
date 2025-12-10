-- ============================================
-- Add updated_at column to locations table
-- Date: 2025-12-10
-- Purpose: Add updated_at for tracking modifications
-- ============================================

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'locations' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE locations ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;
