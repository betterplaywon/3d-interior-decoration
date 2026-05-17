export type {
  FixtureKind,
  FixtureAssetId,
  FixtureCategory,
  FixtureCatalogItem,
  FixtureItem,
} from './model';
export {
  FIXTURE_CATALOG,
  findFixtureCatalogByAssetId,
  findFirstFixtureByKind,
  fixtureShippingLabel,
  fixtureCategoryLabel,
  isFixtureAllowedInRoomKind,
} from './model';
export { buildFixtureGroup, syncFixtureFromItem } from './lib';
