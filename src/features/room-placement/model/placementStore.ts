import { create } from 'zustand';

interface GhostSlot {
  cellX: number;
  cellZ: number;
  cellsW: number;
  cellsD: number;
  /** 충돌 없으면 true (placement valid). UI 가 ghost 색·클릭 동작 결정. */
  valid: boolean;
}

interface PlacementState {
  active: boolean;
  ghost: GhostSlot | null;

  begin(): void;
  setGhost(ghost: GhostSlot | null): void;
  end(): void;
}

/**
 * 방 placement 모드의 ephemeral UI 상태. Toolbar(버튼 토글)와 SceneCanvas(pointer 핸들러)가
 * 공유해야 하므로 hook 로컬 state 가 아닌 mini-store. persist 대상이 아님 — 새로고침 시 모드는 항상 해제.
 *
 * 도메인 데이터(rooms/doorways/...)는 sceneStore 에 있고, 여기는 "이 액션이 진행 중인가" 만 다룬다.
 */
export const usePlacementStore = create<PlacementState>((set) => ({
  active: false,
  ghost: null,

  begin: () => set({ active: true, ghost: null }),
  setGhost: (ghost) => set({ ghost }),
  end: () => set({ active: false, ghost: null }),
}));
