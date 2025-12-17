import type { SpringMaterialId } from "@/lib/materials/springMaterials";

export type EngineeringValueSource = "user" | "library" | "derived";

export type ToleranceBand = {
  plus?: number;
  minus?: number;
};

export type EngineeringValueNumber = {
  nominal: number;
  unit: string;
  tolerance?: ToleranceBand;
  source?: EngineeringValueSource;
  meaning?: string;
};

export type CompressionEngineeringFlags = {
  topGround?: boolean;
  bottomGround?: boolean;
};

export type CompressionSpringEds = {
  type: "compression";
  geometry: {
    wireDiameter: EngineeringValueNumber;
    meanDiameter: EngineeringValueNumber;
    activeCoils: EngineeringValueNumber;
    totalCoils: EngineeringValueNumber;
    freeLength?: EngineeringValueNumber;
  };
  material: {
    materialId?: SpringMaterialId;
    shearModulus: EngineeringValueNumber;
  };
  flags?: CompressionEngineeringFlags;
  quality?: Record<string, unknown>;
  process?: Record<string, unknown>;
};

export type SpringEds = CompressionSpringEds;
