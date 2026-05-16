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
}

export interface GridDoorwayLike {
  roomAId: string;
  roomBId: string;
  offsetCells: number;
  widthCells: number;
}
