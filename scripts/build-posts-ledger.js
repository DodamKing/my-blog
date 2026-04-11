/**
 * ========================================
 * 글 목록 자동 생성 스크립트
 * ========================================
 *
 * src/content/blog/ 의 모든 글 frontmatter 를 스캔해
 * docs/posts-ledger.md 를 생성한다.
 *
 * 📝 사용법:
 *   npm run ledger                (CLI)
 *   import { buildLedger } ...    (create/delete 스크립트에서 호출)
 *
 * 호출 타이밍:
 *   - npm run new 마지막 단계 (새 글 추가 후)
 *   - npm run delete 마지막 단계 (글 삭제 후)
 *   - 필요 시 수동으로 npm run ledger
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLOG_DIR = path.join(__dirname, '..', 'src', 'content', 'blog');
const OUTPUT = path.join(__dirname, '..', 'docs', 'posts-ledger.md');

const CATEGORY_ORDER = ['health', 'tech', 'finance', 'other'];

function scanPosts() {
  const entries = fs.readdirSync(BLOG_DIR, { withFileTypes: true });
  const posts = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const mdxPath = path.join(BLOG_DIR, entry.name, 'index.mdx');
    if (!fs.existsSync(mdxPath)) continue;

    try {
      const raw = fs.readFileSync(mdxPath, 'utf-8');
      const { data } = matter(raw);
      const pubDate = data.pubDate
        ? new Date(data.pubDate).toISOString().split('T')[0]
        : '';
      posts.push({
        slug: entry.name,
        title: data.title || entry.name,
        description: data.description || '',
        category: data.category || 'other',
        pubDate,
        updatedDate: data.updatedDate
          ? new Date(data.updatedDate).toISOString().split('T')[0]
          : '',
      });
    } catch (err) {
      console.warn(`⚠️  frontmatter 파싱 실패: ${entry.name} (${err.message})`);
    }
  }

  return posts;
}

function groupByCategory(posts) {
  const groups = {};
  for (const post of posts) {
    const cat = CATEGORY_ORDER.includes(post.category) ? post.category : 'other';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(post);
  }
  for (const cat of Object.keys(groups)) {
    groups[cat].sort((a, b) => (b.pubDate || '').localeCompare(a.pubDate || ''));
  }
  return groups;
}

function formatLedger(posts) {
  const today = new Date().toISOString().split('T')[0];
  const groups = groupByCategory(posts);
  const total = posts.length;

  let out = `# 글 목록\n\n`;
  out += `**자동 생성**: ${today} (\`src/content/blog/*/index.mdx\` frontmatter 기반)\n`;
  out += `**총 편수**: ${total}편\n\n`;
  out += `> ⚠️ 이 파일은 \`npm run new\` · \`npm run delete\` · \`npm run ledger\` 실행 시 자동 생성됩니다. 직접 수정하지 마세요.\n\n`;
  out += `> 새 키워드로 글 기획 시 여기서 **의미 중복**을 먼저 확인할 것. 키워드 전략 에이전트가 Step 1 에서 이 파일을 읽습니다.\n\n`;

  for (const cat of CATEGORY_ORDER) {
    const list = groups[cat] || [];
    if (list.length === 0) continue;
    out += `## ${cat} (${list.length}편)\n\n`;
    for (const p of list) {
      const dateTag = p.updatedDate && p.updatedDate !== p.pubDate
        ? `${p.pubDate} → ${p.updatedDate}`
        : p.pubDate;
      out += `- \`${p.slug}\` (${dateTag}) — **${p.title}** — ${p.description}\n`;
    }
    out += `\n`;
  }

  return out;
}

export function buildLedger({ silent = false } = {}) {
  const posts = scanPosts();
  const content = formatLedger(posts);

  const dir = path.dirname(OUTPUT);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(OUTPUT, content, 'utf-8');

  if (!silent) {
    console.log(`✅ 글 목록 갱신: ${posts.length}편 → docs/posts-ledger.md`);
  }
  return posts.length;
}

// CLI 실행
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildLedger();
}
