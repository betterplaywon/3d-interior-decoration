import { FURNITURE_CATALOG } from '@entities/furniture';
import { LIGHTING_CATALOG } from '@entities/lighting';
import { FIXTURE_CATALOG, isFixtureAllowedInRoomKind } from '@entities/fixture';
import { ROOM_KIND_LABEL } from '@entities/room';
import { useSceneStore } from '@entities/scene';

export function CatalogPanel() {
  const addFurniture = useSceneStore((s) => s.addFurniture);
  const addLighting = useSceneStore((s) => s.addLighting);
  const addFixture = useSceneStore((s) => s.addFixture);
  // 위생도기 호환 검증의 기준 — 활성 룸이 없으면 'other' 로 폴백해 모두 허용.
  const activeRoom = useSceneStore((s) =>
    s.activeRoomId ? s.rooms.find((r) => r.id === s.activeRoomId) ?? null : null,
  );
  const activeRoomKind = activeRoom?.kind ?? 'other';
  const activeRoomLabel = activeRoom
    ? `${activeRoom.name} · ${ROOM_KIND_LABEL[activeRoom.kind]}`
    : '활성 룸 없음';

  return (
    <section className="panel">
      <h3>가구</h3>
      <ul className="catalog">
        {FURNITURE_CATALOG.map((item) => (
          <li key={item.assetId}>
            <button onClick={() => addFurniture(item.assetId)}>{item.label}</button>
          </li>
        ))}
      </ul>

      <h3>조명</h3>
      <ul className="catalog">
        {LIGHTING_CATALOG.map((item) => (
          <li key={item.assetId}>
            <button onClick={() => addLighting(item.assetId)}>{item.label}</button>
          </li>
        ))}
      </ul>

      <h3>
        위생도기 <span className="muted" style={{ fontWeight: 400, fontSize: '0.85em' }}>({activeRoomLabel})</span>
      </h3>
      <ul className="catalog">
        {FIXTURE_CATALOG.map((item) => {
          const allowed = isFixtureAllowedInRoomKind(item, activeRoomKind);
          return (
            <li key={item.assetId}>
              <button
                onClick={() => addFixture(item.assetId)}
                disabled={!allowed}
                title={
                  allowed
                    ? undefined
                    : `현재 룸(${ROOM_KIND_LABEL[activeRoomKind]})에는 추가할 수 없습니다`
                }
              >
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
