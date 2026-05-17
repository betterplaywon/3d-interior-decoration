import type { ShippingMethod, Vec3 } from '@shared/model';

export type FixtureKind = 'bathtub' | 'showerHead' | 'washbasin' | 'faucet' | 'toilet';

/**
 * 위생도기 분류. 가구·조명과 달리 한 룸 안에서 도기/수전/샤워설비 단위로
 * 묶어 보여줄 일이 잦아 카테고리를 도메인 어휘 그대로 둠.
 */
export type FixtureCategory = 'sanitary' | 'faucet' | 'shower';

export interface FixtureCatalogItem {
  kind: FixtureKind;
  label: string;
  category: FixtureCategory;
  shipping: ShippingMethod;
  size: Vec3;
  color: string;
  /** 단품 단가(KRW). 마감재처럼 면적 단가가 아니라 개당. */
  priceKRW: number;
  /** public/ 기준 GLTF 경로. 없거나 로드 실패 시 박스로 폴백. */
  modelUrl?: string;
}

export interface FixtureItem {
  id: string;
  kind: FixtureKind;
  /** 어느 방에 소속된 위생도기인지. 배치/클램프 계산에 사용. */
  roomId: string;
  position: Vec3;
  rotationY: number;
  size: Vec3;
  color: string;
  modelUrl?: string;
}
