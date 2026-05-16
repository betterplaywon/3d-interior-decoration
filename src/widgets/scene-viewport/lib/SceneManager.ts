import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { buildRoomMesh, type Doorway, type Room } from '@entities/room';
import { buildFurnitureGroup, syncGroupFromItem, type FurnitureItem } from '@entities/furniture';
import type { CameraMode } from '@entities/scene';
import { buildLights } from './Lights';
import { setupEnvironment } from './Environment';

const ORBIT_CAMERA_POS = new THREE.Vector3(8, 7, 8);
const ORBIT_TARGET = new THREE.Vector3(0, 1, 0);
const TOP_CAMERA_POS = new THREE.Vector3(0, 24, 0.0001);
const TOP_TARGET = new THREE.Vector3(0, 0, 0);
const FIRST_EYE_HEIGHT = 1.6;
const FIRST_MOVE_SPEED = 4;

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

  private currentMode: CameraMode = 'orbit';
  private pointerLock: PointerLockControls | null = null;
  private pointerLockClickHandler: (() => void) | null = null;
  private readonly keysDown = new Set<string>();
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private keyupHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#1a1a1d');

    const { clientWidth: w, clientHeight: h } = container;
    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 200);
    this.camera.position.copy(ORBIT_CAMERA_POS);
    this.camera.lookAt(ORBIT_TARGET);

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
    this.controls.target.copy(ORBIT_TARGET);

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

  /**
   * 드래그 중 OrbitControls 충돌 방지용. 1인칭(first) 모드일 때는
   * PointerLock이 입력을 가져가므로 호출자는 신경 쓸 필요 없음.
   */
  setControlsEnabled(enabled: boolean): void {
    if (this.currentMode === 'first') return;
    this.controls.enabled = enabled;
  }

  /**
   * 카메라 모드 전환. 모드별로 컨트롤러 한 종류만 활성화한다 —
   * Orbit/Top은 같은 OrbitControls 인스턴스를 재사용하되 각도·위치를 강제하고,
   * First는 PointerLockControls를 lazy 생성한다.
   */
  setCameraMode(mode: CameraMode): void {
    if (mode === this.currentMode) return;
    const previous = this.currentMode;
    this.currentMode = mode;

    if (previous === 'first') this.exitFirstPerson();

    switch (mode) {
      case 'orbit':
        this.applyOrbitMode();
        break;
      case 'top':
        this.applyTopMode();
        break;
      case 'first':
        this.enterFirstPerson();
        break;
    }
  }

  private applyOrbitMode(): void {
    this.controls.enabled = true;
    this.controls.minPolarAngle = 0;
    this.controls.maxPolarAngle = Math.PI;
    this.controls.enableRotate = true;
    this.camera.position.copy(ORBIT_CAMERA_POS);
    this.controls.target.copy(ORBIT_TARGET);
    this.controls.update();
  }

  /**
   * Top-down 뷰: OrbitControls를 그대로 두되 회전을 막아 평면도처럼 보이게 한다.
   * 카메라 인스턴스 교체(Ortho)는 raycaster/picking 검증이 더 필요해 보류.
   */
  private applyTopMode(): void {
    this.controls.enabled = true;
    this.controls.enableRotate = false;
    this.controls.minPolarAngle = 0;
    this.controls.maxPolarAngle = 0;
    this.camera.position.copy(TOP_CAMERA_POS);
    this.controls.target.copy(TOP_TARGET);
    this.controls.update();
  }

  private enterFirstPerson(): void {
    this.controls.enabled = false;
    const lock = new PointerLockControls(this.camera, this.renderer.domElement);
    this.pointerLock = lock;
    this.scene.add(lock.object);
    lock.object.position.set(0, FIRST_EYE_HEIGHT, 0);
    // 사용자가 캔버스를 직접 클릭해야 lock이 걸리는 브라우저 정책 — 첫 클릭으로 진입 유도
    this.pointerLockClickHandler = () => lock.lock();
    this.renderer.domElement.addEventListener('click', this.pointerLockClickHandler);

    this.keydownHandler = (e) => this.keysDown.add(e.code);
    this.keyupHandler = (e) => this.keysDown.delete(e.code);
    window.addEventListener('keydown', this.keydownHandler);
    window.addEventListener('keyup', this.keyupHandler);
  }

  private exitFirstPerson(): void {
    if (!this.pointerLock) return;
    const lock = this.pointerLock;
    if (this.pointerLockClickHandler) {
      this.renderer.domElement.removeEventListener('click', this.pointerLockClickHandler);
      this.pointerLockClickHandler = null;
    }
    lock.unlock();
    lock.disconnect();
    this.scene.remove(lock.object);
    this.pointerLock = null;

    if (this.keydownHandler) window.removeEventListener('keydown', this.keydownHandler);
    if (this.keyupHandler) window.removeEventListener('keyup', this.keyupHandler);
    this.keydownHandler = null;
    this.keyupHandler = null;
    this.keysDown.clear();
  }

  private updateFirstPerson(dt: number): void {
    const lock = this.pointerLock;
    if (!lock || !lock.isLocked) return;
    const step = FIRST_MOVE_SPEED * dt;
    let forward = 0;
    let right = 0;
    if (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp')) forward += 1;
    if (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown')) forward -= 1;
    if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) right += 1;
    if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft')) right -= 1;
    if (forward === 0 && right === 0) return;
    // moveForward/moveRight는 PointerLockControls가 yaw만 반영하므로 y가 떠오르지 않음
    lock.moveForward(forward * step);
    lock.moveRight(right * step);
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    this.resizeObserver?.disconnect();
    this.exitFirstPerson();
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
      if (this.currentMode === 'first') {
        this.updateFirstPerson(dt);
      } else {
        this.controls.update(dt);
      }
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
