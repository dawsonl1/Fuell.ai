-- Add location column to contacts table
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS location TEXT;

-- Add comment for documentation
COMMENT ON COLUMN contacts.location IS 'Geographic location of the contact (e.g., "San Francisco, CA")';
