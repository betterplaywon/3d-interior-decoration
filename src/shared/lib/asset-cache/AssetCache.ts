import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * GLTF 로드 결과를 url 단위로 캐싱. 같은 모델을 여러 인스턴스가
 * 써도 fetch는 한 번. 반환되는 scene은 사용 측에서 clone해서 씀.
 *
 * 로드 실패는 정상 흐름으로 취급 — null을 캐싱해서 재시도 안 함.
 * (에셋 파일이 없는 폴백 경로를 자연스럽게 지원)
 */
class AssetCache {
  private readonly loader = new GLTFLoader();
  private readonly cache = new Map<string, Promise<GLTF | null>>();

  load(url: string): Promise<GLTF | null> {
    let promise = this.cache.get(url);
    if (!promise) {
      promise = new Promise<GLTF | null>((resolve) => {
        this.loader.load(
          url,
          (gltf) => resolve(gltf),
          undefined,
          (err) => {
            console.warn(`[AssetCache] failed to load ${url}`, err);
            resolve(null);
          },
        );
      });
      this.cache.set(url, promise);
    }
    return promise;
  }

  /** 캐시된 GLTF를 clone — 인스턴스마다 transform/material 독립. */
  async loadCloned(url: string): Promise<THREE.Object3D | null> {
    const gltf = await this.load(url);
    if (!gltf) return null;
    return gltf.scene.clone(true);
  }
}

export const assetCache = new AssetCache();
