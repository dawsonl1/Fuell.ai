-- Email follow-up scheduling tables

-- A follow-up sequence tied to an original sent email
CREATE TABLE email_follow_ups (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_gmail_message_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  contact_name TEXT,
  original_subject TEXT,
  original_sent_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled_reply', 'cancelled_user', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_email_follow_ups_user ON email_follow_ups (user_id, status);
CREATE INDEX idx_email_follow_ups_thread ON email_follow_ups (user_id, thread_id);

-- Individual messages in a follow-up sequence
CREATE TABLE email_follow_up_messages (
  id SERIAL PRIMARY KEY,
  follow_up_id INTEGER NOT NULL REFERENCES email_follow_ups(id) ON DELETE CASCADE,
  sequence_number INTEGER NOT NULL,
  send_after_days INTEGER NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled')),
  scheduled_send_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_follow_up_messages_pending
  ON email_follow_up_messages (status, scheduled_send_at)
  WHERE status = 'pending';

-- RLS for email_follow_ups
ALTER TABLE email_follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own follow-ups"
  ON email_follow_ups FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own follow-ups"
  ON email_follow_ups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own follow-ups"
  ON email_follow_ups FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own follow-ups"
  ON email_follow_ups FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access to email_follow_ups"
  ON email_follow_ups FOR ALL USING (auth.role() = 'service_role');

-- RLS for email_follow_up_messages (through parent)
ALTER TABLE email_follow_up_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their follow-up messages"
  ON email_follow_up_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM email_follow_ups WHERE id = follow_up_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert their follow-up messages"
  ON email_follow_up_messages FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM email_follow_ups WHERE id = follow_up_id AND user_id = auth.uid()));
CREATE POLICY "Users can update their follow-up messages"
  ON email_follow_up_messages FOR UPDATE
  USING (EXISTS (SELECT 1 FROM email_follow_ups WHERE id = follow_up_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete their follow-up messages"
  ON email_follow_up_messages FOR DELETE
  USING (EXISTS (SELECT 1 FROM email_follow_ups WHERE id = follow_up_id AND user_id = auth.uid()));
CREATE POLICY "Service role full access to follow-up messages"
  ON email_follow_up_messages FOR ALL USING (auth.role() = 'service_role');
