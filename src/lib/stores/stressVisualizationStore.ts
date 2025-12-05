/**
 * Stress Visualization Store
 * 应力可视化状态存储
 * 
 * Manages real-time stress distribution data for 3D visualization
 */

import { create } from 'zustand';
import type { StressDistributionResult } from '@/lib/engine/stressDistribution';
import type { FatigueDamageResult } from '@/lib/engine/fatigueDamage';

export type VisualizationMode = 'normal' | 'stress' | 'damage';

interface StressVisualizationState {
  /** Current visualization mode */
  mode: VisualizationMode;
  /** Current stress distribution data */
  stressDistribution: StressDistributionResult | null;
  /** Current fatigue damage data */
  fatigueDamage: FatigueDamageResult | null;
  /** Animation pulse phase (0-1) for failure zones */
  pulsePhase: number;
  /** Whether to show hot spots */
  showHotSpots: boolean;
  /** Whether to show legend */
  showLegend: boolean;
  /** Selected point index for tooltip */
  selectedPointIndex: number | null;
  
  // Actions
  setMode: (mode: VisualizationMode) => void;
  setStressDistribution: (data: StressDistributionResult | null) => void;
  setFatigueDamage: (data: FatigueDamageResult | null) => void;
  setPulsePhase: (phase: number) => void;
  setShowHotSpots: (show: boolean) => void;
  setShowLegend: (show: boolean) => void;
  setSelectedPointIndex: (index: number | null) => void;
  reset: () => void;
}

const initialState = {
  mode: 'normal' as VisualizationMode,
  stressDistribution: null,
  fatigueDamage: null,
  pulsePhase: 0,
  showHotSpots: true,
  showLegend: true,
  selectedPointIndex: null,
};

export const useStressVisualizationStore = create<StressVisualizationState>((set) => ({
  ...initialState,
  
  setMode: (mode) => set({ mode }),
  
  setStressDistribution: (data) => set({ stressDistribution: data }),
  
  setFatigueDamage: (data) => set({ fatigueDamage: data }),
  
  setPulsePhase: (phase) => set({ pulsePhase: phase }),
  
  setShowHotSpots: (show) => set({ showHotSpots: show }),
  
  setShowLegend: (show) => set({ showLegend: show }),
  
  setSelectedPointIndex: (index) => set({ selectedPointIndex: index }),
  
  reset: () => set(initialState),
}));

/**
 * Hook to get vertex colors based on current mode
 */
export function getVertexColorsForMode(
  state: StressVisualizationState
): Float32Array | null {
  const { mode, stressDistribution, fatigueDamage, pulsePhase } = state;
  
  if (mode === 'normal' || (!stressDistribution && !fatigueDamage)) {
    return null;
  }
  
  if (mode === 'stress' && stressDistribution) {
    const colors = new Float32Array(stressDistribution.points.length * 3);
    for (let i = 0; i < stressDistribution.points.length; i++) {
      const point = stressDistribution.points[i];
      colors[i * 3] = point.color[0];
      colors[i * 3 + 1] = point.color[1];
      colors[i * 3 + 2] = point.color[2];
    }
    return colors;
  }
  
  if (mode === 'damage' && fatigueDamage) {
    const colors = new Float32Array(fatigueDamage.points.length * 3);
    for (let i = 0; i < fatigueDamage.points.length; i++) {
      const point = fatigueDamage.points[i];
      let [r, g, b] = point.damageColor;
      
      // Add pulse effect for failure zones
      if (point.damageCategory === 'failure') {
        const pulse = 0.3 * Math.sin(pulsePhase * Math.PI * 2);
        r = Math.min(1, r + pulse);
      }
      
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }
    return colors;
  }
  
  return null;
}
