import { inferRoomKindFromName, type Room, type RoomKind } from '@entities/room';

/**
 * v2 → v3 마이그레이션: Room 에 `kind` 필드(RoomKind) 도입.
 *
 * 정책: 이름에서 추론(`inferRoomKindFromName`) — '욕실' / '주방' / '거실' 등 한국어
 * 토큰을 포함하면 그 kind 로, 매칭 안 되면 'other' (제약 없음) 로 폴백. silent corruption
 * 회피 + 사용자가 인스펙터에서 후속 조정 가능.
 *
 * 입력은 v1ToV2 가 산출한 V2 형태(`rooms: unknown[]`) — 여기서 각 룸 객체를 안전하게 좁힌다.
 */

interface V2RoomLike {
  id?: unknown;
  name?: unknown;
}

export interface V3Persisted {
  rooms: Room[];
  doorways: unknown[];
  furniture: unknown[];
  lights: unknown[];
  fixtures: unknown[];
  activeRoomId: string | null;
}

interface V2PersistedLike {
  rooms?: unknown[];
  doorways?: unknown[];
  furniture?: unknown[];
  lights?: unknown[];
  fixtures?: unknown[];
  activeRoomId?: string | null;
}

export function migrateV2ToV3(persisted: unknown): V3Persisted {
  const v2 = (persisted ?? {}) as V2PersistedLike;

  const rooms = (v2.rooms ?? []).map((raw): Room => {
    const r = raw as Partial<Room> & V2RoomLike;
    const name = typeof r.name === 'string' ? r.name : '';
    const kind: RoomKind = (r.kind as RoomKind | undefined) ?? inferRoomKindFromName(name) ?? 'other';
    return { ...(r as Room), kind };
  });

  return {
    rooms,
    doorways: v2.doorways ?? [],
    furniture: v2.furniture ?? [],
    lights: v2.lights ?? [],
    fixtures: v2.fixtures ?? [],
    activeRoomId: v2.activeRoomId ?? null,
  };
}
