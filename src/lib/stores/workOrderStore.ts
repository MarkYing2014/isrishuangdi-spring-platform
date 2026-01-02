import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { WorkOrder, WorkOrderStatus } from "@/lib/manufacturing/workOrderTypes";
import type { SpringType } from "@/lib/springTypes";
import type { SpringGeometry, MaterialInfo, AnalysisResult } from "@/lib/stores/springDesignStore";
import type { SpringAuditResult, DeliverabilityAudit } from "@/lib/audit/types";
import type { EngineeringRequirements } from "@/lib/audit/engineeringRequirements";
import { ManufacturingPlanner } from "@/lib/manufacturing/ManufacturingPlanner";
import { QCGenerator } from "@/lib/manufacturing/QCGenerator";
import { ManufacturingAuditEngine } from "@/lib/manufacturing/ManufacturingAuditEngine";

export interface WorkOrderStore {
    workOrders: WorkOrder[];

    createWorkOrder: (params: {
        designCode: string;
        springType: SpringType;
        geometry: SpringGeometry;
        material: MaterialInfo;
        analysis: AnalysisResult;
        audit: SpringAuditResult;
        quantity: number;
        priority?: "normal" | "rush";
        createdBy: string;
        notes?: string;
        /** Phase 6 Deliverability: Engineering Requirements */
        engineeringRequirements?: EngineeringRequirements;
        /** Phase 6 Deliverability: Deliverability audit result */
        deliverabilityAudit?: DeliverabilityAudit;
    }) => WorkOrder;

    updateStatus: (workOrderId: string, status: WorkOrderStatus) => void;
    deleteWorkOrder: (workOrderId: string) => void;
    getById: (workOrderId: string) => WorkOrder | undefined;
    getByDesignCode: (designCode: string) => WorkOrder[];
    getByStatus: (status: WorkOrderStatus) => WorkOrder[];
    clear: () => void;

    /**
     * P2: Apply a deliverability waiver to a blocked work order
     * This allows work orders blocked by Deliverability FAIL to proceed with explicit approval
     * Status changes from "blocked" to "created" after waiver is applied
     */
    applyDeliverabilityWaiver: (
        workOrderId: string,
        waiver: { approvedBy: string; reason: string }
    ) => void;
}



export const useWorkOrderStore = create<WorkOrderStore>()(
    persist(
        (set, get) => ({
            workOrders: [],

            createWorkOrder: (params) => {
                const {
                    designCode,
                    springType,
                    geometry,
                    material,
                    analysis,
                    audit,
                    quantity,
                    priority = "normal",
                    createdBy,
                    notes,
                    engineeringRequirements,
                    deliverabilityAudit,
                } = params;

                // Generate manufacturing plan
                const manufacturingPlan = ManufacturingPlanner.generatePlan(
                    springType,
                    geometry,
                    material,
                    analysis
                );

                // Generate QC checklist
                const qcPlan = QCGenerator.generateChecklist(
                    springType,
                    geometry,
                    material,
                    analysis
                );

                // Evaluate manufacturing audit
                const manufacturingAudit = ManufacturingAuditEngine.evaluate(
                    springType,
                    geometry,
                    material,
                    analysis,
                    audit
                );

                // Determine initial status based on manufacturing audit
                // Phase 6: Also consider deliverability audit status
                let initialStatus: WorkOrderStatus =
                    manufacturingAudit.overallStatus === "FAIL" ? "blocked" : "created";

                // If deliverability has FAIL issues, also mark as blocked
                if (deliverabilityAudit?.status === "FAIL") {
                    initialStatus = "blocked";
                }

                // Generate WorkOrder ID
                // Generate WorkOrder ID based on existing orders to prevent duplicates on reload
                const now = new Date();
                const year = now.getFullYear();

                // Find max sequence number for current year
                const currentYearPrefix = `WO-${year}-`;
                const existingIds = get().workOrders
                    .filter(w => w.workOrderId.startsWith(currentYearPrefix))
                    .map(w => parseInt(w.workOrderId.split('-')[2] || "0", 10));

                const nextSequence = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
                const workOrderId = `${currentYearPrefix}${String(nextSequence).padStart(5, "0")}`;

                const newWorkOrder: WorkOrder = {
                    workOrderId,
                    designCode,
                    springType,
                    quantity,
                    priority,
                    engineeringSnapshot: {
                        geometry,
                        material,
                        analysis,
                        audit,
                        engineeringRequirements,
                        deliverabilityAudit,
                    },
                    manufacturingPlan,
                    qcPlan,
                    manufacturingAudit,
                    status: initialStatus,
                    createdAt: now.toISOString(),
                    createdBy,
                    updatedAt: now.toISOString(),
                    notes,
                };

                set((state) => ({
                    workOrders: [newWorkOrder, ...state.workOrders],
                }));

                return newWorkOrder;
            },

            updateStatus: (workOrderId, status) => {
                set((state) => ({
                    workOrders: state.workOrders.map((wo) =>
                        wo.workOrderId === workOrderId
                            ? { ...wo, status, updatedAt: new Date().toISOString() }
                            : wo
                    ),
                }));
            },

            deleteWorkOrder: (workOrderId) => {
                set((state) => ({
                    workOrders: state.workOrders.filter((wo) => wo.workOrderId !== workOrderId),
                }));
            },

            getById: (workOrderId) => {
                return get().workOrders.find((wo) => wo.workOrderId === workOrderId);
            },

            getByDesignCode: (designCode) => {
                return get().workOrders.filter((wo) => wo.designCode === designCode);
            },

            getByStatus: (status) => {
                return get().workOrders.filter((wo) => wo.status === status);
            },

            clear: () => {
                set({ workOrders: [] });
            },

            applyDeliverabilityWaiver: (workOrderId, waiver) => {
                set((state) => ({
                    workOrders: state.workOrders.map((wo) =>
                        wo.workOrderId === workOrderId
                            ? {
                                ...wo,
                                deliverabilityWaiver: {
                                    ...waiver,
                                    date: new Date().toISOString(),
                                },
                                status: "created", // Move from blocked to created after waiver
                                updatedAt: new Date().toISOString(),
                            }
                            : wo
                    ),
                }));
            },
        }),
        {
            name: "work-order-storage",
            storage: createJSONStorage(() => localStorage),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    // Deduplicate work orders by ID to fix "Encountered two children with the same key" error
                    // This handles legacy data where ID generation might have produced duplicates
                    const uniqueOrders = new Map();
                    state.workOrders.forEach(wo => {
                        if (!uniqueOrders.has(wo.workOrderId)) {
                            uniqueOrders.set(wo.workOrderId, wo);
                        }
                    });

                    if (uniqueOrders.size !== state.workOrders.length) {
                        console.warn("[WorkOrderStore] Removed duplicate work orders during rehydration");
                        state.workOrders = Array.from(uniqueOrders.values());
                    }
                }
            },
        }
    )
);
