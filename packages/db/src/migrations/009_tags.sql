ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "kind" varchar(20) NOT NULL DEFAULT 'text';

CREATE TABLE IF NOT EXISTS "post_tags" (
  "post_id" uuid NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
  "tag" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "post_tags_pk" PRIMARY KEY ("post_id", "tag")
);

CREATE INDEX IF NOT EXISTS "idx_post_tags_tag_created_at" ON "post_tags" ("tag", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_post_tags_post_id" ON "post_tags" ("post_id");
