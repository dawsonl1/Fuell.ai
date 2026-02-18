-- Add location column to contact_companies table
ALTER TABLE contact_companies ADD COLUMN location TEXT;

-- Add comment
COMMENT ON COLUMN contact_companies.location IS 'Job location (e.g., "San Francisco, CA")';
