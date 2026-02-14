-- Allow action items to exist without a contact
ALTER TABLE follow_up_action_items ALTER COLUMN contact_id DROP NOT NULL;
