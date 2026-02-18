-- Add title, private_notes, and calendar_description columns to meetings
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS private_notes text;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS calendar_description text;
