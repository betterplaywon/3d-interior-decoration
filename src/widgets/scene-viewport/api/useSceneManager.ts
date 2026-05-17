import { useEffect, useRef } from 'react';
import { useSceneStore } from '@entities/scene';
import type { Room } from '@entities/room';
import { SceneManager } from '../lib/SceneManager';

/** 활성 방의 follow-trigger key — 좌표/크기 중 하나라도 바뀌면 focus 재호출. */
function roomFocusKey(room: Room | undefined): string {
  if (!room) return '';
  return `${room.id}:${room.cellX}:${room.cellZ}:${room.cellsW}:${room.cellsD}`;
}

/**
 * 컨테이너 DOM에 SceneManager를 마운트하고, store의 rooms/doorways/furniture
 * 변경을 명령형으로 scene에 반영. 매니저 인스턴스는 ref로 반환해
 * 컨테이너 컴포넌트(피킹, 입력 처리 등)에서 직접 접근 가능.
 */
export function useSceneManager(container: HTMLElement | null) {
  const managerRef = useRef<SceneManager | null>(null);

  useEffect(() => {
    if (!container) return;
    const manager = new SceneManager(container);
    managerRef.current = manager;

    const state = useSceneStore.getState();
    const initialSelectedRoom = state.selection?.kind === 'room' ? state.selection.id : null;
    manager.syncRooms(state.rooms, state.doorways, initialSelectedRoom);
    manager.syncFurniture(state.furniture);
    manager.syncLights(state.lights);
    manager.syncFixtures(state.fixtures);
    // 첫 mount 는 instant 로 — orbit/top 기본 카메라가 원점에서 시작하므로
    // 활성 방이 멀리 있어도 깜빡임 없이 그 자리로 바로 점프.
    const initialActive = state.rooms.find((r) => r.id === state.activeRoomId);
    if (initialActive) manager.focusOnRoom(initialActive, { instant: true });

    let prevFocusKey = roomFocusKey(initialActive);
    let prevCameraMode = state.cameraMode;

    const unsub = useSceneStore.subscribe((s, prev) => {
      const roomsChanged = s.rooms !== prev.rooms || s.doorways !== prev.doorways;
      const selectionChanged = s.selection !== prev.selection;
      if (roomsChanged || selectionChanged) {
        const selectedRoom = s.selection?.kind === 'room' ? s.selection.id : null;
        manager.syncRooms(s.rooms, s.doorways, selectedRoom);
      }
      if (s.furniture !== prev.furniture) manager.syncFurniture(s.furniture);
      if (s.lights !== prev.lights) manager.syncLights(s.lights);
      if (s.fixtures !== prev.fixtures) manager.syncFixtures(s.fixtures);

      const activeRoom = s.rooms.find((r) => r.id === s.activeRoomId);
      const nextKey = roomFocusKey(activeRoom);
      // 활성 방 자체나 그 방의 좌표·크기 변화에만 반응. cameraMode 전환은 SceneManager 내부에서
      // 이미 현재 target.xz 를 보존하므로 별도 focus 호출 불필요지만, 새 모드가 일관된 거리감을
      // 잡도록 instant 한 번 더 호출해 둠.
      if (activeRoom && nextKey !== prevFocusKey) {
        manager.focusOnRoom(activeRoom);
        prevFocusKey = nextKey;
      }
      if (s.cameraMode !== prevCameraMode) {
        if (activeRoom) manager.focusOnRoom(activeRoom, { instant: true });
        prevCameraMode = s.cameraMode;
      }
    });

    return () => {
      unsub();
      manager.dispose();
      managerRef.current = null;
    };
  }, [container]);

  return managerRef;
}
