/**
 * Gemini(Nano Banana 2 Lite / gemini-3.1-flash-lite-image)로 히어로 이미지를 생성해
 * 곧바로 hero.webp로 변환한다.
 *
 * 사용법:
 *   npm run hero -- <슬러그> "<이미지 프롬프트>"
 *   npm run hero -- hanyena-apptech "스마트폰 화면에 미션 체크리스트가 떠 있는 플랫 일러스트, 가로형 16:9"
 *
 * 환경변수 (.env):
 *   GEMINI_API_KEY=...
 *
 * 동작:
 *   1. Gemini Interactions API로 이미지 생성
 *   2. <슬러그>/images/hero-source.png 로 저장
 *   3. convert-webp.js의 로직을 재사용해 hero.webp로 변환 (원본 삭제)
 */

import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { convertHeroImage } from './convert-webp.js';

const MODEL = 'gemini-3.1-flash-lite-image';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('❌ .env에 GEMINI_API_KEY를 설정하세요.');
  process.exit(1);
}

const [slug, prompt] = process.argv.slice(2);
if (!slug || !prompt) {
  console.error('사용법: npm run hero -- <슬러그> "<이미지 프롬프트>"');
  process.exit(1);
}

const imagesDir = path.join('src', 'content', 'blog', slug, 'images');
if (!fs.existsSync(imagesDir)) {
  console.error(`❌ 폴더가 없습니다: ${imagesDir} (npm run new 로 글을 먼저 스캐폴드하세요)`);
  process.exit(1);
}

const existing = fs
  .readdirSync(imagesDir)
  .filter((f) => ['.png', '.jpg', '.jpeg'].includes(path.extname(f).toLowerCase()));
if (existing.length > 0) {
  console.error(`❌ ${imagesDir} 안에 이미 이미지가 있습니다: ${existing.join(', ')}`);
  console.error('   기존 이미지를 지우거나 확인 후 다시 실행하세요.');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

console.log(`🎨 Gemini(${MODEL})로 이미지 생성 중...`);

let interaction;
try {
  interaction = await ai.interactions.create({
    model: MODEL,
    input: prompt,
  });
} catch (err) {
  console.error(`❌ Gemini API 호출 실패: ${err.message}`);
  process.exit(1);
}

const generatedImage = interaction.output_image;
if (!generatedImage?.data) {
  console.error('❌ 응답에 이미지 데이터가 없습니다. 프롬프트를 확인하세요.');
  console.error(JSON.stringify(interaction, null, 2).slice(0, 1000));
  process.exit(1);
}

const sourcePath = path.join(imagesDir, 'hero-source.png');
fs.writeFileSync(sourcePath, Buffer.from(generatedImage.data, 'base64'));
console.log(`✅ 이미지 생성 완료: ${sourcePath}`);

try {
  const result = await convertHeroImage(slug);
  console.log(`✅ ${result.message}`);
} catch (err) {
  console.error(`❌ webp 변환 실패: ${err.message}`);
  process.exit(1);
}
