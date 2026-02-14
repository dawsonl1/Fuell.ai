-- Add contact_status (student/professional) and expected_graduation to contacts
ALTER TABLE contacts
  ADD COLUMN contact_status text DEFAULT NULL,
  ADD COLUMN expected_graduation text DEFAULT NULL;

-- contact_status values: 'student', 'professional', or NULL
-- expected_graduation: free-form text like "May 2027" or "2026"
