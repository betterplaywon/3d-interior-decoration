import { useCallback, useEffect, type MouseEvent, type MutableRefObject, type PointerEvent } from 'react';
import { useSceneStore } from '@entities/scene';
import { NEW_ROOM_TEMPLATE } from '@entities/room';
import { hasOverlap, snapRoomSlot } from '@shared/lib/grid';
import type { SceneManager } from '@widgets/scene-viewport/lib';
import { usePlacementStore } from './placementStore';

export interface RoomPlacementHandlers {
  active: boolean;
  onPointerMove: (e: PointerEvent<HTMLDivElement>) => void;
  onClick: () => void;
  onContextMenu: (e: MouseEvent<HTMLDivElement>) => void;
}

function ndc(el: HTMLDivElement, clientX: number, clientY: number) {
  const rect = el.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * 2 - 1,
    y: -((clientY - rect.top) / rect.height) * 2 + 1,
  };
}

/**
 * SceneCanvas 가 사용. placement.active 동안 ghost 위치/유효성 계산 + 클릭 commit + 우클릭 cancel.
 * ESC 취소는 window keydown 으로 모드 진행 중에만 등록(div 가 focusable 아님).
 * 패턴은 features/furniture-drag/useFurnitureDrag 와 동일 — features 가 widgets/SceneManager 를
 * type-only 로 참조하고 ref 로 받아쓰는 방식.
 */
export function useRoomPlacement(
  managerRef: MutableRefObject<SceneManager | null>,
): RoomPlacementHandlers {
  const active = usePlacementStore((s) => s.active);
  const setGhost = usePlacementStore((s) => s.setGhost);
  const end = usePlacementStore((s) => s.end);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') end();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, end]);

  // 모드 해제 시 ghost 도 매니저에서 즉시 제거 (mount 직후 ref null 가능성은 effect deps 가 보장)
  useEffect(() => {
    if (active) return;
    managerRef.current?.setRoomGhost(null);
  }, [active, managerRef]);

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!active) return;
      const manager = managerRef.current;
      if (!manager) return;
      const { x, y } = ndc(e.currentTarget, e.clientX, e.clientY);
      const ground = manager.pickGroundPoint(x, y);
      if (!ground) {
        setGhost(null);
        manager.setRoomGhost(null);
        return;
      }
      const { cellsW, cellsD } = NEW_ROOM_TEMPLATE;
      const slot = snapRoomSlot(ground.x, ground.z, cellsW, cellsD);
      const rooms = useSceneStore.getState().rooms;
      const valid = !hasOverlap({ ...slot, cellsW, cellsD }, rooms);
      const ghost = { ...slot, cellsW, cellsD, valid };
      setGhost(ghost);
      manager.setRoomGhost(ghost);
    },
    [active, managerRef, setGhost],
  );

  const onClick = useCallback(() => {
    if (!active) return;
    const ghost = usePlacementStore.getState().ghost;
    if (!ghost || !ghost.valid) return;
    useSceneStore.getState().addRoom({ cellX: ghost.cellX, cellZ: ghost.cellZ });
    end();
  }, [active, end]);

  const onContextMenu = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (!active) return;
      e.preventDefault();
      end();
    },
    [active, end],
  );

  return { active, onPointerMove, onClick, onContextMenu };
}

/** Toolbar 가 버튼 라벨/aria-pressed 결정에 쓰는 가벼운 셀렉터. */
export function useRoomPlacementActive(): boolean {
  return usePlacementStore((s) => s.active);
}

/** Toolbar 의 "+ 방 추가" 클릭 핸들러. 모드 시작/취소 토글. */
export function useRoomPlacementToggle(): () => void {
  const active = usePlacementStore((s) => s.active);
  const begin = usePlacementStore((s) => s.begin);
  const end = usePlacementStore((s) => s.end);
  return useCallback(() => {
    if (active) end();
    else begin();
  }, [active, begin, end]);
}
