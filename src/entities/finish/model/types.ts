/**
 * 마감재는 "어느 면(바닥/벽/천장)에 적용 가능한지"를 카테고리로 가진다.
 * 도메인 현실: 같은 페인트가 벽·천장에 다 쓰일 수 있고, 타일은 보통 바닥/벽만.
 * Room 쪽에서 카테고리 호환을 검증해 잘못된 조합(예: 바닥 슬롯에 천장 전용)을 막는다.
 */
export type FinishSurface = 'floor' | 'wall' | 'ceiling';

export type FinishCategory = 'paint' | 'tile' | 'wood' | 'concrete' | 'wallpaper';

export interface FinishItem {
  id: string;
  label: string;
  category: FinishCategory;
  /** 적용 가능한 면 종류. 빈 배열 금지(타입 차원에서 막진 않음). */
  applicableTo: readonly FinishSurface[];
  /** PBR 베이스 컬러 (hex). 텍스처가 있으면 곱해진다. */
  baseColor: string;
  roughness: number;
  metalness: number;
  /**
   * 반복 패턴 텍스처(타일 컷 등) URL. 없으면 단색 프로시저럴.
   * 텍스처는 wrap = RepeatWrapping, repeat 은 textureRepeatPerMeter 로 결정.
   */
  baseColorMap?: string;
  /**
   * 노말맵 URL. Poly Haven `_nor_gl_*` (OpenGL convention) 권장.
   * sRGB 가 아닌 linear 데이터라 textureCache 의 data 경로로 로드해야 함.
   */
  normalMap?: string;
  /**
   * 러프니스맵 URL. Poly Haven `_rough_*` 권장. linear 데이터.
   * 적용 시 material.roughness 는 1.0 으로 두고 맵 값이 곱해지게 함.
   */
  roughnessMap?: string;
  /** 텍스처 반복 밀도(미터당 반복 횟수). 예: 0.5면 2m마다 한 번 반복. */
  textureRepeatPerMeter?: number;
  /** 면적당 단가(KRW/m²). 견적 v2에서 사용. */
  pricePerSqmKRW: number;
}
