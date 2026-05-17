import { asAssetId, type ShippingMethod } from '@shared/model';

import type { FixtureAssetId, FixtureCatalogItem, FixtureCategory, FixtureKind } from './types';

const id = (slug: string): FixtureAssetId => asAssetId<'fixture'>(`fixture/${slug}`);

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
    assetId: id('bathtub_classic_01'),
    kind: 'bathtub',
    label: '욕조',
    category: 'sanitary',
    shipping: 'sea',
    size: [1.6, 0.6, 0.75],
    color: '#f1efe7',
    priceKRW: 1_800_000,
    recommendedRoomKinds: ['bathroom'],
  },
  {
    assetId: id('washbasin_classic_01'),
    kind: 'washbasin',
    label: '세면대',
    category: 'sanitary',
    shipping: 'sea',
    size: [0.6, 0.85, 0.5],
    color: '#ececec',
    priceKRW: 520_000,
    recommendedRoomKinds: ['bathroom'],
  },
  {
    assetId: id('toilet_classic_01'),
    kind: 'toilet',
    label: '변기',
    category: 'sanitary',
    shipping: 'domestic',
    size: [0.4, 0.8, 0.7],
    color: '#fafafa',
    priceKRW: 380_000,
    recommendedRoomKinds: ['bathroom'],
  },
  {
    assetId: id('shower_head_01'),
    kind: 'showerHead',
    label: '샤워기',
    category: 'shower',
    shipping: 'air',
    size: [0.2, 1.8, 0.2],
    color: '#c8c8cc',
    priceKRW: 240_000,
    recommendedRoomKinds: ['bathroom'],
  },
  {
    assetId: id('faucet_01'),
    kind: 'faucet',
    label: '수전',
    category: 'faucet',
    shipping: 'air',
    size: [0.15, 0.3, 0.15],
    color: '#d6d6da',
    priceKRW: 180_000,
    // 주방 싱크 수전 케이스 — 욕실·주방 양쪽에 허용.
    recommendedRoomKinds: ['bathroom', 'kitchen'],
  },
] as const;

export function findFixtureCatalogByAssetId(
  assetId: string | null | undefined,
): FixtureCatalogItem | null {
  if (!assetId) return null;
  return FIXTURE_CATALOG.find((c) => c.assetId === assetId) ?? null;
}

/**
 * persist v1→v2 마이그레이션 전용. 같은 kind 의 첫 카탈로그 항목으로 강등.
 * 신규 코드는 assetId 기반 `findFixtureCatalogByAssetId` 를 사용할 것.
 */
export function findFirstFixtureByKind(kind: FixtureKind): FixtureCatalogItem | null {
  return FIXTURE_CATALOG.find((c) => c.kind === kind) ?? null;
}

/**
 * 룸 용도(RoomKind 문자열)에 이 위생도기가 허용되는지.
 * - 'other' 는 사용자가 분류를 정하지 않은 자유 룸 → 항상 허용 (UX 막힘 방지).
 * - recommendedRoomKinds 가 비면 제약 없음 (미래 확장 여지).
 *
 * 인자 `roomKind` 를 `string` 으로 받는 이유: entities/fixture 가 entities/room 의
 * RoomKind union 을 import 하면 같은 레이어 cross-import (forbidden #1).
 * 호출부(scene store / catalog panel) 가 Room.kind 를 그대로 넘기면 동작이 같다.
 */
export function isFixtureAllowedInRoomKind(
  item: FixtureCatalogItem,
  roomKind: string,
): boolean {
  if (roomKind === 'other') return true;
  if (item.recommendedRoomKinds.length === 0) return true;
  return item.recommendedRoomKinds.includes(roomKind);
}

const SHIPPING_LABEL: Record<ShippingMethod, string> = {
  sea: '해외(배편)',
  air: '해외(항공)',
  domestic: '국내',
};

export function fixtureShippingLabel(s: ShippingMethod): string {
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
