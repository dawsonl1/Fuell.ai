-- Junction table: many-to-many between action items and contacts
CREATE TABLE IF NOT EXISTS action_item_contacts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  action_item_id BIGINT NOT NULL REFERENCES follow_up_action_items(id) ON DELETE CASCADE,
  contact_id BIGINT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  UNIQUE (action_item_id, contact_id)
);

-- Enable RLS
ALTER TABLE action_item_contacts ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can manage rows for their own action items
CREATE POLICY "Users can manage their action item contacts"
  ON action_item_contacts
  FOR ALL
  USING (
    action_item_id IN (
      SELECT id FROM follow_up_action_items WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    action_item_id IN (
      SELECT id FROM follow_up_action_items WHERE user_id = auth.uid()
    )
  );

-- Migrate existing contact_id data into the junction table
INSERT INTO action_item_contacts (action_item_id, contact_id)
SELECT id, contact_id
FROM follow_up_action_items
WHERE contact_id IS NOT NULL
ON CONFLICT DO NOTHING;
