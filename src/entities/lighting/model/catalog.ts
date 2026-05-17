import { asAssetId, type ShippingMethod } from '@shared/model';

import type {
  LightingAssetId,
  LightingCatalogItem,
  LightingCategory,
  LightingKind,
} from './types';

const id = (slug: string): LightingAssetId => asAssetId<'lighting'>(`lighting/${slug}`);

/**
 * 초기 조명 카탈로그. 카테고리(기본/장식)·조달방식(sea/air/domestic)·단가는
 * 도메인 현업 인터뷰 기반 — 해외 디자이너 펜던트는 배편 + 고가, 국내 다운라이트는 저가/즉시.
 * 단가는 실제 매입가 범위의 대표값(운영 시 외부 데이터 소싱).
 */
export const LIGHTING_CATALOG: readonly LightingCatalogItem[] = [
  {
    assetId: id('downlight_recessed_01'),
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
    assetId: id('pendant_designer_01'),
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
    assetId: id('stand_lamp_floor_01'),
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
    assetId: id('wall_sconce_01'),
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

export function findLightingCatalogByAssetId(
  assetId: string | null | undefined,
): LightingCatalogItem | null {
  if (!assetId) return null;
  return LIGHTING_CATALOG.find((c) => c.assetId === assetId) ?? null;
}

/**
 * persist v1→v2 마이그레이션 전용. 같은 kind 의 첫 카탈로그 항목으로 강등.
 * S7 에서 격리/제거 예정.
 */
export function findFirstLightingByKind(kind: LightingKind): LightingCatalogItem | null {
  return LIGHTING_CATALOG.find((c) => c.kind === kind) ?? null;
}

/** @deprecated v1 호환 — assetId 기반 `findLightingCatalogByAssetId` 사용. */
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
