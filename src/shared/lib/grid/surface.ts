import { CELL_SIZE } from '@shared/config';
import type { GridRoomLike } from './types';

export interface RoomSurfaceAreas {
  /** 바닥 면적(㎡). */
  floor: number;
  /** 벽 면적 합(㎡). 4면 둘레 × 높이. */
  wall: number;
  /** 천장 면적(㎡). 현재 floor 와 동일. */
  ceiling: number;
}

/**
 * 한 방의 마감재 적용 면적을 산출. 견적 v2에서 텍스처 단가(pricePerSqmKRW)와
 * 곱해 마감재 라인을 만드는 입력. CELL_SIZE 직접 사용은 forbidden.md #8 위반이므로
 * 면적 산출도 grid 유틸 안으로 흡수 — widget/entity 가 cellsW * CELL_SIZE 를 쓰지 않게.
 *
 * doorway 차감은 v1 에서 생략. 한 방의 doorway 면적은 전체 벽 대비 < 5% 라
 * 견적 정확도보다 코드 단순성 우선 — 향후 같은 함수 안에 doorway 폭만큼 빼는
 * 분기를 더한다.
 */
export function roomSurfaceAreas(room: GridRoomLike): RoomSurfaceAreas {
  const width = room.cellsW * CELL_SIZE;
  const depth = room.cellsD * CELL_SIZE;
  const floor = width * depth;
  const wall = 2 * (width + depth) * room.height;
  return { floor, wall, ceiling: floor };
}
