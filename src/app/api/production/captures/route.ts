/**
 * Production Captures API
 * 生产截图上传 API
 * 
 * POST: 上传截图并创建附件记录
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const file = formData.get("file") as File | null;
    const lineId = formData.get("lineId") as string | null;
    const stationId = formData.get("stationId") as string | null;
    const workOrderId = formData.get("workOrderId") as string | null;
    const note = formData.get("note") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Mock implementation - in production, save to storage (S3, etc.)
    // For demo, we just return a mock URL
    const captureId = crypto.randomUUID();
    const mockUrl = `/demo/capture-${captureId.slice(0, 8)}.jpg`;

    // In production, you would:
    // 1. Save file to storage
    // 2. Create database record with metadata
    // 3. Return actual URL

    const response = {
      id: captureId,
      url: mockUrl,
      createdAt: new Date().toISOString(),
      lineId,
      stationId,
      workOrderId,
      note,
      size: file.size,
      type: file.type,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Capture upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload capture" },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Mock: Return list of recent captures
  // In production, query from database
  return NextResponse.json({
    captures: [],
    total: 0,
  });
}
