import type { FinishItem } from './types';

/**
 * 초기 마감재 카탈로그. 색·roughness는 현실 인테리어 자재 기준으로 대충 맞춤.
 * 단가는 시공 견적의 일반적인 범위(평당 시공비) 참고치 — 실제 운영 시 외부 데이터 소싱.
 */
export const FINISH_CATALOG: readonly FinishItem[] = [
  {
    id: 'floor-oak',
    label: '오크 원목 마루',
    category: 'wood',
    applicableTo: ['floor'],
    baseColor: '#c9a574',
    roughness: 0.7,
    metalness: 0.0,
    pricePerSqmKRW: 180000,
  },
  {
    id: 'floor-walnut',
    label: '월넛 마루',
    category: 'wood',
    applicableTo: ['floor'],
    baseColor: '#6b4a32',
    roughness: 0.6,
    metalness: 0.0,
    pricePerSqmKRW: 230000,
  },
  {
    id: 'floor-marble-tile',
    label: '대리석 타일(바닥)',
    category: 'tile',
    applicableTo: ['floor', 'wall'],
    baseColor: '#e8e2d6',
    roughness: 0.25,
    metalness: 0.0,
    pricePerSqmKRW: 320000,
  },
  {
    id: 'floor-concrete-polished',
    label: '폴리싱 콘크리트',
    category: 'concrete',
    applicableTo: ['floor', 'wall'],
    baseColor: '#9b9893',
    roughness: 0.45,
    metalness: 0.0,
    pricePerSqmKRW: 140000,
  },
  {
    id: 'wall-paint-ivory',
    label: '아이보리 페인트',
    category: 'paint',
    applicableTo: ['wall', 'ceiling'],
    baseColor: '#f1ebe0',
    roughness: 0.95,
    metalness: 0.0,
    pricePerSqmKRW: 35000,
  },
  {
    id: 'wall-paint-charcoal',
    label: '차콜 페인트',
    category: 'paint',
    applicableTo: ['wall', 'ceiling'],
    baseColor: '#3a3a3e',
    roughness: 0.9,
    metalness: 0.0,
    pricePerSqmKRW: 38000,
  },
  {
    id: 'wall-wallpaper-linen',
    label: '리넨 벽지',
    category: 'wallpaper',
    applicableTo: ['wall'],
    baseColor: '#d8cdb8',
    roughness: 0.88,
    metalness: 0.0,
    pricePerSqmKRW: 55000,
  },
  {
    id: 'wall-tile-subway',
    label: '서브웨이 타일',
    category: 'tile',
    applicableTo: ['wall'],
    baseColor: '#eeeeee',
    roughness: 0.3,
    metalness: 0.0,
    pricePerSqmKRW: 180000,
  },
  {
    id: 'ceiling-paint-white',
    label: '천장 화이트 페인트',
    category: 'paint',
    applicableTo: ['ceiling'],
    baseColor: '#fbfaf6',
    roughness: 0.95,
    metalness: 0.0,
    pricePerSqmKRW: 32000,
  },
] as const;

/** id로 카탈로그 항목 조회. 없으면 null. */
export function findFinish(id: string | null | undefined): FinishItem | null {
  if (!id) return null;
  return FINISH_CATALOG.find((f) => f.id === id) ?? null;
}
