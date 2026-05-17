# 3D Interior Viewer

Three.js + Zustand + FSD(Feature-Sliced Design) 로 만든 인테리어 에디터 — **마감재·조명·위생도기·가구 4개 도메인 + 실시간 견적**까지 다루는 채용 포트폴리오.

- **Stack:** React 19 + TypeScript(strict) + Vite, **순수 Three.js (no R3F)**, **Zustand v5 + persist**, **FSD 6레이어**
- **Concept:** 방을 셀 그리드에 클릭으로 배치하고, 가구/조명/위생도기 카탈로그에서 골라 놓고, 룸 면별 마감재(텍스처) 를 바꾸면 **면적×단가 + 조달방식 가산률** 로 견적이 실시간 계산되는 에디터.
- **Why pure Three.js:** Three.js 자체를 다룰 줄 안다는 걸 보이기 위해 `@react-three/*` 를 쓰지 않고 `useRef` 로 imperative 하게 연결. React 는 UI 패널만, scene 그래프는 별도 매니저가 소유.
- **Why FSD:** 도메인 경계(`room` / `furniture` / `lighting` / `fixture` / `texture` / `scene`) 와 UI 조합 지점(`widgets` / `features`) 을 분리해, 도메인이 늘어도 변경 영향이 한 슬라이스 안에 갇히게 함.

## 도메인 모델

한국 인테리어 현업 인터뷰(2026-05) 를 반영해 **가구 비중을 낮추고 마감재·조명·위생도기에 무게중심을 옮긴** 도메인 설계.

- **`room`** — Room/Doorway 타입, `buildRoomMesh`. 인접 방의 공유 벽은 [`shared/lib/grid/isWallOwned`](src/shared/lib/grid/) 로 한쪽만 그려 z-fighting 회피.
- **`furniture`** — 13종 카탈로그 (chair 3 / table 4 / sofa 2 / bed / lamp / desk / shelf 3 / cabinet). 같은 `kind` 안에 여러 카탈로그 항목이 공존, `assetId` 가 unique key.
- **`lighting`** — 4종 (`ambient` / `decorative`). PointLight·SpotLight + 위치 인지용 sphere fixture. `shipping`(domestic/sea/air) · `priceKRW` 메타 보유.
- **`fixture`** — 5종 위생도기 (욕조 · 세면대 · 변기 · 샤워기 · 수전). 카테고리 `sanitary` / `shower` / `faucet`.
- **`texture`** — 7종 PBR 텍스처 (interior_tiles · linoleum_brown · marble_cliff_03 · painted_concrete_02 · painted_plaster_wall · plank_flooring_04 등). Poly Haven **ARM 통합맵** 한 장을 roughnessMap·metalnessMap 두 슬롯에 묶어 G/B 채널 자동 분리.
- **`scene`** — Selection / CameraMode / 활성 방 등 통합 세션 상태. Zustand `persist` 로 새로고침 안전, v1→v2 마이그레이션으로 데이터 강등 처리.

## 아키텍처 (FSD 6레이어)

```
src/
├── app/                          진입점·전역 스타일
│   └── main.tsx, App.tsx, styles/
├── pages/
│   └── editor/ui/EditorPage.tsx  220 / 1fr / 260 / 240 4분할 grid
├── widgets/                      도메인 통합 지점
│   ├── scene-viewport/           SceneCanvas + SceneManager(lib) + useSceneManager(api)
│   ├── toolbar/                  카메라 모드 / 룸 추가 토글
│   ├── catalog-panel/            가구·조명·위생도기·텍스처 카탈로그
│   ├── inspector-panel/          선택된 객체 편집
│   └── quote-panel/              실시간 견적 4라인 합산
├── features/                     사용자 액션
│   ├── furniture-drag/           가구 + 위생도기 드래그 (도메인 분기 hook 내부)
│   ├── camera-mode/              Orbit / Top / 1인칭(PointerLock + WASD)
│   └── room-placement/           ghost 박스 클릭 배치 + ESC 취소
├── entities/                     도메인 모델 + 표현
│   ├── scene/                    Zustand store + persist v1→v2 migration
│   ├── room/                     Room/Doorway, buildRoomMesh
│   ├── furniture/                FurnitureItem, FURNITURE_CATALOG, buildFurnitureGroup
│   ├── lighting/                 LightingObject, syncLighting 빌더
│   ├── fixture/                  FixtureMesh + 폴백 박스 → GLTF 비동기 swap
│   └── texture/                  PBR ARM 텍스처 카탈로그
└── shared/                       도메인 무관
    ├── config/                   CELL_SIZE = 3, SHIPPING_SURCHARGE_RATE
    ├── lib/grid/                 roomBounds / findSharedEdge / clampToRoomBounds /
    │                             worldPointToCell / snapRoomSlot / cellRectBounds /
    │                             isWallOwned / roomSurfaceAreas
    ├── lib/asset-cache/          GLTF url 캐시 + textureCache color/data 분리
    └── model/                    Vec3, AssetId(nominal brand), ShippingMethod
```

**의존 방향**: `app > pages > widgets > features > entities > shared` 단방향. 같은 레이어 내 cross-import 금지. Path alias: `@app/*`, `@pages/*`, `@widgets/*`, `@features/*`, `@entities/*`, `@shared/*`. 각 슬라이스 루트 `index.ts` 만 외부 공개 (public API).

## 핵심 설계 포인트

- **렌더 루프는 React 밖** — `requestAnimationFrame` 은 `SceneManager` 소유. React 상태가 매 프레임 갱신될 일 없음.
- **Store → Scene 동기화는 차집합** — `syncFurniture` / `syncLights` / `syncFixtures` 세 도메인 모두 차집합 패턴. 사라진 id 만 dispose, 새 id 만 빌드, 기존은 transform 만 갱신. 매 변경마다 전체 재생성하지 않음.
- **Disposal 책임 일원화** — geometry/material/renderer/controls/raf/ResizeObserver/IBL/lighting/fixture/room ghost/texture cache/focus tween 을 모두 `SceneManager.dispose()` 한 곳에서 정리. HMR 안전.
- **Picking 매니저 제공** — `pickFurnitureId / pickLightingId / pickFixtureId / pickRoomId / pickGroundPoint` 한 줄로 NDC → id. raycast 세부는 UI 누출 안 함. `pickRoomId` 는 Floor 만 hit 해 멀리 있는 방의 벽이 잘못 잡히는 문제 회피.
- **카메라 활성 방 follow** — `focusOnRoom(room, {instant?})` 가 활성 방 중심으로 0.35s ease-out cubic 보간. raf 루프가 매 프레임 `camera.position - target` 으로 offset 재캡처해 보간 중에도 사용자 OrbitControls 입력 반영. 모드 전환(Orbit/Top) 도 활성 방 follow 보존.
- **PBR 텍스처 캐시 color/data 분리** — sRGB(diffuse) vs linear(roughness/metalness/normal) `colorSpace` 함정 방어. 캐시 Map 을 두 개로 분리해 잘못된 colorSpace 로 같은 url 을 재사용하는 사고를 차단.
- **assetId 도메인 nominal brand** — `kind` 와 별개로 도메인별 nominal-typed `AssetId` 로 카탈로그 항목 식별. 같은 `kind`(chair 등) 안에 여러 항목이 공존 가능. Zustand `persist` v1→v2 migration 으로 기존 데이터는 같은 kind 의 첫 카탈로그 항목으로 부드럽게 강등.

## 렌더링 / 룩

사실적 PBR 룩 기반 (고정 설정, 임의 교체 금지).

- **렌더러**: `ACESFilmicToneMapping`, `SRGBColorSpace`, `PCFSoftShadowMap`
- **환경광(IBL)**: 절차적 `RoomEnvironment` 를 즉시 적용. `public/hdri/studio.hdr` 가 있으면 비동기로 덮어씀.
- **직접광**: `DirectionalLight` 한 개. AmbientLight 는 IBL 과 이중 가산이 되어 색이 떠 평평해지므로 쓰지 않음.
- **GLTF 머티리얼은 원본 보존** — 스케일/원점만 정규화. PBR 룩을 살려야 인테리어 사실감이 나오는 게 의도.

## 견적 모델

[`widgets/quote-panel`](src/widgets/quote-panel/) 이 4라인을 실시간 합산:

1. **마감재** — 룸별 floor/wall/ceiling 면적을 [`shared/lib/grid/roomSurfaceAreas`](src/shared/lib/grid/) 가 산출 → `texture` 단가와 곱.
2. **조명** — `lighting` 인스턴스 단가 합.
3. **위생도기** — `fixture` 인스턴스 단가 합.
4. **조달방식 가산** — `domestic 0% / sea +15% / air +30%` 의 한국 시장 수입 동선 반영.

순수 계산 함수 [`entities/scene/calcQuote`](src/entities/scene/) 는 단가 숫자만 받음 — cross-entity 카탈로그 lookup 은 widget adapter 책임이라 도메인 경계가 흐려지지 않음.

## 에셋 (GLTF + 텍스처)

전부 [Poly Haven](https://polyhaven.com) CC0. 파일이 없어도 폴백 박스/단색으로 동작.

### GLTF
`public/models/<category>/<polyhaven-slug>_4k.gltf` 구조.

| 카테고리 | 슬러그 예 |
|---|---|
| `furniture/` | `sofa_02`, `coffee_table_round_01`, `mid_century_lounge_chair`, `vintage_cabinet_01`, … |
| `lighting/` | `industrial_pipe_lamp`, `modern_ceiling_lamp_01`, `mounted_fluorescent_lights` |
| `decorative/` | `potted_plant_02`, `fancy_picture_frame_01`, … (P1 후보) |

스케일은 카탈로그의 `size`(W/H/D) bounding box 기준으로 정규화, 원점은 바닥 중앙으로 정렬. `Object3D.clone(true)` 로 인스턴스마다 transform/material 독립.

### 텍스처
`public/textures/<category>/<polyhaven-slug>_4k/` 구조. ARM 통합맵(`*_arm_4k.jpg`) 한 장이 roughness/metalness 두 슬롯을 동시에 구동.

| 카테고리 | 슬러그 |
|---|---|
| `wood/` | `plank_flooring_04` |
| `tiles/` | `interior_tiles` |
| `concrete/` | `painted_concrete_02` |
| `rock/` | `marble_cliff_03` |
| `floor/` | `linoleum_brown` |
| `plaster-concrete/` | `painted_plaster_wall` |

### HDRI (선택)
[Poly Haven HDRIs](https://polyhaven.com/hdris) 에서 `.hdr` (1K~2K) 한 장을 `public/hdri/studio.hdr` 로 두면 자동 적용. 없으면 절차적 IBL 사용.

## 실행

```bash
pnpm install
pnpm dev        # 개발 서버
pnpm build      # 타입체크 + 빌드
pnpm lint
pnpm preview
```

## 다음에 살 붙일 곳

- **InstancedMesh** — 같은 `assetId` 가구가 임계치 넘으면 자동 인스턴싱 (drawcall 절감 데모, 곧 추가 예정)
- **룸 타입(RoomKind)** + 견적 v2 룸별 분류 표기 ("욕실 4.2㎡: 위생도기 X / 거실 18㎡: …")
- **`useFurnitureDrag` → `useObjectDrag` 일반화** + `entities/*/lib/modelHelpers` 공통화 (`shared/lib/three-model/`)
- 가구 간 AABB 충돌 (`clampToFreeSpace`)
- Undo/Redo (zustand-immer + history stack)
- 2D 평면도 ↔ 3D 동기화 뷰
- 4K 텍스처 → 1K/2K 다운스케일
