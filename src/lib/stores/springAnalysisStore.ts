/**
 * Global Spring Analysis Store
 * 全局弹簧分析状态管理
 * 
 * Unified state management for spring analysis across all pages
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SpringGeometry, WorkingConditions, SpringAnalysisResult } from '@/lib/engine/types';
import type { SpringMaterialId } from '@/lib/materials/springMaterials';

// Phase 6 types
import type { CoilingProcessResult } from '@/lib/engine/coilingProcess';
import type { ShotPeeningResult } from '@/lib/engine/shotPeening';
import type { ScragTestResult } from '@/lib/engine/scragTest';
import type { ManufacturabilityResult } from '@/lib/engine/manufacturabilityCheck';
import type { StandardCheckResult } from '@/lib/engine/standardsCheck';
import type { MaterialRecommendationResult } from '@/lib/engine/materialRecommendation';
import type { MLPredictionResult } from '@/lib/engine/mlFatiguePredictor';

/**
 * Phase 6 manufacturing analysis data
 */
export interface Phase6ManufacturingData {
  coilingProcess?: CoilingProcessResult;
  shotPeening?: ShotPeeningResult;
  scragTest?: ScragTestResult;
}

/**
 * Phase 6 standards and quality data
 */
export interface Phase6QualityData {
  manufacturability?: ManufacturabilityResult;
  standardsCheck?: {
    asme?: StandardCheckResult;
    sae?: StandardCheckResult;
    din?: StandardCheckResult;
  };
}

/**
 * Phase 6 AI/ML analysis data
 */
export interface Phase6AIData {
  materialRecommendation?: MaterialRecommendationResult;
  mlFatiguePrediction?: MLPredictionResult;
}

/**
 * Complete spring analysis state
 */
export interface SpringAnalysisState {
  // Basic spring data
  geometry: SpringGeometry | null;
  workingConditions: WorkingConditions | null;
  materialId: SpringMaterialId | null;
  
  // Analysis results
  analysisResult: SpringAnalysisResult | null;
  
  // Phase 6 data
  phase6Manufacturing: Phase6ManufacturingData | null;
  phase6Quality: Phase6QualityData | null;
  phase6AI: Phase6AIData | null;
  
  // UI state
  isAnalyzing: boolean;
  lastAnalyzedAt: number | null;
  
  // Actions
  setGeometry: (geometry: SpringGeometry) => void;
  setWorkingConditions: (conditions: WorkingConditions) => void;
  setMaterialId: (materialId: SpringMaterialId) => void;
  setAnalysisResult: (result: SpringAnalysisResult) => void;
  
  // Phase 6 actions
  setPhase6Manufacturing: (data: Phase6ManufacturingData) => void;
  setPhase6Quality: (data: Phase6QualityData) => void;
  setPhase6AI: (data: Phase6AIData) => void;
  
  // Utility actions
  setIsAnalyzing: (isAnalyzing: boolean) => void;
  clearAnalysis: () => void;
  clearAll: () => void;
  
  // Computed helpers
  hasValidGeometry: () => boolean;
  hasAnalysisResult: () => boolean;
  hasPhase6Data: () => boolean;
}

/**
 * Initial state
 */
const initialState = {
  geometry: null,
  workingConditions: null,
  materialId: null,
  analysisResult: null,
  phase6Manufacturing: null,
  phase6Quality: null,
  phase6AI: null,
  isAnalyzing: false,
  lastAnalyzedAt: null,
};

/**
 * Global spring analysis store with persistence
 */
export const useSpringAnalysisStore = create<SpringAnalysisState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Basic setters
      setGeometry: (geometry) => set({ 
        geometry,
        // Clear analysis when geometry changes
        analysisResult: null,
        phase6Manufacturing: null,
        phase6Quality: null,
        phase6AI: null,
        lastAnalyzedAt: null,
      }),

      setWorkingConditions: (workingConditions) => set({ workingConditions }),

      setMaterialId: (materialId) => set({ 
        materialId,
        // Clear analysis when material changes
        analysisResult: null,
        phase6Manufacturing: null,
        phase6Quality: null,
        phase6AI: null,
      }),

      setAnalysisResult: (analysisResult) => set({ 
        analysisResult,
        lastAnalyzedAt: Date.now(),
      }),

      // Phase 6 setters
      setPhase6Manufacturing: (phase6Manufacturing) => set({ phase6Manufacturing }),
      setPhase6Quality: (phase6Quality) => set({ phase6Quality }),
      setPhase6AI: (phase6AI) => set({ phase6AI }),

      // Utility actions
      setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),

      clearAnalysis: () => set({
        analysisResult: null,
        phase6Manufacturing: null,
        phase6Quality: null,
        phase6AI: null,
        lastAnalyzedAt: null,
      }),

      clearAll: () => set(initialState),

      // Computed helpers
      hasValidGeometry: () => {
        const { geometry } = get();
        return geometry !== null && geometry.wireDiameter > 0;
      },

      hasAnalysisResult: () => {
        const { analysisResult } = get();
        return analysisResult !== null;
      },

      hasPhase6Data: () => {
        const { phase6Manufacturing, phase6Quality, phase6AI } = get();
        return phase6Manufacturing !== null || phase6Quality !== null || phase6AI !== null;
      },
    }),
    {
      name: 'spring-analysis-storage',
      partialize: (state) => ({
        // Only persist essential data, not UI state
        geometry: state.geometry,
        workingConditions: state.workingConditions,
        materialId: state.materialId,
        analysisResult: state.analysisResult,
        phase6Manufacturing: state.phase6Manufacturing,
        phase6Quality: state.phase6Quality,
        phase6AI: state.phase6AI,
        lastAnalyzedAt: state.lastAnalyzedAt,
      }),
    }
  )
);

/**
 * Hook to get spring type from geometry
 */
export function useSpringType() {
  const geometry = useSpringAnalysisStore((state) => state.geometry);
  return geometry?.type ?? null;
}

/**
 * Hook to check if analysis is ready
 */
export function useIsAnalysisReady() {
  const geometry = useSpringAnalysisStore((state) => state.geometry);
  const materialId = useSpringAnalysisStore((state) => state.materialId);
  return geometry !== null && materialId !== null;
}
