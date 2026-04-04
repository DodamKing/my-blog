/**
 * 이미지 → webp 변환 유틸
 *
 * 사용법:
 *   node scripts/pipeline/convert-webp.js input.png output.webp
 *   node scripts/pipeline/convert-webp.js input.png  (→ input.webp로 저장)
 */

import sharp from 'sharp';
import path from 'path';

const [inputPath, outputPath] = process.argv.slice(2);

if (!inputPath) {
  console.error('사용법: node scripts/pipeline/convert-webp.js <입력파일> [출력파일]');
  console.error('예시: node scripts/pipeline/convert-webp.js hero.png hero.webp');
  process.exit(1);
}

const output = outputPath || inputPath.replace(/\.[^.]+$/, '.webp');

try {
  await sharp(inputPath)
    .resize(1200, null, { withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(output);

  console.log(`✅ 변환 완료: ${output}`);
} catch (err) {
  console.error(`❌ 변환 실패: ${err.message}`);
  process.exit(1);
}
