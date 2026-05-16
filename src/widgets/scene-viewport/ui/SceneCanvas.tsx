import { useState } from 'react';
import { useEmptyClick, useFurnitureDrag } from '@features/furniture-drag';
import { useSceneManager } from '../api';

export function SceneCanvas() {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const managerRef = useSceneManager(container);
  const drag = useFurnitureDrag(managerRef);
  const onClick = useEmptyClick(managerRef);

  return (
    <div
      ref={setContainer}
      onPointerDown={drag.onPointerDown}
      onPointerMove={drag.onPointerMove}
      onPointerUp={drag.onPointerUp}
      onPointerCancel={drag.onPointerCancel}
      onClick={onClick}
      style={{ width: '100%', height: '100%', position: 'relative', touchAction: 'none' }}
    />
  );
}
