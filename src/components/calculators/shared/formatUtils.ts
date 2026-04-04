/** 숫자를 한국 원화 형식으로 포맷 (예: 1,234,567원) */
export function formatKRW(amount: number): string {
  return Math.round(amount).toLocaleString('ko-KR') + '원';
}

/** 숫자를 만원 단위로 포맷 (예: 1억 2,345만원) */
export function formatManWon(amount: number): string {
  const man = Math.round(amount / 10000);
  if (man >= 10000) {
    const eok = Math.floor(man / 10000);
    const remainder = man % 10000;
    if (remainder === 0) return `${eok}억원`;
    return `${eok}억 ${remainder.toLocaleString('ko-KR')}만원`;
  }
  return `${man.toLocaleString('ko-KR')}만원`;
}

/** 입력 문자열에서 숫자만 추출 */
export function parseNumberInput(value: string): number {
  const cleaned = value.replace(/[^0-9]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
}

/** 숫자를 콤마가 포함된 문자열로 변환 (입력 필드용) */
export function formatNumberWithCommas(value: number): string {
  if (value === 0) return '';
  return value.toLocaleString('ko-KR');
}
