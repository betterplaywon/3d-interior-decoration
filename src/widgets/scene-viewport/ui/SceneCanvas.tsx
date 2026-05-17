import { useState, type PointerEvent, type MouseEvent } from 'react';
import { useCameraMode } from '@features/camera-mode';
import { useEmptyClick, useFurnitureDrag } from '@features/furniture-drag';
import { useRoomPlacement } from '@features/room-placement';
import { useSceneManager } from '../api';

export function SceneCanvas() {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const managerRef = useSceneManager(container);
  useCameraMode(managerRef);
  const drag = useFurnitureDrag(managerRef);
  const onEmptyClick = useEmptyClick(managerRef);
  const placement = useRoomPlacement(managerRef);

  // placement 모드는 다른 인터랙션(드래그/카메라/빈클릭)을 완전히 가로채는 모달 모드 —
  // 핸들러 우선순위 분기를 한 곳에 모아 SceneCanvas 가 모드 라우터 역할.
  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (placement.active) return;
    drag.onPointerDown(e);
  };
  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (placement.active) {
      placement.onPointerMove(e);
      return;
    }
    drag.onPointerMove(e);
  };
  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (placement.active) {
      placement.onClick();
      return;
    }
    onEmptyClick(e);
  };
  const handleContextMenu = (e: MouseEvent<HTMLDivElement>) => {
    if (placement.active) placement.onContextMenu(e);
  };

  return (
    <div
      ref={setContainer}
      data-mode={placement.active ? 'room-placement' : undefined}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={drag.onPointerUp}
      onPointerCancel={drag.onPointerCancel}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      style={{ width: '100%', height: '100%', position: 'relative', touchAction: 'none' }}
    />
  );
}
