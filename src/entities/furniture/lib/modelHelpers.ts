import * as THREE from 'three';

/**
 * GLTF의 후손 Mesh들이 그림자를 캐스팅·리시브하도록 켜기.
 * 원본 머티리얼은 그대로 두어 PBR 룩 유지.
 */
export function enableShadows(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
}

/**
 * GLTF의 스케일/원점을 카탈로그 size(가로·세로·깊이)에 맞춤.
 * - bounding box 측정 후, 가장 빠듯한 축 기준이 아니라 각 축 독립 스케일
 *   (비례 유지가 필요하면 추후 옵션으로 분기 가능)
 * - 모델 원점을 바닥 중앙(y=0, x=z=0)으로 정렬
 */
export function normalizeToBoundingSize(
  root: THREE.Object3D,
  targetSize: readonly [number, number, number],
): void {
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);

  const sx = size.x > 0 ? targetSize[0] / size.x : 1;
  const sy = size.y > 0 ? targetSize[1] / size.y : 1;
  const sz = size.z > 0 ? targetSize[2] / size.z : 1;
  root.scale.set(sx, sy, sz);

  // 스케일 적용 후 다시 측정 → 중앙으로 이동
  const box2 = new THREE.Box3().setFromObject(root);
  const center = new THREE.Vector3();
  box2.getCenter(center);
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= box2.min.y; // 바닥이 y=0이 되도록
}
