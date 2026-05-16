import type { Vec3 } from '@shared/model';

export type FixtureKind = 'bathtub' | 'showerHead' | 'washbasin' | 'faucet' | 'toilet';

/**
 * 위생도기 분류. 가구·조명과 달리 한 룸 안에서 도기/수전/샤워설비 단위로
 * 묶어 보여줄 일이 잦아 카테고리를 도메인 어휘 그대로 둠.
 */
export type FixtureCategory = 'sanitary' | 'faucet' | 'shower';

/**
 * 조달방식. Lighting과 같은 어휘이지만 cross-entity import 금지 룰에 따라
 * fixture 도메인에서 다시 정의한다. 한 곳에 모으는 일반화는 세 번째 도메인이
 * 같은 어휘를 쓸 때 shared로 끌어올리는 별도 작업으로 분리.
 */
export type FixtureShipping = 'sea' | 'air' | 'domestic';

export interface FixtureCatalogItem {
  kind: FixtureKind;
  label: string;
  category: FixtureCategory;
  shipping: FixtureShipping;
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
