import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Vec3 } from '@shared/model';
import { findFreeSlot, findSharedEdge, hasOverlap, roomBounds } from '@shared/lib/grid';
import {
  DEFAULT_ROOM_TEMPLATE,
  NEW_ROOM_TEMPLATE,
  ROOM_NAME_POOL,
  inferRoomKindFromName,
  type Doorway,
  type Room,
  type RoomKind,
} from '@entities/room';
import {
  findFurnitureCatalogByAssetId,
  type FurnitureAssetId,
  type FurnitureItem,
} from '@entities/furniture';
import { findTexture, type TextureSurface } from '@entities/texture';
import {
  findLightingCatalogByAssetId,
  type LightingAssetId,
  type LightingItem,
} from '@entities/lighting';
import {
  findFixtureCatalogByAssetId,
  isFixtureAllowedInRoomKind,
  type FixtureAssetId,
  type FixtureItem,
} from '@entities/fixture';
import type { CameraMode, Selection } from './types';
import { migrateV1ToV2 } from './migrations/v1ToV2';
import { migrateV2ToV3 } from './migrations/v2ToV3';

interface SceneState {
  rooms: Room[];
  doorways: Doorway[];
  furniture: FurnitureItem[];
  lights: LightingItem[];
  fixtures: FixtureItem[];
  selection: Selection | null;
  /** 새 가구를 추가할 때 기본으로 들어갈 방 id. */
  activeRoomId: string | null;
  cameraMode: CameraMode;

  addFurniture: (assetId: FurnitureAssetId, position?: Vec3) => void;
  removeFurniture: (id: string) => void;
  moveFurniture: (id: string, position: Vec3) => void;
  rotateFurniture: (id: string, rotationY: number) => void;

  /**
   * 카탈로그 assetId 로 새 조명을 활성 룸 중앙에 추가.
   * y 좌표는 anchor (ceiling/floor)에 따라 카탈로그가 결정한다 — 사용자는
   * 일단 위치만 정하고, 추후 인스펙터에서 미세조정 가능.
   */
  addLighting: (assetId: LightingAssetId) => void;
  removeLighting: (id: string) => void;
  moveLighting: (id: string, position: Vec3) => void;

  /**
   * 위생도기를 활성 룸 중앙(바닥)에 추가. 활성 룸의 kind 가 카탈로그의
   * recommendedRoomKinds 와 호환되지 않으면 silent 가 아닌 console.warn 후 무시 —
   * UI(카탈로그 패널)에서 미리 disable 시키므로 여기까지 도달하는 건 비정상 경로.
   */
  addFixture: (assetId: FixtureAssetId, position?: Vec3) => void;
  removeFixture: (id: string) => void;
  moveFixture: (id: string, position: Vec3) => void;
  rotateFixture: (id: string, rotationY: number) => void;

  /**
   * 새 방 추가. slot 이 있으면 그 셀 좌표로(placement UI 가 충돌을 미리 거른다는 전제),
   * 없으면 기존 findFreeSlot() 자동 배치. 슬롯이 다른 방과 겹치면 silent return.
   */
  addRoom: (slot?: { cellX: number; cellZ: number }) => void;
  removeRoom: (id: string) => void;
  renameRoom: (id: string, name: string) => void;
  resizeRoom: (id: string, cellsW: number, cellsD: number) => void;
  /** 룸 용도(욕실/주방/…) 수동 변경. 위생도기 호환 검증의 기준이 된다. */
  setRoomKind: (id: string, kind: RoomKind) => void;
  /** 두 방이 인접하다면 그 공유 변에 doorway를 토글한다. */
  toggleDoorway: (roomAId: string, roomBId: string) => void;
  /**
   * 도어웨이 위치(offsetCells)와 너비(widthCells)를 한 번에 갱신.
   * 두 값이 서로 종속적이라 단일 action 으로 합침 — UI 가 1차 검증, store 가 sharedLength
   * 범위로 2차 클램프하는 안전망. 공유 변이 없어진 doorway 라면 silent no-op.
   */
  setDoorwayPosition: (doorwayId: string, offsetCells: number, widthCells: number) => void;
  /**
   * 특정 면(바닥/벽/천장)에 텍스처를 적용. textureId가 카탈로그에 없거나
   * 해당 면 카테고리에 호환되지 않으면 무시한다(잘못된 조합 방어).
   */
  setRoomTexture: (roomId: string, surface: TextureSurface, textureId: string | null) => void;

  selectFurniture: (id: string | null) => void;
  selectRoom: (id: string | null) => void;
  selectLighting: (id: string | null) => void;
  selectFixture: (id: string | null) => void;
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
  lights: LightingItem[];
  fixtures: FixtureItem[];
  activeRoomId: string;
} {
  const room: Room = {
    id: nextId('room'),
    name: '거실',
    cellX: -1,
    cellZ: -1,
    ...DEFAULT_ROOM_TEMPLATE,
  };
  return {
    rooms: [room],
    doorways: [],
    furniture: [],
    lights: [],
    fixtures: [],
    activeRoomId: room.id,
  };
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

/**
 * persist 가 직렬화할 도메인 데이터 부분집합. selection/cameraMode 는
 * 세션성이라 보존 가치가 낮고, 함수(actions)는 코드에서 매번 새로 만들므로 제외.
 */
type PersistedScene = Pick<
  SceneState,
  'rooms' | 'doorways' | 'furniture' | 'lights' | 'fixtures' | 'activeRoomId'
>;

/**
 * 모든 id 의 숫자 suffix 최대값으로 idCounter 를 다시 맞춰 새 add 가 충돌 id 를 만들지 않게 한다.
 * id 포맷은 nextId(prefix) → `${prefix}-${숫자}` 라는 전제.
 */
function restoreIdCounter(state: PersistedScene): void {
  let max = 0;
  const visit = (id: string) => {
    const m = /-(\d+)$/.exec(id);
    if (m) max = Math.max(max, Number(m[1]));
  };
  state.rooms.forEach((r) => visit(r.id));
  state.doorways.forEach((d) => visit(d.id));
  state.furniture.forEach((f) => visit(f.id));
  state.lights.forEach((l) => visit(l.id));
  state.fixtures.forEach((f) => visit(f.id));
  idCounter = max;
}

export const useSceneStore = create<SceneState>()(
  persist(
    (set) => ({
  rooms: init.rooms,
  doorways: init.doorways,
  furniture: init.furniture,
  lights: init.lights,
  fixtures: init.fixtures,
  selection: null,
  activeRoomId: init.activeRoomId,
  cameraMode: 'orbit',

  addFurniture: (assetId, position) =>
    set((state) => {
      const catalog = findFurnitureCatalogByAssetId(assetId);
      if (!catalog) return state;
      const targetRoomId = state.activeRoomId ?? state.rooms[0]?.id;
      const room = state.rooms.find((r) => r.id === targetRoomId);
      if (!room) return state;
      const b = roomBounds(room);
      const initialPos: Vec3 = position ?? [b.centerX, 0, b.centerZ];
      const item: FurnitureItem = {
        id: nextId('furniture'),
        assetId: catalog.assetId,
        kind: catalog.kind,
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

  addLighting: (assetId) =>
    set((state) => {
      const catalog = findLightingCatalogByAssetId(assetId);
      if (!catalog) return state;
      const targetRoomId = state.activeRoomId ?? state.rooms[0]?.id;
      const room = state.rooms.find((r) => r.id === targetRoomId);
      if (!room) return state;
      const b = roomBounds(room);
      // anchor='ceiling'이면 천장 살짝 아래(0.05m 여유), 'floor'면 바닥 위 스탠드 본체 높이 가정(1.2m).
      const y = catalog.anchor === 'ceiling' ? room.height - 0.05 : 1.2;
      const item: LightingItem = {
        id: nextId('lighting'),
        assetId: catalog.assetId,
        kind: catalog.kind,
        roomId: room.id,
        position: [b.centerX, y, b.centerZ],
      };
      return {
        lights: [...state.lights, item],
        selection: { kind: 'lighting', id: item.id },
      };
    }),

  removeLighting: (id) =>
    set((state) => ({
      lights: state.lights.filter((l) => l.id !== id),
      selection:
        state.selection?.kind === 'lighting' && state.selection.id === id
          ? null
          : state.selection,
    })),

  moveLighting: (id, position) =>
    set((state) => ({
      lights: state.lights.map((l) => (l.id === id ? { ...l, position } : l)),
    })),

  addFixture: (assetId, position) =>
    set((state) => {
      const catalog = findFixtureCatalogByAssetId(assetId);
      if (!catalog) return state;
      const targetRoomId = state.activeRoomId ?? state.rooms[0]?.id;
      const room = state.rooms.find((r) => r.id === targetRoomId);
      if (!room) return state;
      if (!isFixtureAllowedInRoomKind(catalog, room.kind)) {
        console.warn(
          `[scene] ${catalog.label} 은(는) "${room.name}"(${room.kind}) 룸에 추가할 수 없습니다.`,
        );
        return state;
      }
      const b = roomBounds(room);
      const initialPos: Vec3 = position ?? [b.centerX, 0, b.centerZ];
      const item: FixtureItem = {
        id: nextId('fixture'),
        assetId: catalog.assetId,
        kind: catalog.kind,
        roomId: room.id,
        position: initialPos,
        rotationY: 0,
        size: catalog.size,
        color: catalog.color,
        modelUrl: catalog.modelUrl,
      };
      return {
        fixtures: [...state.fixtures, item],
        selection: { kind: 'fixture', id: item.id },
      };
    }),

  removeFixture: (id) =>
    set((state) => ({
      fixtures: state.fixtures.filter((f) => f.id !== id),
      selection:
        state.selection?.kind === 'fixture' && state.selection.id === id
          ? null
          : state.selection,
    })),

  moveFixture: (id, position) =>
    set((state) => ({
      fixtures: state.fixtures.map((f) => (f.id === id ? { ...f, position } : f)),
    })),

  rotateFixture: (id, rotationY) =>
    set((state) => ({
      fixtures: state.fixtures.map((f) => (f.id === id ? { ...f, rotationY } : f)),
    })),

  addRoom: (slot) =>
    set((state) => {
      const { cellsW, cellsD } = NEW_ROOM_TEMPLATE;
      const resolved = slot ?? findFreeSlot(state.rooms, cellsW, cellsD);
      // placement UI 는 미리 valid 검사 후 호출하지만, 자동 placement 경로(슬롯 미지정)와
      // 외부 호출자 안전을 위해 store 가 한 번 더 검증한다.
      if (hasOverlap({ ...resolved, cellsW, cellsD }, state.rooms)) return state;
      const name = pickRoomName(state.rooms);
      // 이름이 ROOM_NAME_POOL 의 '욕실' / '주방' 등이면 자동으로 kind 추론 →
      // 사용자가 룸 추가 후 매번 인스펙터에서 용도를 바꿔야 하는 마찰 제거.
      const inferredKind = inferRoomKindFromName(name);
      const room: Room = {
        id: nextId('room'),
        name,
        cellX: resolved.cellX,
        cellZ: resolved.cellZ,
        ...NEW_ROOM_TEMPLATE,
        ...(inferredKind ? { kind: inferredKind } : {}),
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
      const removedFurnitureIds = new Set(
        state.furniture.filter((f) => f.roomId === id).map((f) => f.id),
      );
      const removedLightIds = new Set(
        state.lights.filter((l) => l.roomId === id).map((l) => l.id),
      );
      const removedFixtureIds = new Set(
        state.fixtures.filter((f) => f.roomId === id).map((f) => f.id),
      );
      const furniture = state.furniture.filter((f) => f.roomId !== id);
      const lights = state.lights.filter((l) => l.roomId !== id);
      const fixtures = state.fixtures.filter((f) => f.roomId !== id);
      const fallbackRoomId = rooms[0].id;
      // 선택이 사라진 방 자체 또는 그 방에 속해 같이 사라진 인스턴스였다면 해제
      const selection = state.selection;
      const selectionCleared =
        (selection?.kind === 'room' && selection.id === id) ||
        (selection?.kind === 'furniture' && removedFurnitureIds.has(selection.id)) ||
        (selection?.kind === 'lighting' && removedLightIds.has(selection.id)) ||
        (selection?.kind === 'fixture' && removedFixtureIds.has(selection.id));
      return {
        rooms,
        doorways,
        furniture,
        lights,
        fixtures,
        activeRoomId: state.activeRoomId === id ? fallbackRoomId : state.activeRoomId,
        selection: selectionCleared ? null : selection,
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

      // 가구·위생도기는 새 방 경계 안으로 클램프 (조명은 천장/공중 점이라 평면 클램프 무관)
      const b = roomBounds(next);
      const clampXZ = (size: Vec3, pos: Vec3): Vec3 => {
        const halfW = size[0] / 2;
        const halfD = size[2] / 2;
        const x = Math.max(b.minX + halfW, Math.min(b.maxX - halfW, pos[0]));
        const z = Math.max(b.minZ + halfD, Math.min(b.maxZ - halfD, pos[2]));
        return [x, pos[1], z];
      };
      const furniture = state.furniture.map((f) =>
        f.roomId === id ? { ...f, position: clampXZ(f.size, f.position) } : f,
      );
      const fixtures = state.fixtures.map((f) =>
        f.roomId === id ? { ...f, position: clampXZ(f.size, f.position) } : f,
      );

      return {
        rooms: state.rooms.map((r) => (r.id === id ? next : r)),
        doorways,
        furniture,
        fixtures,
      };
    }),

  setRoomKind: (id, kind) =>
    set((state) => ({
      rooms: state.rooms.map((r) => (r.id === id ? { ...r, kind } : r)),
    })),

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

  setDoorwayPosition: (doorwayId, offsetCells, widthCells) =>
    set((state) => {
      const doorway = state.doorways.find((d) => d.id === doorwayId);
      if (!doorway) return state;
      const a = state.rooms.find((r) => r.id === doorway.roomAId);
      const b = state.rooms.find((r) => r.id === doorway.roomBId);
      if (!a || !b) return state;
      const edge = findSharedEdge(a, b);
      if (!edge) return state;
      const sharedLength = edge.to - edge.from;
      // width 가 sharedLength 를 초과하면 sharedLength 에 맞추고, offset 은 [0, sharedLength-width] 로 클램프.
      // 슬라이더 max 가 동적이라 1차 방어선이지만, 동시 갱신 race 나 외부 호출 대비 store 도 강제.
      const clampedWidth = Math.max(1, Math.min(widthCells, sharedLength));
      const clampedOffset = Math.max(0, Math.min(offsetCells, sharedLength - clampedWidth));
      if (clampedWidth === doorway.widthCells && clampedOffset === doorway.offsetCells) return state;
      return {
        doorways: state.doorways.map((d) =>
          d.id === doorwayId ? { ...d, offsetCells: clampedOffset, widthCells: clampedWidth } : d,
        ),
      };
    }),

  selectFurniture: (id) =>
    set(() => ({ selection: id ? { kind: 'furniture', id } : null })),
  selectRoom: (id) =>
    set((state) => ({
      selection: id ? { kind: 'room', id } : null,
      activeRoomId: id ?? state.activeRoomId,
    })),
  selectLighting: (id) =>
    set(() => ({ selection: id ? { kind: 'lighting', id } : null })),
  selectFixture: (id) =>
    set(() => ({ selection: id ? { kind: 'fixture', id } : null })),
  setActiveRoom: (id) => set({ activeRoomId: id }),

  setRoomTexture: (roomId, surface, textureId) =>
    set((state) => {
      if (textureId !== null) {
        const texture = findTexture(textureId);
        if (!texture) return state;
        if (!texture.applicableTo.includes(surface)) return state;
      }
      const key =
        surface === 'floor'
          ? 'floorTextureId'
          : surface === 'wall'
            ? 'wallTextureId'
            : 'ceilingTextureId';
      return {
        rooms: state.rooms.map((r) => (r.id === roomId ? { ...r, [key]: textureId } : r)),
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
        lights: fresh.lights,
        fixtures: fresh.fixtures,
        activeRoomId: fresh.activeRoomId,
        selection: null,
      };
    }),
  }),
    {
      name: '3d-interior-scene-v1',
      version: 3,
      storage: createJSONStorage(() => localStorage),
      // selection/cameraMode 는 세션성, 함수는 매번 새로 만들어지므로 제외
      partialize: (state): PersistedScene => ({
        rooms: state.rooms,
        doorways: state.doorways,
        furniture: state.furniture,
        lights: state.lights,
        fixtures: state.fixtures,
        activeRoomId: state.activeRoomId,
      }),
      // v1: assetId 도입 이전 — 같은 kind 의 첫 카탈로그 항목으로 강등.
      // v2: Room.kind 도입 이전 — 이름에서 추론, 매칭 안 되면 'other'.
      // 두 마이그레이션은 순차 적용 (v1 → v2 → v3).
      migrate: (persisted, version) => {
        let data: unknown = persisted;
        if (version < 2) data = migrateV1ToV2(data);
        if (version < 3) data = migrateV2ToV3(data);
        return data as PersistedScene;
      },
      onRehydrateStorage: () => (rehydrated) => {
        if (rehydrated) restoreIdCounter(rehydrated);
      },
    },
  ),
);
