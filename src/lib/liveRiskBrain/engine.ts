import type { ProductionSnapshot } from "@/lib/production/types";
import type {
  Alert,
  DashboardVM,
  LineSummary,
  LiveRiskStatus,
  MachineRiskCard,
  QualityByCharacteristic,
  RadarByMachine,
} from "./types";
import { correlate } from "./correlation";

export type BuildDashboardVMInput = {
  productionSnapshot: ProductionSnapshot;
  radarByMachine?: RadarByMachine;
  qualityByCharacteristic?: QualityByCharacteristic;
};

export function buildDashboardVM(input: BuildDashboardVMInput): DashboardVM {
  const { productionSnapshot, radarByMachine = {}, qualityByCharacteristic = {} } = input;
  const { timestamp, factorySummary, machines, timeseries } = productionSnapshot;

  const machineRiskCards: MachineRiskCard[] = machines.map((machine) => {
    const radar = radarByMachine[machine.machineId];
    const quality = qualityByCharacteristic[machine.productId];

    const machineWithQuality = {
      ...machine,
      lastCpk: quality?.cpk ?? machine.lastCpk,
      lastNelsonViolations: quality?.nelsonViolations ?? machine.lastNelsonViolations,
      scrapRate: quality?.defectRate ?? machine.scrapRate,
    };

    const correlation = correlate({
      machine: machineWithQuality,
      radarStatus: radar?.overallStatus,
      radarScore: radar?.score,
    });

    return {
      ...machineWithQuality,
      liveRiskStatus: correlation.liveRiskStatus,
      liveRiskScore: correlation.liveRiskScore,
      topDrivers: correlation.drivers,
    };
  });

  const lineMap = new Map<string, MachineRiskCard[]>();
  for (const m of machineRiskCards) {
    const arr = lineMap.get(m.lineId) ?? [];
    arr.push(m);
    lineMap.set(m.lineId, arr);
  }

  const lines: LineSummary[] = Array.from(lineMap.entries()).map(([lineId, lineMachines]) => {
    const runningCount = lineMachines.filter((m) => m.status === "RUNNING").length;
    const stoppedCount = lineMachines.filter((m) => m.status === "STOPPED").length;
    const alarmCount = lineMachines.filter((m) => m.status === "ALARM").length;
    const setupCount = lineMachines.filter((m) => m.status === "SETUP").length;

    const runningMachines = lineMachines.filter((m) => m.status === "RUNNING");
    const throughputNow = runningMachines.reduce((sum, m) => sum + Math.round((3600 * 1000) / m.cycleTimeMs), 0);
    const scrapRateNow =
      runningMachines.length > 0
        ? runningMachines.reduce((sum, m) => sum + m.scrapRate, 0) / runningMachines.length
        : 0;

    const overallLiveRisk = computeOverallRisk(lineMachines);

    return {
      lineId,
      runningCount,
      stoppedCount,
      alarmCount,
      setupCount,
      throughputNow,
      scrapRateNow: Math.round(scrapRateNow * 10000) / 10000,
      overallLiveRisk,
      machines: lineMachines,
    };
  });

  const overallLiveRisk = computeOverallRisk(machineRiskCards);
  const overallScore = computeOverallScore(machineRiskCards);

  const alerts = generateAlerts(machineRiskCards, timestamp);

  return {
    timestamp,
    factorySummary: {
      ...factorySummary,
      overallLiveRisk,
      overallScore,
    },
    lines,
    machines: machineRiskCards,
    alerts,
    timeseries,
  };
}

function computeOverallRisk(machines: MachineRiskCard[]): LiveRiskStatus {
  if (machines.some((m) => m.liveRiskStatus === "HIGH_RISK")) {
    return "HIGH_RISK";
  }
  if (machines.some((m) => m.liveRiskStatus === "MANUFACTURING_RISK")) {
    return "MANUFACTURING_RISK";
  }
  return "ENGINEERING_OK";
}

function computeOverallScore(machines: MachineRiskCard[]): number {
  if (machines.length === 0) return 100;
  const sum = machines.reduce((acc, m) => acc + m.liveRiskScore, 0);
  return Math.round(sum / machines.length);
}

function generateAlerts(machines: MachineRiskCard[], timestamp: string): Alert[] {
  const alerts: Alert[] = [];
  let alertId = 0;

  for (const m of machines) {
    if (m.status === "ALARM") {
      alerts.push({
        id: `alert-${++alertId}`,
        severity: "ERROR",
        title: { en: `Machine ${m.machineId} in ALARM`, zh: `机台 ${m.machineId} 报警` },
        evidence: { en: `Status: ALARM`, zh: `状态：报警` },
        suggestedActions: [{ en: "Investigate immediately", zh: "立即排查" }],
        machineId: m.machineId,
        timestamp,
      });
    }

    if (m.lastCpk !== null && m.lastCpk < 1.0) {
      alerts.push({
        id: `alert-${++alertId}`,
        severity: "ERROR",
        title: { en: `Critical Cpk on ${m.machineId}`, zh: `${m.machineId} Cpk 严重偏低` },
        evidence: { en: `Cpk = ${m.lastCpk.toFixed(2)}`, zh: `Cpk = ${m.lastCpk.toFixed(2)}` },
        suggestedActions: [
          { en: "Increase inspection", zh: "加大检验" },
          { en: "Review process", zh: "复核工艺" },
        ],
        machineId: m.machineId,
        timestamp,
      });
    }

    if (m.tempDrift && m.lastCpk !== null && m.lastCpk < 1.33) {
      alerts.push({
        id: `alert-${++alertId}`,
        severity: "WARNING",
        title: { en: `Temp drift correlated with Cpk drop on ${m.machineId}`, zh: `${m.machineId} 温度漂移与 Cpk 下降相关` },
        evidence: {
          en: `Temperature drift detected, Cpk = ${m.lastCpk.toFixed(2)}`,
          zh: `检测到温度漂移，Cpk = ${m.lastCpk.toFixed(2)}`,
        },
        suggestedActions: [
          { en: "Check cooling system", zh: "检查冷却系统" },
          { en: "Correlate with quality data", zh: "关联质量数据" },
        ],
        machineId: m.machineId,
        timestamp,
      });
    }

    if (m.lastNelsonViolations >= 2) {
      alerts.push({
        id: `alert-${++alertId}`,
        severity: "WARNING",
        title: { en: `Multiple Nelson violations on ${m.machineId}`, zh: `${m.machineId} 多项 Nelson 违反` },
        evidence: { en: `${m.lastNelsonViolations} violations`, zh: `${m.lastNelsonViolations} 项违反` },
        suggestedActions: [{ en: "Investigate special cause", zh: "排查特殊原因" }],
        machineId: m.machineId,
        timestamp,
      });
    }
  }

  return alerts.sort((a, b) => {
    const severityOrder = { ERROR: 0, WARNING: 1, INFO: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}
