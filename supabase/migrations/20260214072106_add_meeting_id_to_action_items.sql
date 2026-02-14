-- Add optional meeting_id to follow_up_action_items so action items can be linked to meetings
ALTER TABLE "follow_up_action_items"
  ADD COLUMN "meeting_id" int;

ALTER TABLE "follow_up_action_items"
  ADD CONSTRAINT follow_up_action_items_meeting_fk
  FOREIGN KEY ("meeting_id") REFERENCES "meetings" ("id") ON DELETE SET NULL;
