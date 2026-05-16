export type { WallSide, GridRoomLike, GridDoorwayLike } from './types';
export type { RoomBounds, SharedEdge } from './grid';
export {
  roomBounds,
  findSharedEdge,
  doorwaysOnWall,
  clampToRoomBounds,
  hasOverlap,
  findFreeSlot,
} from './grid';
