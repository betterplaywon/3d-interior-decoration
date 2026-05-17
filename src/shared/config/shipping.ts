import type { ShippingMethod } from '@shared/model';

/**
 * 조달방식별 가산 비율. 현업 인터뷰(2026-05-16) 인사이트:
 * 해외 조달은 단가 외에 운임·관세·리드타임 리스크가 견적의 별도 변수.
 * 절대액이 아니라 비율로 모델링한 이유 — 카탈로그 단가가 바뀌어도
 * 자동 반영되며, 견적 패널이 카탈로그 단가에 단일 기준점을 가짐.
 * 수치는 데모용 추정치 (sea +15%, air +30%). 실제 영업 견적용으로는
 * 카탈로그 보강 시점에 한국 시장 평균치로 정비 권고.
 */
export const SHIPPING_SURCHARGE_RATE: Record<ShippingMethod, number> = {
  domestic: 0,
  sea: 0.15,
  air: 0.3,
};
