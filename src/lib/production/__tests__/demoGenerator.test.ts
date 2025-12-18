import { describe, expect, test } from "vitest";
import { generateDemoProductionSnapshot, generateDemoProductionState } from "../demoGenerator";

describe("demoGenerator", () => {
  test("generateDemoProductionSnapshot returns deterministic output with same seed", () => {
    const snapshot1 = generateDemoProductionSnapshot({ seed: 12345, machineCount: 4 });
    const snapshot2 = generateDemoProductionSnapshot({ seed: 12345, machineCount: 4 });

    expect(snapshot1.machines.length).toBe(4);
    expect(snapshot2.machines.length).toBe(4);

    expect(snapshot1.machines[0].machineId).toBe(snapshot2.machines[0].machineId);
    expect(snapshot1.machines[0].cycleTimeMs).toBe(snapshot2.machines[0].cycleTimeMs);
    expect(snapshot1.machines[0].lastCpk).toBe(snapshot2.machines[0].lastCpk);
  });

  test("generateDemoProductionSnapshot with riskPreset=OK produces mostly healthy machines", () => {
    const snapshot = generateDemoProductionSnapshot({ seed: 42, machineCount: 8, riskPreset: "OK" });

    const alarmCount = snapshot.machines.filter((m) => m.status === "ALARM").length;
    const highScrapCount = snapshot.machines.filter((m) => m.scrapRate > 0.03).length;

    expect(alarmCount).toBeLessThanOrEqual(1);
    expect(highScrapCount).toBe(0);
  });

  test("generateDemoProductionSnapshot with riskPreset=HIGH produces some alarming machines", () => {
    const snapshot = generateDemoProductionSnapshot({ seed: 42, machineCount: 8, riskPreset: "HIGH" });

    const hasAlarmOrHighScrap = snapshot.machines.some(
      (m) => m.status === "ALARM" || m.scrapRate > 0.03 || (m.lastCpk !== null && m.lastCpk < 1.0)
    );

    expect(hasAlarmOrHighScrap).toBe(true);
  });

  test("generateDemoProductionSnapshot includes timeseries when requested", () => {
    const snapshot = generateDemoProductionSnapshot({
      seed: 42,
      machineCount: 2,
      includeTimeseries: true,
      timeseriesMinutes: 30,
    });

    expect(snapshot.timeseries).toBeDefined();
    expect(snapshot.timeseries!.length).toBe(2);
    expect(snapshot.timeseries![0].points.length).toBe(31);
  });

  test("generateDemoProductionSnapshot factorySummary counts are correct", () => {
    const snapshot = generateDemoProductionSnapshot({ seed: 42, machineCount: 8, riskPreset: "OK" });

    const { factorySummary, machines } = snapshot;
    const runningCount = machines.filter((m) => m.status === "RUNNING").length;
    const stoppedCount = machines.filter((m) => m.status === "STOPPED").length;
    const alarmCount = machines.filter((m) => m.status === "ALARM").length;
    const setupCount = machines.filter((m) => m.status === "SETUP").length;

    expect(factorySummary.runningCount).toBe(runningCount);
    expect(factorySummary.stoppedCount).toBe(stoppedCount);
    expect(factorySummary.alarmCount).toBe(alarmCount);
    expect(factorySummary.setupCount).toBe(setupCount);
  });

  test("generateDemoProductionState returns single machine state", () => {
    const state = generateDemoProductionState({
      machineId: "TEST-01",
      springType: "compression",
      riskLevel: "OK",
      seed: 42,
    });

    expect(state.machineId).toBe("TEST-01");
    expect(state.springType).toBe("compression");
    expect(state.status).toBeDefined();
    expect(state.cycleTimeMs).toBeGreaterThan(0);
  });
});
