import * as THREE from 'three';

/**
 * IBL(scene.environment)이 베이스 색감을 담당하므로
 * 여기서는 그림자와 방향성을 만드는 directional 하나만 사용.
 * ambient를 추가로 깔면 IBL과 이중으로 더해져 색이 떠서 빠짐.
 */
export function buildLights(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Lights';

  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(5, 8, 5);
  dir.castShadow = true;
  dir.shadow.mapSize.set(2048, 2048);
  dir.shadow.bias = -0.0005;
  const cam = dir.shadow.camera;
  cam.left = -8;
  cam.right = 8;
  cam.top = 8;
  cam.bottom = -8;
  cam.near = 0.5;
  cam.far = 30;
  cam.updateProjectionMatrix();
  group.add(dir);

  return group;
}
