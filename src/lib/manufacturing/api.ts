/**
 * Manufacturing API Client
 * 生产制造 API 客户端
 */

import type { DashboardQuery, DashboardSummaryResponse } from "./types";

const API_BASE = "/api/manufacturing";

/**
 * Fetch dashboard summary data
 */
export async function fetchDashboardSummary(
  query: Partial<DashboardQuery> = {}
): Promise<DashboardSummaryResponse> {
  const params = new URLSearchParams();
  
  if (query.plantId) params.set("plantId", query.plantId);
  if (query.lineId) params.set("lineId", query.lineId);
  if (query.shiftId) params.set("shiftId", query.shiftId);
  if (query.range) params.set("range", query.range);

  const url = `${API_BASE}/summary?${params.toString()}`;
  const res = await fetch(url);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to fetch dashboard: ${res.status}`);
  }

  return res.json();
}

/**
 * Subscribe to real-time updates via SSE (Server-Sent Events)
 * Returns an unsubscribe function
 */
export function subscribeToDashboard(
  query: Partial<DashboardQuery>,
  onData: (data: DashboardSummaryResponse) => void,
  onError?: (error: Error) => void
): () => void {
  const params = new URLSearchParams();
  
  if (query.plantId) params.set("plantId", query.plantId);
  if (query.lineId) params.set("lineId", query.lineId);
  if (query.shiftId) params.set("shiftId", query.shiftId);
  if (query.range) params.set("range", query.range);

  const url = `${API_BASE}/stream?${params.toString()}`;
  
  const eventSource = new EventSource(url);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onData(data);
    } catch (e) {
      onError?.(e instanceof Error ? e : new Error("Failed to parse SSE data"));
    }
  };

  eventSource.onerror = () => {
    onError?.(new Error("SSE connection error"));
  };

  return () => {
    eventSource.close();
  };
}

/**
 * Acknowledge an Andon event
 */
export async function acknowledgeAndonEvent(eventId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/andon/${eventId}/ack`, {
    method: "POST",
  });

  if (!res.ok) {
    throw new Error(`Failed to acknowledge event: ${res.status}`);
  }
}

/**
 * Get work order details
 */
export async function getWorkOrderDetails(workOrderId: string): Promise<{
  workOrder: DashboardSummaryResponse["workOrders"][0];
  history: Array<{ timestamp: string; event: string }>;
}> {
  const res = await fetch(`${API_BASE}/workorders/${workOrderId}`);

  if (!res.ok) {
    throw new Error(`Failed to fetch work order: ${res.status}`);
  }

  return res.json();
}
