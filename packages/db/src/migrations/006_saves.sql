CREATE TABLE IF NOT EXISTS "saves" (
  "user_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "post_id" uuid NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_saves_unique" ON "saves" ("user_id", "post_id");
CREATE INDEX IF NOT EXISTS "idx_saves_user_created_at" ON "saves" ("user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_saves_post_id" ON "saves" ("post_id");
