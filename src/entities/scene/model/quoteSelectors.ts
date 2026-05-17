import { SHIPPING_SURCHARGE_RATE } from '@shared/config';
import type { ShippingMethod } from '@shared/model';

/**
 * 견적 라인 1 — 마감재. 한 룸의 한 면(바닥·벽·천장) 단위.
 * area 와 단가를 분리한 이유: 면접 데모에서 "이 라인은 18㎡ × 75,000원" 식으로
 * 풀어 보일 수 있도록 — 합산 후 숫자만 던지지 않음.
 */
export interface TextureQuoteLine {
  area: number;
  pricePerSqmKRW: number;
}

/** 견적 라인 2·3 — 조명/위생도기. 단품 단가 + 조달방식. */
export interface ShippableQuoteLine {
  priceKRW: number;
  shipping: ShippingMethod;
}

/**
 * calcQuote 의 입력. cross-entity import 금지(룰 #1) 때문에 selector 자체는
 * entity 카탈로그를 조회하지 않는다 — 카탈로그 lookup 책임은 widget adapter
 * (widgets/quote-panel/api) 가 지고, 이 함수는 "양 + 단가" 묶음만 받아 합산.
 */
export interface QuoteInputs {
  textureLines: readonly TextureQuoteLine[];
  lightingLines: readonly ShippableQuoteLine[];
  fixtureLines: readonly ShippableQuoteLine[];
}

export interface QuoteBreakdown {
  /** 마감재 합 (면적 × 단가). */
  texture: number;
  /** 조명 단품가 합 (조달 가산 제외). */
  lighting: number;
  /** 위생도기 단품가 합 (조달 가산 제외). */
  fixture: number;
  /** 조명·위생도기에 ShippingMethod 별 % 가산해 더한 추가액. */
  shippingSurcharge: number;
  /** 위 4개 합. */
  total: number;
}

function sumShippable(lines: readonly ShippableQuoteLine[]): {
  base: number;
  surcharge: number;
} {
  let base = 0;
  let surcharge = 0;
  for (const line of lines) {
    base += line.priceKRW;
    surcharge += line.priceKRW * SHIPPING_SURCHARGE_RATE[line.shipping];
  }
  return { base, surcharge };
}

/**
 * 견적 합산 순수 함수. React 외부에서도 호출 가능하며,
 * 입력이 같으면 항상 같은 결과를 낸다 (memo 캐싱 친화).
 */
export function calcQuote(inputs: QuoteInputs): QuoteBreakdown {
  let texture = 0;
  for (const line of inputs.textureLines) {
    texture += line.area * line.pricePerSqmKRW;
  }

  const lighting = sumShippable(inputs.lightingLines);
  const fixture = sumShippable(inputs.fixtureLines);

  const shippingSurcharge = lighting.surcharge + fixture.surcharge;
  const total = texture + lighting.base + fixture.base + shippingSurcharge;

  return {
    texture,
    lighting: lighting.base,
    fixture: fixture.base,
    shippingSurcharge,
    total,
  };
}
