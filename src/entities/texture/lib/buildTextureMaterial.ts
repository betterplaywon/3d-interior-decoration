import * as THREE from 'three';
import { textureCache } from '@shared/lib/asset-cache';
import type { TextureItem } from '../model';

interface BuildOptions {
  /** 텍스처 반복 계산용 면적(미터). 가로/세로 각각 — 벽이면 (벽길이, 벽높이). */
  sizeX: number;
  sizeY: number;
  /** 선택된 방 강조 등 베이스 색을 살짝 밝게/어둡게 — RoomMesh의 lightenColor와 같은 의도. */
  tintAmount?: number;
}

/**
 * 텍스처 정의에서 MeshStandardMaterial을 만든다. 텍스처가 있으면
 * 면적 대비 자연스러운 반복 횟수(textureRepeatPerMeter)로 wrap.
 *
 * 머티리얼은 호출자(=RoomMesh의 Group) 소유라 dispose 책임도 Group 단의
 * disposeGroup traverse가 가져간다. 텍스처는 textureCache 공유 객체라 dispose 금지.
 */
export function buildTextureMaterial(
  texture: TextureItem,
  options: BuildOptions,
): THREE.MeshStandardMaterial {
  const color = options.tintAmount
    ? tint(texture.baseColor, options.tintAmount)
    : texture.baseColor;
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: texture.roughness,
    metalness: texture.metalness,
  });

  // 세 맵을 같은 repeat 으로 묶어야 base/normal/roughness 가 픽셀 단위로 정렬됨.
  // baseColorMap 이 없어도 normal/roughness 만 적용하면 단색 PBR 디테일이 살아남.
  const repeat = texture.textureRepeatPerMeter ?? 0.5;
  const rx = Math.max(1, options.sizeX * repeat);
  const ry = Math.max(1, options.sizeY * repeat);

  if (texture.baseColorMap) {
    material.map = textureCache.getRepeated(texture.baseColorMap, rx, ry);
  }
  if (texture.normalMap) {
    material.normalMap = textureCache.getDataRepeated(texture.normalMap, rx, ry);
  }
  if (texture.roughnessMap) {
    // Poly Haven ARM 통합 맵 — G(roughness)·B(metalness) 채널을 Three.js 가
    // 각각 자동 샘플하므로 같은 텍스처 객체를 두 슬롯에 묶어 GPU 메모리 1회분으로
    // PBR 두 변수를 동시에 구동한다.
    const armMap = textureCache.getDataRepeated(texture.roughnessMap, rx, ry);
    material.roughnessMap = armMap;
    material.metalnessMap = armMap;
    // 맵 값이 곱해지는 구조 — base 값을 1.0 으로 두지 않으면 전체가 어두워지거나
    // metalness 가 항상 0 으로 강제됨
    material.roughness = 1.0;
    material.metalness = 1.0;
  }
  return material;
}

function tint(hex: string, amount: number): string {
  const c = new THREE.Color(hex);
  c.r = Math.min(1, Math.max(0, c.r + amount));
  c.g = Math.min(1, Math.max(0, c.g + amount));
  c.b = Math.min(1, Math.max(0, c.b + amount));
  return `#${c.getHexString()}`;
}
