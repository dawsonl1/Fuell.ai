-- Remove the 'role' column from contacts.
-- 'role' was originally meant to be student/professional status,
-- which is now handled by the 'contact_status' column.
-- Job titles are stored in contact_companies.title instead.
ALTER TABLE contacts DROP COLUMN IF EXISTS role;
