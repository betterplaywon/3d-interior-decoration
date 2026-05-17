import type { AssetGroup } from './asset';

declare const assetIdBrand: unique symbol;

/**
 * 도메인별 nominal id. 런타임은 그냥 string 이지만 컴파일 시점에서
 * FurnitureAssetId 를 LightingAssetId 자리에 넣는 것 같은 도메인 간 혼동을 차단.
 *
 * 형태 규약: `<domain>/<slug>` (예: 'furniture/sofa_03').
 * category 는 의도적으로 path 에 박지 않는다 — 도메인마다 category 의 의미 축이
 * 다르고 (조명=조달축, fixture=공종축), 필드로 별도 유지하는 편이 견적·필터·룸 제약을
 * 자유롭게 한다.
 */
export type AssetId<TDomain extends AssetGroup> = string & {
  readonly [assetIdBrand]: TDomain;
};

/**
 * 카탈로그 정의 시점에 string literal 을 좁힌 AssetId 로 캐스팅.
 * widget/feature 계층에서는 호출 금지 — 카탈로그가 단일 진입점이라야
 * "어떤 assetId 가 유효한가" 를 컴파일 타임에 추적 가능.
 */
export function asAssetId<TDomain extends AssetGroup>(raw: string): AssetId<TDomain> {
  return raw as AssetId<TDomain>;
}
