import { useEffect, type MutableRefObject } from 'react';
import { useSceneStore } from '@entities/scene';
import type { SceneManager } from '@widgets/scene-viewport/lib';

/**
 * store의 cameraMode 변화를 SceneManager로 명령형 전달.
 * useSceneManager가 mount된 직후엔 cameraMode도 동기화돼야 하므로
 * managerRef.current 변경(첫 마운트)도 deps에 포함.
 */
export function useCameraMode(managerRef: MutableRefObject<SceneManager | null>): void {
  const cameraMode = useSceneStore((s) => s.cameraMode);

  useEffect(() => {
    const manager = managerRef.current;
    if (!manager) return;
    manager.setCameraMode(cameraMode);
  }, [managerRef, cameraMode]);
}
