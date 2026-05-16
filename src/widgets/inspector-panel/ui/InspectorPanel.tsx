import type { Room } from '@entities/room';
import { useSceneStore } from '@entities/scene';
import { FINISH_CATALOG, findFinish, type FinishSurface } from '@entities/finish';
import { findSharedEdge } from '@shared/lib/grid';

const SURFACE_LABEL: Record<FinishSurface, string> = {
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
  const activeRoomId = useSceneStore((s) => s.activeRoomId);

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

      <h4 className="subhead">마감재</h4>
      <FinishPicker roomId={room.id} surface="floor" currentId={room.floorFinishId} />
      <FinishPicker roomId={room.id} surface="wall" currentId={room.wallFinishId} />
      <FinishPicker roomId={room.id} surface="ceiling" currentId={room.ceilingFinishId} />

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

interface FinishPickerProps {
  roomId: string;
  surface: FinishSurface;
  currentId: string | null;
}

/**
 * 면 하나당 한 줄: 좌측 컬러 칩 + 라벨 + 단가, 우측 select 로 같은 면에 적용 가능한 항목들 나열.
 * 섬네일은 PBR 결과를 작은 색칩으로 근사 — 텍스처 도입 후엔 canvas 미리보기로 확장 가능.
 */
function FinishPicker({ roomId, surface, currentId }: FinishPickerProps) {
  const setRoomFinish = useSceneStore((s) => s.setRoomFinish);
  const options = FINISH_CATALOG.filter((f) => f.applicableTo.includes(surface));
  const current = findFinish(currentId);

  return (
    <div className="finish-row">
      <span
        className="finish-swatch"
        style={{ background: current?.baseColor ?? '#cccccc' }}
        aria-label={`${SURFACE_LABEL[surface]} 색`}
      />
      <div className="finish-meta">
        <span className="finish-surface">{SURFACE_LABEL[surface]}</span>
        <span className="finish-label">{current?.label ?? '미지정'}</span>
        {current && (
          <span className="finish-price muted">
            {current.pricePerSqmKRW.toLocaleString('ko-KR')}원/m²
          </span>
        )}
      </div>
      <select
        value={currentId ?? ''}
        onChange={(e) => setRoomFinish(roomId, surface, e.target.value || null)}
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
