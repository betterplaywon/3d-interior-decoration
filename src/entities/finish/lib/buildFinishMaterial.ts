import * as THREE from 'three';
import { textureCache } from '@shared/lib/asset-cache';
import type { FinishItem } from '../model';

interface BuildOptions {
  /** 텍스처 반복 계산용 면적(미터). 가로/세로 각각 — 벽이면 (벽길이, 벽높이). */
  sizeX: number;
  sizeY: number;
  /** 선택된 방 강조 등 베이스 색을 살짝 밝게/어둡게 — RoomMesh의 lightenColor와 같은 의도. */
  tintAmount?: number;
}

/**
 * 마감재 정의에서 MeshStandardMaterial을 만든다. 텍스처가 있으면
 * 면적 대비 자연스러운 반복 횟수(textureRepeatPerMeter)로 wrap.
 *
 * 머티리얼은 호출자(=RoomMesh의 Group) 소유라 dispose 책임도 Group 단의
 * disposeGroup traverse가 가져간다. 텍스처는 textureCache 공유 객체라 dispose 금지.
 */
export function buildFinishMaterial(
  finish: FinishItem,
  options: BuildOptions,
): THREE.MeshStandardMaterial {
  const color = options.tintAmount ? tint(finish.baseColor, options.tintAmount) : finish.baseColor;
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: finish.roughness,
    metalness: finish.metalness,
  });

  // 세 맵을 같은 repeat 으로 묶어야 base/normal/roughness 가 픽셀 단위로 정렬됨.
  // baseColorMap 이 없어도 normal/roughness 만 적용하면 단색 PBR 디테일이 살아남.
  const repeat = finish.textureRepeatPerMeter ?? 0.5;
  const rx = Math.max(1, options.sizeX * repeat);
  const ry = Math.max(1, options.sizeY * repeat);

  if (finish.baseColorMap) {
    material.map = textureCache.getRepeated(finish.baseColorMap, rx, ry);
  }
  if (finish.normalMap) {
    material.normalMap = textureCache.getDataRepeated(finish.normalMap, rx, ry);
  }
  if (finish.roughnessMap) {
    material.roughnessMap = textureCache.getDataRepeated(finish.roughnessMap, rx, ry);
    // 맵 값이 곱해지는 구조 — base roughness 를 1.0 으로 두지 않으면 전체가 어두워짐
    material.roughness = 1.0;
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
