-- ============================================
-- Migration 006: Add is_bot column and latitude/longitude
-- For Automated Market Maker system
-- ============================================

-- Add is_bot flag to distinguish bot accounts from real users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_bot BOOLEAN DEFAULT FALSE;

-- Add latitude and longitude columns for simplified geo-queries
-- (Alternative to PostGIS geography type)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Create index for finding bot accounts
CREATE INDEX IF NOT EXISTS idx_users_is_bot ON users (is_bot);

-- Create index for location-based queries
CREATE INDEX IF NOT EXISTS idx_users_lat_lng ON users (latitude, longitude);

-- Comment on columns
COMMENT ON COLUMN users.is_bot IS 'True if this is an automated market maker bot account';
COMMENT ON COLUMN users.latitude IS 'User latitude coordinate for geo-queries';
COMMENT ON COLUMN users.longitude IS 'User longitude coordinate for geo-queries';

-- Create helper function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance_km(
  lat1 DOUBLE PRECISION,
  lng1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lng2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
DECLARE
  earth_radius_km CONSTANT DOUBLE PRECISION := 6371;
  dlat DOUBLE PRECISION;
  dlng DOUBLE PRECISION;
  a DOUBLE PRECISION;
  c DOUBLE PRECISION;
BEGIN
  IF lat1 IS NULL OR lng1 IS NULL OR lat2 IS NULL OR lng2 IS NULL THEN
    RETURN NULL;
  END IF;
  
  dlat := RADIANS(lat2 - lat1);
  dlng := RADIANS(lng2 - lng1);
  
  a := SIN(dlat / 2) * SIN(dlat / 2) +
       COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
       SIN(dlng / 2) * SIN(dlng / 2);
  
  c := 2 * ATAN2(SQRT(a), SQRT(1 - a));
  
  RETURN earth_radius_km * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_distance_km IS 'Calculate distance in km between two lat/lng points using Haversine formula';
