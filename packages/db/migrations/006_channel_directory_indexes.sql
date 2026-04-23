-- Channel directory performance indexes

CREATE INDEX IF NOT EXISTS idx_channels_directory
  ON channels (type, display_order, member_count);

CREATE INDEX IF NOT EXISTS idx_channel_members_user_id
  ON channel_members (user_id);
