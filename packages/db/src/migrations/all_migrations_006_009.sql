-- ============================================================
-- T1~T7 데모 강화 통합 마이그레이션 (006 ~ 009)
-- Supabase SQL Editor 에 이 파일을 통째로 붙여 넣고 실행하세요.
-- 기존 005 까지의 마이그레이션이 이미 적용되어 있다고 가정합니다.
-- 모든 구문은 IF NOT EXISTS / IF NOT EXISTS 로 가드되어 재실행 안전합니다.
-- ============================================================

-- ------------------------------------------------------------
-- 006_saves.sql  (T2 — 저장/북마크)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "saves" (
  "user_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "post_id" uuid NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_saves_unique" ON "saves" ("user_id", "post_id");
CREATE INDEX IF NOT EXISTS "idx_saves_user_created_at" ON "saves" ("user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_saves_post_id" ON "saves" ("post_id");


-- ------------------------------------------------------------
-- 007_realtime_publication.sql  (T3 — Realtime 댓글·알림)
-- 이미 publication 에 들어 있으면 에러 → DO 블록으로 가드
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE comments;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;


-- ------------------------------------------------------------
-- 008_polls.sql  (T4 — 투표형 게시글)
-- ------------------------------------------------------------
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "kind" varchar(20) NOT NULL DEFAULT 'text';

CREATE TABLE IF NOT EXISTS "poll_options" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "post_id" uuid NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
  "label" text NOT NULL,
  "order_idx" integer NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_poll_options_post_order" ON "poll_options" ("post_id", "order_idx");
CREATE INDEX IF NOT EXISTS "idx_poll_options_post_id" ON "poll_options" ("post_id");

CREATE TABLE IF NOT EXISTS "poll_votes" (
  "user_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "post_id" uuid NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
  "poll_option_id" uuid NOT NULL REFERENCES "poll_options"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_poll_votes_unique" ON "poll_votes" ("user_id", "post_id");
CREATE INDEX IF NOT EXISTS "idx_poll_votes_post_id" ON "poll_votes" ("post_id");
CREATE INDEX IF NOT EXISTS "idx_poll_votes_option_id" ON "poll_votes" ("poll_option_id");


-- ------------------------------------------------------------
-- 009_tags.sql  (T5 — 해시태그)
-- 008 에서 이미 kind 추가됐지만 단독 실행 안전성 위해 IF NOT EXISTS 중복 보존
-- ------------------------------------------------------------
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "kind" varchar(20) NOT NULL DEFAULT 'text';

CREATE TABLE IF NOT EXISTS "post_tags" (
  "post_id" uuid NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
  "tag" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "post_tags_pk" PRIMARY KEY ("post_id", "tag")
);

CREATE INDEX IF NOT EXISTS "idx_post_tags_tag_created_at" ON "post_tags" ("tag", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_post_tags_post_id" ON "post_tags" ("post_id");


-- ============================================================
-- 확인용 쿼리 (선택 실행)
-- ============================================================
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public' AND table_name IN ('saves','poll_options','poll_votes','post_tags')
--   ORDER BY table_name;
-- SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
-- SELECT column_name, data_type, column_default FROM information_schema.columns
--   WHERE table_name = 'posts' AND column_name = 'kind';
