/**
 * 자산 대분류. 도메인 슬라이스(entities/{furniture,fixture,lighting,texture})와 1:1.
 * 견적 v2 합산 분기·카탈로그 패널 탭 그룹핑이 같은 어휘를 공유하기 위한 키.
 */
export type AssetGroup = 'furniture' | 'fixture' | 'lighting' | 'texture';

/**
 * 조달방식. 도메인 인사이트(3): 해외 sea/air 와 domestic 의 단가·리드타임 차가
 * 견적 가산 변수. lighting/fixture 가 각각 정의하던 어휘를 세 번째 도메인(texture)
 * 합류 시점에 shared 로 끌어올림 (roadmap P1).
 */
export type ShippingMethod = 'sea' | 'air' | 'domestic';
