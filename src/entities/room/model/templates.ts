/**
 * 기본 방 한 칸 — 2x2 셀(6m x 6m).
 * 텍스처 기본값은 모든 면 호환 가능한 보편 조합(원목 플랭크 마루 + 도장 회반죽 벽·천장).
 */
export const DEFAULT_ROOM_TEMPLATE = {
  cellsW: 2,
  cellsD: 2,
  height: 2.7,
  floorTextureId: 'floor-plank-flooring',
  wallTextureId: 'wall-painted-plaster',
  ceilingTextureId: 'wall-painted-plaster',
} as const;

/** "방 추가" 시 새 방의 기본 사이즈. */
export const NEW_ROOM_TEMPLATE = {
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
