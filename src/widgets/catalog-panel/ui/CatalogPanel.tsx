import { FURNITURE_CATALOG } from '@entities/furniture';
import { useSceneStore } from '@entities/scene';

export function CatalogPanel() {
  const addFurniture = useSceneStore((s) => s.addFurniture);

  return (
    <section className="panel">
      <h3>가구</h3>
      <ul className="catalog">
        {FURNITURE_CATALOG.map((item) => (
          <li key={item.kind}>
            <button onClick={() => addFurniture(item.kind)}>{item.label}</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
