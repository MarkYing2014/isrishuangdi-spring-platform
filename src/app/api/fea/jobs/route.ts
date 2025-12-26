import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { inputs, springType } = body;

        if (springType !== "garter") {
            return new NextResponse("Only garter spring supported currently", { status: 400 });
        }

        // Map Garter Inputs (Ring) to Linear Spring FEA (Unwrapped)
        // PERFORMANCE OPTIMIZATION:
        // Garter springs have high coil counts (e.g. 300+). Meshing full length is slow.
        // Since k ~ 1/N, we can simulate a shorter "Representative Model" with fewer coils
        // and proportionally scaled length/deflection.
        // If we scale N' = N/S, L' = L/S, and Target' = Target/S:
        // k' = S * k
        // F' = k' * (Delta/S) = (S * k) * (Delta/S) = k * Delta = F_real
        // Stress (function of F and D) remains identical.

        const MAX_SIM_COILS = 50;
        const N_real = inputs.N || 100;
        const scaleFactor = N_real > MAX_SIM_COILS ? (N_real / MAX_SIM_COILS) : 1.0;

        const N_sim = N_real / scaleFactor;

        // Calculate Real Unwrapped geometry
        const L0_real = Math.PI * (inputs.D_free || 100);
        const L_target_real = Math.PI * (inputs.D_inst || 100);

        // Scale for Simulation
        const L0_sim = L0_real / scaleFactor;
        const L_target_sim = L_target_real / scaleFactor;

        const workerPayload = {
            design_code: "GARTER-VERIFY",
            geometry: {
                section_type: "CIRC",
                wire_diameter: inputs.d,
                mean_diameter: inputs.Dm,
                active_coils: N_sim,
                total_coils: N_sim, // Neglect hooks
                free_length: L0_sim,
                end_type: "closed_ground",
            },
            material: {
                name: "STEEL",
                G: inputs.G,
                E: inputs.G * 2.5,
                nu: 0.3
            },
            loadcases: [
                {
                    name: "INSTALLED_STATE",
                    target_height: L_target_sim
                }
            ],
            mesh_level: "coarse" // Use coarse for even faster linear check
        };

        const base = process.env.FEA_WORKER_URL || "http://localhost:8080";

        // Call Worker /run (Synchronous)
        const r = await fetch(`${base}/run`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(workerPayload),
        });

        if (!r.ok) {
            const errText = await r.text();
            return new NextResponse(`FEA Worker Error: ${errText}`, { status: r.status });
        }

        const jobData = await r.json();

        // Transform Worker Response to GarterFeaResult structure for Frontend
        // Worker returns: { status: "success", results: { steps: [...], max_stress: ... } }
        const steps = jobData.results?.steps || [];
        const firstStep = steps[0] || {};

        const frontendResult = {
            jobId: jobData.job_id,
            status: jobData.status === "success" ? "SUCCEEDED" : "FAILED",
            message: jobData.error_message, // If any
            maxStress: firstStep.max_stress,
            reactionForce: firstStep.reaction_force_z, // Axial force = Hoop Tension F_t
            deformation: firstStep.max_displacement_z
        };

        return NextResponse.json(frontendResult);

    } catch (e: any) {
        console.error("FEA Proxy Error:", e);
        return new NextResponse(JSON.stringify({ error: "Internal Server Error", details: e.message }), { status: 500 });
    }
}
