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

const slug = process.argv[2];

if (!slug) {
  console.error('사용법: npm run webp -- <슬러그>');
  console.error('예시: npm run webp -- bready-lip-balm-review');
  process.exit(1);
}

const imagesDir = path.join('src', 'content', 'blog', slug, 'images');

if (!fs.existsSync(imagesDir)) {
  console.error(`❌ 폴더가 없습니다: ${imagesDir}`);
  process.exit(1);
}

const imageExts = ['.png', '.jpg', '.jpeg'];
const files = fs.readdirSync(imagesDir).filter((f) => {
  const ext = path.extname(f).toLowerCase();
  return imageExts.includes(ext);
});

if (files.length === 0) {
  const hasHero = fs.existsSync(path.join(imagesDir, 'hero.webp'));
  if (hasHero) {
    console.log(`✅ 이미 hero.webp가 존재합니다: ${imagesDir}`);
  } else {
    console.error(`❌ 이미지가 없습니다. 이미지를 먼저 넣어주세요: ${imagesDir}`);
  }
  process.exit(hasHero ? 0 : 1);
}

if (files.length > 1) {
  console.error(`❌ 이미지가 ${files.length}개 있습니다. 1개만 남기고 다시 실행하세요:`);
  files.forEach((f) => console.error(`   - ${f}`));
  process.exit(1);
}

const inputPath = path.join(imagesDir, files[0]);
const outputPath = path.join(imagesDir, 'hero.webp');

try {
  await sharp(inputPath)
    .resize(1200, null, { withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(outputPath);

  fs.unlinkSync(inputPath);
  console.log(`✅ ${files[0]} → hero.webp 변환 완료 (원본 삭제됨)`);
} catch (err) {
  console.error(`❌ 변환 실패: ${err.message}`);
  process.exit(1);
}
