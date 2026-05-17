export type { WallSide, GridRoomLike, GridDoorwayLike } from './types';
export type { RoomBounds, SharedEdge } from './grid';
export type { RoomSurfaceAreas } from './surface';
export {
  roomBounds,
  findSharedEdge,
  doorwaysOnWall,
  isWallOwned,
  clampToRoomBounds,
  hasOverlap,
  findFreeSlot,
  worldPointToCell,
  snapRoomSlot,
  cellRectBounds,
} from './grid';
export { roomSurfaceAreas } from './surface';
