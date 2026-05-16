# 3D Interior Viewer

Three.js로 직접 만든 인테리어 룸 시각화 / 가벼운 에디터.

- **Stack:** React 19 + TypeScript + Vite, **순수 Three.js** (no R3F), **Zustand**, **FSD(Feature-Sliced Design)**
- **Concept:** 방을 3D로 그리고, 카탈로그에서 가구를 골라 배치 → 클릭으로 선택 → 회전/삭제
- **Why pure Three.js:** Three.js 자체에 대한 이해를 보여주기 위해 R3F를 쓰지 않고 `useRef`로 imperative하게 연결. React는 UI 패널만, scene 그래프는 별도 매니저가 소유.
- **Why FSD:** 도메인 경계(`room`/`furniture`/`scene`)와 UI 조합 지점(`widgets`/`features`)을 명확히 분리해 규모가 커져도 변경 영향이 슬라이스 안에 갇히게 함.

## 아키텍처 (FSD 6레이어)

```
src/
├── app/         진입점·전역 스타일
│   ├── main.tsx, App.tsx
│   └── styles/
├── pages/       라우트 단위 페이지
│   └── editor/ui/EditorPage.tsx
├── widgets/     큰 UI 블록 (도메인 통합 지점)
│   ├── scene-viewport/  ─ SceneCanvas + SceneManager(lib) + useSceneManager(api)
│   ├── toolbar/
│   ├── catalog-panel/
│   └── inspector-panel/
├── features/    사용자 액션 단위
│   └── furniture-drag/  ─ useFurnitureDrag, useEmptyClick
├── entities/    도메인 모델 + 표현
│   ├── scene/      ─ Zustand store, Selection/CameraMode
│   ├── room/       ─ Room/Doorway 타입, buildRoomMesh
│   └── furniture/  ─ FurnitureItem 타입, FURNITURE_CATALOG, buildFurnitureGroup
└── shared/      도메인 무관 유틸
    ├── config/        ─ CELL_SIZE
    ├── lib/grid/      ─ roomBounds, findSharedEdge, clampToRoomBounds, ...
    ├── lib/asset-cache/ ─ GLTF url 캐시
    └── model/         ─ Vec3
```

**의존 방향**: 상위 → 하위만 (app > pages > widgets > features > entities > shared). 같은 레이어끼리 import 금지. Path alias: `@app/*`, `@pages/*`, `@widgets/*`, `@features/*`, `@entities/*`, `@shared/*`.

### 핵심 설계 포인트

- **렌더 루프는 React 밖.** `requestAnimationFrame`은 `SceneManager`가 소유. React 상태가 매 프레임 갱신되는 일이 없도록 분리.
- **Store → Scene 동기화는 명령형.** `useSceneStore.subscribe`로 `furniture` 배열 변경을 듣고 `syncFurniture(items)`를 호출. 내부에서 차집합으로 추가/삭제/업데이트만 처리해 매 변경마다 전체 재생성하지 않음.
- **Disposal 책임 일원화.** `SceneManager.dispose()`에서 geometry/material/renderer/controls/raf/ResizeObserver를 모두 정리. HMR 안전.
- **Picking은 매니저가 제공.** `pickFurnitureId(ndcX, ndcY)` 한 줄로 클릭 → 선택 ID. raycast 세부는 UI에 누출 안 함.

## 실행

```bash
pnpm install
pnpm dev
```

## 렌더링 / 룩

사실적 PBR 룩을 기본으로 합니다.

- **렌더러:** `ACESFilmicToneMapping`, `SRGBColorSpace`, `PCFSoftShadowMap`
- **환경광(IBL):** `RoomEnvironment`(절차적)를 즉시 적용. `public/hdri/studio.hdr` 가 있으면 비동기로 덮어씀
- **직접광:** Directional 한 개 (방향성·그림자 담당, ambient는 IBL과 이중 가산을 피하려 미사용)

## 가구 에셋 (GLTF)

가구는 `public/models/` 하위의 `.glb` 파일을 자동 로드합니다. 파일이 없으면 박스로 폴백되므로 에셋 없이도 동작합니다.

기대하는 경로 (카탈로그 기준):
- `/public/models/sofa.glb`
- `/public/models/table.glb`
- `/public/models/chair.glb`
- `/public/models/bed.glb`
- `/public/models/lamp.glb`

권장 무료 출처: [Poly Haven](https://polyhaven.com/models), [Sketchfab CC0]. GLTF의 원본 PBR 머티리얼은 그대로 유지되며, 스케일은 카탈로그의 `size`(W/H/D)에 맞춰 bounding box 기준으로 정규화되고 원점은 바닥 중앙으로 정렬됩니다.

## HDRI (선택)

더 사실적인 반사·환경광을 원하면 [Poly Haven HDRIs](https://polyhaven.com/hdris)에서 `.hdr`(1K~2K) 한 장을 받아 `public/hdri/studio.hdr` 경로로 두세요. 자동으로 RoomEnvironment 위에 덮어씁니다. 파일이 없으면 무시되고 절차적 환경광이 계속 사용됩니다.

## 다음에 살을 붙일 수 있는 곳

- `widgets/scene-viewport/lib/SceneManager.ts` → InstancedMesh / LOD / Frustum culling 데모
- 가구 간 AABB 충돌(`shared/lib/grid`에 `clampToFreeSpace`)
- Undo/Redo (zustand-immer + history stack)
- 2D 평면도 ↔ 3D 동기화 뷰
- store 액션을 `features/*` 슬라이스로 분리 (`add-furniture`, `manage-rooms` 등)
