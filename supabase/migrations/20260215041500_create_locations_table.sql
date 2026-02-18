-- Create normalized locations table
CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  city TEXT,
  state TEXT,
  country TEXT NOT NULL DEFAULT 'United States',
  UNIQUE(city, state, country)
);

-- Add location_id foreign key to contacts (replacing the text location column)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id);

-- Drop the text location column if it exists
ALTER TABLE contacts DROP COLUMN IF EXISTS location;

-- Enable RLS on locations
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Locations are shared/readable by all authenticated users
CREATE POLICY "Locations are viewable by authenticated users"
  ON locations FOR SELECT
  TO authenticated
  USING (true);

-- Any authenticated user can insert locations
CREATE POLICY "Authenticated users can insert locations"
  ON locations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE locations IS 'Normalized location data with city, state, country';
COMMENT ON COLUMN locations.city IS 'City name (e.g., San Francisco)';
COMMENT ON COLUMN locations.state IS 'State/province/region (e.g., California, CA)';
COMMENT ON COLUMN locations.country IS 'Country name (e.g., United States)';
COMMENT ON COLUMN contacts.location_id IS 'Foreign key to normalized locations table';
