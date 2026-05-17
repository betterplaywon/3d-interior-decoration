const KRW_FORMATTER = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

const PLAIN_FORMATTER = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 });

/** 견적 라인 포매팅. 0원도 그대로 노출 — 면접관에게 "비어있다" 가 시연 신호. */
export function formatKRW(value: number): string {
  return KRW_FORMATTER.format(Math.round(value));
}

/** 면적·개수 등 단위 없는 숫자 포매팅. */
export function formatNumber(value: number): string {
  return PLAIN_FORMATTER.format(Math.round(value));
}
