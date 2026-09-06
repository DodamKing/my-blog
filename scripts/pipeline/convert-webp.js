/**
 * 이미지 → hero.webp 변환 유틸
 *
 * 사용법:
 *   npm run webp -- <슬러그>
 *   npm run webp -- bready-lip-balm-review
 *
 *   슬러그의 images/ 폴더에서 이미지(png/jpg/jpeg)를 찾아
 *   hero.webp로 변환하고 원본을 삭제한다.
 *   이미지가 0개 또는 2개 이상이면 작업을 취소한다.
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

/**
 * <슬러그>/images/ 안의 이미지 1개를 hero.webp로 변환한다 (원본 삭제).
 * CLI뿐 아니라 다른 스크립트(generate-hero-image.js 등)에서도 import해서 쓸 수 있게 함수로 분리.
 * 실패 시 에러를 throw한다 (process.exit는 호출부 책임).
 */
/**
 * index.mdx frontmatter 에 heroImage 줄을 넣는다.
 *
 * npm run new 가 heroImage 줄을 미리 쓰면 실물 파일이 없는 동안 빌드가 죽는다
 * (Astro image() 가 경로를 해석하려다 ImageNotFound). 그래서 실물이 생긴 뒤 여기서 붙인다.
 * content.config.ts 는 image().optional() 이고 HeroImage/BlogCard/BlogPost 가 전부
 * 부재를 처리하므로, 줄이 없는 동안에도 빌드는 통과한다.
 *
 * 이미 heroImage 가 있으면 아무것도 하지 않는다 — 잘 나가는 글에 재실행해도
 * 본문 파일이 바뀌지 않아야 한다 (재색인 사고 방지).
 */
function ensureHeroImageField(slug) {
  const mdxPath = path.join('src', 'content', 'blog', slug, 'index.mdx');
  if (!fs.existsSync(mdxPath)) return { added: false, reason: 'index.mdx 없음' };

  const raw = fs.readFileSync(mdxPath, 'utf8');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return { added: false, reason: 'frontmatter 파싱 실패' };
  if (/^heroImage:/m.test(m[1])) return { added: false, reason: '이미 있음' };

  const fm = m[1];
  const line = "heroImage: './images/hero.webp'";
  // pubDate 바로 뒤에 넣어 기존 발행글의 필드 순서와 맞춘다
  const updated = /^pubDate:.*$/m.test(fm)
    ? fm.replace(/^(pubDate:.*)$/m, '$1\n' + line)
    : fm + '\n' + line;

  fs.writeFileSync(mdxPath, raw.replace(fm, updated));
  return { added: true };
}


export async function convertHeroImage(slug) {
  const imagesDir = path.join('src', 'content', 'blog', slug, 'images');

  if (!fs.existsSync(imagesDir)) {
    throw new Error(`폴더가 없습니다: ${imagesDir}`);
  }

  const imageExts = ['.png', '.jpg', '.jpeg'];
  const files = fs.readdirSync(imagesDir).filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return imageExts.includes(ext);
  });

  if (files.length === 0) {
    const hasHero = fs.existsSync(path.join(imagesDir, 'hero.webp'));
    if (hasHero) {
      const fm0 = ensureHeroImageField(slug);
      const suffix0 = fm0.added ? ' · index.mdx 에 heroImage 추가' : '';
      return { skipped: true, message: `이미 hero.webp가 존재합니다: ${imagesDir}${suffix0}` };
    }
    throw new Error(`이미지가 없습니다. 이미지를 먼저 넣어주세요: ${imagesDir}`);
  }

  if (files.length > 1) {
    throw new Error(
      `이미지가 ${files.length}개 있습니다. 1개만 남기고 다시 실행하세요: ${files.join(', ')}`
    );
  }

  const inputPath = path.join(imagesDir, files[0]);
  const outputPath = path.join(imagesDir, 'hero.webp');

  await sharp(inputPath)
    .resize(1200, null, { withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(outputPath);

  fs.unlinkSync(inputPath);
  const fm = ensureHeroImageField(slug);
  const suffix = fm.added ? ' · index.mdx 에 heroImage 추가' : '';
  return { skipped: false, message: `${files[0]} → hero.webp 변환 완료 (원본 삭제됨)${suffix}` };
}

// CLI로 직접 실행됐을 때만 동작 (다른 스크립트가 import할 땐 실행 안 됨)
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const slug = process.argv[2];

  if (!slug) {
    console.error('사용법: npm run webp -- <슬러그>');
    console.error('예시: npm run webp -- bready-lip-balm-review');
    process.exit(1);
  }

  try {
    const result = await convertHeroImage(slug);
    console.log(`✅ ${result.message}`);
  } catch (err) {
    console.error(`❌ 변환 실패: ${err.message}`);
    process.exit(1);
  }
}
