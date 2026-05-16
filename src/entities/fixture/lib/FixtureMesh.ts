import * as THREE from 'three';
import { assetCache } from '@shared/lib/asset-cache';
import type { FixtureItem } from '../model';
import { enableShadows, normalizeToBoundingSize } from './modelHelpers';

/**
 * 위생도기 한 인스턴스를 Group으로 표현.
 * 구조는 가구와 동일 — 자식 0번 폴백 박스, GLTF 로드 성공 시 자식 1번 추가.
 *
 * 가구 빌더를 그대로 재사용하지 않는 이유: entities 간 cross-import 금지.
 * userData 키도 fixtureId 로 분리해 raycast 결과 도메인 구분이 명확하다.
 */
export function buildFixtureGroup(item: FixtureItem): THREE.Group {
  const group = new THREE.Group();
  group.name = `Fixture:${item.kind}:${item.id}`;
  group.userData.fixtureId = item.id;

  const fallback = buildFallbackBox(item);
  fallback.name = 'fallback';
  group.add(fallback);

  syncFixtureFromItem(group, item);

  if (item.modelUrl) {
    void loadAndSwap(group, item);
  }

  return group;
}

export function syncFixtureFromItem(group: THREE.Group, item: FixtureItem): void {
  const [x, , z] = item.position;
  group.position.set(x, 0, z);
  group.rotation.y = item.rotationY;
}

function buildFallbackBox(item: FixtureItem): THREE.Mesh {
  const [w, h, d] = item.size;
  const geom = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshStandardMaterial({
    color: item.color,
    roughness: 0.4,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.y = h / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.fixtureId = item.id;
  return mesh;
}

async function loadAndSwap(group: THREE.Group, item: FixtureItem): Promise<void> {
  if (!item.modelUrl) return;
  const loaded = await assetCache.loadCloned(item.modelUrl);
  if (!loaded) return;

  // Group이 dispose 된 뒤 로드가 끝나는 race 방어
  if (!group.parent && group.userData.disposed) return;

  normalizeToBoundingSize(loaded, item.size);
  enableShadows(loaded);

  loaded.name = 'model';
  loaded.traverse((obj) => {
    obj.userData.fixtureId = item.id;
  });

  group.add(loaded);
  const fallback = group.getObjectByName('fallback');
  if (fallback) fallback.visible = false;
}
