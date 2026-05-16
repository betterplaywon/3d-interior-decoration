import { useCallback, useRef, type MouseEvent, type MutableRefObject, type PointerEvent } from 'react';
import * as THREE from 'three';
import { useSceneStore } from '@entities/scene';
import { clampToRoomBounds } from '@shared/lib/grid';
import type { Vec3 } from '@shared/model';
import type { SceneManager } from '@widgets/scene-viewport/lib';

const DRAG_THRESHOLD_PX = 4;

type DragKind = 'furniture' | 'fixture';

interface DragState {
  kind: DragKind;
  id: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startGround: THREE.Vector3;
  startItemPos: Vec3;
  itemSize: Vec3;
  roomId: string;
  active: boolean;
}

export interface FurnitureDragHandlers {
  onPointerDown: (e: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: PointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (e: PointerEvent<HTMLDivElement>) => void;
}

interface DragTarget {
  kind: DragKind;
  id: string;
  position: Vec3;
  size: Vec3;
  roomId: string;
}

function ndc(el: HTMLDivElement, clientX: number, clientY: number) {
  const rect = el.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * 2 - 1,
    y: -((clientY - rect.top) / rect.height) * 2 + 1,
  };
}

/**
 * 가구·위생도기 모두 같은 평면 드래그 흐름을 공유하므로 한 hook 안에서
 * 도메인을 분기한다. FSD에서 features는 "사용자 액션 단위" — '오브젝트 드래그'는
 * 단일 액션이라 슬라이스를 쪼개지 않음. P1에서 useObjectDrag 로 리네임/일반화 예정.
 */
function pickDragTarget(manager: SceneManager, ndcX: number, ndcY: number): DragTarget | null {
  const furnitureId = manager.pickFurnitureId(ndcX, ndcY);
  if (furnitureId) {
    const item = useSceneStore.getState().furniture.find((f) => f.id === furnitureId);
    if (item) return { kind: 'furniture', id: item.id, position: item.position, size: item.size, roomId: item.roomId };
  }
  const fixtureId = manager.pickFixtureId(ndcX, ndcY);
  if (fixtureId) {
    const item = useSceneStore.getState().fixtures.find((f) => f.id === fixtureId);
    if (item) return { kind: 'fixture', id: item.id, position: item.position, size: item.size, roomId: item.roomId };
  }
  return null;
}

/**
 * 가구·위생도기 픽 → 드래그 → 클램프 이동 흐름을 SceneCanvas에서 분리.
 * - 4px threshold 넘기 전까지는 click 후보 (드래그 미발동, 선택만 처리)
 * - 드래그 발동 순간 OrbitControls 비활성, pointerup에 복구
 */
export function useFurnitureDrag(
  managerRef: MutableRefObject<SceneManager | null>,
): FurnitureDragHandlers {
  const dragRef = useRef<DragState | null>(null);

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const manager = managerRef.current;
      const el = e.currentTarget;
      if (!manager) return;

      const { x, y } = ndc(el, e.clientX, e.clientY);
      const target = pickDragTarget(manager, x, y);
      const ground = manager.pickGroundPoint(x, y);
      if (!target || !ground) return;

      dragRef.current = {
        kind: target.kind,
        id: target.id,
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startGround: ground.clone(),
        startItemPos: target.position,
        itemSize: target.size,
        roomId: target.roomId,
        active: false,
      };
      el.setPointerCapture(e.pointerId);
    },
    [managerRef],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      const manager = managerRef.current;
      if (!drag || !manager || drag.pointerId !== e.pointerId) return;

      if (!drag.active) {
        const dx = e.clientX - drag.startClientX;
        const dy = e.clientY - drag.startClientY;
        if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) return;
        drag.active = true;
        manager.setControlsEnabled(false);
        e.currentTarget.style.cursor = 'grabbing';
      }

      const { x, y } = ndc(e.currentTarget, e.clientX, e.clientY);
      const ground = manager.pickGroundPoint(x, y);
      if (!ground) return;

      const deltaX = ground.x - drag.startGround.x;
      const deltaZ = ground.z - drag.startGround.z;
      const next: Vec3 = [
        drag.startItemPos[0] + deltaX,
        drag.startItemPos[1],
        drag.startItemPos[2] + deltaZ,
      ];
      const room = useSceneStore.getState().rooms.find((r) => r.id === drag.roomId);
      const clamped = room ? clampToRoomBounds(next, drag.itemSize, room) : next;
      if (drag.kind === 'furniture') {
        useSceneStore.getState().moveFurniture(drag.id, clamped);
      } else {
        useSceneStore.getState().moveFixture(drag.id, clamped);
      }
    },
    [managerRef],
  );

  const endDrag = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      const manager = managerRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;

      if (!drag.active) {
        if (drag.kind === 'furniture') {
          useSceneStore.getState().selectFurniture(drag.id);
        } else {
          useSceneStore.getState().selectFixture(drag.id);
        }
      } else {
        manager?.setControlsEnabled(true);
        e.currentTarget.style.cursor = '';
      }
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      dragRef.current = null;
    },
    [managerRef],
  );

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
  };
}

/**
 * 빈 영역 클릭 처리. 드래그 후보(가구/위생도기) hit는 useFurnitureDrag의
 * pointerup에서 처리하므로 여기서는 그 외 — 조명·방·완전 빈 곳만 다룬다.
 *
 * 우선순위: 가구/위생도기 hit 무시 → 조명 hit → 방 바닥 hit → 모두 해제.
 */
export function useEmptyClick(managerRef: MutableRefObject<SceneManager | null>) {
  return useCallback(
    (e: PointerEvent<HTMLDivElement> | MouseEvent<HTMLDivElement>) => {
      const manager = managerRef.current;
      if (!manager) return;
      const { x, y } = ndc(e.currentTarget, e.clientX, e.clientY);
      if (manager.pickFurnitureId(x, y) !== null) return;
      if (manager.pickFixtureId(x, y) !== null) return;
      const roomId = manager.pickRoomId(x, y);
      if (roomId) {
        useSceneStore.getState().selectRoom(roomId);
      } else {
        useSceneStore.getState().selectFurniture(null);
      }
    },
    [managerRef],
  );
}
