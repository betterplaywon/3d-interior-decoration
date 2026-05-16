import { useCallback, useRef, type MouseEvent, type MutableRefObject, type PointerEvent } from 'react';
import * as THREE from 'three';
import { useSceneStore } from '@entities/scene';
import { clampToRoomBounds } from '@shared/lib/grid';
import type { Vec3 } from '@shared/model';
import type { SceneManager } from '@widgets/scene-viewport/lib';

const DRAG_THRESHOLD_PX = 4;

interface DragState {
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

function ndc(el: HTMLDivElement, clientX: number, clientY: number) {
  const rect = el.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * 2 - 1,
    y: -((clientY - rect.top) / rect.height) * 2 + 1,
  };
}

/**
 * 가구 픽 → 드래그 → 클램프 이동 흐름을 SceneCanvas에서 분리.
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
      const id = manager.pickFurnitureId(x, y);
      if (!id) return;

      const item = useSceneStore.getState().furniture.find((f) => f.id === id);
      const ground = manager.pickGroundPoint(x, y);
      if (!item || !ground) return;

      dragRef.current = {
        id,
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startGround: ground.clone(),
        startItemPos: item.position,
        itemSize: item.size,
        roomId: item.roomId,
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
      useSceneStore.getState().moveFurniture(drag.id, clamped);
    },
    [managerRef],
  );

  const endDrag = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      const manager = managerRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;

      if (!drag.active) {
        useSceneStore.getState().selectFurniture(drag.id);
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
 * 빈 영역 클릭 처리. 가구 위 클릭은 useFurnitureDrag의 pointerup에서 처리하므로
 * 여기서는 가구 hit가 없을 때만 방 선택/해제를 한다.
 */
export function useEmptyClick(managerRef: MutableRefObject<SceneManager | null>) {
  return useCallback(
    (e: PointerEvent<HTMLDivElement> | MouseEvent<HTMLDivElement>) => {
      const manager = managerRef.current;
      if (!manager) return;
      const { x, y } = ndc(e.currentTarget, e.clientX, e.clientY);
      if (manager.pickFurnitureId(x, y) !== null) return;
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
