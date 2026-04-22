import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  varchar,
  uniqueIndex,
  index,
  numeric,
  jsonb,
  check,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ============================================
// Profiles (extends Supabase Auth)
// ============================================
export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    displayName: varchar('display_name', { length: 255 }).notNull(),
    role: varchar('role', { length: 50 }).default('member'),
    department: varchar('department', { length: 255 }),
    jobTitle: varchar('job_title', { length: 255 }),
    avatarUrl: text('avatar_url'),
    trustScore: integer('trust_score').default(36),
    isVerified: boolean('is_verified').default(false),
    anonymousSeed: uuid('anonymous_seed').defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => {
    return {
      emailIdx: uniqueIndex('idx_profiles_email').on(table.email),
      createdAtIdx: index('idx_profiles_created_at').on(table.createdAt),
    };
  }
);

// ============================================
// Channels
// ============================================
export const channels = pgTable(
  'channels',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    iconUrl: text('icon_url'),
    isPrivate: boolean('is_private').default(false),
    memberCount: integer('member_count').default(0),
    postCount: integer('post_count').default(0),
    createdBy: uuid('created_by').references(() => profiles.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => {
    return {
      slugIdx: uniqueIndex('idx_channels_slug').on(table.slug),
      createdByIdx: index('idx_channels_created_by').on(table.createdBy),
    };
  }
);

// ============================================
// Channel Requests
// ============================================
export const channelRequests = pgTable(
  'channel_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    description: text('description'),
    reason: text('reason'),
    status: varchar('status', { length: 50 }).default('pending'),
    requestedBy: uuid('requested_by')
      .notNull()
      .references(() => profiles.id),
    reviewedBy: uuid('reviewed_by').references(() => profiles.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    createdChannelId: uuid('created_channel_id').references(() => channels.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => {
    return {
      slugStatusIdx: index('idx_channel_requests_slug_status').on(table.slug, table.status),
      requestedByIdx: index('idx_channel_requests_requested_by').on(table.requestedBy),
      statusIdx: index('idx_channel_requests_status').on(table.status),
    };
  }
);

// ============================================
// Posts
// ============================================
export const posts = pgTable(
  'posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    channelId: uuid('channel_id')
      .notNull()
      .references(() => channels.id),
    authorId: uuid('author_id')
      .notNull()
      .references(() => profiles.id),
    isAnonymous: boolean('is_anonymous').default(false),
    anonAlias: varchar('anon_alias', { length: 100 }),
    title: varchar('title', { length: 300 }),
    content: text('content').notNull(),
    contentType: varchar('content_type', { length: 50 }).default('text'),
    mediaUrls: text('media_urls').array().default([]),
    linkUrl: text('link_url'),
    linkPreview: jsonb('link_preview'),
    upvoteCount: integer('upvote_count').default(0),
    downvoteCount: integer('downvote_count').default(0),
    commentCount: integer('comment_count').default(0),
    viewCount: integer('view_count').default(0),
    flair: varchar('flair', { length: 100 }),
    isPinned: boolean('is_pinned').default(false),
    isDeleted: boolean('is_deleted').default(false),
    hotScore: numeric('hot_score', { precision: 10, scale: 4 }).default('0'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => {
    return {
      channelIdIdx: index('idx_posts_channel_id').on(table.channelId),
      authorIdIdx: index('idx_posts_author_id').on(table.authorId),
      createdAtIdx: index('idx_posts_created_at').on(table.createdAt),
      hotScoreIdx: index('idx_posts_hot_score').on(table.hotScore),
    };
  }
);

// ============================================
// Comments (Hierarchical)
// ============================================
export const comments = pgTable(
  'comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id),
    authorId: uuid('author_id')
      .notNull()
      .references(() => profiles.id),
    parentId: uuid('parent_id').references((): AnyPgColumn => comments.id),
    isAnonymous: boolean('is_anonymous').default(false),
    anonNumber: integer('anon_number'),
    content: text('content').notNull(),
    upvoteCount: integer('upvote_count').default(0),
    isDeleted: boolean('is_deleted').default(false),
    depth: integer('depth').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => {
    return {
      postIdIdx: index('idx_comments_post_id').on(table.postId),
      parentIdIdx: index('idx_comments_parent_id').on(table.parentId),
      authorIdIdx: index('idx_comments_author_id').on(table.authorId),
    };
  }
);

// ============================================
// Votes
// ============================================
export const votes = pgTable(
  'votes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id),
    targetType: varchar('target_type', { length: 50 }).notNull(),
    targetId: uuid('target_id').notNull(),
    voteType: varchar('vote_type', { length: 10 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => {
    return {
      targetIdx: index('idx_votes_target').on(table.targetType, table.targetId),
      userIdx: index('idx_votes_user_id').on(table.userId),
      uniqueVoteIdx: uniqueIndex('idx_votes_unique').on(table.userId, table.targetType, table.targetId),
    };
  }
);

// ============================================
// Reactions
// ============================================
export const reactions = pgTable(
  'reactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id),
    postId: uuid('post_id').references(() => posts.id),
    commentId: uuid('comment_id').references(() => comments.id),
    emoji: varchar('emoji', { length: 50 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => {
    return {
      userIdx: index('idx_reactions_user_id').on(table.userId),
      postIdx: index('idx_reactions_post_id').on(table.postId),
      commentIdx: index('idx_reactions_comment_id').on(table.commentId),
      targetCheck: check(
        'reactions_target_check',
        sql`(
          (${table.postId} IS NOT NULL AND ${table.commentId} IS NULL)
          OR
          (${table.postId} IS NULL AND ${table.commentId} IS NOT NULL)
        )`
      ),
    };
  }
);

// ============================================
// Channel Members
// ============================================
export const channelMembers = pgTable(
  'channel_members',
  {
    channelId: uuid('channel_id')
      .notNull()
      .references(() => channels.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id),
    role: varchar('role', { length: 50 }).default('member'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow(),
  },
  (table) => {
    return {
      pk: uniqueIndex('idx_channel_members_pk').on(table.channelId, table.userId),
    };
  }
);

// ============================================
// Notifications
// ============================================
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    recipientId: uuid('recipient_id')
      .notNull()
      .references(() => profiles.id),
    actorId: uuid('actor_id').references(() => profiles.id),
    postId: uuid('post_id').references(() => posts.id),
    type: varchar('type', { length: 50 }).notNull(),
    targetType: varchar('target_type', { length: 50 }),
    targetId: uuid('target_id'),
    message: text('message').notNull(),
    isRead: boolean('is_read').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => {
    return {
      recipientIdx: index('idx_notifications_recipient').on(table.recipientId, table.isRead),
      actorIdx: index('idx_notifications_actor').on(table.actorId),
    };
  }
);

// ============================================
// Reports
// ============================================
export const reports = pgTable(
  'reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reporterId: uuid('reporter_id')
      .notNull()
      .references(() => profiles.id),
    targetType: varchar('target_type', { length: 50 }).notNull(),
    targetId: uuid('target_id').notNull(),
    reason: varchar('reason', { length: 100 }).notNull(),
    description: text('description'),
    status: varchar('status', { length: 50 }).default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => {
    return {
      reporterIdx: index('idx_reports_reporter_id').on(table.reporterId),
      targetIdx: index('idx_reports_target').on(table.targetType, table.targetId),
      statusIdx: index('idx_reports_status').on(table.status),
    };
  }
);
