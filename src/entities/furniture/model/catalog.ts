import type { FurnitureCatalogItem } from './types';

/**
 * modelUrl은 public/ 기준 절대 경로. 사용자가 해당 파일을
 * public/models/ 아래에 두면 자동 로드, 없으면 박스로 폴백.
 * 권장 무료 출처: Poly Haven, Kenney furniture pack, Sketchfab CC0.
 */
export const FURNITURE_CATALOG: readonly FurnitureCatalogItem[] = [
  { kind: 'sofa', label: '소파', size: [2.0, 0.8, 0.9], color: '#8a7a6b', modelUrl: '/models/Sofa_03/Sofa_03_4k.gltf' },
  {
    kind: 'table',
    label: '테이블',
    size: [1.2, 0.45, 0.7],
    color: '#6b4f3a',
    modelUrl: '/models/wooden_table_02_4k.gltf/wooden_table_02_4k.gltf',
  },
  {
    kind: 'chair',
    label: '의자',
    size: [0.5, 0.9, 0.5],
    color: '#3a3a3a',
    modelUrl: '/models/dining_chair_02/dining_chair_02_4k.gltf',
  },
  {
    kind: 'bed',
    label: '침대',
    size: [1.6, 0.5, 2.0],
    color: '#cfcab8',
    modelUrl: '/models/GothicBed_01/GothicBed_01_4k.gltf',
  },
  {
    kind: 'lamp',
    label: '스탠드',
    size: [0.3, 1.5, 0.3],
    color: '#d9b86a',
    modelUrl: '/models/desk_lamp_arm_01/desk_lamp_arm_01_4k.gltf',
  },
] as const;
