/**
 * Workshop Simulator (DEMO) - Digital Twin Edition
 * Rule-driven data generator for customer presentations
 * 
 * 设计口诀: "看布局，找瓶颈，哪条线停救哪条。"
 */

export type MachineState = "running" | "idle" | "blocking" | "offline";
export type LineStatus = "normal" | "warning" | "fault";
export type OverallStatus = "on_track" | "at_risk" | "delayed";
export type Shift = "A" | "B" | "C";

export interface MachineStatus {
    id: string;
    name: string;
    nameZh: string;
    state: MachineState;
    reason?: string;
    reasonZh?: string;
    utilization?: number;
}

export interface ProductionLine {
    id: string;
    name: string;
    nameZh: string;
    status: LineStatus;
    oee: number;
    fpy: number;
    wipLevel: number;
    wipStatus: "normal" | "warning" | "critical";
    throughput: number;
    machines: MachineStatus[];
}

export interface DefectItem {
    id: string;
    type: string;
    typeZh: string;
    count: number;
    lineId: string;
    lineName: string;
    severity: "minor" | "major" | "critical";
}

export interface DeliveryMetrics {
    planQty: number;
    actualQty: number;
    completionRate: number;
    predictedOutput: number;
    remainingMinutes: number;
    trend: "up" | "down" | "stable";
}

export interface EngineeringMetrics {
    riskStatus: "PASS" | "WARN" | "FAIL";
    deliverabilityStatus: "OK" | "CHALLENGING" | "NOT_DELIVERABLE";
    fpy: number;
    defectCount: number;
    defectTrend: "up" | "down" | "stable";
}

export interface Alert {
    id: string;
    type: "blocking" | "warning" | "info";
    message: string;
    messageZh: string;
    timestamp: Date;
    action?: string;
    actionZh?: string;
}

export interface WorkshopState {
    workshopName: string;
    workshopNameZh: string;
    currentTime: Date;
    shift: Shift;
    overallStatus: OverallStatus;
    lines: ProductionLine[];
    machines: MachineStatus[];
    defects: DefectItem[];
    delivery: DeliveryMetrics;
    engineering: EngineeringMetrics;
    alerts: Alert[];
}

export type DemoScenario = "normal" | "warning" | "critical";

function getCurrentShift(date: Date): Shift {
    const hour = date.getHours();
    if (hour >= 6 && hour < 14) return "A";
    if (hour >= 14 && hour < 22) return "B";
    return "C";
}

function deriveOverallStatus(lines: ProductionLine[], engineering: EngineeringMetrics): OverallStatus {
    if (lines.some(l => l.status === "fault")) return "delayed";
    if (engineering.riskStatus === "FAIL") return "delayed";
    if (lines.some(l => l.status === "warning") || engineering.riskStatus === "WARN") return "at_risk";
    return "on_track";
}

export function generateWorkshopState(scenario: DemoScenario = "normal"): WorkshopState {
    const now = new Date();
    const shift = getCurrentShift(now);
    const alerts: Alert[] = [];
    const defects: DefectItem[] = [];

    // ===== Production Lines =====
    const lines: ProductionLine[] = [
        {
            id: "LINE-A",
            name: "Line A",
            nameZh: "A线",
            status: "normal",
            oee: 85,
            fpy: 98.2,
            wipLevel: 40,
            wipStatus: "normal",
            throughput: 120,
            machines: [
                { id: "A-CNC", name: "CNC-A", nameZh: "数控车床-A", state: "running", utilization: 92 },
                { id: "A-COIL", name: "Coiler-A", nameZh: "卷簧机-A", state: "running", utilization: 88 },
            ]
        },
        {
            id: "LINE-B",
            name: "Line B",
            nameZh: "B线",
            status: "normal",
            oee: 78,
            fpy: 95.5,
            wipLevel: 60,
            wipStatus: "normal",
            throughput: 98,
            machines: [
                { id: "B-CNC", name: "CNC-B", nameZh: "数控车床-B", state: "running", utilization: 82 },
                { id: "B-COIL", name: "Coiler-B", nameZh: "卷簧机-B", state: "running", utilization: 75 },
            ]
        },
        {
            id: "LINE-C",
            name: "Line C",
            nameZh: "C线",
            status: "normal",
            oee: 90,
            fpy: 99.1,
            wipLevel: 25,
            wipStatus: "normal",
            throughput: 135,
            machines: [
                { id: "C-CNC", name: "CNC-C", nameZh: "数控车床-C", state: "running", utilization: 95 },
                { id: "C-COIL", name: "Coiler-C", nameZh: "卷簧机-C", state: "running", utilization: 91 },
            ]
        }
    ];

    // Base values
    let planQty = 1200;
    let actualQty = 980;
    let engineering: EngineeringMetrics = {
        riskStatus: "PASS",
        deliverabilityStatus: "OK",
        fpy: 97.6,
        defectCount: 24,
        defectTrend: "stable"
    };

    // Scenario modifications
    switch (scenario) {
        case "warning":
            // Line B has issues
            lines[1].status = "warning";
            lines[1].oee = 72;
            lines[1].fpy = 93.2;
            lines[1].wipLevel = 80;
            lines[1].wipStatus = "warning";
            lines[1].machines[1].state = "idle";
            lines[1].machines[1].reason = "Setup change";
            lines[1].machines[1].reasonZh = "换型中";
            lines[1].machines[1].utilization = 0;

            engineering.riskStatus = "WARN";
            engineering.deliverabilityStatus = "CHALLENGING";
            engineering.fpy = 95.1;
            engineering.defectCount = 45;
            engineering.defectTrend = "up";
            actualQty = 850;

            defects.push(
                { id: "D1", type: "Dimension Out of Spec", typeZh: "尺寸超差", count: 18, lineId: "LINE-B", lineName: "B线", severity: "major" },
                { id: "D2", type: "Scratch", typeZh: "划痕", count: 12, lineId: "LINE-A", lineName: "A线", severity: "minor" },
                { id: "D3", type: "Missing Part", typeZh: "漏装", count: 8, lineId: "LINE-B", lineName: "B线", severity: "critical" }
            );

            alerts.push({
                id: "WIP-001",
                type: "warning",
                message: "Line B WIP at 80% - consider pausing upstream",
                messageZh: "B线 WIP 达80% - 建议暂停上料",
                timestamp: new Date(now.getTime() - 10 * 60000),
                action: "Notify dispatcher",
                actionZh: "通知调度员"
            });
            alerts.push({
                id: "OEE-001",
                type: "warning",
                message: "Line B OEE at 72% - below target (80%)",
                messageZh: "B线 OEE 72% - 低于目标值 (80%)",
                timestamp: new Date(now.getTime() - 20 * 60000),
                action: "Check bottleneck",
                actionZh: "检查瓶颈"
            });
            break;

        case "critical":
            // Line C has fault
            lines[2].status = "fault";
            lines[2].oee = 0;
            lines[2].fpy = 88.5;
            lines[2].wipLevel = 0;
            lines[2].wipStatus = "normal";
            lines[2].throughput = 0;
            lines[2].machines[0].state = "blocking";
            lines[2].machines[0].reason = "Spindle failure";
            lines[2].machines[0].reasonZh = "主轴故障";
            lines[2].machines[0].utilization = 0;
            lines[2].machines[1].state = "idle";
            lines[2].machines[1].reason = "Waiting upstream";
            lines[2].machines[1].reasonZh = "等待上道";
            lines[2].machines[1].utilization = 0;

            // Line B also stressed
            lines[1].status = "warning";
            lines[1].oee = 68;
            lines[1].wipLevel = 95;
            lines[1].wipStatus = "critical";

            engineering.riskStatus = "WARN";
            engineering.deliverabilityStatus = "CHALLENGING";
            engineering.fpy = 91.2;
            engineering.defectCount = 68;
            engineering.defectTrend = "up";
            actualQty = 620;

            defects.push(
                { id: "D1", type: "Dimension Out of Spec", typeZh: "尺寸超差", count: 32, lineId: "LINE-C", lineName: "C线", severity: "critical" },
                { id: "D2", type: "Crack", typeZh: "裂纹", count: 18, lineId: "LINE-C", lineName: "C线", severity: "critical" },
                { id: "D3", type: "Scratch", typeZh: "划痕", count: 12, lineId: "LINE-B", lineName: "B线", severity: "minor" }
            );

            alerts.push({
                id: "FAULT-001",
                type: "blocking",
                message: "🔴 LINE C DOWN: Spindle failure on CNC-C",
                messageZh: "🔴 C线停机: 数控车床-C 主轴故障",
                timestamp: new Date(now.getTime() - 5 * 60000),
                action: "Dispatch maintenance ASAP",
                actionZh: "立即派遣维修"
            });
            alerts.push({
                id: "WIP-002",
                type: "blocking",
                message: "Line B WIP CRITICAL (95%) - STOP upstream!",
                messageZh: "B线 WIP 严重堆积 (95%) - 立即停止上料！",
                timestamp: new Date(now.getTime() - 3 * 60000),
                action: "Stop material feed",
                actionZh: "停止物料供给"
            });
            break;

        default: // normal
            defects.push(
                { id: "D1", type: "Scratch", typeZh: "划痕", count: 8, lineId: "LINE-A", lineName: "A线", severity: "minor" },
                { id: "D2", type: "Dimension Out of Spec", typeZh: "尺寸超差", count: 5, lineId: "LINE-B", lineName: "B线", severity: "minor" }
            );
            alerts.push({
                id: "INF-001",
                type: "info",
                message: "All lines operating normally",
                messageZh: "所有产线正常运行",
                timestamp: now
            });
    }

    const completionRate = (actualQty / planQty) * 100;
    const remainingMinutes = scenario === "critical" ? 200 : scenario === "warning" ? 150 : 120;
    const predictedOutput = scenario === "critical" ? 850 : scenario === "warning" ? 1050 : 1180;

    const delivery: DeliveryMetrics = {
        planQty,
        actualQty,
        completionRate,
        predictedOutput,
        remainingMinutes,
        trend: scenario === "normal" ? "up" : "down"
    };

    // Flatten all machines for legacy compatibility
    const machines = lines.flatMap(l => l.machines);

    return {
        workshopName: "Shuangdi Digital Workshop",
        workshopNameZh: "双第弹簧数字车间",
        currentTime: now,
        shift,
        overallStatus: deriveOverallStatus(lines, engineering),
        lines,
        machines,
        defects,
        delivery,
        engineering,
        alerts
    };
}

export function getLineStatusColor(status: LineStatus): string {
    switch (status) {
        case "normal": return "emerald";
        case "warning": return "amber";
        case "fault": return "red";
    }
}

export function getStatusColor(status: OverallStatus): string {
    switch (status) {
        case "on_track": return "emerald";
        case "at_risk": return "amber";
        case "delayed": return "red";
    }
}

export function getMachineStateColor(state: MachineState): string {
    switch (state) {
        case "running": return "emerald";
        case "idle": return "amber";
        case "blocking": return "red";
        case "offline": return "slate";
    }
}
