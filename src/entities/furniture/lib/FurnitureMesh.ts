import * as THREE from 'three';
import { assetCache } from '@shared/lib/asset-cache';
import type { FurnitureItem } from '../model';
import { enableShadows, normalizeToBoundingSize } from './modelHelpers';

/**
 * 가구 한 인스턴스를 Group으로 표현.
 * - 자식 0번: 폴백 박스 (즉시 표시 + GLTF 실패 시 영구 표시)
 * - 자식 1번: GLTF 로드 성공 시 추가, 박스는 visible=false 처리
 *
 * 위치/회전/스케일은 Group이 소유. 자식은 모델 정규화 결과만 담음.
 * Raycast가 자식 어디를 맞히든 furnitureId를 찾을 수 있도록 모든
 * 후손 mesh의 userData에 id를 부여.
 */
export function buildFurnitureGroup(item: FurnitureItem): THREE.Group {
  const group = new THREE.Group();
  group.name = `Furniture:${item.kind}:${item.id}`;
  group.userData.furnitureId = item.id;

  const fallback = buildFallbackBox(item);
  fallback.name = 'fallback';
  group.add(fallback);

  syncGroupFromItem(group, item);

  if (item.modelUrl) {
    void loadAndSwap(group, item);
  }

  return group;
}

export function syncGroupFromItem(group: THREE.Group, item: FurnitureItem): void {
  const [x, , z] = item.position;
  group.position.set(x, 0, z);
  group.rotation.y = item.rotationY;
}

function buildFallbackBox(item: FurnitureItem): THREE.Mesh {
  const [w, h, d] = item.size;
  const geom = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshStandardMaterial({
    color: item.color,
    roughness: 0.75,
    metalness: 0.05,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.y = h / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.furnitureId = item.id;
  return mesh;
}

async function loadAndSwap(group: THREE.Group, item: FurnitureItem): Promise<void> {
  if (!item.modelUrl) return;
  const loaded = await assetCache.loadCloned(item.modelUrl);
  if (!loaded) return; // 파일 없음 → 폴백 유지

  // Group이 dispose 된 뒤 로드가 끝나는 race 방어
  if (!group.parent && group.userData.disposed) return;

  normalizeToBoundingSize(loaded, item.size);
  enableShadows(loaded);

  loaded.name = 'model';
  // 모든 후손에 id 전파 (raycast 결과에서 부모를 거슬러 올라가지 않아도 됨)
  loaded.traverse((obj) => {
    obj.userData.furnitureId = item.id;
  });

  group.add(loaded);
  const fallback = group.getObjectByName('fallback');
  if (fallback) fallback.visible = false;
}
