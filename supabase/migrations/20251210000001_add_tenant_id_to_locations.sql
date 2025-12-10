-- ============================================
-- Add tenant_id column to locations table
-- Date: 2025-12-10
-- Purpose: Add tenant_id for multi-tenant support
-- ============================================

-- Add tenant_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'locations' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE locations ADD COLUMN tenant_id UUID;
  END IF;
END $$;

-- Create index on tenant_id for performance
CREATE INDEX IF NOT EXISTS idx_locations_tenant_id ON locations(tenant_id);
