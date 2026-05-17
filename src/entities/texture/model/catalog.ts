import type { TextureItem } from './types';

/**
 * 초기 텍스처 카탈로그. public/textures/<polyHavenCategory>/<slug>/ 폴더 규약에 맞춰
 * 실제 디스크 에셋 기반으로 구성. 옛 finish 카탈로그의 슬러그(herringbone_parquet 등)는
 * 디스크에 부재하여 색 폴백 상태였으므로 전부 폐기하고 디스크 7슬러그로 재시작한다.
 *
 * URL 패턴은 Poly Haven CC0 4K 텍스처 패키지 표준 — diff/nor_gl/rough.
 * 슬러그별 단가/룩 파라미터는 매입가 대표값(운영 시 외부 소싱).
 */
export const TEXTURE_CATALOG: readonly TextureItem[] = [
  {
    id: 'tile-interior',
    label: '인테리어 타일',
    category: 'tile',
    polyHavenCategory: 'tiles',
    applicableTo: ['floor', 'wall'],
    baseColor: '#d8d2c4',
    roughness: 0.5,
    metalness: 0,
    baseColorMap: '/textures/tiles/interior_tiles_4k/textures/interior_tiles_diff_4k.jpg',
    normalMap: '/textures/tiles/interior_tiles_4k/textures/interior_tiles_nor_gl_4k.jpg',
    roughnessMap: '/textures/tiles/interior_tiles_4k/textures/interior_tiles_arm_4k.jpg',
    textureRepeatPerMeter: 0.6,
    pricePerSqmKRW: 85_000,
  },
  {
    id: 'floor-linoleum-brown',
    label: '갈색 리놀륨 바닥',
    category: 'linoleum',
    polyHavenCategory: 'floor',
    applicableTo: ['floor'],
    baseColor: '#8a6b4a',
    roughness: 0.7,
    metalness: 0,
    baseColorMap: '/textures/floor/linoleum_brown_4k/textures/linoleum_brown_diff_4k.jpg',
    normalMap: '/textures/floor/linoleum_brown_4k/textures/linoleum_brown_nor_gl_4k.jpg',
    roughnessMap: '/textures/floor/linoleum_brown_4k/textures/linoleum_brown_arm_4k.jpg',
    textureRepeatPerMeter: 0.5,
    pricePerSqmKRW: 45_000,
  },
  {
    id: 'stone-marble-cliff',
    label: '마블 클리프 석재',
    category: 'stone',
    polyHavenCategory: 'rock',
    applicableTo: ['floor', 'wall'],
    baseColor: '#b8b3a8',
    roughness: 0.45,
    metalness: 0,
    baseColorMap: '/textures/rock/marble_cliff_03_4k/textures/marble_cliff_03_diff_4k.jpg',
    normalMap: '/textures/rock/marble_cliff_03_4k/textures/marble_cliff_03_nor_gl_4k.jpg',
    roughnessMap: '/textures/rock/marble_cliff_03_4k/textures/marble_cliff_03_arm_4k.jpg',
    textureRepeatPerMeter: 0.4,
    pricePerSqmKRW: 220_000,
  },
  {
    id: 'concrete-painted',
    label: '도장 콘크리트',
    category: 'concrete',
    polyHavenCategory: 'concrete',
    applicableTo: ['floor', 'wall', 'ceiling'],
    baseColor: '#cfcdc6',
    roughness: 0.75,
    metalness: 0,
    baseColorMap: '/textures/concrete/painted_concrete_02_4k/textures/painted_concrete_02_diff_4k.jpg',
    normalMap: '/textures/concrete/painted_concrete_02_4k/textures/painted_concrete_02_nor_gl_4k.jpg',
    roughnessMap: '/textures/concrete/painted_concrete_02_4k/textures/painted_concrete_02_arm_4k.jpg',
    textureRepeatPerMeter: 0.4,
    pricePerSqmKRW: 70_000,
  },
  {
    id: 'wall-painted-plaster',
    label: '도장 회반죽 벽',
    category: 'paint',
    polyHavenCategory: 'plaster-concrete',
    applicableTo: ['wall', 'ceiling'],
    baseColor: '#ece7df',
    roughness: 0.85,
    metalness: 0,
    baseColorMap: '/textures/plaster-concrete/painted_plaster_wall_4k/textures/painted_plaster_wall_diff_4k.jpg',
    normalMap: '/textures/plaster-concrete/painted_plaster_wall_4k/textures/painted_plaster_wall_nor_gl_4k.jpg',
    roughnessMap: '/textures/plaster-concrete/painted_plaster_wall_4k/textures/painted_plaster_wall_arm_4k.jpg',
    textureRepeatPerMeter: 0.5,
    pricePerSqmKRW: 38_000,
  },
  {
    id: 'floor-plank-flooring',
    label: '원목 플랭크 바닥',
    category: 'wood',
    polyHavenCategory: 'wood',
    applicableTo: ['floor'],
    baseColor: '#a47a52',
    roughness: 0.6,
    metalness: 0,
    baseColorMap: '/textures/wood/plank_flooring_04_4k/textures/plank_flooring_04_diff_4k.jpg',
    normalMap: '/textures/wood/plank_flooring_04_4k/textures/plank_flooring_04_nor_gl_4k.jpg',
    roughnessMap: '/textures/wood/plank_flooring_04_4k/textures/plank_flooring_04_arm_4k.jpg',
    textureRepeatPerMeter: 0.4,
    pricePerSqmKRW: 125_000,
  },
] as const;

export function findTexture(id: string | null | undefined): TextureItem | null {
  if (!id) return null;
  return TEXTURE_CATALOG.find((t) => t.id === id) ?? null;
}
