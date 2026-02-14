-- Enable Row Level Security and add policies for all tables
-- Users can only access their own data

-- ═══════════════════════════════════════════════════════════
-- users
-- ═══════════════════════════════════════════════════════════
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own" ON "users"
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "users_insert_own" ON "users"
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "users_update_own" ON "users"
  FOR UPDATE USING (id = auth.uid());

-- ═══════════════════════════════════════════════════════════
-- contacts
-- ═══════════════════════════════════════════════════════════
ALTER TABLE "contacts" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacts_select_own" ON "contacts"
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "contacts_insert_own" ON "contacts"
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "contacts_update_own" ON "contacts"
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "contacts_delete_own" ON "contacts"
  FOR DELETE USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════
-- contact_emails  (access via owning contact)
-- ═══════════════════════════════════════════════════════════
ALTER TABLE "contact_emails" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_emails_select" ON "contact_emails"
  FOR SELECT USING (
    contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid())
  );

CREATE POLICY "contact_emails_insert" ON "contact_emails"
  FOR INSERT WITH CHECK (
    contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid())
  );

CREATE POLICY "contact_emails_update" ON "contact_emails"
  FOR UPDATE USING (
    contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid())
  );

CREATE POLICY "contact_emails_delete" ON "contact_emails"
  FOR DELETE USING (
    contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid())
  );

-- ═══════════════════════════════════════════════════════════
-- contact_phones
-- ═══════════════════════════════════════════════════════════
ALTER TABLE "contact_phones" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_phones_select" ON "contact_phones"
  FOR SELECT USING (
    contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid())
  );

CREATE POLICY "contact_phones_insert" ON "contact_phones"
  FOR INSERT WITH CHECK (
    contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid())
  );

CREATE POLICY "contact_phones_update" ON "contact_phones"
  FOR UPDATE USING (
    contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid())
  );

CREATE POLICY "contact_phones_delete" ON "contact_phones"
  FOR DELETE USING (
    contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid())
  );

-- ═══════════════════════════════════════════════════════════
-- companies  (shared lookup table — anyone can read, only insert)
-- ═══════════════════════════════════════════════════════════
ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companies_select_all" ON "companies"
  FOR SELECT USING (true);

CREATE POLICY "companies_insert_authenticated" ON "companies"
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ═══════════════════════════════════════════════════════════
-- contact_companies
-- ═══════════════════════════════════════════════════════════
ALTER TABLE "contact_companies" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_companies_select" ON "contact_companies"
  FOR SELECT USING (
    contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid())
  );

CREATE POLICY "contact_companies_insert" ON "contact_companies"
  FOR INSERT WITH CHECK (
    contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid())
  );

CREATE POLICY "contact_companies_update" ON "contact_companies"
  FOR UPDATE USING (
    contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid())
  );

CREATE POLICY "contact_companies_delete" ON "contact_companies"
  FOR DELETE USING (
    contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid())
  );

-- ═══════════════════════════════════════════════════════════
-- schools  (shared lookup table)
-- ═══════════════════════════════════════════════════════════
ALTER TABLE "schools" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schools_select_all" ON "schools"
  FOR SELECT USING (true);

CREATE POLICY "schools_insert_authenticated" ON "schools"
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ═══════════════════════════════════════════════════════════
-- contact_schools
-- ═══════════════════════════════════════════════════════════
ALTER TABLE "contact_schools" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_schools_select" ON "contact_schools"
  FOR SELECT USING (
    contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid())
  );

CREATE POLICY "contact_schools_insert" ON "contact_schools"
  FOR INSERT WITH CHECK (
    contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid())
  );

CREATE POLICY "contact_schools_update" ON "contact_schools"
  FOR UPDATE USING (
    contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid())
  );

CREATE POLICY "contact_schools_delete" ON "contact_schools"
  FOR DELETE USING (
    contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid())
  );

-- ═══════════════════════════════════════════════════════════
-- user_companies
-- ═══════════════════════════════════════════════════════════
ALTER TABLE "user_companies" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_companies_select_own" ON "user_companies"
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_companies_insert_own" ON "user_companies"
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_companies_update_own" ON "user_companies"
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "user_companies_delete_own" ON "user_companies"
  FOR DELETE USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════
-- user_schools
-- ═══════════════════════════════════════════════════════════
ALTER TABLE "user_schools" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_schools_select_own" ON "user_schools"
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_schools_insert_own" ON "user_schools"
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_schools_update_own" ON "user_schools"
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "user_schools_delete_own" ON "user_schools"
  FOR DELETE USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════
-- meetings
-- ═══════════════════════════════════════════════════════════
ALTER TABLE "meetings" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meetings_select_own" ON "meetings"
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "meetings_insert_own" ON "meetings"
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "meetings_update_own" ON "meetings"
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "meetings_delete_own" ON "meetings"
  FOR DELETE USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════
-- meeting_contacts
-- ═══════════════════════════════════════════════════════════
ALTER TABLE "meeting_contacts" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meeting_contacts_select" ON "meeting_contacts"
  FOR SELECT USING (
    meeting_id IN (SELECT id FROM meetings WHERE user_id = auth.uid())
  );

CREATE POLICY "meeting_contacts_insert" ON "meeting_contacts"
  FOR INSERT WITH CHECK (
    meeting_id IN (SELECT id FROM meetings WHERE user_id = auth.uid())
  );

CREATE POLICY "meeting_contacts_delete" ON "meeting_contacts"
  FOR DELETE USING (
    meeting_id IN (SELECT id FROM meetings WHERE user_id = auth.uid())
  );

-- ═══════════════════════════════════════════════════════════
-- interactions
-- ═══════════════════════════════════════════════════════════
ALTER TABLE "interactions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "interactions_select" ON "interactions"
  FOR SELECT USING (
    contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid())
  );

CREATE POLICY "interactions_insert" ON "interactions"
  FOR INSERT WITH CHECK (
    contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid())
  );

CREATE POLICY "interactions_update" ON "interactions"
  FOR UPDATE USING (
    contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid())
  );

CREATE POLICY "interactions_delete" ON "interactions"
  FOR DELETE USING (
    contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid())
  );

-- ═══════════════════════════════════════════════════════════
-- tags
-- ═══════════════════════════════════════════════════════════
ALTER TABLE "tags" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tags_select_own" ON "tags"
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "tags_insert_own" ON "tags"
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "tags_update_own" ON "tags"
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "tags_delete_own" ON "tags"
  FOR DELETE USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════
-- contact_tags
-- ═══════════════════════════════════════════════════════════
ALTER TABLE "contact_tags" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_tags_select" ON "contact_tags"
  FOR SELECT USING (
    contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid())
  );

CREATE POLICY "contact_tags_insert" ON "contact_tags"
  FOR INSERT WITH CHECK (
    contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid())
  );

CREATE POLICY "contact_tags_delete" ON "contact_tags"
  FOR DELETE USING (
    contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid())
  );

-- ═══════════════════════════════════════════════════════════
-- referrals
-- ═══════════════════════════════════════════════════════════
ALTER TABLE "referrals" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referrals_select_own" ON "referrals"
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "referrals_insert_own" ON "referrals"
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "referrals_delete_own" ON "referrals"
  FOR DELETE USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════
-- attachments
-- ═══════════════════════════════════════════════════════════
ALTER TABLE "attachments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attachments_select_own" ON "attachments"
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "attachments_insert_own" ON "attachments"
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "attachments_delete_own" ON "attachments"
  FOR DELETE USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════
-- contact_attachments
-- ═══════════════════════════════════════════════════════════
ALTER TABLE "contact_attachments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_attachments_select" ON "contact_attachments"
  FOR SELECT USING (
    contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid())
  );

CREATE POLICY "contact_attachments_insert" ON "contact_attachments"
  FOR INSERT WITH CHECK (
    contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid())
  );

CREATE POLICY "contact_attachments_delete" ON "contact_attachments"
  FOR DELETE USING (
    contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid())
  );

-- ═══════════════════════════════════════════════════════════
-- meeting_attachments
-- ═══════════════════════════════════════════════════════════
ALTER TABLE "meeting_attachments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meeting_attachments_select" ON "meeting_attachments"
  FOR SELECT USING (
    meeting_id IN (SELECT id FROM meetings WHERE user_id = auth.uid())
  );

CREATE POLICY "meeting_attachments_insert" ON "meeting_attachments"
  FOR INSERT WITH CHECK (
    meeting_id IN (SELECT id FROM meetings WHERE user_id = auth.uid())
  );

CREATE POLICY "meeting_attachments_delete" ON "meeting_attachments"
  FOR DELETE USING (
    meeting_id IN (SELECT id FROM meetings WHERE user_id = auth.uid())
  );

-- ═══════════════════════════════════════════════════════════
-- interaction_attachments
-- ═══════════════════════════════════════════════════════════
ALTER TABLE "interaction_attachments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "interaction_attachments_select" ON "interaction_attachments"
  FOR SELECT USING (
    interaction_id IN (
      SELECT i.id FROM interactions i
      JOIN contacts c ON c.id = i.contact_id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "interaction_attachments_insert" ON "interaction_attachments"
  FOR INSERT WITH CHECK (
    interaction_id IN (
      SELECT i.id FROM interactions i
      JOIN contacts c ON c.id = i.contact_id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "interaction_attachments_delete" ON "interaction_attachments"
  FOR DELETE USING (
    interaction_id IN (
      SELECT i.id FROM interactions i
      JOIN contacts c ON c.id = i.contact_id
      WHERE c.user_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════
-- post_meeting_action_items
-- ═══════════════════════════════════════════════════════════
ALTER TABLE "post_meeting_action_items" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_meeting_action_items_select_own" ON "post_meeting_action_items"
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "post_meeting_action_items_insert_own" ON "post_meeting_action_items"
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "post_meeting_action_items_update_own" ON "post_meeting_action_items"
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "post_meeting_action_items_delete_own" ON "post_meeting_action_items"
  FOR DELETE USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════
-- follow_up_action_items
-- ═══════════════════════════════════════════════════════════
ALTER TABLE "follow_up_action_items" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "follow_up_action_items_select_own" ON "follow_up_action_items"
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "follow_up_action_items_insert_own" ON "follow_up_action_items"
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "follow_up_action_items_update_own" ON "follow_up_action_items"
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "follow_up_action_items_delete_own" ON "follow_up_action_items"
  FOR DELETE USING (user_id = auth.uid());
