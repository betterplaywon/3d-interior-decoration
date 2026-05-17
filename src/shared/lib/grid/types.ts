/**
 * grid 유틸이 다루는 최소 구조. entities 레이어의 Room/Doorway는
 * 이 구조를 만족(structural typing)하지만, shared는 entities를 모른다 —
 * grid 함수가 도메인에 결합되지 않게 입력 형태만 노출.
 */
export type WallSide = 'north' | 'south' | 'east' | 'west';

export interface GridRoomLike {
  id: string;
  cellX: number;
  cellZ: number;
  cellsW: number;
  cellsD: number;
  /**
   * 천장 높이(m). 벽 면적 산출(roomSurfaceAreas)에서만 사용되며,
   * roomBounds 등 평면 계산에는 무관. entities.Room 이 동일 필드를 가져 structural 호환.
   */
  height: number;
}

export interface GridDoorwayLike {
  roomAId: string;
  roomBId: string;
  offsetCells: number;
  widthCells: number;
}
