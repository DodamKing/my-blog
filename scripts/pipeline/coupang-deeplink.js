/**
 * 쿠팡파트너스 딥링크 자동 생성
 *
 * 사용법:
 *   npm run coupang -- <슬러그>           결과 표만 출력 (기본)
 *   npm run coupang -- <슬러그> --apply   브랜드 매칭된 것만 자동 교체
 *
 * 환경변수 (.env):
 *   COUPANG_ACCESS_KEY=...
 *   COUPANG_SECRET_KEY=...
 */

import 'dotenv/config';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ACCESS_KEY = process.env.COUPANG_ACCESS_KEY;
const SECRET_KEY = process.env.COUPANG_SECRET_KEY;
const DOMAIN = 'https://api-gateway.coupang.com';

if (!ACCESS_KEY || !SECRET_KEY) {
  console.error('❌ .env에 COUPANG_ACCESS_KEY와 COUPANG_SECRET_KEY를 설정하세요.');
  process.exit(1);
}

const args = process.argv.slice(2);
const applyMode = args.includes('--apply');
const slug = args.find((a) => !a.startsWith('--'));
if (!slug) {
  console.error('사용법: npm run coupang -- <슬러그> [--apply]');
  process.exit(1);
}

const mdxPath = path.join('src', 'content', 'blog', slug, 'index.mdx');
if (!fs.existsSync(mdxPath)) {
  console.error(`❌ 파일이 없습니다: ${mdxPath}`);
  process.exit(1);
}

// --- HMAC 서명 생성 ---
function generateAuth(method, urlPath, query = '') {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const datetime =
    pad(now.getUTCFullYear() % 100) +
    pad(now.getUTCMonth() + 1) +
    pad(now.getUTCDate()) + 'T' +
    pad(now.getUTCHours()) +
    pad(now.getUTCMinutes()) +
    pad(now.getUTCSeconds()) + 'Z';

  const message = datetime + method + urlPath + query;
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(message)
    .digest('hex');

  return `CEA algorithm=HmacSHA256, access-key=${ACCESS_KEY}, signed-date=${datetime}, signature=${signature}`;
}

// --- 상품 검색 ---
async function searchProducts(keyword) {
  const method = 'GET';
  const urlPath = '/v2/providers/affiliate_open_api/apis/openapi/products/search';
  const query = `keyword=${encodeURIComponent(keyword)}&limit=5`;
  const authorization = generateAuth(method, urlPath, query);

  const res = await fetch(`${DOMAIN}${urlPath}?${query}`, {
    method,
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json',
    },
  });

  return res.json();
}

// --- 딥링크 생성 ---
async function createDeeplink(productUrl) {
  const method = 'POST';
  const urlPath = '/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink';
  const authorization = generateAuth(method, urlPath, '');

  const res = await fetch(`${DOMAIN}${urlPath}`, {
    method,
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      coupangUrls: [productUrl],
      subId: slug,
    }),
  });

  return res.json();
}

// --- MDX 파싱 ---
function parseCoupangLinks(content) {
  const regex = /<CoupangLink\s[^>]*title="([^"]+)"[^>]*url="([^"]*)"[^>]*\/>/g;
  const links = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    const url = match[2].trim();
    if (url !== '') continue; // 빈 URL만 대상
    links.push({
      fullMatch: match[0],
      title: match[1],
    });
  }
  return links;
}

// --- 메인 ---
async function main() {
  let content = fs.readFileSync(mdxPath, 'utf-8');
  const links = parseCoupangLinks(content);

  if (links.length === 0) {
    console.log('✅ 처리할 CoupangLink가 없습니다.');
    process.exit(0);
  }

  console.log(applyMode ? '🔧 APPLY 모드 (브랜드 매칭 시 자동 교체)\n' : '📋 조회 모드 (결과만 출력)\n');
  console.log(`📦 ${links.length}개 상품 링크 처리 중...\n`);

  const results = [];

  for (const link of links) {
    const searchKeyword = link.title
      .replace(/\d+(\.\d+)?\s*(g|ml|mm|kg|L)\b/gi, '')
      .replace(/\(.*?\)/g, '')
      .replace(/\b\d{1,2}호\b/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    // title에서 브랜드명 추출 (첫 단어)
    const brand = link.title.split(' ')[0];

    // 검색 실패 시 키워드를 줄여가며 재시도
    const tryKeywords = [searchKeyword];
    const words = searchKeyword.split(' ');
    if (words.length > 3) tryKeywords.push(words.slice(0, 3).join(' '));
    if (words.length > 2) tryKeywords.push(words.slice(0, 2).join(' '));

    try {
      let product = null;
      let usedKeyword = '';

      for (const kw of tryKeywords) {
        const searchResult = await searchProducts(kw);
        const products = searchResult?.data?.productData;
        if (products && products.length > 0) {
          // 브랜드 매칭되는 상품 우선, 없으면 첫 번째 결과
          const matched = products.find((p) => p.productName.includes(brand));
          product = matched || products[0];
          usedKeyword = kw;
          break;
        }
        await new Promise((r) => setTimeout(r, 200));
      }

      if (!product) {
        results.push({ title: link.title, status: '❌ 검색 결과 없음', url: null, brandMatch: false });
        continue;
      }

      const brandMatch = product.productName.includes(brand);

      // productId로 상품 URL 구성 후 딥링크 생성
      const productPageUrl = `https://www.coupang.com/vp/products/${product.productId}`;
      const deeplinkResult = await createDeeplink(productPageUrl);
      const deeplink = deeplinkResult?.data?.[0]?.shortenUrl;

      if (!deeplink) {
        results.push({ title: link.title, status: '❌ 딥링크 생성 실패', url: null, brandMatch: false });
        continue;
      }

      // apply 모드 + 브랜드 매칭일 때만 교체
      if (applyMode && brandMatch) {
        const newTag = link.fullMatch.replace('url=""', `url="${deeplink}"`);
        content = content.replace(link.fullMatch, newTag);
      }

      results.push({
        title: link.title,
        status: brandMatch ? '✅' : '⚠️',
        matchedProduct: product.productName,
        price: product.productPrice?.toLocaleString() + '원',
        rocket: product.isRocket ? '🚀' : '',
        url: deeplink,
        brandMatch,
      });

      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      results.push({ title: link.title, status: `❌ ${err.message}`, url: null, brandMatch: false });
    }
  }

  // apply 모드일 때만 파일 저장
  if (applyMode) {
    fs.writeFileSync(mdxPath, content, 'utf-8');
  }

  // 결과 출력
  console.log('─'.repeat(60));
  console.log('결과:');
  console.log('─'.repeat(60));

  for (const r of results) {
    console.log(`${r.status} ${r.title}`);
    if (r.matchedProduct) {
      console.log(`   → ${r.matchedProduct} (${r.price}) ${r.rocket}`);
      console.log(`   ${r.url}`);
      if (!r.brandMatch) console.log(`   ⚠️ 브랜드 불일치 — 수동 확인 필요`);
    }
    console.log('');
  }

  const matched = results.filter((r) => r.brandMatch).length;
  const unmatched = results.filter((r) => r.url && !r.brandMatch).length;
  const failed = results.filter((r) => !r.url).length;

  console.log(`완료: ✅ ${matched}개 매칭, ⚠️ ${unmatched}개 브랜드 불일치, ❌ ${failed}개 실패`);

  if (applyMode && matched > 0) {
    console.log(`\n📝 ${matched}개 링크가 파일에 적용되었습니다.`);
  }
  if (unmatched > 0 || failed > 0) {
    console.log('\n⚠️ 나머지는 수동으로 딥링크를 생성하세요.');
  }
}

main().catch((err) => {
  console.error(`❌ ${err.message}`);
  process.exit(1);
});
