import type { Vec3 } from '@shared/model';

export type FurnitureKind = 'sofa' | 'table' | 'chair' | 'bed' | 'lamp';

export interface FurnitureCatalogItem {
  kind: FurnitureKind;
  label: string;
  size: Vec3;
  color: string;
  /** public/ 기준 GLTF 경로. 없거나 로드 실패 시 박스로 폴백. */
  modelUrl?: string;
}

export interface FurnitureItem {
  id: string;
  kind: FurnitureKind;
  /** 어느 방에 소속된 가구인지. 배치/클램프 계산에 사용. */
  roomId: string;
  position: Vec3;
  rotationY: number;
  size: Vec3;
  color: string;
  modelUrl?: string;
}
