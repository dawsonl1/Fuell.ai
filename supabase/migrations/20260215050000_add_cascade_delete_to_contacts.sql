-- Add ON DELETE CASCADE to all foreign keys referencing contacts table
-- This ensures that when a contact is deleted, all related records are also deleted

-- Drop existing constraints and recreate with CASCADE
ALTER TABLE contact_emails DROP CONSTRAINT IF EXISTS contact_emails_contact_fk;
ALTER TABLE contact_emails ADD CONSTRAINT contact_emails_contact_fk 
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;

ALTER TABLE contact_phones DROP CONSTRAINT IF EXISTS contact_phones_contact_fk;
ALTER TABLE contact_phones ADD CONSTRAINT contact_phones_contact_fk 
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;

ALTER TABLE contact_companies DROP CONSTRAINT IF EXISTS contact_companies_contact_fk;
ALTER TABLE contact_companies ADD CONSTRAINT contact_companies_contact_fk 
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;

ALTER TABLE contact_schools DROP CONSTRAINT IF EXISTS contact_schools_contact_fk;
ALTER TABLE contact_schools ADD CONSTRAINT contact_schools_contact_fk 
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;

ALTER TABLE contact_tags DROP CONSTRAINT IF EXISTS contact_tags_contact_fk;
ALTER TABLE contact_tags ADD CONSTRAINT contact_tags_contact_fk 
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;

ALTER TABLE contact_attachments DROP CONSTRAINT IF EXISTS contact_attachments_contact_fk;
ALTER TABLE contact_attachments ADD CONSTRAINT contact_attachments_contact_fk 
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;

ALTER TABLE meeting_contacts DROP CONSTRAINT IF EXISTS meeting_contacts_contact_fk;
ALTER TABLE meeting_contacts ADD CONSTRAINT meeting_contacts_contact_fk 
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;

ALTER TABLE interactions DROP CONSTRAINT IF EXISTS interactions_contact_fk;
ALTER TABLE interactions ADD CONSTRAINT interactions_contact_fk 
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;

ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_referrer_fk;
ALTER TABLE referrals ADD CONSTRAINT referrals_referrer_fk 
  FOREIGN KEY (referred_by_contact_id) REFERENCES contacts(id) ON DELETE CASCADE;

ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_contact_fk;
ALTER TABLE referrals ADD CONSTRAINT referrals_contact_fk 
  FOREIGN KEY (referred_contact_id) REFERENCES contacts(id) ON DELETE CASCADE;

-- For follow_up_action_items, set contact_id to NULL on delete (since it's nullable)
ALTER TABLE follow_up_action_items DROP CONSTRAINT IF EXISTS follow_up_action_items_contact_fk;
ALTER TABLE follow_up_action_items ADD CONSTRAINT follow_up_action_items_contact_fk 
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL;

COMMENT ON TABLE contacts IS 'Contacts table with CASCADE delete on related records';
