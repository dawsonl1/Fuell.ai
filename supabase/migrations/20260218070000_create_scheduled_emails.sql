-- Scheduled emails — queue for send-later functionality
CREATE TABLE scheduled_emails (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  cc TEXT,
  bcc TEXT,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  thread_id TEXT,
  in_reply_to TEXT,
  references_header TEXT,
  scheduled_send_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled')),
  sent_at TIMESTAMPTZ,
  gmail_message_id TEXT,
  sent_thread_id TEXT,
  contact_name TEXT,
  matched_contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_scheduled_emails_user ON scheduled_emails (user_id, status);
CREATE INDEX idx_scheduled_emails_pending
  ON scheduled_emails (status, scheduled_send_at)
  WHERE status = 'pending';

-- Link follow-ups to scheduled emails so they activate after the parent sends
ALTER TABLE email_follow_ups
  ADD COLUMN scheduled_email_id INTEGER REFERENCES scheduled_emails(id) ON DELETE CASCADE;

-- RLS for scheduled_emails
ALTER TABLE scheduled_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scheduled emails"
  ON scheduled_emails FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own scheduled emails"
  ON scheduled_emails FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own scheduled emails"
  ON scheduled_emails FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own scheduled emails"
  ON scheduled_emails FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access to scheduled_emails"
  ON scheduled_emails FOR ALL USING (auth.role() = 'service_role');
