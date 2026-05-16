import * as THREE from 'three';
import type { LightingCatalogItem, LightingItem } from '../model';

const FIXTURE_RADIUS = 0.08;
const SPOT_TARGET_OFFSET_Y = -1; // SpotLight는 target이 별도 Object3D — 아래쪽을 향하도록.

/**
 * 조명 한 인스턴스를 Group으로 표현. 라이트 자체는 보이지 않으므로
 * 같은 Group에 작은 sphere 메쉬를 함께 두어 위치 인지·피킹 타깃을 제공.
 *
 * - PointLight: 전방향. Group 위치 = item.position.
 * - SpotLight: 원뿔. anchor='ceiling'이면 바닥을 향하도록 target을 음의 Y로.
 *
 * 그림자는 P0 범위에서 켜지 않음 — 광원 다수 × 그림자맵 비용 부담.
 */
export function buildLightingObject(item: LightingItem, catalog: LightingCatalogItem): THREE.Group {
  const group = new THREE.Group();
  group.name = `Lighting:${catalog.kind}:${item.id}`;
  group.userData.lightingId = item.id;

  const light = createLight(catalog);
  group.add(light);

  if (light instanceof THREE.SpotLight) {
    // SpotLight.target은 기본적으로 (0,0,0)에 있는 별도 Object3D — 명시적으로 Group 자식으로 두고 아래로 내려야 원뿔이 향한다
    light.target.position.set(0, SPOT_TARGET_OFFSET_Y, 0);
    group.add(light.target);
  }

  const fixture = buildFixtureMesh(catalog);
  fixture.userData.lightingId = item.id;
  group.add(fixture);

  syncLightingFromItem(group, item);
  return group;
}

export function syncLightingFromItem(group: THREE.Group, item: LightingItem): void {
  const [x, y, z] = item.position;
  group.position.set(x, y, z);
}

function createLight(catalog: LightingCatalogItem): THREE.Light {
  const color = new THREE.Color(catalog.color);
  if (catalog.shape === 'spot') {
    const spot = new THREE.SpotLight(
      color,
      catalog.intensity,
      catalog.distance,
      catalog.angle ?? Math.PI / 6,
      catalog.penumbra ?? 0.3,
      1.2,
    );
    return spot;
  }
  // 마지막 인자(decay=1.2)는 PBR 단위에서 자연 감쇠처럼 보이게 튜닝한 값
  return new THREE.PointLight(color, catalog.intensity, catalog.distance, 1.2);
}

/**
 * 조명 위치 인지·피킹용 작은 sphere. emissive로 항상 빛 색이 보이도록 —
 * 자체 조명 영향을 받지 않게 lights:false 효과 (MeshBasicMaterial 사용)로 단순화.
 */
function buildFixtureMesh(catalog: LightingCatalogItem): THREE.Mesh {
  const geom = new THREE.SphereGeometry(FIXTURE_RADIUS, 12, 8);
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(catalog.color) });
  return new THREE.Mesh(geom, mat);
}
