export type {
  FurnitureKind,
  FurnitureAssetId,
  FurnitureCatalogItem,
  FurnitureItem,
} from './model';
export {
  FURNITURE_CATALOG,
  findFurnitureCatalogByAssetId,
  findFirstFurnitureByKind,
} from './model';
export { buildFurnitureGroup, syncGroupFromItem } from './lib';
