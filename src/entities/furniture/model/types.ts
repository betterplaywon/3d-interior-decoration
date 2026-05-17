import type { AssetId, Vec3 } from '@shared/model';

export type FurnitureKind =
  | 'sofa'
  | 'table'
  | 'chair'
  | 'bed'
  | 'lamp'
  | 'desk'
  | 'shelf'
  | 'cabinet';

/**
 * 가구 도메인 nominal id. 카탈로그 unique key 이자 인스턴스 식별 축.
 * kind 는 카테고리(룸 제약·견적 분류) 로만 쓰고, 같은 kind 안에서
 * assetId 로 실제 에셋(렌더·단가) 을 구분.
 */
export type FurnitureAssetId = AssetId<'furniture'>;

export interface FurnitureCatalogItem {
  assetId: FurnitureAssetId;
  kind: FurnitureKind;
  label: string;
  size: Vec3;
  color: string;
  /** public/ 기준 GLTF 경로. 없거나 로드 실패 시 박스로 폴백. */
  modelUrl?: string;
}

export interface FurnitureItem {
  id: string;
  assetId: FurnitureAssetId;
  kind: FurnitureKind;
  /** 어느 방에 소속된 가구인지. 배치/클램프 계산에 사용. */
  roomId: string;
  position: Vec3;
  rotationY: number;
  size: Vec3;
  color: string;
  modelUrl?: string;
}
