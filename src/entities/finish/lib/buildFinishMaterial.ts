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

  if (finish.baseColorMap) {
    const repeat = finish.textureRepeatPerMeter ?? 0.5;
    const map = textureCache.getRepeated(
      finish.baseColorMap,
      Math.max(1, options.sizeX * repeat),
      Math.max(1, options.sizeY * repeat),
    );
    material.map = map;
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
