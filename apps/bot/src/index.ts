import cron from 'node-cron';
import { config } from './config.js';
import { crawlAll } from './crawler.js';
import { generatePosts } from './generator.js';
import { postAll } from './poster.js';

async function runBotCycle(): Promise<void> {
  const startAt = new Date().toISOString();
  console.log(`\n[Bot] ===== 사이클 시작 ${startAt} =====`);

  let articles;
  try {
    articles = await crawlAll();
    console.log(`[Bot] 새 기사: ${articles.length}개`);
  } catch (err) {
    console.error('[Bot] 크롤링 실패:', err);
    return;
  }

  if (articles.length === 0) {
    console.log('[Bot] 새 기사 없음 — 이번 사이클 스킵');
    return;
  }

  const posts = await generatePosts(articles);
  console.log(`[Bot] 생성 완료: ${posts.length}개 게시물`);

  if (posts.length === 0) {
    console.log('[Bot] 생성된 게시물 없음 (LM Studio 오프라인?)');
    return;
  }

  const links = articles.slice(0, posts.length).map((a) => a.link);
  const results = await postAll(posts, links);

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  console.log(`[Bot] 등록 결과 — 성공: ${succeeded}, 실패: ${failed}`);
  console.log(`[Bot] ===== 사이클 종료 =====\n`);
}

async function main() {
  console.log('='.repeat(50));
  console.log('[Bot] Company Community 자동 글쓰기 봇 시작');
  console.log(`[Bot] LM Studio: ${config.LMSTUDIO_BASE_URL}`);
  console.log(`[Bot] 모델: ${config.LMSTUDIO_MODEL}`);
  console.log(`[Bot] 스케줄: ${config.BOT_INTERVAL_MINUTES}분마다`);
  console.log('='.repeat(50));

  await runBotCycle();

  const cronExpr = `*/${config.BOT_INTERVAL_MINUTES} * * * *`;
  cron.schedule(cronExpr, () => {
    runBotCycle().catch((err) => {
      console.error('[Bot] 예상치 못한 오류:', err);
    });
  });

  console.log(`[Bot] 스케줄러 등록 완료 (${cronExpr})`);
  console.log('[Bot] Ctrl+C로 종료\n');
}

main().catch((err) => {
  console.error('[Bot] 치명적 오류:', err);
  process.exit(1);
});
