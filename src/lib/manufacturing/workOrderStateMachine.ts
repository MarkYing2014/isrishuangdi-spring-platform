/**
 * Work Order State Machine
 * Q2: Engineering Decision Pipeline
 */

export type WorkOrderState =
    | "DRAFT"
    | "ENGINEERING_APPROVED"
    | "DELIVERABILITY_APPROVED"
    | "SUPPLIER_SELECTED"
    | "INSPECTION_READY"
    | "COST_APPROVED"
    | "RELEASED"
    | "BLOCKED"
    | "WAIVER_PENDING";

export interface WorkOrderContext {
    physicsStatus: "PASS" | "WARN" | "FAIL";
    deliverabilityStatus: "PASS" | "WARN" | "FAIL";
    gaugeStrategyReady: boolean;
    supplierMatchLevel: "FULL" | "PARTIAL" | "NO_MATCH";
    costApproved: boolean;
    hasWaiver: boolean;
    waiverApprovedBy?: string;
}

export interface TransitionResult {
    nextState: WorkOrderState;
    allowed: boolean;
    reasonEn?: string;
    reasonZh?: string;
}

/**
 * Validates transition to RELEASED state
 */
export function validateRelease(context: WorkOrderContext): TransitionResult {
    // 1. Engineering Physics (Audit) - FAIL blocks everything
    if (context.physicsStatus === "FAIL") {
        return {
            nextState: "BLOCKED",
            allowed: false,
            reasonEn: "Engineering Audit FAILED. Production blocked.",
            reasonZh: "工程审计失败。生产已阻断。"
        };
    }

    // 2. Deliverability Status
    if (context.deliverabilityStatus === "FAIL") {
        return {
            nextState: "BLOCKED",
            allowed: false,
            reasonEn: "Designable but not Deliverable. Manufacturing blocked.",
            reasonZh: "设计可行但不可交付。制造已阻断。"
        };
    }

    // 3. Gauge Generation
    if (!context.gaugeStrategyReady) {
        return {
            nextState: "INSPECTION_READY",
            allowed: false,
            reasonEn: "Inspection Gauge Strategy not generated.",
            reasonZh: "检测检具策略未生成。"
        };
    }

    // 4. Supplier Match & Waiver
    if (context.supplierMatchLevel === "NO_MATCH") {
        return {
            nextState: "BLOCKED",
            allowed: false,
            reasonEn: "No capable suppliers found matching requirements.",
            reasonZh: "未找到符合要求的具备能力的供应商。"
        };
    }

    if (context.supplierMatchLevel === "PARTIAL" && !context.hasWaiver) {
        return {
            nextState: "WAIVER_PENDING",
            allowed: false,
            reasonEn: "Partial supplier match requires an approved technical waiver.",
            reasonZh: "部分匹配的供应商需要获得已批准的技术偏差 (Waiver)。"
        };
    }

    // 5. Costing
    if (!context.costApproved) {
        return {
            nextState: "COST_APPROVED",
            allowed: false,
            reasonEn: "Commercial approval pending.",
            reasonZh: "商务审批待定。"
        };
    }

    // All Pass
    return {
        nextState: "RELEASED",
        allowed: true,
        reasonEn: "All engineering and supply chain gates passed. Released for production.",
        reasonZh: "所有工程和供应链关卡已通过。准予发布生产。"
    };
}
