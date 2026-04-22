BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- Backfill older databases so the seed can be re-run safely.
-- =========================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'member';

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS post_id UUID REFERENCES posts(id);

ALTER TABLE channels
  ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'board',
  ADD COLUMN IF NOT EXISTS scope VARCHAR(50) DEFAULT 'company',
  ADD COLUMN IF NOT EXISTS posting_mode VARCHAR(50) DEFAULT 'anonymous_allowed',
  ADD COLUMN IF NOT EXISTS membership_type VARCHAR(50) DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS is_listed BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES channels(id),
  ADD COLUMN IF NOT EXISTS default_sort VARCHAR(50) DEFAULT 'latest',
  ADD COLUMN IF NOT EXISTS purpose VARCHAR(100) DEFAULT 'discussion',
  ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

ALTER TABLE channel_requests
  ADD COLUMN IF NOT EXISTS requested_type VARCHAR(50) DEFAULT 'board',
  ADD COLUMN IF NOT EXISTS requested_scope VARCHAR(50) DEFAULT 'company',
  ADD COLUMN IF NOT EXISTS requested_posting_mode VARCHAR(50) DEFAULT 'anonymous_allowed',
  ADD COLUMN IF NOT EXISTS requested_membership_type VARCHAR(50) DEFAULT 'open';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reactions_target_check'
  ) THEN
    ALTER TABLE reactions
      ADD CONSTRAINT reactions_target_check
      CHECK (
        (post_id IS NOT NULL AND comment_id IS NULL)
        OR
        (post_id IS NULL AND comment_id IS NOT NULL)
      );
  END IF;
END $$;

-- =========================================================
-- Clear previous demo data so reruns stay idempotent.
-- We delete by slug and fixed demo IDs to tolerate older runs
-- where channel IDs differed from the current seed.
-- =========================================================
DELETE FROM reactions r
USING comments c, posts p, channels ch
WHERE (
  (r.post_id = p.id AND p.channel_id = ch.id)
  OR
  (r.comment_id = c.id AND c.post_id = p.id AND p.channel_id = ch.id)
)
AND ch.slug IN (
  'notice',
  'free',
  'qna',
  'knowledge',
  'tech',
  'culture',
  'anon-suggest',
  'anon-concern',
  'space-projects',
  'space-study',
  'space-tf',
  'space-hobby'
);

DELETE FROM votes v
USING comments c, posts p, channels ch
WHERE (
  (v.target_type = 'post' AND v.target_id = p.id AND p.channel_id = ch.id)
  OR
  (v.target_type = 'comment' AND v.target_id = c.id AND c.post_id = p.id AND p.channel_id = ch.id)
)
AND ch.slug IN (
  'notice',
  'free',
  'qna',
  'knowledge',
  'tech',
  'culture',
  'anon-suggest',
  'anon-concern',
  'space-projects',
  'space-study',
  'space-tf',
  'space-hobby'
);

DELETE FROM notifications n
USING comments c, posts p, channels ch
WHERE (
  (n.post_id = p.id AND p.channel_id = ch.id)
  OR
  (n.target_type = 'comment' AND n.target_id = c.id AND c.post_id = p.id AND p.channel_id = ch.id)
  OR
  (n.target_type = 'post' AND n.target_id = p.id AND p.channel_id = ch.id)
)
AND ch.slug IN (
  'notice',
  'free',
  'qna',
  'knowledge',
  'tech',
  'culture',
  'anon-suggest',
  'anon-concern',
  'space-projects',
  'space-study',
  'space-tf',
  'space-hobby'
);

DELETE FROM comments cmt
USING posts p, channels ch
WHERE cmt.post_id = p.id
  AND p.channel_id = ch.id
  AND ch.slug IN (
    'notice',
    'free',
    'qna',
    'knowledge',
    'tech',
    'culture',
    'anon-suggest',
    'anon-concern',
    'space-projects',
    'space-study',
    'space-tf',
    'space-hobby'
  );

DELETE FROM posts p
USING channels ch
WHERE p.channel_id = ch.id
  AND ch.slug IN (
    'notice',
    'free',
    'qna',
    'knowledge',
    'tech',
    'culture',
    'anon-suggest',
    'anon-concern',
    'space-projects',
    'space-study',
    'space-tf',
    'space-hobby'
  );

DELETE FROM channel_members cm
USING channels ch
WHERE cm.channel_id = ch.id
  AND ch.slug IN (
    'notice',
    'free',
    'qna',
    'knowledge',
    'tech',
    'culture',
    'anon-suggest',
    'anon-concern',
    'space-projects',
    'space-study',
    'space-tf',
    'space-hobby'
  );

DELETE FROM channel_requests
WHERE slug IN ('data-team', 'running-club', 'private-lab');

DELETE FROM channels
WHERE slug IN (
  'notice',
  'free',
  'qna',
  'knowledge',
  'tech',
  'culture',
  'anon-suggest',
  'anon-concern',
  'space-projects',
  'space-study',
  'space-tf',
  'space-hobby'
);

-- =========================================================
-- Auth users
-- =========================================================
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'mina.admin@company.demo',
    crypt('Demo1234!', gen_salt('bf')),
    NOW() - INTERVAL '30 days',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Mina Admin"}'::jsonb,
    NOW() - INTERVAL '30 days',
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'seo.yun@company.demo',
    crypt('Demo1234!', gen_salt('bf')),
    NOW() - INTERVAL '28 days',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Seo Yun"}'::jsonb,
    NOW() - INTERVAL '28 days',
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-3333-3333-333333333333',
    'authenticated',
    'authenticated',
    'junho.kim@company.demo',
    crypt('Demo1234!', gen_salt('bf')),
    NOW() - INTERVAL '26 days',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Junho Kim"}'::jsonb,
    NOW() - INTERVAL '26 days',
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '44444444-4444-4444-4444-444444444444',
    'authenticated',
    'authenticated',
    'hayeon.lee@company.demo',
    crypt('Demo1234!', gen_salt('bf')),
    NOW() - INTERVAL '24 days',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Hayeon Lee"}'::jsonb,
    NOW() - INTERVAL '24 days',
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '55555555-5555-5555-5555-555555555555',
    'authenticated',
    'authenticated',
    'taeho.park@company.demo',
    crypt('Demo1234!', gen_salt('bf')),
    NOW() - INTERVAL '22 days',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Taeho Park"}'::jsonb,
    NOW() - INTERVAL '22 days',
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '66666666-6666-6666-6666-666666666666',
    'authenticated',
    'authenticated',
    'sujin.choi@company.demo',
    crypt('Demo1234!', gen_salt('bf')),
    NOW() - INTERVAL '20 days',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Sujin Choi"}'::jsonb,
    NOW() - INTERVAL '20 days',
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  raw_app_meta_data = EXCLUDED.raw_app_meta_data,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = EXCLUDED.updated_at;

-- =========================================================
-- Profiles
-- =========================================================
INSERT INTO profiles (
  id,
  email,
  display_name,
  role,
  department,
  job_title,
  avatar_url,
  trust_score,
  is_verified,
  anonymous_seed,
  created_at,
  updated_at
) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'mina.admin@company.demo',
    'Mina Admin',
    'admin',
    'Platform',
    'Engineering Manager',
    'https://i.pravatar.cc/150?img=12',
    98,
    TRUE,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    NOW() - INTERVAL '30 days',
    NOW()
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'seo.yun@company.demo',
    'Seo Yun',
    'moderator',
    'People Ops',
    'Community Manager',
    'https://i.pravatar.cc/150?img=32',
    92,
    TRUE,
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    NOW() - INTERVAL '28 days',
    NOW()
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'junho.kim@company.demo',
    'Junho Kim',
    'member',
    'Backend',
    'Software Engineer',
    'https://i.pravatar.cc/150?img=14',
    84,
    TRUE,
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    NOW() - INTERVAL '26 days',
    NOW()
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'hayeon.lee@company.demo',
    'Hayeon Lee',
    'member',
    'Design',
    'Product Designer',
    'https://i.pravatar.cc/150?img=47',
    76,
    FALSE,
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    NOW() - INTERVAL '24 days',
    NOW()
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    'taeho.park@company.demo',
    'Taeho Park',
    'member',
    'Sales',
    'Account Executive',
    'https://i.pravatar.cc/150?img=21',
    69,
    FALSE,
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    NOW() - INTERVAL '22 days',
    NOW()
  ),
  (
    '66666666-6666-6666-6666-666666666666',
    'sujin.choi@company.demo',
    'Sujin Choi',
    'member',
    'Product',
    'Product Manager',
    'https://i.pravatar.cc/150?img=5',
    88,
    TRUE,
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    NOW() - INTERVAL '20 days',
    NOW()
  )
ON CONFLICT (email) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  role = EXCLUDED.role,
  department = EXCLUDED.department,
  job_title = EXCLUDED.job_title,
  avatar_url = EXCLUDED.avatar_url,
  trust_score = EXCLUDED.trust_score,
  is_verified = EXCLUDED.is_verified,
  anonymous_seed = EXCLUDED.anonymous_seed,
  updated_at = EXCLUDED.updated_at;

-- =========================================================
-- Channels
-- =========================================================
INSERT INTO channels (
  id,
  slug,
  name,
  description,
  icon_url,
  is_private,
  member_count,
  post_count,
  created_by,
  created_at,
  type,
  scope,
  posting_mode,
  membership_type,
  is_listed,
  parent_id,
  default_sort,
  purpose,
  display_order
) VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'notice',
    '공지사항',
    '회사 공지와 운영 안내를 모아두는 공식 게시판',
    NULL,
    FALSE,
    0,
    0,
    '11111111-1111-1111-1111-111111111111',
    NOW() - INTERVAL '30 days',
    'board',
    'company',
    'real_only',
    'open',
    TRUE,
    NULL,
    'pinned',
    'announcement',
    1
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'free',
    '자유게시판',
    '가볍게 이야기하고 소식을 나누는 공간',
    NULL,
    FALSE,
    0,
    0,
    '22222222-2222-2222-2222-222222222222',
    NOW() - INTERVAL '29 days',
    'board',
    'company',
    'anonymous_allowed',
    'open',
    TRUE,
    NULL,
    'hot',
    'social',
    2
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'qna',
    'Q&A / 질문답변',
    '업무, 제도, 복지 관련 궁금한 점을 묻고 답하는 게시판',
    NULL,
    FALSE,
    0,
    0,
    '22222222-2222-2222-2222-222222222222',
    NOW() - INTERVAL '28 days',
    'board',
    'company',
    'anonymous_allowed',
    'open',
    TRUE,
    NULL,
    'latest',
    'discussion',
    3
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'knowledge',
    '지식공유',
    '문서, 팁, 노하우를 모아두는 지식형 게시판',
    NULL,
    FALSE,
    0,
    0,
    '11111111-1111-1111-1111-111111111111',
    NOW() - INTERVAL '27 days',
    'board',
    'company',
    'real_only',
    'open',
    TRUE,
    NULL,
    'hot',
    'knowledge',
    4
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'tech',
    '기술토론',
    '개발, 인프라, 데이터, 기술 전반을 다루는 게시판',
    NULL,
    FALSE,
    0,
    0,
    '11111111-1111-1111-1111-111111111111',
    NOW() - INTERVAL '26 days',
    'board',
    'company',
    'real_only',
    'open',
    TRUE,
    NULL,
    'hot',
    'discussion',
    5
  ),
  (
    'f1111111-1111-1111-1111-111111111111',
    'culture',
    '복지 / 문화',
    '사내 복지, 행사, 취미 이야기를 나누는 게시판',
    NULL,
    FALSE,
    0,
    0,
    '22222222-2222-2222-2222-222222222222',
    NOW() - INTERVAL '25 days',
    'board',
    'company',
    'anonymous_allowed',
    'open',
    TRUE,
    NULL,
    'latest',
    'social',
    6
  ),
  (
    'f2222222-2222-2222-2222-222222222222',
    'anon-suggest',
    '익명 제안',
    '익명으로 제안과 건의사항을 남기는 게시판',
    NULL,
    FALSE,
    0,
    0,
    '11111111-1111-1111-1111-111111111111',
    NOW() - INTERVAL '24 days',
    'board',
    'company',
    'anonymous_only',
    'open',
    TRUE,
    NULL,
    'latest',
    'discussion',
    7
  ),
  (
    'f3333333-3333-3333-3333-333333333333',
    'anon-concern',
    '익명 고민',
    '익명으로 고민과 제안을 나누는 게시판',
    NULL,
    FALSE,
    0,
    0,
    '22222222-2222-2222-2222-222222222222',
    NOW() - INTERVAL '23 days',
    'board',
    'company',
    'anonymous_only',
    'open',
    TRUE,
    NULL,
    'latest',
    'social',
    8
  ),
  (
    'f4444444-4444-4444-4444-444444444444',
    'space-projects',
    '프로젝트 공간',
    '프로젝트별 이슈, 공유, 공지를 위한 공간',
    NULL,
    FALSE,
    0,
    0,
    '11111111-1111-1111-1111-111111111111',
    NOW() - INTERVAL '21 days',
    'space',
    'project',
    'real_only',
    'invite',
    TRUE,
    NULL,
    'latest',
    'discussion',
    20
  ),
  (
    'f5555555-5555-5555-5555-555555555555',
    'space-study',
    '스터디 공간',
    '사내 스터디 그룹을 위한 공간',
    NULL,
    FALSE,
    0,
    0,
    '11111111-1111-1111-1111-111111111111',
    NOW() - INTERVAL '20 days',
    'space',
    'interest',
    'real_only',
    'open',
    TRUE,
    NULL,
    'latest',
    'knowledge',
    21
  ),
  (
    'f6666666-6666-6666-6666-666666666666',
    'space-tf',
    'TF 공간',
    '단기 태스크포스 전용 비공개 공간',
    NULL,
    FALSE,
    0,
    0,
    '11111111-1111-1111-1111-111111111111',
    NOW() - INTERVAL '19 days',
    'space',
    'project',
    'real_only',
    'invite',
    FALSE,
    NULL,
    'latest',
    'discussion',
    22
  ),
  (
    'f7777777-7777-7777-7777-777777777777',
    'space-hobby',
    '취미 모임',
    '운동, 여행, 독서 같은 사내 취미 모임 공간',
    NULL,
    FALSE,
    0,
    0,
    '22222222-2222-2222-2222-222222222222',
    NOW() - INTERVAL '18 days',
    'space',
    'interest',
    'anonymous_allowed',
    'open',
    TRUE,
    NULL,
    'latest',
    'social',
    23
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_url = EXCLUDED.icon_url,
  is_private = EXCLUDED.is_private,
  created_by = EXCLUDED.created_by,
  type = EXCLUDED.type,
  scope = EXCLUDED.scope,
  posting_mode = EXCLUDED.posting_mode,
  membership_type = EXCLUDED.membership_type,
  is_listed = EXCLUDED.is_listed,
  parent_id = EXCLUDED.parent_id,
  default_sort = EXCLUDED.default_sort,
  purpose = EXCLUDED.purpose,
  display_order = EXCLUDED.display_order;

-- =========================================================
-- Channel members
-- =========================================================
INSERT INTO channel_members (channel_id, user_id, role, joined_at) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin', NOW() - INTERVAL '30 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'moderator', NOW() - INTERVAL '29 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'member', NOW() - INTERVAL '28 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'member', NOW() - INTERVAL '28 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 'member', NOW() - INTERVAL '27 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666666', 'member', NOW() - INTERVAL '27 days'),

  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'admin', NOW() - INTERVAL '29 days'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'moderator', NOW() - INTERVAL '29 days'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 'member', NOW() - INTERVAL '28 days'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '66666666-6666-6666-6666-666666666666', 'member', NOW() - INTERVAL '27 days'),

  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'admin', NOW() - INTERVAL '28 days'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'moderator', NOW() - INTERVAL '28 days'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '44444444-4444-4444-4444-444444444444', 'member', NOW() - INTERVAL '27 days'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '66666666-6666-6666-6666-666666666666', 'member', NOW() - INTERVAL '27 days'),

  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'admin', NOW() - INTERVAL '27 days'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'moderator', NOW() - INTERVAL '27 days'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '33333333-3333-3333-3333-333333333333', 'member', NOW() - INTERVAL '26 days'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '44444444-4444-4444-4444-444444444444', 'member', NOW() - INTERVAL '26 days'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '55555555-5555-5555-5555-555555555555', 'member', NOW() - INTERVAL '26 days'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '66666666-6666-6666-6666-666666666666', 'member', NOW() - INTERVAL '26 days'),

  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 'admin', NOW() - INTERVAL '26 days'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '33333333-3333-3333-3333-333333333333', 'member', NOW() - INTERVAL '25 days'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '55555555-5555-5555-5555-555555555555', 'member', NOW() - INTERVAL '25 days'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '66666666-6666-6666-6666-666666666666', 'member', NOW() - INTERVAL '25 days'),

  ('f1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'admin', NOW() - INTERVAL '25 days'),
  ('f1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'member', NOW() - INTERVAL '24 days'),
  ('f1111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'member', NOW() - INTERVAL '24 days'),
  ('f1111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'member', NOW() - INTERVAL '24 days'),
  ('f1111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666666', 'member', NOW() - INTERVAL '24 days'),

  ('f2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'admin', NOW() - INTERVAL '24 days'),
  ('f2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'member', NOW() - INTERVAL '23 days'),
  ('f2222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'member', NOW() - INTERVAL '23 days'),

  ('f3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'admin', NOW() - INTERVAL '23 days'),
  ('f3333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'member', NOW() - INTERVAL '23 days'),
  ('f3333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', 'member', NOW() - INTERVAL '22 days'),
  ('f3333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555', 'member', NOW() - INTERVAL '22 days'),

  ('f4444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'admin', NOW() - INTERVAL '21 days'),
  ('f4444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 'member', NOW() - INTERVAL '20 days'),
  ('f4444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555', 'member', NOW() - INTERVAL '20 days'),

  ('f5555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'admin', NOW() - INTERVAL '20 days'),
  ('f5555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 'member', NOW() - INTERVAL '19 days'),
  ('f5555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', 'member', NOW() - INTERVAL '19 days'),
  ('f5555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444', 'member', NOW() - INTERVAL '19 days'),
  ('f5555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666666', 'member', NOW() - INTERVAL '19 days'),

  ('f6666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'admin', NOW() - INTERVAL '19 days'),
  ('f6666666-6666-6666-6666-666666666666', '33333333-3333-3333-3333-333333333333', 'member', NOW() - INTERVAL '18 days'),
  ('f6666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', 'member', NOW() - INTERVAL '18 days'),

  ('f7777777-7777-7777-7777-777777777777', '22222222-2222-2222-2222-222222222222', 'admin', NOW() - INTERVAL '18 days'),
  ('f7777777-7777-7777-7777-777777777777', '44444444-4444-4444-4444-444444444444', 'member', NOW() - INTERVAL '17 days'),
  ('f7777777-7777-7777-7777-777777777777', '55555555-5555-5555-5555-555555555555', 'member', NOW() - INTERVAL '17 days'),
  ('f7777777-7777-7777-7777-777777777777', '66666666-6666-6666-6666-666666666666', 'member', NOW() - INTERVAL '17 days')
ON CONFLICT (channel_id, user_id) DO UPDATE SET
  role = EXCLUDED.role,
  joined_at = EXCLUDED.joined_at;

-- =========================================================
-- Posts
-- =========================================================
INSERT INTO posts (
  id,
  channel_id,
  author_id,
  is_anonymous,
  anon_alias,
  title,
  content,
  content_type,
  media_urls,
  link_url,
  link_preview,
  upvote_count,
  downvote_count,
  comment_count,
  view_count,
  flair,
  is_pinned,
  is_deleted,
  hot_score,
  created_at,
  updated_at
) VALUES
  (
    'e1111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    FALSE,
    NULL,
    '이번 주 점검 안내',
    '이번 주 금요일 18:00~19:00에 서비스 점검이 예정되어 있습니다. 점검 시간에는 일부 기능이 잠시 제한될 수 있어요.',
    'text',
    ARRAY[]::text[],
    NULL,
    NULL,
    24,
    0,
    0,
    220,
    'notice',
    TRUE,
    FALSE,
    12.5000,
    NOW() - INTERVAL '6 days',
    NOW() - INTERVAL '6 days'
  ),
  (
    'e2222222-2222-2222-2222-222222222222',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '33333333-3333-3333-3333-333333333333',
    FALSE,
    NULL,
    '오늘 점심 메뉴 추천해요',
    '다들 점심 메뉴 뭐 드실 예정인가요? 근처 새로 생긴 식당도 궁금합니다.',
    'text',
    ARRAY[]::text[],
    NULL,
    NULL,
    11,
    1,
    0,
    95,
    'discussion',
    FALSE,
    FALSE,
    9.2000,
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days'
  ),
  (
    'e3333333-3333-3333-3333-333333333333',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '66666666-6666-6666-6666-666666666666',
    FALSE,
    NULL,
    'VPN 접속이 느릴 때 확인할 것',
    '사내 VPN 속도가 느릴 때는 네트워크 상태와 지역 설정을 먼저 확인해보면 도움이 됩니다.',
    'text',
    ARRAY[]::text[],
    NULL,
    NULL,
    8,
    0,
    0,
    64,
    'question',
    FALSE,
    FALSE,
    6.3000,
    NOW() - INTERVAL '4 days',
    NOW() - INTERVAL '4 days'
  ),
  (
    'e4444444-4444-4444-4444-444444444444',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '22222222-2222-2222-2222-222222222222',
    FALSE,
    NULL,
    '복지 제도 개선 제안',
    '이번 분기 복지 제도에 대해 만족도 설문을 받고 있어요. 불편한 점이나 개선 아이디어를 자유롭게 남겨주세요.',
    'text',
    ARRAY[]::text[],
    NULL,
    NULL,
    18,
    0,
    0,
    143,
    'info',
    FALSE,
    FALSE,
    11.0000,
    NOW() - INTERVAL '4 days',
    NOW() - INTERVAL '4 days'
  ),
  (
    'e5555555-5555-5555-5555-555555555555',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '44444444-4444-4444-4444-444444444444',
    TRUE,
    '익명-2',
    '신규 온보딩 자료가 있으면 좋겠어요',
    '신입 입장에서 한 번에 참고할 수 있는 온보딩 페이지가 있으면 훨씬 좋을 것 같아요.',
    'text',
    ARRAY['https://picsum.photos/seed/lunch/1200/800']::text[],
    NULL,
    NULL,
    5,
    0,
    0,
    72,
    'daily',
    FALSE,
    FALSE,
    4.1000,
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days'
  ),
  (
    'e6666666-6666-6666-6666-666666666666',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '55555555-5555-5555-5555-555555555555',
    FALSE,
    NULL,
    '사내 행사 사진 공유',
    '지난 행사 사진을 정리해두었습니다. 참여해주신 분들 모두 감사합니다!',
    'text',
    ARRAY[]::text[],
    NULL,
    NULL,
    13,
    0,
    0,
    88,
    'discussion',
    FALSE,
    FALSE,
    7.8000,
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days'
  ),
  (
    'e7777777-7777-7777-7777-777777777777',
    'f4444444-4444-4444-4444-444444444444',
    '33333333-3333-3333-3333-333333333333',
    FALSE,
    NULL,
    'Q2 OKR 공유합니다',
    '이번 분기 목표를 정리해서 공유합니다. 팀별로 참고해주시면 좋겠습니다.',
    'text',
    ARRAY[]::text[],
    'https://docs.company.demo/okr-q2',
    '{"title":"Q2 OKR 공유","description":"이번 분기 목표를 정리한 문서입니다.","url":"https://docs.company.demo/okr-q2"}'::jsonb,
    6,
    0,
    0,
    41,
    'info',
    FALSE,
    FALSE,
    3.4000,
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
  ),
  (
    'e8888888-8888-8888-8888-888888888888',
    'f7777777-7777-7777-7777-777777777777',
    '11111111-1111-1111-1111-111111111111',
    FALSE,
    NULL,
    '취미 모임 일정 조사',
    '저녁 러닝 모임을 열어보려고 합니다. 참여 가능하신 분들은 댓글 남겨주세요.',
    'text',
    ARRAY[]::text[],
    NULL,
    NULL,
    9,
    0,
    0,
    57,
    'info',
    FALSE,
    FALSE,
    5.9000,
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
  )
ON CONFLICT (id) DO UPDATE SET
  channel_id = EXCLUDED.channel_id,
  author_id = EXCLUDED.author_id,
  is_anonymous = EXCLUDED.is_anonymous,
  anon_alias = EXCLUDED.anon_alias,
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  content_type = EXCLUDED.content_type,
  media_urls = EXCLUDED.media_urls,
  link_url = EXCLUDED.link_url,
  link_preview = EXCLUDED.link_preview,
  upvote_count = EXCLUDED.upvote_count,
  downvote_count = EXCLUDED.downvote_count,
  comment_count = EXCLUDED.comment_count,
  view_count = EXCLUDED.view_count,
  flair = EXCLUDED.flair,
  is_pinned = EXCLUDED.is_pinned,
  is_deleted = EXCLUDED.is_deleted,
  hot_score = EXCLUDED.hot_score,
  updated_at = EXCLUDED.updated_at;

-- =========================================================
-- Comments
-- =========================================================
INSERT INTO comments (
  id,
  post_id,
  author_id,
  parent_id,
  is_anonymous,
  anon_number,
  content,
  upvote_count,
  is_deleted,
  depth,
  created_at
) VALUES
  (
    'c1111111-1111-1111-1111-111111111111',
    'e1111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    NULL,
    FALSE,
    NULL,
    '안내 감사합니다. 점검 전에 미리 작업 마무리하겠습니다.',
    4,
    FALSE,
    0,
    NOW() - INTERVAL '5 days 23 hours'
  ),
  (
    'c2222222-2222-2222-2222-222222222222',
    'e1111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'c1111111-1111-1111-1111-111111111111',
    FALSE,
    NULL,
    '감사합니다. 점검 중 공지사항은 별도 채널에 바로 올릴게요.',
    3,
    FALSE,
    1,
    NOW() - INTERVAL '5 days 22 hours'
  ),
  (
    'c3333333-3333-3333-3333-333333333333',
    'e2222222-2222-2222-2222-222222222222',
    '66666666-6666-6666-6666-666666666666',
    NULL,
    FALSE,
    NULL,
    '저는 오늘 국밥 생각 중인데, 같이 가실 분 있나요?',
    5,
    FALSE,
    0,
    NOW() - INTERVAL '4 days 20 hours'
  ),
  (
    'c4444444-4444-4444-4444-444444444444',
    'e2222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    'c3333333-3333-3333-3333-333333333333',
    FALSE,
    NULL,
    '저도 좋아요. 점심시간 전에 메뉴 정해두죠.',
    2,
    FALSE,
    1,
    NOW() - INTERVAL '4 days 18 hours'
  ),
  (
    'c5555555-5555-5555-5555-555555555555',
    'e5555555-5555-5555-5555-555555555555',
    '55555555-5555-5555-5555-555555555555',
    NULL,
    TRUE,
    1,
    '온보딩 자료 있으면 정말 도움될 것 같아요. 새로 입사한 분들도 바로 찾기 쉬울 듯합니다.',
    1,
    FALSE,
    0,
    NOW() - INTERVAL '2 days 12 hours'
  ),
  (
    'c6666666-6666-6666-6666-666666666666',
    'e6666666-6666-6666-6666-666666666666',
    '44444444-4444-4444-4444-444444444444',
    NULL,
    FALSE,
    NULL,
    '사진 공유 감사합니다. 다음 행사도 기대돼요!',
    2,
    FALSE,
    0,
    NOW() - INTERVAL '2 days 8 hours'
  ),
  (
    'c7777777-7777-7777-7777-777777777777',
    'e7777777-7777-7777-7777-777777777777',
    '22222222-2222-2222-2222-222222222222',
    NULL,
    FALSE,
    NULL,
    '문서 확인했습니다. 목표가 명확해서 좋네요.',
    4,
    FALSE,
    0,
    NOW() - INTERVAL '1 day 18 hours'
  ),
  (
    'c8888888-8888-8888-8888-888888888888',
    'e8888888-8888-8888-8888-888888888888',
    '66666666-6666-6666-6666-666666666666',
    NULL,
    FALSE,
    NULL,
    '러닝 모임 참여합니다. 시간만 맞으면 꼭 갈게요.',
    2,
    FALSE,
    0,
    NOW() - INTERVAL '12 hours'
  )
ON CONFLICT (id) DO UPDATE SET
  post_id = EXCLUDED.post_id,
  author_id = EXCLUDED.author_id,
  parent_id = EXCLUDED.parent_id,
  is_anonymous = EXCLUDED.is_anonymous,
  anon_number = EXCLUDED.anon_number,
  content = EXCLUDED.content,
  upvote_count = EXCLUDED.upvote_count,
  is_deleted = EXCLUDED.is_deleted,
  depth = EXCLUDED.depth,
  created_at = EXCLUDED.created_at;

-- =========================================================
-- Votes
-- =========================================================
INSERT INTO votes (id, user_id, target_type, target_id, vote_type, created_at) VALUES
  ('b1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'post', 'e1111111-1111-1111-1111-111111111111', 'up', NOW() - INTERVAL '5 days'),
  ('b2222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'post', 'e2222222-2222-2222-2222-222222222222', 'up', NOW() - INTERVAL '4 days'),
  ('b3333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', 'comment', 'c3333333-3333-3333-3333-333333333333', 'up', NOW() - INTERVAL '4 days'),
  ('b4444444-4444-4444-4444-444444444444', '66666666-6666-6666-6666-666666666666', 'post', 'e8888888-8888-8888-8888-888888888888', 'up', NOW() - INTERVAL '12 hours')
ON CONFLICT (id) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  target_type = EXCLUDED.target_type,
  target_id = EXCLUDED.target_id,
  vote_type = EXCLUDED.vote_type,
  created_at = EXCLUDED.created_at;

-- =========================================================
-- Reactions
-- =========================================================
INSERT INTO reactions (id, user_id, post_id, comment_id, emoji, created_at) VALUES
  ('c1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'e1111111-1111-1111-1111-111111111111', NULL, '👍', NOW() - INTERVAL '5 days'),
  ('c2222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'e2222222-2222-2222-2222-222222222222', NULL, '❤️', NOW() - INTERVAL '4 days'),
  ('c3333333-3333-3333-3333-333333333334', '44444444-4444-4444-4444-444444444444', NULL, 'c3333333-3333-3333-3333-333333333333', '👏', NOW() - INTERVAL '4 days'),
  ('c4444444-4444-4444-4444-444444444445', '66666666-6666-6666-6666-666666666666', 'e8888888-8888-8888-8888-888888888888', NULL, '🔥', NOW() - INTERVAL '12 hours')
ON CONFLICT (id) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  post_id = EXCLUDED.post_id,
  comment_id = EXCLUDED.comment_id,
  emoji = EXCLUDED.emoji,
  created_at = EXCLUDED.created_at;

-- =========================================================
-- Notifications
-- =========================================================
INSERT INTO notifications (
  id,
  recipient_id,
  actor_id,
  post_id,
  type,
  target_type,
  target_id,
  message,
  is_read,
  created_at
) VALUES
  (
    'a1111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'e1111111-1111-1111-1111-111111111111',
    'comment',
    'post',
    'e1111111-1111-1111-1111-111111111111',
    '새 댓글이 달렸습니다.',
    FALSE,
    NOW() - INTERVAL '5 days 23 hours'
  ),
  (
    'a2222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'e1111111-1111-1111-1111-111111111111',
    'reply',
    'comment',
    'c1111111-1111-1111-1111-111111111111',
    '내 댓글에 답글이 달렸습니다.',
    FALSE,
    NOW() - INTERVAL '5 days 22 hours'
  ),
  (
    'a3333333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    '66666666-6666-6666-6666-666666666666',
    'e2222222-2222-2222-2222-222222222222',
    'comment',
    'post',
    'e2222222-2222-2222-2222-222222222222',
    '새 댓글이 달렸습니다.',
    FALSE,
    NOW() - INTERVAL '4 days 20 hours'
  ),
  (
    'a4444444-4444-4444-4444-444444444444',
    '66666666-6666-6666-6666-666666666666',
    '33333333-3333-3333-3333-333333333333',
    'e2222222-2222-2222-2222-222222222222',
    'reply',
    'comment',
    'c3333333-3333-3333-3333-333333333333',
    '내 댓글에 답글이 달렸습니다.',
    FALSE,
    NOW() - INTERVAL '4 days 18 hours'
  )
ON CONFLICT (id) DO UPDATE SET
  recipient_id = EXCLUDED.recipient_id,
  actor_id = EXCLUDED.actor_id,
  post_id = EXCLUDED.post_id,
  type = EXCLUDED.type,
  target_type = EXCLUDED.target_type,
  target_id = EXCLUDED.target_id,
  message = EXCLUDED.message,
  is_read = EXCLUDED.is_read,
  created_at = EXCLUDED.created_at;

-- =========================================================
-- Channel requests
-- =========================================================
INSERT INTO channel_requests (
  id,
  name,
  slug,
  description,
  reason,
  status,
  requested_by,
  reviewed_by,
  reviewed_at,
  created_channel_id,
  created_at,
  requested_type,
  requested_scope,
  requested_posting_mode,
  requested_membership_type
) VALUES
  (
    'd1111111-1111-1111-1111-111111111111',
    '데이터팀 게시판',
    'data-team',
    '데이터팀 전용 질문 및 공유 공간',
    '팀 별도 게시판이 있으면 협업이 편해집니다.',
    'pending',
    '44444444-4444-4444-4444-444444444444',
    NULL,
    NULL,
    NULL,
    NOW() - INTERVAL '1 day',
    'board',
    'department',
    'real_only',
    'request'
  ),
  (
    'd2222222-2222-2222-2222-222222222222',
    '러닝 모임 공간',
    'running-club',
    '사내 러닝 모임을 위한 소규모 공간',
    '취미 기반 모임을 새로 열고 싶습니다.',
    'approved',
    '55555555-5555-5555-5555-555555555555',
    '11111111-1111-1111-1111-111111111111',
    NOW() - INTERVAL '2 hours',
    'f7777777-7777-7777-7777-777777777777',
    NOW() - INTERVAL '3 days',
    'space',
    'interest',
    'anonymous_allowed',
    'open'
  ),
  (
    'd3333333-3333-3333-3333-333333333333',
    '비공개 연구실',
    'private-lab',
    '실험적인 기능을 테스트하는 비공개 공간',
    '민감한 실험 데이터를 보호하고 싶습니다.',
    'rejected',
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    NOW() - INTERVAL '12 hours',
    NULL,
    NOW() - INTERVAL '4 days',
    'space',
    'project',
    'real_only',
    'invite'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  reason = EXCLUDED.reason,
  status = EXCLUDED.status,
  requested_by = EXCLUDED.requested_by,
  reviewed_by = EXCLUDED.reviewed_by,
  reviewed_at = EXCLUDED.reviewed_at,
  created_channel_id = EXCLUDED.created_channel_id,
  created_at = EXCLUDED.created_at,
  requested_type = EXCLUDED.requested_type,
  requested_scope = EXCLUDED.requested_scope,
  requested_posting_mode = EXCLUDED.requested_posting_mode,
  requested_membership_type = EXCLUDED.requested_membership_type;

-- =========================================================
-- Recalculate counters
-- =========================================================
UPDATE channels c
SET member_count = COALESCE(m.member_count, 0)
FROM (
  SELECT channel_id, COUNT(*)::int AS member_count
  FROM channel_members
  GROUP BY channel_id
) m
WHERE c.id = m.channel_id;

UPDATE channels c
SET member_count = 0
WHERE NOT EXISTS (
  SELECT 1
  FROM channel_members cm
  WHERE cm.channel_id = c.id
);

UPDATE channels c
SET post_count = COALESCE(p.post_count, 0)
FROM (
  SELECT channel_id, COUNT(*)::int AS post_count
  FROM posts
  WHERE NOT is_deleted
  GROUP BY channel_id
) p
WHERE c.id = p.channel_id;

UPDATE channels c
SET post_count = 0
WHERE NOT EXISTS (
  SELECT 1
  FROM posts p
  WHERE p.channel_id = c.id AND NOT p.is_deleted
);

UPDATE posts p
SET comment_count = COALESCE(cmt.comment_count, 0)
FROM (
  SELECT post_id, COUNT(*)::int AS comment_count
  FROM comments
  WHERE NOT is_deleted
  GROUP BY post_id
) cmt
WHERE p.id = cmt.post_id;

UPDATE posts p
SET comment_count = 0
WHERE NOT EXISTS (
  SELECT 1
  FROM comments c
  WHERE c.post_id = p.id AND NOT c.is_deleted
);

COMMIT;
