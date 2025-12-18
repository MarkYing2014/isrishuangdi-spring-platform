import { describe, expect, test } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";

function createRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

describe("GET /api/production/dashboard", () => {
  test("returns valid DashboardVM in demo mode", async () => {
    const req = createRequest("/api/production/dashboard?mode=demo&risk=OK&seed=42");
    const res = await GET(req);

    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.timestamp).toBeDefined();
    expect(data.factorySummary).toBeDefined();
    expect(data.factorySummary.overallLiveRisk).toBeDefined();
    expect(data.machines).toBeDefined();
    expect(Array.isArray(data.machines)).toBe(true);
  });

  test("returns deterministic results with same seed", async () => {
    const req1 = createRequest("/api/production/dashboard?mode=demo&risk=OK&seed=12345");
    const req2 = createRequest("/api/production/dashboard?mode=demo&risk=OK&seed=12345");

    const res1 = await GET(req1);
    const res2 = await GET(req2);

    const data1 = await res1.json();
    const data2 = await res2.json();

    expect(data1.machines[0].machineId).toBe(data2.machines[0].machineId);
    expect(data1.machines[0].cycleTimeMs).toBe(data2.machines[0].cycleTimeMs);
  });

  test("HIGH risk preset produces HIGH_RISK overall status", async () => {
    const req = createRequest("/api/production/dashboard?mode=demo&risk=HIGH&seed=42");
    const res = await GET(req);

    const data = await res.json();
    expect(data.factorySummary.overallLiveRisk).toBe("HIGH_RISK");
  });

  test("returns 400 for invalid mode", async () => {
    const req = createRequest("/api/production/dashboard?mode=invalid");
    const res = await GET(req);

    expect(res.status).toBe(400);
  });

  test("includes alerts in response", async () => {
    const req = createRequest("/api/production/dashboard?mode=demo&risk=HIGH&seed=42");
    const res = await GET(req);

    const data = await res.json();
    expect(data.alerts).toBeDefined();
    expect(Array.isArray(data.alerts)).toBe(true);
  });

  test("includes timeseries in response", async () => {
    const req = createRequest("/api/production/dashboard?mode=demo&risk=OK&seed=42");
    const res = await GET(req);

    const data = await res.json();
    expect(data.timeseries).toBeDefined();
    expect(Array.isArray(data.timeseries)).toBe(true);
  });
});
