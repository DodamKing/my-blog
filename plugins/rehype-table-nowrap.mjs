// 표 칸 안의 전화번호·금액·용량·시간을 끊기지 않는 덩어리(<span class="nb">)로 감싼다.
// 2026-11-07: 모바일 표를 줄바꿈 허용으로 바꾸자 "043-268-9998" 이 하이픈에서, "15 g" 이 공백에서 끊겼다.
// CSS 만으로는 글자 덩어리 단위 줄바꿈 금지를 걸 수 없어서 빌드 때 감싼다. 글자는 바꾸지 않는다.
const TOKEN = new RegExp([
  String.raw`\d{2,4}-\d{3,4}-\d{4}(?:~\d+)?`,                         // 전화번호 (02-2608-2795~6)
  String.raw`\d{1,2}:\d{2}(?:\s?~\s?\d{1,2}:\d{2})?`,                  // 시간 09:00~18:00
  String.raw`\d{1,3}(?:,\d{3})+(?:\.\d+)?\s?(?:원|만원|ml|mL|g|kg|mg|L|개|명|회|%)?`, // 콤마 숫자 + 단위
  String.raw`\d+(?:\.\d+)?\s?(?:ml|mL|g|kg|mg|mcg|μg|L|원|만원|%|개월|cm|mm|kcal|ppm|IU|분|시간|인용|정|포|캡슐)(?![A-Za-z가-힣])`, // 숫자 + 단위
].join('|'), 'g');

function wrapText(value) {
  const out = [];
  let last = 0;
  for (const m of value.matchAll(TOKEN)) {
    // 공백이 없는 짧은 숫자는 원래 끊기지 않으므로 감쌀 필요가 없다
    if (!/[-\s:~,]/.test(m[0])) continue;
    if (m.index > last) out.push({ type: 'text', value: value.slice(last, m.index) });
    out.push({ type: 'element', tagName: 'span', properties: { className: ['nb'] }, children: [{ type: 'text', value: m[0] }] });
    last = m.index + m[0].length;
  }
  if (!out.length) return null;
  if (last < value.length) out.push({ type: 'text', value: value.slice(last) });
  return out;
}

function walk(node, inCell) {
  if (!node.children) return;
  const cell = inCell || (node.type === 'element' && (node.tagName === 'td' || node.tagName === 'th'));
  const next = [];
  for (const child of node.children) {
    if (cell && child.type === 'text') {
      const parts = wrapText(child.value);
      if (parts) { next.push(...parts); continue; }
    } else if (!(child.type === 'element' && (child.tagName === 'code' || child.tagName === 'pre'))) {
      walk(child, cell);
    }
    next.push(child);
  }
  node.children = next;
}

export default function rehypeTableNowrap() {
  return (tree) => walk(tree, false);
}
