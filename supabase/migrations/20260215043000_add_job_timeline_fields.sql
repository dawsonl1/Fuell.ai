-- Add job timeline fields to contact_companies table
ALTER TABLE contact_companies ADD COLUMN IF NOT EXISTS start_month TEXT;
ALTER TABLE contact_companies ADD COLUMN IF NOT EXISTS end_month TEXT;

-- Add comments for documentation
COMMENT ON COLUMN contact_companies.start_month IS 'Job start month in format "Mon YYYY" (e.g., "Jan 2023")';
COMMENT ON COLUMN contact_companies.end_month IS 'Job end month in format "Mon YYYY" or "Present" for current jobs';
