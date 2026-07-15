// 계산기/도구 단일 소스 레지스트리
// 새 도구 추가 = 여기에 1줄 + src/pages/tools/<slug>.astro 생성
// 인덱스 카드·관련 계산기·브레드크럼·JSON-LD 카테고리가 모두 여기서 파생된다.

export type ToolCategory = 'finance' | 'labor';

export interface CategoryMeta {
  /** /tools/ 인덱스 섹션 제목 & "다른 OO 계산기" 헤딩 */
  label: string;
  /** 브레드크럼 2번째 항목 */
  breadcrumb: string;
  /** JSON-LD applicationCategory (schema.org) */
  schema: string;
}

export const categories: Record<ToolCategory, CategoryMeta> = {
  finance: { label: '금융 계산기', breadcrumb: '금융 도구', schema: 'FinanceApplication' },
  labor: { label: '노동·급여 계산기', breadcrumb: '생활 도구', schema: 'UtilitiesApplication' },
};

export interface Tool {
  slug: string;
  /** 인덱스 카드/관련 링크용 짧은 제목 (SEO용 긴 title은 각 페이지가 별도로 넘김) */
  title: string;
  desc: string;
  category: ToolCategory;
}

export const tools: Tool[] = [
  {
    slug: 'loan-calculator',
    title: '대출 계산기',
    desc: '상환방식별(원리금균등·원금균등·만기일시) 월 상환액과 총이자 비교',
    category: 'finance',
  },
  {
    slug: 'mortgage-calculator',
    title: '주택담보대출 계산기',
    desc: 'LTV·DSR 한도 확인과 월 상환액 계산',
    category: 'finance',
  },
  {
    slug: 'jeonse-loan-calculator',
    title: '전세대출 계산기',
    desc: '전세 보증금 기준 월 이자·총 비용 계산',
    category: 'finance',
  },
  {
    slug: 'credit-loan-calculator',
    title: '신용대출 계산기',
    desc: '상환 기간별 월 상환액·총이자 비교',
    category: 'finance',
  },
  {
    slug: 'work-hours-calculator',
    title: '근무시간 계산기',
    desc: '출퇴근·휴게 시간으로 일·주·월 실근무시간 계산',
    category: 'labor',
  },
  {
    slug: 'part-time-wage-calculator',
    title: '알바비 계산기',
    desc: '시급·근무시간으로 주휴수당 포함 일급·주급·월급 계산',
    category: 'labor',
  },
];

/** slug로 도구 조회 */
export function getTool(slug: string): Tool | undefined {
  return tools.find((t) => t.slug === slug);
}

/** 같은 카테고리의 다른 도구들 (관련 계산기 링크용) */
export function getRelatedTools(slug: string): Tool[] {
  const tool = getTool(slug);
  if (!tool) return [];
  return tools.filter((t) => t.category === tool.category && t.slug !== slug);
}

/** 카테고리별로 그룹핑 (인덱스 페이지용) */
export function getToolsByCategory(): { category: ToolCategory; meta: CategoryMeta; items: Tool[] }[] {
  return (Object.keys(categories) as ToolCategory[])
    .map((category) => ({
      category,
      meta: categories[category],
      items: tools.filter((t) => t.category === category),
    }))
    .filter((group) => group.items.length > 0);
}
