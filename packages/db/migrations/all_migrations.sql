-- ============================================================
-- 전체 마이그레이션 통합본 (Supabase SQL Editor에서 실행)
-- 순서: 001 → 002 → 003 → 004 → 005
-- ============================================================


-- ============================================================
-- 001: 초기 스키마
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  department VARCHAR(255),
  job_title VARCHAR(255),
  avatar_url TEXT,
  trust_score INTEGER DEFAULT 36,
  is_verified BOOLEAN DEFAULT FALSE,
  anonymous_seed UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);

-- Channels
CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon_url TEXT,
  is_private BOOLEAN DEFAULT FALSE,
  member_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_channels_slug ON channels(slug);
CREATE INDEX IF NOT EXISTS idx_channels_created_by ON channels(created_by);

-- Posts
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_anonymous BOOLEAN DEFAULT FALSE,
  anon_alias VARCHAR(100),
  title VARCHAR(300),
  content TEXT NOT NULL,
  content_type VARCHAR(50) DEFAULT 'text',
  media_urls TEXT[] DEFAULT '{}',
  link_url TEXT,
  link_preview JSONB,
  upvote_count INTEGER DEFAULT 0,
  downvote_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  flair VARCHAR(100),
  is_pinned BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  hot_score NUMERIC(10, 4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_channel_id ON posts(channel_id);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_hot_score ON posts(hot_score DESC);
CREATE INDEX IF NOT EXISTS idx_posts_is_deleted ON posts(is_deleted);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  is_anonymous BOOLEAN DEFAULT FALSE,
  anon_number INTEGER,
  content TEXT NOT NULL,
  upvote_count INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT FALSE,
  depth INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id);

-- Votes
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type VARCHAR(50) NOT NULL,
  target_id UUID NOT NULL,
  vote_type VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_target ON votes(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);

-- Reactions
CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  emoji VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id, emoji),
  UNIQUE(user_id, comment_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_comment_id ON reactions(comment_id);

-- Channel Members
CREATE TABLE IF NOT EXISTS channel_members (
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY(channel_id, user_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL,
  target_type VARCHAR(50),
  target_id UUID,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_actor ON notifications(actor_id);

-- Reports
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type VARCHAR(50) NOT NULL,
  target_id UUID NOT NULL,
  reason VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- RLS 정책
CREATE POLICY IF NOT EXISTS "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "posts_select" ON posts FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "posts_insert" ON posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY IF NOT EXISTS "posts_update" ON posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY IF NOT EXISTS "posts_delete" ON posts FOR DELETE USING (auth.uid() = author_id);

CREATE POLICY IF NOT EXISTS "comments_select" ON comments FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "comments_insert" ON comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY IF NOT EXISTS "comments_update" ON comments FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY IF NOT EXISTS "votes_insert" ON votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "votes_select" ON votes FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "votes_delete" ON votes FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "reactions_select" ON reactions FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "reactions_insert" ON reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "reactions_delete" ON reactions FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "notifications_select" ON notifications FOR SELECT USING (auth.uid() = recipient_id);
CREATE POLICY IF NOT EXISTS "notifications_update" ON notifications FOR UPDATE USING (auth.uid() = recipient_id);

CREATE POLICY IF NOT EXISTS "reports_insert" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);


-- ============================================================
-- 002: channel_requests 테이블
-- ============================================================

CREATE TABLE IF NOT EXISTS channel_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT,
  reason TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_channel_id UUID REFERENCES channels(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_channel_requests_slug_status ON channel_requests(slug, status);
CREATE INDEX IF NOT EXISTS idx_channel_requests_requested_by ON channel_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_channel_requests_status ON channel_requests(status);

ALTER TABLE channel_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "channel_requests_insert"
  ON channel_requests FOR INSERT
  WITH CHECK (auth.uid() = requested_by);

CREATE POLICY IF NOT EXISTS "channel_requests_select_own"
  ON channel_requests FOR SELECT
  USING (auth.uid() = requested_by);


-- ============================================================
-- 003: channels / channel_members RLS 읽기 정책
-- ============================================================

CREATE POLICY IF NOT EXISTS "channels_select_public"
  ON channels FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "channel_members_select_own"
  ON channel_members FOR SELECT
  USING (auth.uid() = user_id);


-- ============================================================
-- 004: profiles.role 컬럼 추가
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'member';


-- ============================================================
-- 005: posts 피드 성능 인덱스
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_posts_feed_hot
  ON posts (channel_id, is_deleted, hot_score DESC);

CREATE INDEX IF NOT EXISTS idx_posts_feed_new
  ON posts (channel_id, is_deleted, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_feed_top
  ON posts (channel_id, is_deleted, upvote_count DESC);

CREATE INDEX IF NOT EXISTS idx_posts_global_hot
  ON posts (is_deleted, hot_score DESC);

CREATE INDEX IF NOT EXISTS idx_posts_global_new
  ON posts (is_deleted, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_global_top
  ON posts (is_deleted, upvote_count DESC);


-- ============================================================
-- 006: channel directory performance indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_channels_directory
  ON channels (type, display_order, member_count);

CREATE INDEX IF NOT EXISTS idx_channel_members_user_id
  ON channel_members (user_id);
