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
      return { skipped: true, message: `이미 hero.webp가 존재합니다: ${imagesDir}` };
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
  return { skipped: false, message: `${files[0]} → hero.webp 변환 완료 (원본 삭제됨)` };
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
