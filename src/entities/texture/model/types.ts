import type { PolyHavenTextureCategory } from '@shared/model';

/**
 * 텍스처는 "어느 면(바닥/벽/천장)에 적용 가능한지"를 카테고리로 가진다.
 * 도메인 현실: 같은 페인트가 벽·천장에 다 쓰일 수 있고, 타일은 보통 바닥/벽만.
 * Room 쪽에서 카테고리 호환을 검증해 잘못된 조합(예: 바닥 슬롯에 천장 전용)을 막는다.
 */
export type TextureSurface = 'floor' | 'wall' | 'ceiling';

/**
 * 앱 도메인 어휘. 견적/UI 의 한국어 라벨 매핑과 1:1.
 * Poly Haven 의 소스 카테고리(`polyHavenCategory`)와는 축이 다르다 —
 * 같은 'wood' 라도 앱은 'wood'(원목 마감) vs Poly Haven 도 'wood' 처럼
 * 우연히 일치할 뿐, 별도 메타로 보존해 폴더 규약과 1:1 매핑에 사용.
 */
export type TextureCategory =
  | 'paint'
  | 'tile'
  | 'wood'
  | 'concrete'
  | 'wallpaper'
  | 'stone'
  | 'linoleum';

export interface TextureItem {
  id: string;
  label: string;
  category: TextureCategory;
  /**
   * Poly Haven API 카테고리. public/textures/<polyHavenCategory>/<slug>/ 폴더
   * 규약과 카탈로그 항목을 컴파일 타임에 묶어 typo/누락 방지.
   */
  polyHavenCategory: PolyHavenTextureCategory;
  /** 적용 가능한 면 종류. 빈 배열 금지(타입 차원에서 막진 않음). */
  applicableTo: readonly TextureSurface[];
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
   * Poly Haven 의 ARM 통합 맵 URL(`_arm_*`). linear 데이터.
   * AO(R) · Roughness(G) · Metalness(B) 가 한 텍스처에 packed 되어 있어 빌더가
   * roughnessMap / metalnessMap 두 슬롯에 같은 객체를 묶어 GPU 메모리 1회분으로
   * PBR 두 변수를 동시에 구동한다(AO 는 uv2 비요구 환경이라 생략).
   */
  roughnessMap?: string;
  /** 텍스처 반복 밀도(미터당 반복 횟수). 예: 0.5면 2m마다 한 번 반복. */
  textureRepeatPerMeter?: number;
  /** 면적당 단가(KRW/m²). 견적 v2에서 사용. */
  pricePerSqmKRW: number;
}
