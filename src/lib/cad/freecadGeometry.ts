import type {
  SpringGeometry as EngineSpringGeometry,
  CompressionSpringGeometry,
  ExtensionSpringGeometry,
  TorsionSpringGeometry,
  ConicalSpringGeometry,
} from "@/lib/engine/types";

export type FreeCadSpringType = "compression" | "extension" | "torsion" | "conical";

export interface FreeCadGeometryPayload {
  wireDiameter: number;
  meanDiameter?: number;
  outerDiameter?: number;
  activeCoils: number;
  totalCoils?: number;
  freeLength?: number;
  bodyLength?: number;
  hookType?: string;
  initialTension?: number;
  legLength1?: number;
  legLength2?: number;
  windingDirection?: "left" | "right";
  freeAngle?: number;
  largeOuterDiameter?: number;
  smallOuterDiameter?: number;
  endType?: "natural" | "closed" | "closed_ground";
  topGround?: boolean;
  bottomGround?: boolean;
}

function fromCompression(geometry: CompressionSpringGeometry): FreeCadGeometryPayload {
  return {
    wireDiameter: geometry.wireDiameter,
    meanDiameter: geometry.meanDiameter,
    activeCoils: geometry.activeCoils,
    totalCoils: geometry.totalCoils,
    freeLength: geometry.freeLength,
  };
}

function fromExtension(geometry: ExtensionSpringGeometry): FreeCadGeometryPayload {
  const meanDiameter = geometry.meanDiameter;
  const outerDiameter = meanDiameter + geometry.wireDiameter;
  return {
    wireDiameter: geometry.wireDiameter,
    meanDiameter,
    outerDiameter,
    activeCoils: geometry.activeCoils,
    totalCoils: geometry.totalCoils,
    bodyLength: geometry.bodyLength,
    hookType: geometry.hookType,
    initialTension: geometry.initialTension,
  };
}

function fromTorsion(geometry: TorsionSpringGeometry): FreeCadGeometryPayload {
  const outerDiameter = geometry.meanDiameter + geometry.wireDiameter;
  return {
    wireDiameter: geometry.wireDiameter,
    meanDiameter: geometry.meanDiameter,
    outerDiameter,
    activeCoils: geometry.activeCoils,
    totalCoils: geometry.totalCoils,
    bodyLength: geometry.bodyLength,
    legLength1: geometry.legLength1,
    legLength2: geometry.legLength2,
    windingDirection: geometry.windDirection,
  };
}

function fromConical(geometry: ConicalSpringGeometry): FreeCadGeometryPayload {
  return {
    wireDiameter: geometry.wireDiameter,
    activeCoils: geometry.activeCoils,
    totalCoils: geometry.totalCoils,
    freeLength: geometry.freeLength,
    largeOuterDiameter: geometry.largeOuterDiameter,
    smallOuterDiameter: geometry.smallOuterDiameter,
  };
}

/**
 * Convert engine geometry into the payload expected by FreeCAD services (preview/export/drawing)
 */
export function buildFreeCadGeometryPayload(
  geometry: EngineSpringGeometry,
  overrides?: Partial<FreeCadGeometryPayload>
): FreeCadGeometryPayload {
  let base: FreeCadGeometryPayload;
  switch (geometry.type) {
    case "compression":
      base = fromCompression(geometry);
      break;
    case "extension":
      base = fromExtension(geometry);
      break;
    case "torsion":
      base = fromTorsion(geometry);
      break;
    case "conical":
      base = fromConical(geometry);
      break;
    default: {
      const _exhaustiveCheck: never = geometry;
      base = _exhaustiveCheck;
    }
  }
  return overrides ? { ...base, ...overrides } : base;
}
