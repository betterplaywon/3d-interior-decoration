import * as THREE from 'three';

/**
 * 텍스처를 url 단위로 캐싱. 같은 마감재가 여러 방에 적용돼도 GPU 업로드 1회.
 * 반환된 Texture는 공유 객체 — 호출자가 dispose 하면 안 됨.
 *
 * 색공간은 sRGB로 강제: 마감재 base color map은 모두 컬러 데이터.
 * roughness/normal 같은 데이터 맵을 도입할 땐 별도 캐시(혹은 옵션) 필요.
 */
class TextureCache {
  private readonly loader = new THREE.TextureLoader();
  private readonly cache = new Map<string, THREE.Texture>();

  get(url: string): THREE.Texture {
    let tex = this.cache.get(url);
    if (!tex) {
      tex = this.loader.load(url);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      this.cache.set(url, tex);
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
}

export const textureCache = new TextureCache();
