-- Drop the unused post_meeting_action_items table.
-- All action item functionality uses follow_up_action_items + action_item_contacts instead.
DROP TABLE IF EXISTS "post_meeting_action_items";
