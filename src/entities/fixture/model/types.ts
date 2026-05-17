import type { AssetId, ShippingMethod, Vec3 } from '@shared/model';

export type FixtureKind = 'bathtub' | 'showerHead' | 'washbasin' | 'faucet' | 'toilet';

/**
 * 위생도기 분류. 가구·조명과 달리 한 룸 안에서 도기/수전/샤워설비 단위로
 * 묶어 보여줄 일이 잦아 카테고리를 도메인 어휘 그대로 둠.
 */
export type FixtureCategory = 'sanitary' | 'faucet' | 'shower';

/**
 * 위생도기 도메인 nominal id. 같은 kind(욕조·세면대 등) 안에서 실제 에셋·단가를
 * 구분하는 키.
 */
export type FixtureAssetId = AssetId<'fixture'>;

export interface FixtureCatalogItem {
  assetId: FixtureAssetId;
  kind: FixtureKind;
  label: string;
  category: FixtureCategory;
  shipping: ShippingMethod;
  size: Vec3;
  color: string;
  /** 단품 단가(KRW). 마감재처럼 면적 단가가 아니라 개당. */
  priceKRW: number;
  /**
   * 이 위생도기가 어울리는 Room.kind 목록. 빈 배열이면 어디든 허용.
   * 검증은 `isFixtureAllowedInRoomKind` 에서 — 카탈로그 패널이 활성 룸 기준으로
   * 버튼 disable 여부를 결정한다.
   *
   * 타입을 `RoomKind[]` 가 아닌 `string[]` 으로 둔 이유: entities/fixture 가
   * entities/room 을 import 하면 같은 레이어 cross-import (forbidden #1).
   * 검증 함수 내부에서만 RoomKind 와 비교한다.
   */
  recommendedRoomKinds: readonly string[];
  /** public/ 기준 GLTF 경로. 없거나 로드 실패 시 박스로 폴백. */
  modelUrl?: string;
}

export interface FixtureItem {
  id: string;
  assetId: FixtureAssetId;
  kind: FixtureKind;
  /** 어느 방에 소속된 위생도기인지. 배치/클램프 계산에 사용. */
  roomId: string;
  position: Vec3;
  rotationY: number;
  size: Vec3;
  color: string;
  modelUrl?: string;
}
