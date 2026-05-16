import type { FixtureCatalogItem, FixtureCategory, FixtureShipping } from './types';

/**
 * 초기 위생도기 카탈로그. 현업 인터뷰 기반 — 욕조·세면대 등 도기류는
 * 해외 수입 비중이 높고(배편 기본), 수전류는 브랜드에 따라 항공/국내가 혼재.
 * 단가는 실제 매입가 범위의 대표값(운영 시 외부 데이터 소싱).
 *
 * modelUrl은 일부러 비워둠 — 박스 폴백만으로도 카탈로그/드래그 흐름 검증이
 * 가능하다는 게 P0 의도. Poly Haven 등에서 에셋 확보 후 채워 넣을 자리.
 */
export const FIXTURE_CATALOG: readonly FixtureCatalogItem[] = [
  {
    kind: 'bathtub',
    label: '욕조',
    category: 'sanitary',
    shipping: 'sea',
    size: [1.6, 0.6, 0.75],
    color: '#f1efe7',
    priceKRW: 1_800_000,
  },
  {
    kind: 'washbasin',
    label: '세면대',
    category: 'sanitary',
    shipping: 'sea',
    size: [0.6, 0.85, 0.5],
    color: '#ececec',
    priceKRW: 520_000,
  },
  {
    kind: 'toilet',
    label: '변기',
    category: 'sanitary',
    shipping: 'domestic',
    size: [0.4, 0.8, 0.7],
    color: '#fafafa',
    priceKRW: 380_000,
  },
  {
    kind: 'showerHead',
    label: '샤워기',
    category: 'shower',
    shipping: 'air',
    size: [0.2, 1.8, 0.2],
    color: '#c8c8cc',
    priceKRW: 240_000,
  },
  {
    kind: 'faucet',
    label: '수전',
    category: 'faucet',
    shipping: 'air',
    size: [0.15, 0.3, 0.15],
    color: '#d6d6da',
    priceKRW: 180_000,
  },
] as const;

export function findFixtureCatalog(kind: string | null | undefined): FixtureCatalogItem | null {
  if (!kind) return null;
  return FIXTURE_CATALOG.find((c) => c.kind === kind) ?? null;
}

const SHIPPING_LABEL: Record<FixtureShipping, string> = {
  sea: '해외(배편)',
  air: '해외(항공)',
  domestic: '국내',
};

export function fixtureShippingLabel(s: FixtureShipping): string {
  return SHIPPING_LABEL[s];
}

const CATEGORY_LABEL: Record<FixtureCategory, string> = {
  sanitary: '도기',
  faucet: '수전',
  shower: '샤워설비',
};

export function fixtureCategoryLabel(c: FixtureCategory): string {
  return CATEGORY_LABEL[c];
}
