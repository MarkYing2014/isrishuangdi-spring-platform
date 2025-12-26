import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { WorkOrder, WorkOrderStatus } from "@/lib/manufacturing/workOrderTypes";
import type { SpringType } from "@/lib/springTypes";
import type { SpringGeometry, MaterialInfo, AnalysisResult } from "@/lib/stores/springDesignStore";
import type { SpringAuditResult } from "@/lib/audit/types";
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
    }) => WorkOrder;

    updateStatus: (workOrderId: string, status: WorkOrderStatus) => void;
    deleteWorkOrder: (workOrderId: string) => void;
    getById: (workOrderId: string) => WorkOrder | undefined;
    getByDesignCode: (designCode: string) => WorkOrder[];
    getByStatus: (status: WorkOrderStatus) => WorkOrder[];
    clear: () => void;
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
                const initialStatus: WorkOrderStatus =
                    manufacturingAudit.overallStatus === "FAIL" ? "blocked" : "created";

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
        }),
        {
            name: "work-order-storage",
            storage: createJSONStorage(() => localStorage),
        }
    )
);
