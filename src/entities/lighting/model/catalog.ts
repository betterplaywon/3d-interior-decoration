import type { ShippingMethod } from '@shared/model';

import type { LightingCatalogItem, LightingCategory } from './types';

/**
 * 초기 조명 카탈로그. 카테고리(기본/장식)·조달방식(sea/air/domestic)·단가는
 * 도메인 현업 인터뷰 기반 — 해외 디자이너 펜던트는 배편 + 고가, 국내 다운라이트는 저가/즉시.
 * 단가는 실제 매입가 범위의 대표값(운영 시 외부 데이터 소싱).
 */
export const LIGHTING_CATALOG: readonly LightingCatalogItem[] = [
  {
    kind: 'downlight',
    label: '매입 다운라이트',
    shape: 'spot',
    category: 'ambient',
    shipping: 'domestic',
    anchor: 'ceiling',
    color: '#fff1d6',
    intensity: 8,
    distance: 6,
    angle: Math.PI / 6,
    penumbra: 0.35,
    priceKRW: 45000,
  },
  {
    kind: 'pendant',
    label: '디자이너 펜던트',
    shape: 'point',
    category: 'decorative',
    shipping: 'sea',
    anchor: 'ceiling',
    color: '#ffd9a8',
    intensity: 14,
    distance: 5,
    priceKRW: 780000,
  },
  {
    kind: 'standLamp',
    label: '플로어 스탠드',
    shape: 'point',
    category: 'decorative',
    shipping: 'air',
    anchor: 'floor',
    color: '#ffe0b3',
    intensity: 10,
    distance: 4,
    priceKRW: 320000,
  },
  {
    kind: 'wallSconce',
    label: '월 스콘스',
    shape: 'spot',
    category: 'decorative',
    shipping: 'sea',
    anchor: 'ceiling',
    color: '#ffd9b0',
    intensity: 6,
    distance: 3,
    angle: Math.PI / 4,
    penumbra: 0.5,
    priceKRW: 240000,
  },
] as const;

export function findLightingCatalog(kind: string | null | undefined): LightingCatalogItem | null {
  if (!kind) return null;
  return LIGHTING_CATALOG.find((c) => c.kind === kind) ?? null;
}

const SHIPPING_LABEL: Record<ShippingMethod, string> = {
  sea: '해외(배편)',
  air: '해외(항공)',
  domestic: '국내',
};

export function shippingLabel(s: ShippingMethod): string {
  return SHIPPING_LABEL[s];
}

const CATEGORY_LABEL: Record<LightingCategory, string> = {
  ambient: '기본 조명',
  decorative: '장식 조명',
};

export function categoryLabel(c: LightingCategory): string {
  return CATEGORY_LABEL[c];
}
