import { FURNITURE_CATALOG } from '@entities/furniture';
import { LIGHTING_CATALOG } from '@entities/lighting';
import { FIXTURE_CATALOG } from '@entities/fixture';
import { useSceneStore } from '@entities/scene';

export function CatalogPanel() {
  const addFurniture = useSceneStore((s) => s.addFurniture);
  const addLighting = useSceneStore((s) => s.addLighting);
  const addFixture = useSceneStore((s) => s.addFixture);

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

      <h3>위생도기</h3>
      <ul className="catalog">
        {FIXTURE_CATALOG.map((item) => (
          <li key={item.assetId}>
            <button onClick={() => addFixture(item.assetId)}>{item.label}</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
