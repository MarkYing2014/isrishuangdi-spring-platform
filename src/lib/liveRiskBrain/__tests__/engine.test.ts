import { describe, expect, test } from "vitest";
import { buildDashboardVM } from "../engine";
import { generateDemoProductionSnapshot } from "@/lib/production/demoGenerator";

describe("liveRiskBrain engine", () => {
  test("buildDashboardVM returns valid DashboardVM structure", () => {
    const snapshot = generateDemoProductionSnapshot({ seed: 42, machineCount: 4, riskPreset: "OK" });
    const vm = buildDashboardVM({ productionSnapshot: snapshot });

    expect(vm.timestamp).toBeDefined();
    expect(vm.factorySummary).toBeDefined();
    expect(vm.factorySummary.overallLiveRisk).toBeDefined();
    expect(vm.factorySummary.overallScore).toBeGreaterThanOrEqual(0);
    expect(vm.factorySummary.overallScore).toBeLessThanOrEqual(100);
    expect(vm.machines.length).toBe(4);
    expect(vm.lines.length).toBeGreaterThan(0);
  });

  test("buildDashboardVM with HIGH risk preset produces HIGH_RISK overall status", () => {
    const snapshot = generateDemoProductionSnapshot({ seed: 42, machineCount: 8, riskPreset: "HIGH" });
    const vm = buildDashboardVM({ productionSnapshot: snapshot });

    expect(vm.factorySummary.overallLiveRisk).toBe("HIGH_RISK");
    expect(vm.factorySummary.overallScore).toBeLessThan(80);
  });

  test("buildDashboardVM generates alerts for alarming machines", () => {
    const snapshot = generateDemoProductionSnapshot({ seed: 42, machineCount: 8, riskPreset: "HIGH" });
    const vm = buildDashboardVM({ productionSnapshot: snapshot });

    expect(vm.alerts.length).toBeGreaterThan(0);

    const errorAlerts = vm.alerts.filter((a) => a.severity === "ERROR");
    expect(errorAlerts.length).toBeGreaterThan(0);
  });

  test("buildDashboardVM machines have topDrivers", () => {
    const snapshot = generateDemoProductionSnapshot({ seed: 42, machineCount: 4, riskPreset: "WARN" });
    const vm = buildDashboardVM({ productionSnapshot: snapshot });

    const machinesWithDrivers = vm.machines.filter((m) => m.topDrivers.length > 0);
    expect(machinesWithDrivers.length).toBeGreaterThan(0);
  });

  test("buildDashboardVM lines are grouped correctly", () => {
    const snapshot = generateDemoProductionSnapshot({ seed: 42, machineCount: 8, lineCount: 2, riskPreset: "OK" });
    const vm = buildDashboardVM({ productionSnapshot: snapshot });

    expect(vm.lines.length).toBe(2);

    const totalMachinesInLines = vm.lines.reduce((sum, l) => sum + l.machines.length, 0);
    expect(totalMachinesInLines).toBe(8);
  });

  test("buildDashboardVM with external radar data affects risk score", () => {
    const snapshot = generateDemoProductionSnapshot({ seed: 42, machineCount: 2, riskPreset: "OK" });

    const vmWithoutRadar = buildDashboardVM({ productionSnapshot: snapshot });

    const vmWithRadar = buildDashboardVM({
      productionSnapshot: snapshot,
      radarByMachine: {
        M01: { overallStatus: "HIGH_RISK", score: 30 },
      },
    });

    const m01WithoutRadar = vmWithoutRadar.machines.find((m) => m.machineId === "M01");
    const m01WithRadar = vmWithRadar.machines.find((m) => m.machineId === "M01");

    expect(m01WithRadar!.liveRiskScore).toBeLessThan(m01WithoutRadar!.liveRiskScore);
    expect(m01WithRadar!.topDrivers.some((d) => d.title.en.includes("Engineering Risk Radar"))).toBe(true);
  });

  test("buildDashboardVM with external quality data affects risk score", () => {
    const snapshot = generateDemoProductionSnapshot({ seed: 42, machineCount: 2, riskPreset: "OK" });

    const vmWithQuality = buildDashboardVM({
      productionSnapshot: snapshot,
      qualityByCharacteristic: {
        "SP-001": { cpk: 0.8, nelsonViolations: 3, defectRate: 0.05 },
      },
    });

    const machineWithBadQuality = vmWithQuality.machines.find((m) => m.productId === "SP-001");
    if (machineWithBadQuality) {
      expect(machineWithBadQuality.liveRiskStatus).toBe("HIGH_RISK");
    }
  });
});
