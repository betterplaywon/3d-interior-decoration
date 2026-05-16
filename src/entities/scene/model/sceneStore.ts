import { create } from 'zustand';
import type { Vec3 } from '@shared/model';
import { findFreeSlot, findSharedEdge, hasOverlap, roomBounds } from '@shared/lib/grid';
import {
  DEFAULT_ROOM_TEMPLATE,
  NEW_ROOM_TEMPLATE,
  ROOM_NAME_POOL,
  type Doorway,
  type Room,
} from '@entities/room';
import {
  FURNITURE_CATALOG,
  type FurnitureItem,
  type FurnitureKind,
} from '@entities/furniture';
import { findFinish, type FinishSurface } from '@entities/finish';
import type { CameraMode, Selection } from './types';

interface SceneState {
  rooms: Room[];
  doorways: Doorway[];
  furniture: FurnitureItem[];
  selection: Selection | null;
  /** 새 가구를 추가할 때 기본으로 들어갈 방 id. */
  activeRoomId: string | null;
  cameraMode: CameraMode;

  addFurniture: (kind: FurnitureKind, position?: Vec3) => void;
  removeFurniture: (id: string) => void;
  moveFurniture: (id: string, position: Vec3) => void;
  rotateFurniture: (id: string, rotationY: number) => void;

  addRoom: () => void;
  removeRoom: (id: string) => void;
  renameRoom: (id: string, name: string) => void;
  resizeRoom: (id: string, cellsW: number, cellsD: number) => void;
  /** 두 방이 인접하다면 그 공유 변에 doorway를 토글한다. */
  toggleDoorway: (roomAId: string, roomBId: string) => void;
  /**
   * 특정 면(바닥/벽/천장)에 마감재를 적용. finishId가 카탈로그에 없거나
   * 해당 면 카테고리에 호환되지 않으면 무시한다(잘못된 조합 방어).
   */
  setRoomFinish: (roomId: string, surface: FinishSurface, finishId: string | null) => void;

  selectFurniture: (id: string | null) => void;
  selectRoom: (id: string | null) => void;
  setActiveRoom: (id: string) => void;

  setCameraMode: (mode: CameraMode) => void;
  resetScene: () => void;
}

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}-${++idCounter}`;

function initialState(): {
  rooms: Room[];
  doorways: Doorway[];
  furniture: FurnitureItem[];
  activeRoomId: string;
} {
  const room: Room = {
    id: nextId('room'),
    name: '거실',
    cellX: -1,
    cellZ: -1,
    ...DEFAULT_ROOM_TEMPLATE,
  };
  return { rooms: [room], doorways: [], furniture: [], activeRoomId: room.id };
}

function pickRoomName(existing: readonly Room[]): string {
  const used = new Set(existing.map((r) => r.name));
  for (const name of ROOM_NAME_POOL) {
    if (!used.has(name)) return name;
  }
  return `방 ${existing.length + 1}`;
}

/**
 * 새 방을 만든 직후, 기존 모든 방과 인접한 변이 있다면 가운데에
 * 자동으로 doorway를 하나씩 만들어 준다 (셀 1칸 폭).
 * 사용자가 "방을 추가" 했다 = "연결되길 원한다" 라는 가정.
 */
function autoConnectDoorways(rooms: readonly Room[], newRoom: Room): Doorway[] {
  const result: Doorway[] = [];
  for (const other of rooms) {
    if (other.id === newRoom.id) continue;
    const edge = findSharedEdge(newRoom, other);
    if (!edge) continue;
    const sharedLength = edge.to - edge.from;
    if (sharedLength < 1) continue;
    const width = 1;
    const offsetCells = Math.floor((sharedLength - width) / 2);
    result.push({
      id: nextId('door'),
      roomAId: newRoom.id,
      roomBId: other.id,
      axis: edge.axis,
      offsetCells,
      widthCells: width,
    });
  }
  return result;
}

const init = initialState();

export const useSceneStore = create<SceneState>((set) => ({
  rooms: init.rooms,
  doorways: init.doorways,
  furniture: init.furniture,
  selection: null,
  activeRoomId: init.activeRoomId,
  cameraMode: 'orbit',

  addFurniture: (kind, position) =>
    set((state) => {
      const catalog = FURNITURE_CATALOG.find((c) => c.kind === kind);
      if (!catalog) return state;
      const targetRoomId = state.activeRoomId ?? state.rooms[0]?.id;
      const room = state.rooms.find((r) => r.id === targetRoomId);
      if (!room) return state;
      const b = roomBounds(room);
      const initialPos: Vec3 = position ?? [b.centerX, 0, b.centerZ];
      const item: FurnitureItem = {
        id: nextId(kind),
        kind,
        roomId: room.id,
        position: initialPos,
        rotationY: 0,
        size: catalog.size,
        color: catalog.color,
        modelUrl: catalog.modelUrl,
      };
      return {
        furniture: [...state.furniture, item],
        selection: { kind: 'furniture', id: item.id },
      };
    }),

  removeFurniture: (id) =>
    set((state) => ({
      furniture: state.furniture.filter((f) => f.id !== id),
      selection: state.selection?.kind === 'furniture' && state.selection.id === id ? null : state.selection,
    })),

  moveFurniture: (id, position) =>
    set((state) => ({
      furniture: state.furniture.map((f) => (f.id === id ? { ...f, position } : f)),
    })),

  rotateFurniture: (id, rotationY) =>
    set((state) => ({
      furniture: state.furniture.map((f) => (f.id === id ? { ...f, rotationY } : f)),
    })),

  addRoom: () =>
    set((state) => {
      const { cellsW, cellsD } = NEW_ROOM_TEMPLATE;
      const slot = findFreeSlot(state.rooms, cellsW, cellsD);
      const room: Room = {
        id: nextId('room'),
        name: pickRoomName(state.rooms),
        cellX: slot.cellX,
        cellZ: slot.cellZ,
        ...NEW_ROOM_TEMPLATE,
      };
      const newDoors = autoConnectDoorways(state.rooms, room);
      return {
        rooms: [...state.rooms, room],
        doorways: [...state.doorways, ...newDoors],
        activeRoomId: room.id,
        selection: { kind: 'room', id: room.id },
      };
    }),

  removeRoom: (id) =>
    set((state) => {
      if (state.rooms.length <= 1) return state; // 최소 1개는 유지
      const rooms = state.rooms.filter((r) => r.id !== id);
      const doorways = state.doorways.filter((d) => d.roomAId !== id && d.roomBId !== id);
      const furniture = state.furniture.filter((f) => f.roomId !== id);
      const fallbackRoomId = rooms[0].id;
      return {
        rooms,
        doorways,
        furniture,
        activeRoomId: state.activeRoomId === id ? fallbackRoomId : state.activeRoomId,
        selection:
          state.selection?.kind === 'room' && state.selection.id === id ? null : state.selection,
      };
    }),

  renameRoom: (id, name) =>
    set((state) => ({
      rooms: state.rooms.map((r) => (r.id === id ? { ...r, name } : r)),
    })),

  resizeRoom: (id, cellsW, cellsD) =>
    set((state) => {
      const target = state.rooms.find((r) => r.id === id);
      if (!target) return state;
      const next = { ...target, cellsW: Math.max(1, cellsW), cellsD: Math.max(1, cellsD) };
      if (hasOverlap(next, state.rooms, id)) return state;

      // 리사이즈 후 doorway 유효성 검사 — 공유 변이 없어졌거나 짧아진 경우 제거
      const roomsById = new Map(state.rooms.map((r) => [r.id, r] as const));
      roomsById.set(id, next);
      const doorways = state.doorways.filter((d) => {
        const a = roomsById.get(d.roomAId);
        const b = roomsById.get(d.roomBId);
        if (!a || !b) return false;
        const edge = findSharedEdge(a, b);
        if (!edge) return false;
        const sharedLength = edge.to - edge.from;
        return d.offsetCells + d.widthCells <= sharedLength;
      });

      // 가구는 새 방 경계 안으로 클램프
      const b = roomBounds(next);
      const furniture = state.furniture.map((f) => {
        if (f.roomId !== id) return f;
        const halfW = f.size[0] / 2;
        const halfD = f.size[2] / 2;
        const x = Math.max(b.minX + halfW, Math.min(b.maxX - halfW, f.position[0]));
        const z = Math.max(b.minZ + halfD, Math.min(b.maxZ - halfD, f.position[2]));
        return { ...f, position: [x, f.position[1], z] as Vec3 };
      });

      return {
        rooms: state.rooms.map((r) => (r.id === id ? next : r)),
        doorways,
        furniture,
      };
    }),

  toggleDoorway: (roomAId, roomBId) =>
    set((state) => {
      const a = state.rooms.find((r) => r.id === roomAId);
      const b = state.rooms.find((r) => r.id === roomBId);
      if (!a || !b) return state;
      const edge = findSharedEdge(a, b);
      if (!edge) return state;

      const existing = state.doorways.find(
        (d) =>
          (d.roomAId === roomAId && d.roomBId === roomBId) ||
          (d.roomAId === roomBId && d.roomBId === roomAId),
      );
      if (existing) {
        return { doorways: state.doorways.filter((d) => d.id !== existing.id) };
      }
      const sharedLength = edge.to - edge.from;
      const width = Math.min(1, sharedLength);
      const offsetCells = Math.floor((sharedLength - width) / 2);
      const doorway: Doorway = {
        id: nextId('door'),
        roomAId,
        roomBId,
        axis: edge.axis,
        offsetCells,
        widthCells: width,
      };
      return { doorways: [...state.doorways, doorway] };
    }),

  selectFurniture: (id) =>
    set(() => ({ selection: id ? { kind: 'furniture', id } : null })),
  selectRoom: (id) =>
    set((state) => ({
      selection: id ? { kind: 'room', id } : null,
      activeRoomId: id ?? state.activeRoomId,
    })),
  setActiveRoom: (id) => set({ activeRoomId: id }),

  setRoomFinish: (roomId, surface, finishId) =>
    set((state) => {
      if (finishId !== null) {
        const finish = findFinish(finishId);
        if (!finish) return state;
        if (!finish.applicableTo.includes(surface)) return state;
      }
      const key =
        surface === 'floor'
          ? 'floorFinishId'
          : surface === 'wall'
            ? 'wallFinishId'
            : 'ceilingFinishId';
      return {
        rooms: state.rooms.map((r) => (r.id === roomId ? { ...r, [key]: finishId } : r)),
      };
    }),

  setCameraMode: (mode) => set({ cameraMode: mode }),
  resetScene: () =>
    set(() => {
      const fresh = initialState();
      return {
        rooms: fresh.rooms,
        doorways: fresh.doorways,
        furniture: fresh.furniture,
        activeRoomId: fresh.activeRoomId,
        selection: null,
      };
    }),
}));
