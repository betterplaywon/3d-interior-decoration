/**
 * 방의 용도 분류. 시각화에는 영향 없는 순수 도메인 메타로,
 * 위생도기·조명 카탈로그가 "어느 룸에 적합한가" 를 검증하는 키로 쓴다.
 * 'other' 는 ROOM_NAME_POOL 에 없는 자유 입력 룸을 위한 fallback —
 * 호환 검증에서 항상 통과시켜 사용자가 길이 막히지 않게 한다.
 */
export type RoomKind =
  | 'bathroom'
  | 'kitchen'
  | 'bedroom'
  | 'living'
  | 'balcony'
  | 'other';

/**
 * 방은 그리드 좌표계에서 정의된다.
 * cellX/cellZ: 좌상단(또는 -x, -z 쪽) 모서리의 셀 인덱스
 * cellsW/cellsD: x/z 방향 셀 개수 (>=1)
 * 월드 좌표 변환은 @shared/lib/grid 참고.
 */
export interface Room {
  id: string;
  name: string;
  /**
   * 방 용도. 위생도기 카탈로그의 recommendedRoomKinds 와 매칭해
   * 카탈로그 패널에서 "여기엔 추가 불가" 를 disable 처리하는 데 쓴다.
   */
  kind: RoomKind;
  cellX: number;
  cellZ: number;
  cellsW: number;
  cellsD: number;
  height: number;
  /**
   * 각 면에 적용된 텍스처 id (TEXTURE_CATALOG.id). null이면 폴백 단색.
   * 카탈로그 조회 실패 시에도 폴백으로 떨어져 렌더는 끊기지 않음.
   */
  floorTextureId: string | null;
  wallTextureId: string | null;
  ceilingTextureId: string | null;
}

/**
 * 두 방을 잇는 개구부. 두 방이 한 변을 공유해야 유효하며
 * doorway는 그 공유 변 위에서 [offsetCells, offsetCells+widthCells) 범위만
 * 벽을 비워둔다 (셀 단위 정수).
 */
export interface Doorway {
  id: string;
  roomAId: string;
  roomBId: string;
  /** 공유 변의 방향 — 두 방 공통 좌표축. 저장은 정렬된 형태(NS or EW). */
  axis: 'x' | 'z';
  /** 공유 변 위에서의 시작 셀 오프셋(공유 구간 기준). */
  offsetCells: number;
  /** 개구부 폭(셀 단위). */
  widthCells: number;
}
