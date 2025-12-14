/**
 * Arc Spring 材料库
 * 
 * 剪切模量 G 值来源: DIN EN 10270 标准
 */

import { ArcSpringMaterial } from "./types";

export const ARC_SPRING_MATERIALS: ArcSpringMaterial[] = [
  { key: "EN10270_1", name: "DIN EN 10270-1 (Patent drawn)", G: 81500 },
  { key: "EN10270_2", name: "DIN EN 10270-2 (Oil hardened & tempered)", G: 80000 },
  { key: "EN10270_3", name: "DIN EN 10270-3 (Stainless)", G: 77000 },
  { key: "CUSTOM", name: "Custom (override G)", G: 80000 },
];

export function getMaterialByKey(key: string): ArcSpringMaterial | undefined {
  return ARC_SPRING_MATERIALS.find(m => m.key === key);
}
