/**
 * FEA Jobs API Route
 * Proxy to fea-calculix-worker service
 */

import { NextRequest, NextResponse } from "next/server";

const FEA_WORKER_URL = process.env.FEA_WORKER_URL || "http://localhost:8080";

export interface FeaJobRequest {
    design_code: string;
    geometry: {
        wire_diameter: number;
        mean_diameter: number;
        active_coils: number;
        total_coils: number;
        free_length: number;
        end_type: string;
        dm_start?: number;
        dm_mid?: number;
        dm_end?: number;
    };
    material?: {
        E?: number;
        nu?: number;
        G?: number;
        name?: string;
    };
    loadcases: Array<{
        name: string;
        target_height: number;
    }>;
    mesh_level?: "coarse" | "medium" | "fine";
}

export interface FeaJobResponse {
    job_id: string;
    status: "success" | "failed" | "error";
    elapsed_ms: number;
    results?: {
        job_name: string;
        num_steps: number;
        success: boolean;
        errors: string[];
        warnings: string[];
        steps: Array<{
            step_number: number;
            step_name: string;
            reaction_force: Record<string, { fx: number; fy: number; fz: number; magnitude: number }>;
            max_stress: number;
            max_stress_element: number;
        }>;
    };
    error_message?: string;
}

/**
 * POST /api/fea/jobs
 * Submit FEA job to worker
 */
export async function POST(request: NextRequest) {
    try {
        const body: FeaJobRequest = await request.json();

        // Validate required fields
        if (!body.geometry || !body.loadcases || body.loadcases.length === 0) {
            return NextResponse.json(
                { error: "Missing geometry or loadcases" },
                { status: 400 }
            );
        }

        // Forward to FEA worker
        const response = await fetch(`${FEA_WORKER_URL}/run`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json(
                { error: `FEA worker error: ${errorText}` },
                { status: response.status }
            );
        }

        const result: FeaJobResponse = await response.json();
        return NextResponse.json(result);

    } catch (error) {
        console.error("[FEA Jobs] Error:", error);

        // Check if worker is not available
        if (error instanceof TypeError && error.message.includes("fetch")) {
            return NextResponse.json(
                {
                    error: "FEA worker not available",
                    hint: "Ensure FEA_WORKER_URL is set and worker is running"
                },
                { status: 503 }
            );
        }

        return NextResponse.json(
            { error: String(error) },
            { status: 500 }
        );
    }
}

/**
 * GET /api/fea/jobs
 * Check FEA worker health
 */
export async function GET() {
    try {
        const response = await fetch(`${FEA_WORKER_URL}/health`);

        if (!response.ok) {
            return NextResponse.json(
                { status: "unhealthy", worker_url: FEA_WORKER_URL },
                { status: 503 }
            );
        }

        const health = await response.json();
        return NextResponse.json({
            status: "healthy",
            worker: health,
            worker_url: FEA_WORKER_URL,
        });

    } catch {
        return NextResponse.json(
            {
                status: "unavailable",
                worker_url: FEA_WORKER_URL,
                hint: "Worker not reachable"
            },
            { status: 503 }
        );
    }
}
