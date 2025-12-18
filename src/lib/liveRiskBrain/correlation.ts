import type { MachineCard } from "@/lib/production/types";
import { PRODUCTION_CONFIG } from "@/lib/production/config";
import type { Driver, BilingualText, LiveRiskStatus } from "./types";

export type CorrelationInput = {
  machine: MachineCard;
  radarStatus?: "ENGINEERING_OK" | "MANUFACTURING_RISK" | "HIGH_RISK";
  radarScore?: number;
};

export type CorrelationResult = {
  liveRiskStatus: LiveRiskStatus;
  liveRiskScore: number;
  drivers: Driver[];
};

export function correlate(input: CorrelationInput): CorrelationResult {
  const { machine, radarStatus, radarScore } = input;
  const drivers: Driver[] = [];
  let score = 100;

  if (machine.status === "ALARM") {
    score -= 35;
    drivers.push({
      dimension: "manufacturing",
      title: bt("Machine in ALARM state", "机台处于报警状态"),
      confidence: 1.0,
      evidence: { metricRefs: ["status"] },
      recommendedActions: [bt("Investigate alarm cause immediately", "立即排查报警原因")],
    });
  }

  if (machine.lastCpk !== null && machine.lastCpk < PRODUCTION_CONFIG.cpkHighThreshold) {
    score -= 30;
    drivers.push({
      dimension: "quality",
      title: bt(`Cpk critically low (${machine.lastCpk.toFixed(2)})`, `Cpk 严重偏低 (${machine.lastCpk.toFixed(2)})`),
      confidence: 0.95,
      evidence: { metricRefs: ["lastCpk"] },
      recommendedActions: [
        bt("Review process parameters", "复核工艺参数"),
        bt("Increase inspection frequency", "加大检验频次"),
      ],
    });
  } else if (machine.lastCpk !== null && machine.lastCpk < PRODUCTION_CONFIG.cpkWarnThreshold) {
    score -= 12;
    drivers.push({
      dimension: "quality",
      title: bt(`Cpk below target (${machine.lastCpk.toFixed(2)})`, `Cpk 低于目标 (${machine.lastCpk.toFixed(2)})`),
      confidence: 0.8,
      evidence: { metricRefs: ["lastCpk"] },
      recommendedActions: [bt("Monitor trend closely", "密切关注趋势")],
    });
  }

  if (machine.lastNelsonViolations >= PRODUCTION_CONFIG.nelsonViolationsHighThreshold) {
    score -= 25;
    drivers.push({
      dimension: "quality",
      title: bt(`Multiple Nelson rule violations (${machine.lastNelsonViolations})`, `多项 Nelson 规则违反 (${machine.lastNelsonViolations})`),
      confidence: 0.9,
      evidence: { metricRefs: ["lastNelsonViolations"] },
      recommendedActions: [bt("Investigate special cause variation", "排查特殊原因变异")],
    });
  } else if (machine.lastNelsonViolations >= PRODUCTION_CONFIG.nelsonViolationsWarnThreshold) {
    score -= 10;
    drivers.push({
      dimension: "quality",
      title: bt(`Nelson rule violation detected`, `检测到 Nelson 规则违反`),
      confidence: 0.75,
      evidence: { metricRefs: ["lastNelsonViolations"] },
      recommendedActions: [bt("Review control chart", "复核控制图")],
    });
  }

  if (machine.scrapRate > PRODUCTION_CONFIG.scrapRateHighThreshold) {
    score -= 15;
    drivers.push({
      dimension: "manufacturing",
      title: bt(`High scrap rate (${(machine.scrapRate * 100).toFixed(1)}%)`, `高报废率 (${(machine.scrapRate * 100).toFixed(1)}%)`),
      confidence: 0.85,
      evidence: { metricRefs: ["scrapRate"] },
      recommendedActions: [bt("Analyze defect patterns", "分析缺陷模式")],
    });
  } else if (machine.scrapRate > PRODUCTION_CONFIG.scrapRateWarnThreshold) {
    score -= 7;
    drivers.push({
      dimension: "manufacturing",
      title: bt(`Elevated scrap rate`, `报废率偏高`),
      confidence: 0.7,
      evidence: { metricRefs: ["scrapRate"] },
      recommendedActions: [bt("Monitor scrap trend", "监控报废趋势")],
    });
  }

  if (machine.cycleTimeDeltaPct > PRODUCTION_CONFIG.cycleTimeDeltaHighPct) {
    score -= 10;
    drivers.push({
      dimension: "manufacturing",
      title: bt(`Cycle time significantly elevated (+${(machine.cycleTimeDeltaPct * 100).toFixed(0)}%)`, `节拍时间显著延长 (+${(machine.cycleTimeDeltaPct * 100).toFixed(0)}%)`),
      confidence: 0.8,
      evidence: { metricRefs: ["cycleTimeDeltaPct"] },
      recommendedActions: [bt("Check for mechanical issues", "检查机械问题")],
    });
  } else if (machine.cycleTimeDeltaPct > PRODUCTION_CONFIG.cycleTimeDeltaWarnPct) {
    score -= 5;
    drivers.push({
      dimension: "manufacturing",
      title: bt(`Cycle time elevated`, `节拍时间偏长`),
      confidence: 0.6,
      evidence: { metricRefs: ["cycleTimeDeltaPct"] },
      recommendedActions: [bt("Monitor cycle time trend", "监控节拍趋势")],
    });
  }

  if (machine.tempDrift) {
    score -= 10;
    drivers.push({
      dimension: "manufacturing",
      title: bt("Temperature drift detected", "检测到温度漂移"),
      confidence: 0.75,
      evidence: { metricRefs: ["tempC", "tempDrift"] },
      recommendedActions: [
        bt("Check cooling system", "检查冷却系统"),
        bt("Correlate with quality metrics", "关联质量指标"),
      ],
    });
  }

  if (radarStatus === "HIGH_RISK") {
    score -= 20;
    drivers.push({
      dimension: "engineering",
      title: bt("Engineering Risk Radar: HIGH_RISK", "工程风险雷达：高风险"),
      confidence: 0.9,
      evidence: { metricRefs: ["radarStatus", "radarScore"] },
      recommendedActions: [bt("Review design parameters", "复核设计参数")],
    });
  } else if (radarStatus === "MANUFACTURING_RISK") {
    score -= 8;
    drivers.push({
      dimension: "engineering",
      title: bt("Engineering Risk Radar: MANUFACTURING_RISK", "工程风险雷达：制造风险"),
      confidence: 0.7,
      evidence: { metricRefs: ["radarStatus", "radarScore"] },
      recommendedActions: [bt("Review manufacturability", "复核可制造性")],
    });
  }

  score = Math.max(0, Math.min(100, score));

  let liveRiskStatus: LiveRiskStatus = "ENGINEERING_OK";
  if (
    machine.status === "ALARM" ||
    (machine.lastCpk !== null && machine.lastCpk < PRODUCTION_CONFIG.cpkHighThreshold) ||
    machine.lastNelsonViolations >= PRODUCTION_CONFIG.nelsonViolationsHighThreshold ||
    radarStatus === "HIGH_RISK"
  ) {
    liveRiskStatus = "HIGH_RISK";
  } else if (
    machine.scrapRate > PRODUCTION_CONFIG.scrapRateHighThreshold ||
    machine.cycleTimeDeltaPct > PRODUCTION_CONFIG.cycleTimeDeltaWarnPct ||
    machine.tempDrift ||
    radarStatus === "MANUFACTURING_RISK"
  ) {
    liveRiskStatus = "MANUFACTURING_RISK";
  }

  const topDrivers = drivers
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);

  return {
    liveRiskStatus,
    liveRiskScore: score,
    drivers: topDrivers,
  };
}

function bt(en: string, zh: string): BilingualText {
  return { en, zh };
}
