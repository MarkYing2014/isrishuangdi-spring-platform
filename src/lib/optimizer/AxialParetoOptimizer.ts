import { generateAxialPackEngine } from "@/lib/spring-platform/engines/axial-pack-engine";
import { type AxialPackInput, type AxialPackResult } from "@/lib/spring-platform/types";
import { AxialPackAudit } from "@/lib/designRules/AxialPackAudit";

// Re-export types for consumers
export type { AxialPackInput, AxialPackResult };

export type OptimizeTarget =
    | { type: "k"; kReq: number; tolerancePct: number }
    | { type: "loadAtStroke"; pReq: number; stroke: number; tolerancePct: number };

export interface AxialOptimizerEnvelope {
    maxOD?: number; // housing limit
    minID?: number; // shaft limit
    maxSolidHeight?: number;
}

export interface AxialOptimizerConstraints {
    minSafetyFactor?: number; // e.g. 1.1
    indexRange?: [number, number]; // default [4,12]
    packNRange?: [number, number]; // e.g. [4,20]
    NaRange?: [number, number]; // e.g. [3,20]
    wireSeries?: number[]; // optional override
    maxCandidates?: number; // e.g. 60
    requireAuditPass?: boolean; // true -> only PASS designs can be applied
}

export interface AxialOptimizerRequest {
    baseTemplate: AxialPackInput; // includes materialId, endCondition, etc.
    target: OptimizeTarget;
    envelope: AxialOptimizerEnvelope;
    constraints?: AxialOptimizerConstraints;
}

export interface AxialOptimizerCandidate {
    input: AxialPackInput;
    result: AxialPackResult;
    audit: ReturnType<typeof AxialPackAudit.evaluate>;
    score: {
        targetErrorPct: number;
        massProxy: number; // lightweight heuristic
        safetyFactor: number;
        composite: number; // for sorting
        bucket: "Lightweight" | "Balanced" | "HighMargin";
    };
    why: string[]; // short reasoning bullets for UI
}

const DEFAULTS: Required<AxialOptimizerConstraints> = {
    minSafetyFactor: 1.1,
    indexRange: [4, 12],
    packNRange: [4, 20],
    NaRange: [3, 20],
    wireSeries: [],
    maxCandidates: 60,
    requireAuditPass: true,
};

/**
 * Standard metric wire series (example). Replace with your platform's material/wire table if you have one.
 */
export function generateWireSeriesMetric(): number[] {
    // keep discrete + manufacturable
    return [
        0.8, 1.0, 1.2, 1.4, 1.6,
        1.8, 2.0, 2.2, 2.5, 2.8,
        3.0, 3.2, 3.5, 4.0, 4.5,
        5.0, 5.5, 6.0, 7.0, 8.0,
        9.0, 10.0, 11.0, 12.0,
    ];
}

/**
 * Filter wire series to practical range based on template's wire diameter.
 * For clutch/heavy-duty springs, we don't want 0.8mm wire if template uses 4mm.
 */
function filterWireSeriesForTemplate(fullSeries: number[], templateD: number): number[] {
    // Allow ±60% variation from template wire diameter
    const minD = templateD * 0.4;
    const maxD = templateD * 1.6;
    const filtered = fullSeries.filter(d => d >= minD && d <= maxD);
    // If no wires in range, return at least the template value
    if (filtered.length === 0) {
        const closest = fullSeries.reduce((prev, curr) =>
            Math.abs(curr - templateD) < Math.abs(prev - templateD) ? curr : prev
        );
        return [closest];
    }
    return filtered;
}

/**
 * Main optimizer entry
 * - Brute force discrete search
 * - Evaluate via AxialPackEngine + AuditEngine
 * - Filter hard constraints
 * - Rank by composite score & bucket
 */
export function optimizeAxialPack(req: AxialOptimizerRequest): AxialOptimizerCandidate[] {
    const baseD = req.baseTemplate.baseSpring.d;

    // Filter wire series based on template for practical results
    const fullWireSeries = req.constraints?.wireSeries?.length
        ? req.constraints.wireSeries
        : generateWireSeriesMetric();
    const practicalWireSeries = filterWireSeriesForTemplate(fullWireSeries, baseD);

    console.log(`[Optimizer] Template d=${baseD}mm, using wire range: ${practicalWireSeries.join(', ')}mm`);

    const cfg: Required<AxialOptimizerConstraints> = {
        ...DEFAULTS,
        ...req.constraints,
        wireSeries: practicalWireSeries,
    };

    const candidates: AxialOptimizerCandidate[] = [];
    const [Cmin, Cmax] = cfg.indexRange;
    const [Nmin, Nmax] = cfg.packNRange;
    const [NaMin, NaMax] = cfg.NaRange;

    // Guardrails (anti-freeze)
    const hardLoopCap = 12000; // hard safety cap; keep < 1s typical
    let loops = 0;

    // DEBUG: Rejection counters
    let dbg = { envelope: 0, noRawResult: 0, auditFail: 0, auditNotPass: 0, sfFail: 0, solidFail: 0, passed: 0 };


    // Create engine instance
    const engine = generateAxialPackEngine();

    for (const d of cfg.wireSeries) {
        for (let Na = NaMin; Na <= NaMax; Na += 0.5) {
            for (let N = Nmin; N <= Nmax; N++) {
                for (let C = Cmin; C <= Cmax; C += 0.5) {
                    loops++;
                    if (loops > hardLoopCap) break;

                    const input = buildCandidateInput(req.baseTemplate, { d, Na, N, C }, req.envelope);
                    if (!input) { dbg.envelope++; continue; }

                    // Run engine
                    const result = engine.calculate({
                        geometry: input,
                        cases: { mode: "deflection", values: [0] },
                        material: { id: input.baseSpring.materialId, G: 79000, E: 206000, tauAllow: 800 },
                        modules: { basicGeometry: true } as any
                    }) as AxialPackResult;

                    if (!result.rawResult) { dbg.noRawResult++; continue; }

                    const audit = AxialPackAudit.evaluate({
                        input: input,
                        result: result as any
                    });

                    // Hard filters with debug
                    if (audit.status === "FAIL") { dbg.auditFail++; continue; }
                    if (cfg.requireAuditPass && audit.status !== "PASS") { dbg.auditNotPass++; continue; }
                    const sf = audit.kpi?.safetyFactor ?? 0;
                    if (sf < cfg.minSafetyFactor) { dbg.sfFail++; continue; }

                    // Solid height check (optional)
                    if (req.envelope.maxSolidHeight !== undefined) {
                        const Hs = result.pack?.Hs_pack;
                        if (typeof Hs === 'number' && Number.isFinite(Hs) && Hs > req.envelope.maxSolidHeight) {
                            dbg.solidFail++;
                            continue;
                        }
                    }

                    dbg.passed++;
                    const scored = scoreCandidate(req, input, result, audit);
                    candidates.push(scored);
                }
            }
        }
    }

    // Log debug info
    console.log(`[Optimizer Debug] loops=${loops} | envelope=${dbg.envelope} | noRawResult=${dbg.noRawResult} | auditFail=${dbg.auditFail} | auditNotPass=${dbg.auditNotPass} | sfFail=${dbg.sfFail} | solidFail=${dbg.solidFail} | passed=${dbg.passed}`);

    // Sort by composite, then take top K, but keep diversity buckets
    candidates.sort((a, b) => a.score.composite - b.score.composite);

    return selectTopWithBuckets(candidates, cfg.maxCandidates);
}

// --------------------------- helpers ---------------------------

function buildCandidateInput(
    base: AxialPackInput,
    v: { d: number; Na: number; N: number; C: number },
    env: AxialOptimizerEnvelope
): AxialPackInput | null {
    // Derive Dm using envelope + C + d
    const Dm = v.C * v.d;
    const springOD = Dm + v.d;

    // --- AUTO-FIT LOGIC ---
    // Instead of fixed Rbc, we calculate the required Rbc to fit N springs.
    // 1. Min Rbc for Spring-to-Spring clearance (gap >= 0.5mm)
    //    gap = 2 * R * sin(pi/N) - OD
    //    0.5 = 2 * R_min * sin(pi/N) - OD
    //    R_min = (OD + 0.5) / (2 * Math.sin(Math.PI / N))
    const minRbc_SS = (springOD + 0.5) / (2 * Math.sin(Math.PI / v.N));

    // 2. Max Rbc allowed by Envelope Max OD (Housing)
    //    PackOD = 2 * Rbc + OD_spring <= MaxOD
    //    2 * Rbc <= MaxOD - OD_spring
    //    Rbc_max = (MaxOD - OD_spring) / 2
    let maxRbc_Env = Infinity;
    if (env.maxOD !== undefined) {
        maxRbc_Env = (env.maxOD - springOD) / 2;
    }

    // 3. Min Rbc allowed by Envelope Min ID (Shaft)
    //    PackID = 2 * Rbc - OD_spring >= MinID
    //    2 * Rbc >= MinID + OD_spring
    //    Rbc_min_ID = (MinID + OD_spring) / 2
    let minRbc_ID = 0;
    if (env.minID !== undefined) {
        minRbc_ID = (env.minID + springOD) / 2;
    }

    // Combine constraints
    const validMin = Math.max(minRbc_SS, minRbc_ID);
    const validMax = maxRbc_Env;

    if (validMin > validMax) return null; // Geometrically impossible

    // 4. Select Rbc
    //    Strategy: Prefer "Compact but Safe".
    //    Default to validMin + 0.5mm for robustness.
    let targetRbc = validMin + 0.5;

    // Clamp to max
    if (targetRbc > validMax) targetRbc = validMin; // Fallback to tightest possible

    // 5. Derive RingOD/ID for the Pack Object
    //    Use Envelope boundaries if provided, otherwise derived
    const ringOD = env.maxOD ?? base.pack.ringOD ?? (targetRbc * 2 + springOD + 10);
    const ringID = env.minID ?? base.pack.ringID ?? 0;

    const next: AxialPackInput = {
        ...base,
        baseSpring: {
            ...base.baseSpring,
            d: v.d,
            Dm,
            Na: v.Na,
            Nt: v.Na + 2, // Approximation for closed ends
            L0: base.baseSpring.L0
        },
        pack: {
            ...base.pack,
            N: v.N,
            Rbc: targetRbc,
            ringOD: ringOD,
            ringID: ringID
        },
    };

    return next;
}

function passesHardConstraints(
    req: AxialOptimizerRequest,
    input: AxialPackInput,
    result: AxialPackResult,
    audit: ReturnType<typeof AxialPackAudit.evaluate>,
    cfg: Required<AxialOptimizerConstraints>
): boolean {
    // Solid / stroke constraint should be enforced in engine + audit already
    // Explicit check for solid bind if engine doesn't return FAIL for it
    if (audit.status === "FAIL") return false;

    // Optional: require audit PASS to be "Apply-able"
    if (cfg.requireAuditPass && audit.status !== "PASS") return false;

    // Safety factor min
    const sf = audit.kpi?.safetyFactor ?? 0;
    if (sf < cfg.minSafetyFactor) return false;

    // Envelope: max solid height
    if (req.envelope.maxSolidHeight !== undefined) {
        const Hs = result.pack?.Hs_pack ?? Infinity;
        if (Hs > req.envelope.maxSolidHeight) return false;
    }

    return true;
}

function scoreCandidate(
    req: AxialOptimizerRequest,
    input: AxialPackInput,
    result: AxialPackResult,
    audit: ReturnType<typeof AxialPackAudit.evaluate>
): AxialOptimizerCandidate {
    const { targetErrorPct, achieved } = computeTargetError(req, result);
    const sf = audit.kpi?.safetyFactor ?? 0;

    // Simple mass proxy: N * d^2 * Dm * Na (not exact; consistent ranking)
    const d = input.baseSpring.d;
    const Dm = input.baseSpring.Dm;
    const Na = input.baseSpring.Na;
    const N = input.pack.N;
    const massProxy = N * (d * d) * Dm * Math.max(Na, 1);

    // Composite score (lower better)
    // Weight: target accuracy > mass > safety (but keep safety in filters)
    const composite = targetErrorPct * 2.0 + (massProxy / 1e6) * 1.0 + (1 / Math.max(sf, 1e-6)) * 0.2;

    const bucket = pickBucket(targetErrorPct, massProxy, sf);

    const why: string[] = [
        `Target error: ${targetErrorPct.toFixed(1)}% (achieved: ${achieved})`,
        `Safety factor: ${sf.toFixed(2)}`,
        `Lightweight proxy: ${(massProxy / 1e6).toFixed(2)}`,
    ];

    return {
        input,
        result,
        audit,
        score: { targetErrorPct, massProxy, safetyFactor: sf, composite, bucket },
        why,
    };
}

function computeTargetError(req: AxialOptimizerRequest, result: AxialPackResult): { targetErrorPct: number; achieved: string } {
    // const tol = req.target.tolerancePct / 100;

    if (req.target.type === "k") {
        const k = result.pack?.k_total ?? 0;
        const err = req.target.kReq > 0 ? Math.abs(k - req.target.kReq) / req.target.kReq : 1;
        return { targetErrorPct: err * 100, achieved: `k=${k.toFixed(2)}` };
    }

    // load at stroke
    // Approximation: P = k * stroke
    const stroke = req.target.stroke;
    const k = result.pack?.k_total ?? 0;
    const P = k * stroke;
    const err = req.target.pReq > 0 ? Math.abs(P - req.target.pReq) / req.target.pReq : 1;
    return { targetErrorPct: err * 100, achieved: `P@${stroke}=${P.toFixed(1)}` };
}

function pickBucket(targetErrorPct: number, massProxy: number, sf: number): AxialOptimizerCandidate["score"]["bucket"] {
    if (sf >= 1.6) return "HighMargin";
    // Define mass threshold dynamically? For now constant
    if (massProxy <= 1.2e6 && targetErrorPct <= 8) return "Lightweight";
    return "Balanced";
}

function selectTopWithBuckets(all: AxialOptimizerCandidate[], max: number): AxialOptimizerCandidate[] {
    // Keep diversity: 1/3 per bucket, then fill
    const buckets: Record<string, AxialOptimizerCandidate[]> = { Lightweight: [], Balanced: [], HighMargin: [] };
    for (const c of all) buckets[c.score.bucket].push(c);

    const per = Math.max(1, Math.floor(max / 3));
    const out: AxialOptimizerCandidate[] = [];
    for (const key of ["Lightweight", "Balanced", "HighMargin"] as const) {
        if (out.length >= max) break;
        out.push(...buckets[key].slice(0, per));
    }
    if (out.length < max) {
        // fill remaining from global list not already included
        const set = new Set(out.map(x => snapshotKey(x.input)));
        for (const c of all) {
            if (out.length >= max) break;
            const k = snapshotKey(c.input);
            if (!set.has(k)) {
                out.push(c);
                set.add(k);
            }
        }
    }
    return out.slice(0, max);
}

function snapshotKey(input: AxialPackInput): string {
    const b = input.baseSpring;
    const p = input.pack;
    return `${b.d}|${b.Dm}|${b.Na}|${p.N}|${p.Rbc}`;
}
