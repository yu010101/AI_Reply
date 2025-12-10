-- ============================================
-- Add address column to locations table
-- Date: 2025-12-10
-- Purpose: Add address field for store locations
-- ============================================

-- Add address column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'locations' AND column_name = 'address'
  ) THEN
    ALTER TABLE locations ADD COLUMN address TEXT;
  END IF;
END $$;

-- Add google_place_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'locations' AND column_name = 'google_place_id'
  ) THEN
    ALTER TABLE locations ADD COLUMN google_place_id TEXT;
  END IF;
END $$;
