import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildRoomMesh, type Doorway, type Room } from '@entities/room';
import { buildFurnitureGroup, syncGroupFromItem, type FurnitureItem } from '@entities/furniture';
import { buildLights } from './Lights';
import { setupEnvironment } from './Environment';

/**
 * Three.js scene/renderer/camera/controls 일생을 캡슐화.
 * React useEffect 안에서 mount/dispose 한 번씩 호출하는 형태로 사용.
 *
 * Zustand store 변경은 외부 어댑터에서 syncFurniture/syncRooms로
 * 명령형으로 반영. 매 프레임 React 리렌더를 유발하지 않는 게 핵심.
 */
export class SceneManager {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly controls: OrbitControls;

  private readonly container: HTMLElement;
  private readonly clock = new THREE.Clock();
  private readonly groupById = new Map<string, THREE.Group>();
  private readonly roomGroupById = new Map<string, THREE.Group>();

  private raf = 0;
  private resizeObserver: ResizeObserver | null = null;
  private readonly groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly raycaster = new THREE.Raycaster();
  private environmentHandle: { dispose: () => void } | null = null;

  constructor(container: HTMLElement) {
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#1a1a1d');

    const { clientWidth: w, clientHeight: h } = container;
    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 200);
    this.camera.position.set(8, 7, 8);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 1, 0);

    this.environmentHandle = setupEnvironment(this.scene, this.renderer);
    this.scene.add(buildLights());

    const grid = new THREE.GridHelper(40, 40, 0x444444, 0x222222);
    grid.position.y = -0.001;
    this.scene.add(grid);

    this.setupResize();
    this.start();
  }

  /**
   * 방/도어웨이/선택 상태를 한꺼번에 반영.
   * 방 매쉬는 doorway 변화에도 다시 빌드해야 하므로 전체 재생성이 단순함.
   * 방 개수는 적게 유지될 거라 재빌드 비용 미미.
   */
  syncRooms(rooms: readonly Room[], doorways: readonly Doorway[], selectedRoomId: string | null): void {
    for (const [, group] of this.roomGroupById) {
      this.scene.remove(group);
      disposeGroup(group);
    }
    this.roomGroupById.clear();

    const roomsById = new Map(rooms.map((r) => [r.id, r] as const));
    for (const room of rooms) {
      const mesh = buildRoomMesh(room, doorways, roomsById, { selected: room.id === selectedRoomId });
      this.roomGroupById.set(room.id, mesh);
      this.scene.add(mesh);
    }
  }

  /**
   * 가구 배열의 현재 상태를 scene에 반영. 차집합 기반으로
   * 추가/삭제/업데이트만 처리해 매 프레임 재생성 회피.
   */
  syncFurniture(items: readonly FurnitureItem[]): void {
    const nextIds = new Set(items.map((i) => i.id));

    for (const [id, group] of this.groupById) {
      if (!nextIds.has(id)) {
        this.scene.remove(group);
        disposeGroup(group);
        group.userData.disposed = true;
        this.groupById.delete(id);
      }
    }

    for (const item of items) {
      let group = this.groupById.get(item.id);
      if (!group) {
        group = buildFurnitureGroup(item);
        this.groupById.set(item.id, group);
        this.scene.add(group);
      } else {
        syncGroupFromItem(group, item);
      }
    }
  }

  pickFurnitureId(ndcX: number, ndcY: number): string | null {
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const groups = Array.from(this.groupById.values());
    const [hit] = this.raycaster.intersectObjects(groups, true);
    return (hit?.object.userData.furnitureId as string | undefined) ?? null;
  }

  /**
   * 가구 hit가 없을 때 방 바닥을 클릭한 거라면 그 방 id를 반환.
   * 멀리 있는 방의 벽이 가까운 바닥보다 먼저 hit 되는 문제 회피 위해 Floor만 검사.
   */
  pickRoomId(ndcX: number, ndcY: number): string | null {
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const groups = Array.from(this.roomGroupById.values());
    const hits = this.raycaster.intersectObjects(groups, true);
    for (const hit of hits) {
      const roomId = hit.object.userData.roomId as string | undefined;
      if (roomId && hit.object.name === 'Floor') return roomId;
    }
    return null;
  }

  pickGroundPoint(ndcX: number, ndcY: number): THREE.Vector3 | null {
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const hit = new THREE.Vector3();
    const result = this.raycaster.ray.intersectPlane(this.groundPlane, hit);
    return result ? hit : null;
  }

  setControlsEnabled(enabled: boolean): void {
    this.controls.enabled = enabled;
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    this.resizeObserver?.disconnect();
    this.controls.dispose();
    for (const group of this.groupById.values()) {
      disposeGroup(group);
      group.userData.disposed = true;
    }
    this.groupById.clear();
    for (const group of this.roomGroupById.values()) disposeGroup(group);
    this.roomGroupById.clear();
    this.environmentHandle?.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }

  private start(): void {
    const tick = () => {
      const dt = this.clock.getDelta();
      this.controls.update(dt);
      this.renderer.render(this.scene, this.camera);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  private setupResize(): void {
    this.resizeObserver = new ResizeObserver(() => {
      const { clientWidth: w, clientHeight: h } = this.container;
      if (w === 0 || h === 0) return;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
    this.resizeObserver.observe(this.container);
  }
}

function disposeMesh(mesh: THREE.Mesh): void {
  mesh.geometry.dispose();
  const mat = mesh.material;
  if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
  else mat.dispose();
}

function disposeGroup(group: THREE.Group): void {
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) disposeMesh(obj);
    if (obj instanceof THREE.LineSegments) {
      obj.geometry.dispose();
      const mat = obj.material as THREE.Material | THREE.Material[];
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat.dispose();
    }
  });
}
