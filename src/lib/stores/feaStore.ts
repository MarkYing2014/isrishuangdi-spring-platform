/**
 * FEA Store
 * 
 * Zustand store for managing FEA analysis state shared between
 * the FeaPanel UI and Three.js visualizers.
 */

import { create } from "zustand";
import type { FEAResult, FeaColorMode } from "@/lib/fea/feaTypes";

interface FeaState {
  feaResult: FEAResult | null;
  colorMode: FeaColorMode;
  isLoading: boolean;
  error: string | null;
}

interface FeaActions {
  setFeaResult: (result: FEAResult | null) => void;
  setColorMode: (mode: FeaColorMode) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

type FeaStore = FeaState & FeaActions;

const initialState: FeaState = {
  feaResult: null,
  colorMode: "formula",
  isLoading: false,
  error: null,
};

export const useFeaStore = create<FeaStore>((set) => ({
  ...initialState,

  setFeaResult: (result) => set({ feaResult: result, error: null }),
  setColorMode: (mode) => set({ colorMode: mode }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
