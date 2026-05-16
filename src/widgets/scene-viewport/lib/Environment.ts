import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

/**
 * scene.environment 세팅. PBR 머티리얼이 자연스럽게 보이려면 IBL이 필수.
 *
 * 1) RoomEnvironment(절차적 실내광)를 기본으로 즉시 적용
 * 2) public/hdri/studio.hdr 가 있으면 비동기로 덮어씀 (없으면 그냥 무시)
 *
 * 가구 GLTF와 같은 폴백 패턴: 파일이 있으면 사실감 ↑, 없어도 데모는 동작.
 */
export function setupEnvironment(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  hdriUrl = '/hdri/studio.hdr',
): { dispose: () => void } {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const procedural = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = procedural.texture;

  let hdriTexture: THREE.Texture | null = null;

  new RGBELoader().load(
    hdriUrl,
    (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      const envMap = pmrem.fromEquirectangular(texture).texture;
      scene.environment = envMap;
      hdriTexture = envMap;
      texture.dispose();
      procedural.dispose();
    },
    undefined,
    () => {
      // HDRI 없음 → 절차적 환경광 유지. 정상 동작.
    },
  );

  return {
    dispose: () => {
      scene.environment = null;
      procedural.dispose();
      hdriTexture?.dispose();
      pmrem.dispose();
    },
  };
}
