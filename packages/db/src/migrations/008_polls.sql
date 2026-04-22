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
