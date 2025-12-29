
import { create } from "zustand";
import { type CadExportResult } from "@/lib/cad/types";
import { useSpringSimulationStore, type ExtensionDesignMeta } from "@/lib/stores/springSimulationStore";
import { buildExtensionSpringCenterlineMm } from "@/lib/cad/extensionSpringCad";
import { generateCadQueryPython } from "@/lib/cad/cadquery";
import { type TorsionDesignMeta } from "@/lib/stores/springSimulationStore";
import { buildTorsionSpringCenterlineMm } from "@/lib/cad/torsionSpringCad";
import { type WaveSpringGeometry, useSpringDesignStore } from "@/lib/stores/springDesignStore";
import { buildWaveSpringCenterlineMm } from "@/lib/cad/waveSpringCad";

interface CadExportState {
    isExporting: boolean;
    lastResult?: CadExportResult;
    lastError?: string;

    exportExtensionCad: () => Promise<CadExportResult>;
    exportTorsionCad: () => Promise<CadExportResult>;
    exportWaveCad: () => Promise<CadExportResult>;
}

export const useCadExportStore = create<CadExportState>((set) => ({
    isExporting: false,
    lastResult: undefined,
    lastError: undefined,

    exportExtensionCad: async () => {
        set({ isExporting: true, lastError: undefined });

        try {
            const design = useSpringSimulationStore.getState().design;
            const currentDeflection = useSpringSimulationStore.getState().currentDeflection;

            if (!design || design.type !== "extension") {
                const error = "No active extension spring design found.";
                set({ isExporting: false, lastError: error });
                return {
                    ok: false,
                    kernel: "cadquery",
                    filename: "",
                    content: "",
                    meta: {
                        partName: "Error",
                        unit: "mm",
                        generatedAtIso: new Date().toISOString(),
                    },
                    warnings: [error],
                };
            }

            // Allow UI update cycle
            await new Promise(resolve => setTimeout(resolve, 0));

            const extDesign = design as ExtensionDesignMeta;
            const currentExtensionMm = currentDeflection;

            const centerline = buildExtensionSpringCenterlineMm(extDesign, currentExtensionMm);
            const result = generateCadQueryPython(centerline, extDesign);

            set({ isExporting: false, lastResult: result });
            return result;

        } catch (e) {
            const errorMsg = (e as Error).message;
            set({ isExporting: false, lastError: errorMsg });
            return {
                ok: false,
                kernel: "cadquery",
                filename: "",
                content: "",
                meta: {
                    partName: "Error",
                    unit: "mm",
                    generatedAtIso: new Date().toISOString(),
                },
                warnings: [errorMsg],
            };
        }
    },

    exportTorsionCad: async () => {
        set({ isExporting: true, lastError: undefined });

        try {
            const design = useSpringSimulationStore.getState().design;
            const currentDeflection = useSpringSimulationStore.getState().currentDeflection;

            if (!design || design.type !== "torsion") {
                const error = "No active torsion spring design found.";
                set({ isExporting: false, lastError: error });
                return {
                    ok: false,
                    kernel: "cadquery",
                    filename: "",
                    content: "",
                    meta: {
                        partName: "Error",
                        unit: "mm",
                        generatedAtIso: new Date().toISOString(),
                    },
                    warnings: [error],
                };
            }

            await new Promise(resolve => setTimeout(resolve, 0));

            const torDesign = design as TorsionDesignMeta;
            // For Torsion, currentDeflection is the working angle in degrees
            const currentDeflectionDeg = currentDeflection;

            const centerline = buildTorsionSpringCenterlineMm(torDesign, currentDeflectionDeg);

            // Note: generateCadQueryPython needs to be overloaded or updated to handle Torsion
            // For now, we assume it can handle the generic structure or we'll update it next
            const result = generateCadQueryPython(centerline, torDesign);

            set({ isExporting: false, lastResult: result });
            return result;

        } catch (e) {
            const errorMsg = (e as Error).message;
            set({ isExporting: false, lastError: errorMsg });
            return {
                ok: false,
                kernel: "cadquery",
                filename: "",
                content: "",
                meta: {
                    partName: "Error",
                    unit: "mm",
                    generatedAtIso: new Date().toISOString(),
                },
                warnings: [errorMsg],
            };
        }
    },
    exportWaveCad: async () => {
        set({ isExporting: true, lastError: undefined });

        try {
            const geometry = useSpringDesignStore.getState().geometry;

            if (!geometry || geometry.type !== "wave") {
                const error = "No active wave spring design found.";
                set({ isExporting: false, lastError: error });
                return {
                    ok: false,
                    kernel: "cadquery",
                    filename: "",
                    content: "",
                    meta: {
                        partName: "Error",
                        unit: "mm",
                        generatedAtIso: new Date().toISOString(),
                    },
                    warnings: [error],
                };
            }

            // Allow UI update cycle
            await new Promise(resolve => setTimeout(resolve, 0));

            const waveDesign = geometry as WaveSpringGeometry;
            // Assume 0 deflection (Free Height) for default export
            const deflectionMm = 0;

            const centerline = buildWaveSpringCenterlineMm(waveDesign, deflectionMm);
            const result = generateCadQueryPython(centerline, waveDesign);

            set({ isExporting: false, lastResult: result });
            return result;

        } catch (e) {
            const errorMsg = (e as Error).message;
            set({ isExporting: false, lastError: errorMsg });
            return {
                ok: false,
                kernel: "cadquery",
                filename: "",
                content: "",
                meta: {
                    partName: "Error",
                    unit: "mm",
                    generatedAtIso: new Date().toISOString(),
                },
                warnings: [errorMsg],
            };
        }
    },
}));
