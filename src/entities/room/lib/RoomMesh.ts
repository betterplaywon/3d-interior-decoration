import * as THREE from 'three';
import { CELL_SIZE } from '@shared/config';
import { doorwaysOnWall, type WallSide } from '@shared/lib/grid';
import type { Doorway, Room } from '../model';

/** doorway 윗부분 인방(lintel)은 이 높이만큼 남긴다. 시각적으로 "문"임을 알리는 단서. */
const DOORWAY_OPENING_HEIGHT = 2.1;

interface BuildOptions {
  selected: boolean;
}

/**
 * 한 방을 Group으로. Group의 위치를 (minX, 0, minZ)로 두고
 * 내부 메쉬는 룸 로컬 좌표(0..width, 0..depth)에서 만든다.
 *
 * doorway가 있는 벽은 세 조각(아래 인방 + 양옆)으로 분할해 그린다.
 * "벽 자체에 구멍을 뚫는" 대신 "비워둘 구간을 빼고 나머지만 그리는" 접근 — z-fighting 없음.
 */
export function buildRoomMesh(
  room: Room,
  doorways: readonly Doorway[],
  roomsById: ReadonlyMap<string, Room>,
  options: BuildOptions = { selected: false },
): THREE.Group {
  const group = new THREE.Group();
  group.name = `Room:${room.id}`;
  group.userData.roomId = room.id;

  const minX = room.cellX * CELL_SIZE;
  const minZ = room.cellZ * CELL_SIZE;
  group.position.set(minX, 0, minZ);

  const width = room.cellsW * CELL_SIZE;
  const depth = room.cellsD * CELL_SIZE;

  const floorColor = options.selected ? lightenColor(room.floorColor, 0.08) : room.floorColor;
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: room.wallColor,
    roughness: 0.95,
    metalness: 0.0,
  });

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshStandardMaterial({ color: floorColor, roughness: 0.85, metalness: 0.0 }),
  );
  floor.rotation.x = -Math.PI / 2;
  // PlaneGeometry는 자기 중심을 원점으로 갖는다 — 룸 로컬에서 중심으로 옮김
  floor.position.set(width / 2, 0, depth / 2);
  floor.receiveShadow = true;
  floor.name = 'Floor';
  floor.userData.roomId = room.id;
  group.add(floor);

  // 선택된 방은 바닥 외곽선을 살짝 띄워 표시
  if (options.selected) {
    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(width, depth)),
      new THREE.LineBasicMaterial({ color: 0x4aa3ff }),
    );
    outline.rotation.x = -Math.PI / 2;
    outline.position.set(width / 2, 0.01, depth / 2);
    outline.name = 'SelectionOutline';
    group.add(outline);
  }

  // 4면 벽 — doorway 있는 벽은 세그먼트로
  buildWall(group, room, doorways, roomsById, 'north', width, depth, wallMaterial);
  buildWall(group, room, doorways, roomsById, 'south', width, depth, wallMaterial);
  buildWall(group, room, doorways, roomsById, 'west', width, depth, wallMaterial);
  buildWall(group, room, doorways, roomsById, 'east', width, depth, wallMaterial);

  return group;
}

function buildWall(
  group: THREE.Group,
  room: Room,
  doorways: readonly Doorway[],
  roomsById: ReadonlyMap<string, Room>,
  side: WallSide,
  width: number,
  depth: number,
  material: THREE.Material,
): void {
  const minX = room.cellX * CELL_SIZE;
  const minZ = room.cellZ * CELL_SIZE;
  const maxX = minX + width;
  const maxZ = minZ + depth;
  const wallH = room.height;

  let axisStart: number;
  let axisEnd: number;
  if (side === 'north' || side === 'south') {
    axisStart = minX;
    axisEnd = maxX;
  } else {
    axisStart = minZ;
    axisEnd = maxZ;
  }

  const openings = doorwaysOnWall(room, side, doorways, roomsById)
    .map((o) => ({
      start: Math.max(o.startWorld, axisStart),
      end: Math.min(o.endWorld, axisEnd),
    }))
    .filter((o) => o.end > o.start)
    .sort((a, b) => a.start - b.start);

  type Segment = { start: number; end: number; full: boolean };
  const segments: Segment[] = [];
  let cursor = axisStart;
  for (const o of openings) {
    if (o.start > cursor) {
      segments.push({ start: cursor, end: o.start, full: true });
    }
    // doorway 위쪽 인방: 폭만큼은 짧은 위쪽 벽(상부 거치대)으로 표현 — 시각적 단서
    segments.push({ start: o.start, end: o.end, full: false });
    cursor = Math.max(cursor, o.end);
  }
  if (cursor < axisEnd) {
    segments.push({ start: cursor, end: axisEnd, full: true });
  }

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const segWidth = seg.end - seg.start;
    if (segWidth <= 1e-6) continue;

    if (seg.full) {
      const mesh = makeWallPlane(segWidth, wallH, material);
      placeWall(mesh, side, seg.start, room, width, depth);
      mesh.name = `Wall:${side}:${i}`;
      mesh.userData.roomId = room.id;
      group.add(mesh);
    } else {
      // doorway 위쪽 인방 — DOORWAY_OPENING_HEIGHT 위쪽만 채움
      const lintelHeight = Math.max(0, wallH - DOORWAY_OPENING_HEIGHT);
      if (lintelHeight > 1e-3) {
        const mesh = makeWallPlane(segWidth, lintelHeight, material);
        placeWall(mesh, side, seg.start, room, width, depth, DOORWAY_OPENING_HEIGHT + lintelHeight / 2);
        mesh.name = `Wall:${side}:${i}:lintel`;
        mesh.userData.roomId = room.id;
        group.add(mesh);
      }
    }
  }
}

function makeWallPlane(width: number, height: number, material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Room 그룹이 (minX, 0, minZ)에 있으므로 mesh 좌표는 룸 로컬(0..width, 0..depth)을 기대.
 * axisWorldStart는 axis 방향(월드)의 시작점이라 minX/minZ를 빼서 로컬화한다.
 */
function placeWall(
  mesh: THREE.Mesh,
  side: WallSide,
  axisWorldStart: number,
  room: Room,
  width: number,
  depth: number,
  centerY?: number,
): void {
  const minX = room.cellX * CELL_SIZE;
  const minZ = room.cellZ * CELL_SIZE;
  const segWidth = (mesh.geometry as THREE.PlaneGeometry).parameters.width;
  const planeHeight = (mesh.geometry as THREE.PlaneGeometry).parameters.height;
  const y = centerY ?? planeHeight / 2;

  const localStart = side === 'north' || side === 'south' ? axisWorldStart - minX : axisWorldStart - minZ;
  const localCenter = localStart + segWidth / 2;

  switch (side) {
    case 'south':
      mesh.position.set(localCenter, y, 0);
      mesh.rotation.y = 0;
      break;
    case 'north':
      mesh.position.set(localCenter, y, depth);
      mesh.rotation.y = Math.PI;
      break;
    case 'west':
      mesh.position.set(0, y, localCenter);
      mesh.rotation.y = Math.PI / 2;
      break;
    case 'east':
      mesh.position.set(width, y, localCenter);
      mesh.rotation.y = -Math.PI / 2;
      break;
  }
}

function lightenColor(hex: string, amount: number): string {
  const c = new THREE.Color(hex);
  c.r = Math.min(1, c.r + amount);
  c.g = Math.min(1, c.g + amount);
  c.b = Math.min(1, c.b + amount);
  return `#${c.getHexString()}`;
}
