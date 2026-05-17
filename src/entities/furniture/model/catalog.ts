import { asAssetId } from '@shared/model';

import type { FurnitureAssetId, FurnitureCatalogItem, FurnitureKind } from './types';

const id = (slug: string): FurnitureAssetId => asAssetId<'furniture'>(`furniture/${slug}`);

/**
 * modelUrl은 public/ 기준 절대 경로. 사용자가 해당 파일을
 * public/models/ 아래에 두면 자동 로드, 없으면 박스로 폴백.
 * 권장 무료 출처: Poly Haven, Kenney furniture pack, Sketchfab CC0.
 *
 * 같은 kind 다중 항목 패턴 — chair 2종 / table 3종 / sofa 2종이 공존해
 * 사용자가 카테고리 안에서 실체를 선택. assetId 가 unique key, kind 는 분류 축.
 */
export const FURNITURE_CATALOG: readonly FurnitureCatalogItem[] = [
  {
    assetId: id('sofa_03'),
    kind: 'sofa',
    label: '소파',
    size: [2.0, 0.8, 0.9],
    color: '#8a7a6b',
    modelUrl: '/models/Sofa_03/Sofa_03_4k.gltf',
  },
  {
    assetId: id('sofa_02'),
    kind: 'sofa',
    label: '소파 (모던)',
    size: [2.2, 0.85, 1.0],
    color: '#6e6258',
    modelUrl: '/models/furniture/sofa_02_4k.gltf/sofa_02_4k.gltf',
  },
  {
    assetId: id('wooden_table_02'),
    kind: 'table',
    label: '테이블 (원목)',
    size: [1.2, 0.45, 0.7],
    color: '#6b4f3a',
    modelUrl: '/models/furniture/wooden_table_02_4k/wooden_table_02_4k.gltf',
  },
  {
    assetId: id('coffee_table_round_01'),
    kind: 'table',
    label: '커피 테이블 (라운드)',
    size: [0.9, 0.4, 0.9],
    color: '#5b4636',
    modelUrl: '/models/furniture/coffee_table_round_01_4k.gltf/coffee_table_round_01_4k.gltf',
  },
  {
    assetId: id('small_wooden_table_01'),
    kind: 'table',
    label: '작은 사이드 테이블',
    size: [0.6, 0.5, 0.6],
    color: '#7a5c44',
    modelUrl: '/models/furniture/small_wooden_table_01_4k.gltf/small_wooden_table_01_4k.gltf',
  },
  {
    assetId: id('dining_chair_02'),
    kind: 'chair',
    label: '의자 (다이닝)',
    size: [0.5, 0.9, 0.5],
    color: '#3a3a3a',
    modelUrl: '/models/dining_chair_02/dining_chair_02_4k.gltf',
  },
  {
    assetId: id('mid_century_lounge_chair'),
    kind: 'chair',
    label: '의자 (미드센추리)',
    size: [0.75, 0.8, 0.75],
    color: '#8a6648',
    modelUrl: '/models/furniture/mid_century_lounge_chair_4k.gltf/mid_century_lounge_chair_4k.gltf',
  },
  {
    assetId: id('plastic_monobloc_chair_01'),
    kind: 'chair',
    label: '의자 (플라스틱)',
    size: [0.45, 0.8, 0.5],
    color: '#d9d4ca',
    modelUrl: '/models/furniture/plastic_monobloc_chair_01_4k.gltf/plastic_monobloc_chair_01_4k.gltf',
  },
  {
    assetId: id('gothic_bed_01'),
    kind: 'bed',
    label: '침대',
    size: [1.6, 0.5, 2.0],
    color: '#cfcab8',
    modelUrl: '/models/GothicBed_01/GothicBed_01_4k.gltf',
  },
  {
    assetId: id('desk_lamp_arm_01'),
    kind: 'lamp',
    label: '스탠드',
    size: [0.3, 1.5, 0.3],
    color: '#d9b86a',
    modelUrl: '/models/desk_lamp_arm_01/desk_lamp_arm_01_4k.gltf',
  },
] as const;

export function findFurnitureCatalogByAssetId(
  assetId: string | null | undefined,
): FurnitureCatalogItem | null {
  if (!assetId) return null;
  return FURNITURE_CATALOG.find((c) => c.assetId === assetId) ?? null;
}

/**
 * persist v1→v2 마이그레이션 전용. 기존 v1 데이터는 assetId 가 없고 kind 만
 * 있으므로 카테고리 안의 첫 카탈로그 항목으로 부드럽게 강등. 사용자가 의도한
 * 카테고리는 유지, 구체 에셋만 디폴트로. S7 에서 격리/제거 예정.
 */
export function findFirstFurnitureByKind(kind: FurnitureKind): FurnitureCatalogItem | null {
  return FURNITURE_CATALOG.find((c) => c.kind === kind) ?? null;
}
