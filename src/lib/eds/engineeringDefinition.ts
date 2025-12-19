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

export type CompressionPpapCtq = {
  characteristic: string;
  spec?: string;
  method?: string;
  frequency?: string;
  reactionPlan?: string;
};

export type CompressionPpap = {
  customer?: string;
  partNumber?: string;
  rev?: string;
  submissionLevel?: string;
  ctq?: CompressionPpapCtq[];
};

export type CompressionQuality = {
  ppap?: CompressionPpap;
};

export type CompressionProcessStep = {
  stepName: string;
  machine?: string;
  keyParams?: string;
  operatorCheck?: string;
  inProcessCheck?: string;
};

export type CompressionProcess = {
  route?: CompressionProcessStep[];
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
  quality?: CompressionQuality;
  process?: CompressionProcess;
};

export type WaveSpringEds = {
  type: "wave";
  geometry: {
    id: EngineeringValueNumber;
    od: EngineeringValueNumber;
    thickness_t: EngineeringValueNumber;
    radialWall_b: EngineeringValueNumber;
    turns_Nt: EngineeringValueNumber;
    wavesPerTurn_Nw: EngineeringValueNumber;
    freeHeight_Hf: EngineeringValueNumber;
    workingHeight_Hw: EngineeringValueNumber;
  };
  material: {
    materialId?: string;
    elasticModulus: EngineeringValueNumber;
  };
  targets?: {
    mode: "loadAtWorkingHeight" | "springRate";
    value?: EngineeringValueNumber;
  };
  quality?: CompressionQuality;
  process?: CompressionProcess;
};

export type SpringEds = CompressionSpringEds | WaveSpringEds;
