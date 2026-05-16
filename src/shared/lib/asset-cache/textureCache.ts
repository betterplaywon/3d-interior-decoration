import * as THREE from 'three';

/**
 * 텍스처를 url 단위로 캐싱. 같은 마감재가 여러 방에 적용돼도 GPU 업로드 1회.
 * 반환된 Texture는 공유 객체 — 호출자가 dispose 하면 안 됨.
 *
 * 색공간 분리:
 * - `get` / `getRepeated`: sRGB — baseColor 같은 컬러 데이터용.
 * - `getData` / `getDataRepeated`: linear (NoColorSpace) — normal/roughness/metalness 같은
 *   숫자 데이터용. 컬러로 잘못 해석하면 톤매핑이 데이터값을 왜곡해 렌더가 깨진다.
 *
 * 같은 URL 이 컬러와 데이터로 동시에 쓰일 일은 없지만 가드를 위해 캐시 키를 분리.
 */
class TextureCache {
  private readonly loader = new THREE.TextureLoader();
  private readonly colorCache = new Map<string, THREE.Texture>();
  private readonly dataCache = new Map<string, THREE.Texture>();

  get(url: string): THREE.Texture {
    let tex = this.colorCache.get(url);
    if (!tex) {
      tex = this.loader.load(url);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      this.colorCache.set(url, tex);
    }
    return tex;
  }

  /**
   * 같은 URL을 다른 repeat 값으로 쓰고 싶을 때 사용. 텍스처는 공유하되
   * repeat은 인스턴스별로 다를 수 있어야 하므로 clone 후 repeat만 덮어쓴다.
   * clone된 텍스처는 자체 GPU 업로드를 트리거하지 않음(이미지 객체 공유).
   */
  getRepeated(url: string, repeatX: number, repeatY: number): THREE.Texture {
    const base = this.get(url);
    const clone = base.clone();
    clone.repeat.set(repeatX, repeatY);
    clone.needsUpdate = false;
    return clone;
  }

  /** 데이터 맵(normal/roughness 등). linear colorSpace 강제. */
  getData(url: string): THREE.Texture {
    let tex = this.dataCache.get(url);
    if (!tex) {
      tex = this.loader.load(url);
      tex.colorSpace = THREE.NoColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      this.dataCache.set(url, tex);
    }
    return tex;
  }

  /** getRepeated 의 데이터 맵 버전. base/normal/roughness 가 같은 repeat 으로 정렬되도록 호출자가 동일 값 전달. */
  getDataRepeated(url: string, repeatX: number, repeatY: number): THREE.Texture {
    const base = this.getData(url);
    const clone = base.clone();
    clone.repeat.set(repeatX, repeatY);
    clone.needsUpdate = false;
    return clone;
  }
}

export const textureCache = new TextureCache();
