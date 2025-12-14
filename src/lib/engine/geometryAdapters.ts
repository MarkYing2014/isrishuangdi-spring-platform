import type { SpringMaterialId } from "@/lib/materials/springMaterials";
import type {
  SpringGeometry as StoreSpringGeometry,
  CompressionGeometry,
  ExtensionGeometry,
  TorsionGeometry,
  ConicalGeometry,
} from "@/lib/stores/springDesignStore";
import type {
  SpringGeometry as EngineSpringGeometry,
  CompressionSpringGeometry,
  ExtensionSpringGeometry,
  TorsionSpringGeometry,
  ConicalSpringGeometry,
} from "@/lib/engine/types";

function toCompressionGeometry(
  geometry: CompressionGeometry,
  materialId: SpringMaterialId
): CompressionSpringGeometry {
  return {
    type: "compression",
    wireDiameter: geometry.wireDiameter,
    meanDiameter: geometry.meanDiameter,
    activeCoils: geometry.activeCoils,
    totalCoils: geometry.totalCoils ?? geometry.activeCoils + 2,
    freeLength: geometry.freeLength,
    pitch: geometry.pitch,
    materialId,
  };
}

function toExtensionGeometry(
  geometry: ExtensionGeometry,
  materialId: SpringMaterialId
): ExtensionSpringGeometry {
  const meanDiameter = geometry.meanDiameter ?? geometry.outerDiameter - geometry.wireDiameter;
  const bodyLength =
    geometry.bodyLength ?? geometry.freeLength ?? geometry.activeCoils * geometry.wireDiameter;
  const hookType =
    geometry.hookType === "doubleLoop"
      ? "extended"
      : geometry.hookType ?? "machine";

  return {
    type: "extension",
    wireDiameter: geometry.wireDiameter,
    meanDiameter,
    activeCoils: geometry.activeCoils,
    totalCoils: geometry.activeCoils,
    bodyLength,
    initialTension: geometry.initialTension ?? 0,
    hookType,
    materialId,
  };
}

function toTorsionGeometry(
  geometry: TorsionGeometry,
  materialId: SpringMaterialId
): TorsionSpringGeometry {
  return {
    type: "torsion",
    wireDiameter: geometry.wireDiameter,
    meanDiameter: geometry.meanDiameter,
    activeCoils: geometry.activeCoils,
    totalCoils: geometry.activeCoils,
    bodyLength: geometry.bodyLength ?? geometry.activeCoils * geometry.wireDiameter,
    legLength1: geometry.legLength1,
    legLength2: geometry.legLength2,
    windDirection: geometry.windingDirection,
    materialId,
  };
}

function toConicalGeometry(
  geometry: ConicalGeometry,
  materialId: SpringMaterialId
): ConicalSpringGeometry {
  return {
    type: "conical",
    wireDiameter: geometry.wireDiameter,
    activeCoils: geometry.activeCoils,
    totalCoils: geometry.totalCoils ?? geometry.activeCoils,
    largeOuterDiameter: geometry.largeOuterDiameter,
    smallOuterDiameter: geometry.smallOuterDiameter,
    freeLength: geometry.freeLength,
    materialId,
  };
}

export function convertStoreGeometryToEngine(
  geometry: StoreSpringGeometry,
  materialId: SpringMaterialId
): EngineSpringGeometry {
  switch (geometry.type) {
    case "compression":
      return toCompressionGeometry(geometry, materialId);
    case "extension":
      return toExtensionGeometry(geometry, materialId);
    case "torsion":
      return toTorsionGeometry(geometry, materialId);
    case "conical":
      return toConicalGeometry(geometry, materialId);
    case "spiralTorsion":
      // 螺旋扭转弹簧暂不支持通用几何适配器
      // 返回 null 或抛出错误
      throw new Error("Spiral torsion spring geometry adapter not yet implemented");
  }
}
