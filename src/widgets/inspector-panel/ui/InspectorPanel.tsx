import { ROOM_KIND_LABEL, type Room, type RoomKind } from '@entities/room';
import { useSceneStore } from '@entities/scene';
import { TEXTURE_CATALOG, findTexture, type TextureSurface } from '@entities/texture';
import {
  categoryLabel,
  findLightingCatalogByAssetId,
  shippingLabel,
} from '@entities/lighting';
import {
  findFixtureCatalogByAssetId,
  fixtureCategoryLabel,
  fixtureShippingLabel,
} from '@entities/fixture';
import { findSharedEdge } from '@shared/lib/grid';

const SURFACE_LABEL: Record<TextureSurface, string> = {
  floor: '바닥',
  wall: '벽',
  ceiling: '천장',
};

export function InspectorPanel() {
  const selection = useSceneStore((s) => s.selection);
  const rooms = useSceneStore((s) => s.rooms);
  const furniture = useSceneStore((s) => s.furniture);

  if (!selection) {
    return (
      <section className="panel">
        <h3>속성</h3>
        <p className="muted">가구나 방을 클릭해 선택하세요.</p>
      </section>
    );
  }

  if (selection.kind === 'furniture') {
    const item = furniture.find((f) => f.id === selection.id);
    if (!item) return null;
    return <FurnitureInspector itemId={item.id} />;
  }

  if (selection.kind === 'lighting') {
    return <LightingInspector itemId={selection.id} />;
  }

  if (selection.kind === 'fixture') {
    return <FixtureInspector itemId={selection.id} />;
  }

  const room = rooms.find((r) => r.id === selection.id);
  if (!room) return null;
  return <RoomInspector room={room} />;
}

interface FurnitureInspectorProps {
  itemId: string;
}

function FurnitureInspector({ itemId }: FurnitureInspectorProps) {
  const item = useSceneStore((s) => s.furniture.find((f) => f.id === itemId));
  const rooms = useSceneStore((s) => s.rooms);
  const removeFurniture = useSceneStore((s) => s.removeFurniture);
  const rotateFurniture = useSceneStore((s) => s.rotateFurniture);

  if (!item) return null;
  const roomName = rooms.find((r) => r.id === item.roomId)?.name ?? '-';

  return (
    <section className="panel">
      <h3>가구 속성</h3>
      <dl className="props">
        <dt>종류</dt>
        <dd>{item.kind}</dd>
        <dt>소속 방</dt>
        <dd>{roomName}</dd>
        <dt>위치</dt>
        <dd>{item.position.map((v) => v.toFixed(2)).join(', ')}</dd>
        <dt>회전(Y)</dt>
        <dd>{((item.rotationY * 180) / Math.PI).toFixed(0)}°</dd>
      </dl>
      <div className="row">
        <button onClick={() => rotateFurniture(item.id, item.rotationY + Math.PI / 2)}>
          90° 회전
        </button>
        <button onClick={() => removeFurniture(item.id)}>삭제</button>
      </div>
    </section>
  );
}

interface RoomInspectorProps {
  room: Room;
}

function RoomInspector({ room }: RoomInspectorProps) {
  const rooms = useSceneStore((s) => s.rooms);
  const doorways = useSceneStore((s) => s.doorways);
  const renameRoom = useSceneStore((s) => s.renameRoom);
  const resizeRoom = useSceneStore((s) => s.resizeRoom);
  const removeRoom = useSceneStore((s) => s.removeRoom);
  const toggleDoorway = useSceneStore((s) => s.toggleDoorway);
  const setActiveRoom = useSceneStore((s) => s.setActiveRoom);
  const setRoomKind = useSceneStore((s) => s.setRoomKind);
  const activeRoomId = useSceneStore((s) => s.activeRoomId);

  const kindOptions = Object.entries(ROOM_KIND_LABEL) as ReadonlyArray<[RoomKind, string]>;

  const neighbors = rooms.filter((other) => {
    if (other.id === room.id) return false;
    return findSharedEdge(room, other) !== null;
  });

  return (
    <section className="panel">
      <h3>방 속성</h3>
      <label className="field">
        이름
        <input type="text" value={room.name} onChange={(e) => renameRoom(room.id, e.target.value)} />
      </label>
      <label className="field">
        용도
        <select
          value={room.kind}
          onChange={(e) => setRoomKind(room.id, e.target.value as RoomKind)}
        >
          {kindOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <div className="field-row">
        <label className="field">
          폭(셀)
          <input
            type="number"
            min={1}
            value={room.cellsW}
            onChange={(e) => resizeRoom(room.id, Number(e.target.value), room.cellsD)}
          />
        </label>
        <label className="field">
          깊이(셀)
          <input
            type="number"
            min={1}
            value={room.cellsD}
            onChange={(e) => resizeRoom(room.id, room.cellsW, Number(e.target.value))}
          />
        </label>
      </div>
      <dl className="props">
        <dt>그리드</dt>
        <dd>
          ({room.cellX}, {room.cellZ})
        </dd>
        <dt>활성</dt>
        <dd>
          {activeRoomId === room.id ? (
            '가구 추가 시 이 방'
          ) : (
            <button onClick={() => setActiveRoom(room.id)}>이 방으로</button>
          )}
        </dd>
      </dl>

      <h4 className="subhead">텍스처</h4>
      <TexturePicker roomId={room.id} surface="floor" currentId={room.floorTextureId} />
      <TexturePicker roomId={room.id} surface="wall" currentId={room.wallTextureId} />
      <TexturePicker roomId={room.id} surface="ceiling" currentId={room.ceilingTextureId} />

      <h4 className="subhead">연결</h4>
      {neighbors.length === 0 ? (
        <p className="muted">인접한 방이 없습니다.</p>
      ) : (
        <ul className="connections">
          {neighbors.map((other) => {
            const connected = doorways.some(
              (d) =>
                (d.roomAId === room.id && d.roomBId === other.id) ||
                (d.roomAId === other.id && d.roomBId === room.id),
            );
            return (
              <li key={other.id}>
                <span>{other.name}</span>
                <button onClick={() => toggleDoorway(room.id, other.id)}>
                  {connected ? '문 닫기' : '문 열기'}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="row" style={{ marginTop: 12 }}>
        <button onClick={() => removeRoom(room.id)} disabled={rooms.length <= 1}>
          이 방 삭제
        </button>
      </div>
    </section>
  );
}

interface LightingInspectorProps {
  itemId: string;
}

/**
 * 조명 인스턴스 인스펙터. 위치 편집은 인스펙터에 두지 않고 추후 드래그로 — 여기선
 * 도메인 메타(카테고리/조달방식/단가)를 노출해 견적 v2 의도가 드러나게 한다.
 */
function LightingInspector({ itemId }: LightingInspectorProps) {
  const item = useSceneStore((s) => s.lights.find((l) => l.id === itemId));
  const rooms = useSceneStore((s) => s.rooms);
  const removeLighting = useSceneStore((s) => s.removeLighting);

  if (!item) return null;
  const catalog = findLightingCatalogByAssetId(item.assetId);
  if (!catalog) return null;
  const roomName = rooms.find((r) => r.id === item.roomId)?.name ?? '-';

  return (
    <section className="panel">
      <h3>조명 속성</h3>
      <dl className="props">
        <dt>이름</dt>
        <dd>{catalog.label}</dd>
        <dt>분류</dt>
        <dd>{categoryLabel(catalog.category)}</dd>
        <dt>조달</dt>
        <dd>{shippingLabel(catalog.shipping)}</dd>
        <dt>단가</dt>
        <dd>{catalog.priceKRW.toLocaleString('ko-KR')}원</dd>
        <dt>소속 방</dt>
        <dd>{roomName}</dd>
        <dt>위치</dt>
        <dd>{item.position.map((v) => v.toFixed(2)).join(', ')}</dd>
      </dl>
      <div className="row">
        <button onClick={() => removeLighting(item.id)}>삭제</button>
      </div>
    </section>
  );
}

interface FixtureInspectorProps {
  itemId: string;
}

/**
 * 위생도기 인스턴스 인스펙터. 가구처럼 배치/회전 편집을 제공하고,
 * 조명처럼 도메인 메타(분류/조달/단가)를 함께 노출해 견적 v2 흐름에 연결할 자리를 만든다.
 */
function FixtureInspector({ itemId }: FixtureInspectorProps) {
  const item = useSceneStore((s) => s.fixtures.find((f) => f.id === itemId));
  const rooms = useSceneStore((s) => s.rooms);
  const removeFixture = useSceneStore((s) => s.removeFixture);
  const rotateFixture = useSceneStore((s) => s.rotateFixture);

  if (!item) return null;
  const catalog = findFixtureCatalogByAssetId(item.assetId);
  if (!catalog) return null;
  const roomName = rooms.find((r) => r.id === item.roomId)?.name ?? '-';

  return (
    <section className="panel">
      <h3>위생도기 속성</h3>
      <dl className="props">
        <dt>이름</dt>
        <dd>{catalog.label}</dd>
        <dt>분류</dt>
        <dd>{fixtureCategoryLabel(catalog.category)}</dd>
        <dt>조달</dt>
        <dd>{fixtureShippingLabel(catalog.shipping)}</dd>
        <dt>단가</dt>
        <dd>{catalog.priceKRW.toLocaleString('ko-KR')}원</dd>
        <dt>소속 방</dt>
        <dd>{roomName}</dd>
        <dt>위치</dt>
        <dd>{item.position.map((v) => v.toFixed(2)).join(', ')}</dd>
        <dt>회전(Y)</dt>
        <dd>{((item.rotationY * 180) / Math.PI).toFixed(0)}°</dd>
      </dl>
      <div className="row">
        <button onClick={() => rotateFixture(item.id, item.rotationY + Math.PI / 2)}>
          90° 회전
        </button>
        <button onClick={() => removeFixture(item.id)}>삭제</button>
      </div>
    </section>
  );
}

interface TexturePickerProps {
  roomId: string;
  surface: TextureSurface;
  currentId: string | null;
}

/**
 * 면 하나당 한 줄: 좌측 컬러 칩 + 라벨 + 단가, 우측 select 로 같은 면에 적용 가능한 항목들 나열.
 * 섬네일은 PBR 결과를 작은 색칩으로 근사 — 추후 canvas 기반 미리보기로 확장 가능.
 */
function TexturePicker({ roomId, surface, currentId }: TexturePickerProps) {
  const setRoomTexture = useSceneStore((s) => s.setRoomTexture);
  const options = TEXTURE_CATALOG.filter((t) => t.applicableTo.includes(surface));
  const current = findTexture(currentId);

  return (
    <div className="texture-row">
      <span
        className="texture-swatch"
        style={{ background: current?.baseColor ?? '#cccccc' }}
        aria-label={`${SURFACE_LABEL[surface]} 색`}
      />
      <div className="texture-meta">
        <span className="texture-surface">{SURFACE_LABEL[surface]}</span>
        <span className="texture-label">{current?.label ?? '미지정'}</span>
        {current && (
          <span className="texture-price muted">
            {current.pricePerSqmKRW.toLocaleString('ko-KR')}원/m²
          </span>
        )}
      </div>
      <select
        value={currentId ?? ''}
        onChange={(e) => setRoomTexture(roomId, surface, e.target.value || null)}
      >
        <option value="">미지정</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
