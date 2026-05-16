import { useEffect, useRef } from 'react';
import { useSceneStore } from '@entities/scene';
import { SceneManager } from '../lib/SceneManager';

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

    const unsub = useSceneStore.subscribe((s, prev) => {
      const roomsChanged = s.rooms !== prev.rooms || s.doorways !== prev.doorways;
      const selectionChanged = s.selection !== prev.selection;
      if (roomsChanged || selectionChanged) {
        const selectedRoom = s.selection?.kind === 'room' ? s.selection.id : null;
        manager.syncRooms(s.rooms, s.doorways, selectedRoom);
      }
      if (s.furniture !== prev.furniture) manager.syncFurniture(s.furniture);
    });

    return () => {
      unsub();
      manager.dispose();
      managerRef.current = null;
    };
  }, [container]);

  return managerRef;
}
