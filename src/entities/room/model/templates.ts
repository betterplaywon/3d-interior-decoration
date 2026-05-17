import type { RoomKind } from './types';

/**
 * 기본 방 한 칸 — 2x2 셀(6m x 6m). 첫 진입 시의 거실 한 개.
 * 텍스처 기본값은 모든 면 호환 가능한 보편 조합(원목 플랭크 마루 + 도장 회반죽 벽·천장).
 */
export const DEFAULT_ROOM_TEMPLATE = {
  kind: 'living' as RoomKind,
  cellsW: 2,
  cellsD: 2,
  height: 2.7,
  floorTextureId: 'floor-plank-flooring',
  wallTextureId: 'wall-painted-plaster',
  ceilingTextureId: 'wall-painted-plaster',
} as const;

/**
 * "방 추가" 시 새 방의 기본 사이즈. kind 는 store 에서 이름으로 추론(`inferRoomKindFromName`)
 * 하므로 여기선 안전한 fallback 'other' (호환 검증 항상 통과).
 */
export const NEW_ROOM_TEMPLATE = {
  kind: 'other' as RoomKind,
  cellsW: 2,
  cellsD: 2,
  height: 2.7,
  floorTextureId: 'floor-plank-flooring',
  wallTextureId: 'wall-painted-plaster',
  ceilingTextureId: 'wall-painted-plaster',
} as const;

/** 새 방 이름 후보 — 순서대로 소비. */
export const ROOM_NAME_POOL = [
  '거실',
  '주방',
  '침실',
  '서재',
  '욕실',
  '드레스룸',
  '발코니',
] as const;

/** UI 라벨. select 옵션·인스펙터 표기에 사용. */
export const ROOM_KIND_LABEL: Record<RoomKind, string> = {
  bathroom: '욕실',
  kitchen: '주방',
  bedroom: '침실',
  living: '거실·서재',
  balcony: '발코니',
  other: '기타',
};

/**
 * 이름 한국어 토큰 → RoomKind 추론. ROOM_NAME_POOL 항목과 사용자가
 * 직접 친 이름(서재/거실 등) 모두 커버. 매핑 없으면 null 반환 — 호출부는 'other' 로 폴백.
 *
 * 이름에 토큰이 "포함" 되기만 해도 매칭 ('안방 욕실' → bathroom). 가장 구체적 토큰부터 검사.
 */
const NAME_KIND_RULES: ReadonlyArray<readonly [string, RoomKind]> = [
  ['욕실', 'bathroom'],
  ['화장실', 'bathroom'],
  ['주방', 'kitchen'],
  ['부엌', 'kitchen'],
  ['침실', 'bedroom'],
  ['안방', 'bedroom'],
  ['거실', 'living'],
  ['서재', 'living'],
  ['발코니', 'balcony'],
  ['베란다', 'balcony'],
];

export function inferRoomKindFromName(name: string): RoomKind | null {
  for (const [token, kind] of NAME_KIND_RULES) {
    if (name.includes(token)) return kind;
  }
  return null;
}
