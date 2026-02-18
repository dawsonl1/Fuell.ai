-- Gmail integration tables: OAuth connections + email metadata cache

-- Store per-user Gmail OAuth tokens
CREATE TABLE gmail_connections (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gmail_address TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  last_gmail_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id)
);

-- Lightweight email metadata cache
CREATE TABLE email_messages (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gmail_message_id TEXT NOT NULL,
  thread_id TEXT,
  subject TEXT,
  snippet TEXT,
  from_address TEXT,
  to_addresses TEXT[],
  date TIMESTAMPTZ,
  label_ids TEXT[],
  is_read BOOLEAN DEFAULT true,
  direction TEXT CHECK (direction IN ('inbound', 'outbound')),
  matched_contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, gmail_message_id)
);

CREATE INDEX idx_email_messages_contact_date
  ON email_messages (user_id, matched_contact_id, date DESC);

-- RLS policies for gmail_connections
ALTER TABLE gmail_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own gmail connection"
  ON gmail_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gmail connection"
  ON gmail_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own gmail connection"
  ON gmail_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own gmail connection"
  ON gmail_connections FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for email_messages
ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own email messages"
  ON email_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email messages"
  ON email_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email messages"
  ON email_messages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email messages"
  ON email_messages FOR DELETE
  USING (auth.uid() = user_id);

-- Service role bypass for both tables (needed for API routes using service client)
CREATE POLICY "Service role has full access to gmail_connections"
  ON gmail_connections FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to email_messages"
  ON email_messages FOR ALL
  USING (auth.role() = 'service_role');
