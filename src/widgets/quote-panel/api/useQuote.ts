import { useMemo } from 'react';
import { useSceneStore } from '@entities/scene';
import {
  calcQuote,
  type QuoteBreakdown,
  type ShippableQuoteLine,
  type TextureQuoteLine,
} from '@entities/scene';
import { findFixtureCatalog } from '@entities/fixture';
import { findLightingCatalog } from '@entities/lighting';
import { findTexture } from '@entities/texture';
import { roomSurfaceAreas } from '@shared/lib/grid';

export interface QuoteResult extends QuoteBreakdown {
  /** breakdown 패널에 풀어 보일 때 쓰는 룸별 마감재 라인. */
  textureLineDetails: readonly TextureLineDetail[];
  lightingCount: number;
  fixtureCount: number;
}

export interface TextureLineDetail {
  roomId: string;
  roomName: string;
  surface: 'floor' | 'wall' | 'ceiling';
  textureLabel: string;
  area: number;
  pricePerSqmKRW: number;
  subtotal: number;
}

const SURFACE_KEY = {
  floor: 'floorTextureId',
  wall: 'wallTextureId',
  ceiling: 'ceilingTextureId',
} as const;

/**
 * scene store 의 현재 상태로 견적을 계산. cross-entity 카탈로그 lookup 은
 * widget layer 책임 — entities/scene 의 calcQuote 는 단가 숫자만 받아 합산한다.
 * 카탈로그가 사라진 항목(잘못된 id)은 견적에서 제외 — 잠시 깜빡이는 것보다
 * "왜 합계가 NaN 이지?" 가 더 위험하기 때문.
 */
export function useQuote(): QuoteResult {
  const rooms = useSceneStore((s) => s.rooms);
  const lights = useSceneStore((s) => s.lights);
  const fixtures = useSceneStore((s) => s.fixtures);

  return useMemo(() => {
    const textureLineDetails: TextureLineDetail[] = [];
    const textureLines: TextureQuoteLine[] = [];

    for (const room of rooms) {
      const areas = roomSurfaceAreas(room);
      for (const surface of ['floor', 'wall', 'ceiling'] as const) {
        const textureId = room[SURFACE_KEY[surface]];
        if (!textureId) continue;
        const texture = findTexture(textureId);
        if (!texture) continue;
        const area = areas[surface];
        textureLines.push({ area, pricePerSqmKRW: texture.pricePerSqmKRW });
        textureLineDetails.push({
          roomId: room.id,
          roomName: room.name,
          surface,
          textureLabel: texture.label,
          area,
          pricePerSqmKRW: texture.pricePerSqmKRW,
          subtotal: area * texture.pricePerSqmKRW,
        });
      }
    }

    const lightingLines: ShippableQuoteLine[] = [];
    for (const light of lights) {
      const catalog = findLightingCatalog(light.kind);
      if (!catalog) continue;
      lightingLines.push({ priceKRW: catalog.priceKRW, shipping: catalog.shipping });
    }

    const fixtureLines: ShippableQuoteLine[] = [];
    for (const fx of fixtures) {
      const catalog = findFixtureCatalog(fx.kind);
      if (!catalog) continue;
      fixtureLines.push({ priceKRW: catalog.priceKRW, shipping: catalog.shipping });
    }

    const breakdown = calcQuote({ textureLines, lightingLines, fixtureLines });
    return {
      ...breakdown,
      textureLineDetails,
      lightingCount: lightingLines.length,
      fixtureCount: fixtureLines.length,
    };
  }, [rooms, lights, fixtures]);
}
