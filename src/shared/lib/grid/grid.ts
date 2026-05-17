import { CELL_SIZE } from '@shared/config';
import type { Vec3 } from '@shared/model';
import type { GridDoorwayLike, GridRoomLike, WallSide } from './types';

export interface RoomBounds {
  /** 월드 좌표 기준 방 영역의 최소/최대값 (xz 평면). y는 무시. */
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  centerX: number;
  centerZ: number;
  width: number;
  depth: number;
}

export function roomBounds(room: GridRoomLike): RoomBounds {
  const minX = room.cellX * CELL_SIZE;
  const minZ = room.cellZ * CELL_SIZE;
  const width = room.cellsW * CELL_SIZE;
  const depth = room.cellsD * CELL_SIZE;
  const maxX = minX + width;
  const maxZ = minZ + depth;
  return {
    minX,
    maxX,
    minZ,
    maxZ,
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2,
    width,
    depth,
  };
}

export interface SharedEdge {
  /** 'x' 축으로 평행한 변(=z 좌표가 같음) or 'z'축 평행한 변(=x 좌표가 같음). */
  axis: 'x' | 'z';
  /** 공유 좌표선 (axis='x'이면 z값, 'z'이면 x값) — 셀 인덱스. */
  line: number;
  /** 변의 시작/끝 (axis 방향 셀 인덱스). from < to. */
  from: number;
  /** 끝 셀 인덱스 (exclusive). to - from = 공유 길이(셀 수). */
  to: number;
  /** A에서 보면 어느 방향 벽인지. */
  sideForA: WallSide;
  sideForB: WallSide;
}

/**
 * 두 방이 한 변을 공유하는지 검사. 공유한다면 그 변의 셀 인덱스 범위를 반환.
 * 두 방의 변이 정확히 같은 좌표선 위에 있고, 길이 방향 겹침이 있어야 한다.
 */
export function findSharedEdge(a: GridRoomLike, b: GridRoomLike): SharedEdge | null {
  const aRight = a.cellX + a.cellsW;
  const aBottom = a.cellZ + a.cellsD;
  const bRight = b.cellX + b.cellsW;
  const bBottom = b.cellZ + b.cellsD;

  // X축으로 평행 (위/아래 인접) — z 좌표선 공유
  if (aBottom === b.cellZ || a.cellZ === bBottom) {
    const from = Math.max(a.cellX, b.cellX);
    const to = Math.min(aRight, bRight);
    if (to > from) {
      const aIsAbove = aBottom === b.cellZ;
      return {
        axis: 'x',
        line: aIsAbove ? aBottom : a.cellZ,
        from,
        to,
        sideForA: aIsAbove ? 'south' : 'north',
        sideForB: aIsAbove ? 'north' : 'south',
      };
    }
  }

  // Z축으로 평행 (좌/우 인접) — x 좌표선 공유
  if (aRight === b.cellX || a.cellX === bRight) {
    const from = Math.max(a.cellZ, b.cellZ);
    const to = Math.min(aBottom, bBottom);
    if (to > from) {
      const aIsLeft = aRight === b.cellX;
      return {
        axis: 'z',
        line: aIsLeft ? aRight : a.cellX,
        from,
        to,
        sideForA: aIsLeft ? 'east' : 'west',
        sideForB: aIsLeft ? 'west' : 'east',
      };
    }
  }

  return null;
}

/**
 * 한 방의 특정 벽에 걸리는 doorway 구간 목록.
 * doorway는 두 방의 공유 변에 정의되어 있으므로, 그 변을 이 방 기준 좌표로 변환한다.
 * 반환값: [start, end) — 월드 좌표 (axis 방향).
 */
export function doorwaysOnWall(
  room: GridRoomLike,
  side: WallSide,
  doorways: readonly GridDoorwayLike[],
  roomsById: ReadonlyMap<string, GridRoomLike>,
): Array<{ startWorld: number; endWorld: number }> {
  const result: Array<{ startWorld: number; endWorld: number }> = [];
  for (const dw of doorways) {
    const other = roomsById.get(dw.roomAId === room.id ? dw.roomBId : dw.roomAId);
    if (!other || (dw.roomAId !== room.id && dw.roomBId !== room.id)) continue;

    const edge = findSharedEdge(room, other);
    if (!edge) continue;
    if (edge.sideForA !== side) continue;

    const startCells = edge.from + dw.offsetCells;
    const endCells = startCells + dw.widthCells;
    const clampedStart = Math.max(startCells, edge.from);
    const clampedEnd = Math.min(endCells, edge.to);
    if (clampedEnd <= clampedStart) continue;

    result.push({
      startWorld: clampedStart * CELL_SIZE,
      endWorld: clampedEnd * CELL_SIZE,
    });
  }
  return result;
}

/**
 * 공유 변에서 이 방이 해당 면(side) 벽을 "그릴 권리"가 있는지.
 * 같은 평면 위에 두 방이 동시에 PlaneGeometry를 올리면 z-fighting이 생기므로
 * id 사전순이 작은 쪽 하나만 그리도록 강제 — 건축적으로도 공유 벽은 1장이 옳다.
 * doorway 인방 중복도 같은 메커니즘으로 자동 해소.
 */
export function isWallOwned(
  room: GridRoomLike,
  side: WallSide,
  rooms: readonly GridRoomLike[],
): boolean {
  for (const other of rooms) {
    if (other.id === room.id) continue;
    const edge = findSharedEdge(room, other);
    if (!edge || edge.sideForA !== side) continue;
    if (other.id < room.id) return false;
  }
  return true;
}

/** 가구를 방 내부 (벽 밖으로 나가지 않게) 클램프. doorway는 고려하지 않음. */
export function clampToRoomBounds(position: Vec3, size: Vec3, room: GridRoomLike): Vec3 {
  const b = roomBounds(room);
  const halfW = size[0] / 2;
  const halfD = size[2] / 2;
  const x = clamp(position[0], b.minX + halfW, b.maxX - halfW);
  const z = clamp(position[2], b.minZ + halfD, b.maxZ - halfD);
  return [x, position[1], z];
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** 셀 인덱스 그리드가 비어 있는지 (다른 방과 겹치지 않는지) 확인. */
export function hasOverlap(
  candidate: { cellX: number; cellZ: number; cellsW: number; cellsD: number },
  rooms: readonly GridRoomLike[],
  excludeId?: string,
): boolean {
  const cRight = candidate.cellX + candidate.cellsW;
  const cBottom = candidate.cellZ + candidate.cellsD;
  for (const r of rooms) {
    if (excludeId && r.id === excludeId) continue;
    const rRight = r.cellX + r.cellsW;
    const rBottom = r.cellZ + r.cellsD;
    if (candidate.cellX < rRight && cRight > r.cellX && candidate.cellZ < rBottom && cBottom > r.cellZ) {
      return true;
    }
  }
  return false;
}

/**
 * 월드 좌표 (x, z) 가 어떤 셀에 속하는지. floor 기반이라 음수 좌표도 일관되게 처리.
 * room placement UI 가 마우스 ground point 를 셀 인덱스로 환산할 때 사용.
 */
export function worldPointToCell(worldX: number, worldZ: number): { cellX: number; cellZ: number } {
  return {
    cellX: Math.floor(worldX / CELL_SIZE),
    cellZ: Math.floor(worldZ / CELL_SIZE),
  };
}

/**
 * 마우스 위치(월드 좌표)를 받아, 그 점을 중앙 근방으로 하는 cellsW×cellsD 방의 좌상단 셀을 반환.
 * placement ghost 가 커서 중앙에 떠 있는 자연스러운 정렬을 위해 절반 만큼 빼는 게 핵심.
 */
export function snapRoomSlot(
  worldX: number,
  worldZ: number,
  cellsW: number,
  cellsD: number,
): { cellX: number; cellZ: number } {
  const c = worldPointToCell(worldX, worldZ);
  return {
    cellX: c.cellX - Math.floor(cellsW / 2),
    cellZ: c.cellZ - Math.floor(cellsD / 2),
  };
}

/**
 * 기존 방들 옆 빈 자리를 탐색해 새 방의 셀 좌표를 결정.
 * 단순 전략: 각 기존 방의 4방향으로 동일 크기 후보를 시도하고,
 * 겹치지 않으면 채택. 시드는 (0,0)에 가까운 후보 우선.
 */
export function findFreeSlot(
  rooms: readonly GridRoomLike[],
  cellsW: number,
  cellsD: number,
): { cellX: number; cellZ: number } {
  if (rooms.length === 0) {
    return { cellX: -Math.floor(cellsW / 2), cellZ: -Math.floor(cellsD / 2) };
  }

  const candidates: Array<{ cellX: number; cellZ: number; dist: number }> = [];
  for (const r of rooms) {
    const slots = [
      { cellX: r.cellX + r.cellsW, cellZ: r.cellZ },
      { cellX: r.cellX - cellsW, cellZ: r.cellZ },
      { cellX: r.cellX, cellZ: r.cellZ + r.cellsD },
      { cellX: r.cellX, cellZ: r.cellZ - cellsD },
    ];
    for (const s of slots) {
      if (!hasOverlap({ ...s, cellsW, cellsD }, rooms)) {
        const cx = s.cellX + cellsW / 2;
        const cz = s.cellZ + cellsD / 2;
        candidates.push({ ...s, dist: cx * cx + cz * cz });
      }
    }
  }
  candidates.sort((a, b) => a.dist - b.dist);
  if (candidates.length > 0) {
    return { cellX: candidates[0].cellX, cellZ: candidates[0].cellZ };
  }

  // 폴백: 모든 방을 감싸는 박스의 오른쪽에 붙임
  let maxRight = -Infinity;
  let minZ = Infinity;
  for (const r of rooms) {
    maxRight = Math.max(maxRight, r.cellX + r.cellsW);
    minZ = Math.min(minZ, r.cellZ);
  }
  return { cellX: maxRight, cellZ: minZ };
}
