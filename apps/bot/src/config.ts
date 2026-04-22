import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const envSchema = z.object({
  LMSTUDIO_BASE_URL: z.string().url().default('http://127.0.0.1:1218/v1'),
  LMSTUDIO_MODEL: z.string().default('google/gemma-4-e4b'),
  COMMUNITY_API_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
  BOT_EMAIL: z.string().email(),
  BOT_PASSWORD: z.string().min(8),
  BOT_INTERVAL_MINUTES: z.coerce.number().int().min(1).default(10),
  CHANNEL_GENERAL: z.string().uuid(),
  CHANNEL_ENGINEERING: z.string().uuid(),
  CHANNEL_RANDOM: z.string().uuid(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('[Config] 환경변수 오류:', parsed.error.flatten());
  process.exit(1);
}

export const config = parsed.data;

export const RSS_SOURCES = [
  {
    url: 'https://www.yonhapnewstv.co.kr/browse/feed/',
    channelId: config.CHANNEL_GENERAL,
    category: 'general',
    label: '연합뉴스',
  },
  {
    url: 'https://hnrss.org/frontpage',
    channelId: config.CHANNEL_ENGINEERING,
    category: 'tech',
    label: 'Hacker News',
  },
  {
    url: 'https://feeds.feedburner.com/ZDNetKorea',
    channelId: config.CHANNEL_ENGINEERING,
    category: 'tech',
    label: 'ZDNet Korea',
  },
] as const;
