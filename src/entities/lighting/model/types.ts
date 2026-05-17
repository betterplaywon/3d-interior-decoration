import type { AssetId, ShippingMethod, Vec3 } from '@shared/model';

/**
 * 조명 도메인 nominal id. 같은 kind(다운라이트 등) 안에서 실제 에셋·단가를
 * 구분하는 키.
 */
export type LightingAssetId = AssetId<'lighting'>;

/**
 * 카탈로그 구분: 기본(ambient)은 전반 밝기용, 장식(decorative)은 데코·악센트.
 * 현업 인터뷰 인사이트 — 장식 조명은 단가/조달방식 변수가 큰 도메인 요소.
 */
export type LightingCategory = 'ambient' | 'decorative';

/**
 * Three.js 광원 매핑. PointLight = 전구·펜던트(전방향),
 * SpotLight = 다운라이트·스포트(원뿔 방향). RectArea/Directional은 P0 밖.
 */
export type LightingShape = 'point' | 'spot';

/**
 * 천장 매달림(ceiling) / 바닥 스탠드(floor) — 방 안 어디에 놓는지 기본 높이가 다르다.
 * y 좌표를 카탈로그가 결정해두면 사용자가 위치만 정하면 된다.
 */
export type LightingAnchor = 'ceiling' | 'floor';

export type LightingKind = 'pendant' | 'downlight' | 'standLamp' | 'wallSconce';

export interface LightingCatalogItem {
  assetId: LightingAssetId;
  kind: LightingKind;
  label: string;
  shape: LightingShape;
  category: LightingCategory;
  shipping: ShippingMethod;
  anchor: LightingAnchor;
  /** 광원 색 (hex). PBR 환경에서도 카메라 노출과 무관하게 톤이 보이도록. */
  color: string;
  /** Three.js light.intensity. PBR 단위에 맞춰 1~30 정도. */
  intensity: number;
  /** 감쇠 거리 (m). 0이면 무한. 점광원 반경 의도. */
  distance: number;
  /** Spot 전용: 원뿔 반각(rad). shape='point'면 무시. */
  angle?: number;
  /** Spot 전용: 가장자리 페더링 [0~1]. */
  penumbra?: number;
  /** 구매 단가(KRW). 견적 v2에서 합산. */
  priceKRW: number;
}

export interface LightingItem {
  id: string;
  assetId: LightingAssetId;
  kind: LightingKind;
  /** 어느 방에 소속된 조명인지 — 방 삭제 시 함께 정리하기 위함. */
  roomId: string;
  /** 월드 좌표. y는 anchor 기본값으로 세팅하지만 사용자가 인스펙터에서 조정 가능. */
  position: Vec3;
}
