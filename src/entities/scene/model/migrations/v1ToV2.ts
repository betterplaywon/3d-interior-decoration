import {
  findFirstFurnitureByKind,
  type FurnitureItem,
  type FurnitureKind,
} from '@entities/furniture';
import {
  findFirstLightingByKind,
  type LightingItem,
  type LightingKind,
} from '@entities/lighting';
import {
  findFirstFixtureByKind,
  type FixtureItem,
  type FixtureKind,
} from '@entities/fixture';

/**
 * v1 → v2 마이그레이션: 카탈로그 lookup key 가 kind 에서 assetId 로 바뀌면서
 * 기존 persist 인스턴스에 assetId 필드가 비어 있는 상태.
 *
 * 정책: 같은 kind 의 첫 카탈로그 항목으로 부드럽게 강등 (사용자 의도한
 * 카테고리는 유지, 구체 에셋만 디폴트로). 카탈로그에서 kind 자체가 사라진
 * 항목은 drop + warn — silent corruption 보다 사용자에게 한 번 알리는 게 안전.
 *
 * 입력은 zustand persist 가 storage 에서 읽어온 원시 데이터(`unknown`).
 * v1 스키마 형태 가정만으로 좁히고, 깨진 형태면 비어있는 v2 로 폴백한다.
 */

interface V1FurnitureItem extends Omit<FurnitureItem, 'assetId'> {
  assetId?: undefined;
}
interface V1LightingItem extends Omit<LightingItem, 'assetId'> {
  assetId?: undefined;
}
interface V1FixtureItem extends Omit<FixtureItem, 'assetId'> {
  assetId?: undefined;
}

interface V1Persisted {
  rooms?: unknown[];
  doorways?: unknown[];
  furniture?: V1FurnitureItem[];
  lights?: V1LightingItem[];
  fixtures?: V1FixtureItem[];
  activeRoomId?: string | null;
}

export interface V2Persisted {
  rooms: unknown[];
  doorways: unknown[];
  furniture: FurnitureItem[];
  lights: LightingItem[];
  fixtures: FixtureItem[];
  activeRoomId: string | null;
}

export function migrateV1ToV2(persisted: unknown): V2Persisted {
  const v1 = (persisted ?? {}) as V1Persisted;

  const furniture = (v1.furniture ?? []).flatMap((f): FurnitureItem[] => {
    const cat = findFirstFurnitureByKind(f.kind as FurnitureKind);
    if (!cat) {
      console.warn('[scene persist v2] furniture kind 매핑 실패, drop:', f);
      return [];
    }
    return [{ ...f, assetId: cat.assetId }];
  });

  const lights = (v1.lights ?? []).flatMap((l): LightingItem[] => {
    const cat = findFirstLightingByKind(l.kind as LightingKind);
    if (!cat) {
      console.warn('[scene persist v2] lighting kind 매핑 실패, drop:', l);
      return [];
    }
    return [{ ...l, assetId: cat.assetId }];
  });

  const fixtures = (v1.fixtures ?? []).flatMap((f): FixtureItem[] => {
    const cat = findFirstFixtureByKind(f.kind as FixtureKind);
    if (!cat) {
      console.warn('[scene persist v2] fixture kind 매핑 실패, drop:', f);
      return [];
    }
    return [{ ...f, assetId: cat.assetId }];
  });

  return {
    rooms: v1.rooms ?? [],
    doorways: v1.doorways ?? [],
    furniture,
    lights,
    fixtures,
    activeRoomId: v1.activeRoomId ?? null,
  };
}
