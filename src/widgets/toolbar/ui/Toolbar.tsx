import { useSceneStore } from '@entities/scene';
import { useRoomPlacementActive, useRoomPlacementToggle } from '@features/room-placement';

export function Toolbar() {
  const cameraMode = useSceneStore((s) => s.cameraMode);
  const setCameraMode = useSceneStore((s) => s.setCameraMode);
  const resetScene = useSceneStore((s) => s.resetScene);
  const placementActive = useRoomPlacementActive();
  const togglePlacement = useRoomPlacementToggle();

  return (
    <header className="toolbar">
      <strong>3D Interior</strong>
      <div className="row">
        <button
          onClick={togglePlacement}
          aria-pressed={placementActive}
          title="그리드에서 빈 자리를 클릭해 방을 배치 (ESC/우클릭 취소)"
        >
          {placementActive ? '배치 중… (ESC 취소)' : '+ 방 추가'}
        </button>
        <button aria-pressed={cameraMode === 'orbit'} onClick={() => setCameraMode('orbit')}>
          Orbit
        </button>
        <button aria-pressed={cameraMode === 'top'} onClick={() => setCameraMode('top')}>
          Top
        </button>
        <button
          aria-pressed={cameraMode === 'first'}
          onClick={() => setCameraMode('first')}
          title="WASD로 이동, 캔버스 클릭으로 마우스 락"
        >
          1인칭
        </button>
        <button onClick={resetScene}>전체 비우기</button>
      </div>
    </header>
  );
}
