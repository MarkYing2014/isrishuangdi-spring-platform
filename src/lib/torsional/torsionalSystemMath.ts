import {
    TorsionalSpringSystemDesign,
    TorsionalSystemResult,
    TorsionalCurvePoint,
    TorsionalGroupResult,
    TorsionalSpringGroup
} from "./torsionalSystemTypes";
import { TORSIONAL_SYSTEM_POLICY_V1 } from "./torsionalSystemPolicy";
import { SPRING_MATERIALS, SpringMaterial } from "../materials/springMaterials";

/**
 * calculateTorsionalSystem
 * 
 * Implements the "Equivalent Unwrapped Model" for clutch dampers.
 */
export function calculateTorsionalSystem(
    design: TorsionalSpringSystemDesign,
    materials?: Record<string, SpringMaterial>
): TorsionalSystemResult {
    const warnings: string[] = [];
    const { groups, frictionTorque, referenceAngle } = design;
    const policy = TORSIONAL_SYSTEM_POLICY_V1;

    // 1. Calculate individual group properties
    const groupProps = groups.map(g => {
        // Equivalent stiffness Kθ,i = n * k * R^2 [N*mm/rad^2 ? No, units check]
        // k is N/mm, R is mm. k*R^2 is (N/mm) * mm^2 = N*mm.
        // This T = Kθ * Δθ(rad). 
        // If we want Nm/deg:
        // T [Nm] = (k [N/mm] * R^2 [mm^2] * Δθ [deg] * (PI/180)) / 1000
        // Kθ [Nm/deg] = (k * R^2 * PI/180) / 1000
        const K_theta_deg = (g.k * Math.pow(g.R, 2) * Math.PI / 180) / 1000;

        // Stop angle in degrees
        const theta_range = (g.L_free - g.L_solid - g.clearance) / g.R * (180 / Math.PI);
        const theta_stop_i = g.theta_start + theta_range;

        return {
            ...g,
            K_theta_deg,
            theta_stop_i,
            theta_range
        };
    });

    // 2. Physical Collision Audit (Angular Gap)
    const radiusBuckets: Record<number, TorsionalSpringGroup[]> = {};
    groups.forEach(g => {
        if (!g.enabled) return;
        const bucketR = Math.round(g.R * 10) / 10;
        if (!radiusBuckets[bucketR]) radiusBuckets[bucketR] = [];
        radiusBuckets[bucketR].push(g);
    });

    Object.entries(radiusBuckets).forEach(([R_str, bucketGroups]) => {
        const R = parseFloat(R_str);
        const allSprings: { angle: number, OD: number, groupId: string }[] = [];

        bucketGroups.forEach(g => {
            const OD = g.Dm + g.d;
            for (let i = 0; i < g.n; i++) {
                allSprings.push({
                    angle: (g.theta_start + i * (360 / g.n)) % 360,
                    OD,
                    groupId: g.id
                });
            }
        });

        if (allSprings.length <= 1) return;

        allSprings.sort((a, b) => a.angle - b.angle);

        for (let i = 0; i < allSprings.length; i++) {
            const nextIdx = (i + 1) % allSprings.length;
            const s1 = allSprings[i];
            const s2 = allSprings[nextIdx];

            let angularGap = (s2.angle - s1.angle + 360) % 360;
            // Handle precision/wrap-around edge case
            if (angularGap > 359.9) angularGap = 0;

            // minGap = (avgOD / R) * (180/PI) + clearance
            const avgOD = (s1.OD + s2.OD) / 2;
            const minRequiredGap = (avgOD / R) * (180 / Math.PI) + 1.5; // 1.5 deg clearance

            if (angularGap < minRequiredGap && s1.groupId !== s2.groupId) {
                warnings.push(`Angular collision detected at R=${R}mm between springs of different groups (Gap: ${angularGap.toFixed(1)}°, Min: ${minRequiredGap.toFixed(1)}°)`);
            }
        }
    });

    // 3. Identify System Stop Angle
    const systemStopTheta = groupProps.length > 0
        ? Math.min(...groupProps.map(gp => gp.theta_stop_i))
        : 0;

    // 3. Generate Curves
    const curves: TorsionalCurvePoint[] = [];
    const samples = policy.defaultSamples;
    const maxTheta = Math.max(systemStopTheta * 1.2, referenceAngle * 1.2, 10);

    // Pre-calculate full system nominal stiffness (sum of all enabled groups)
    const fullNominalK = groupProps.reduce((sum, gp) => gp.enabled ? sum + gp.n * gp.K_theta_deg : sum, 0);

    for (let i = 0; i <= samples; i++) {
        const theta = (maxTheta * i) / samples;
        const isPastStop = theta >= systemStopTheta;

        let totalK = 0;
        let totalTorqueLoad = 0;
        const activeGroups: string[] = [];

        groupProps.forEach(gp => {
            if (!gp.enabled) return;

            // Group is active if theta >= theta_start AND it hasn't personal-stopped
            // But for the system perspective, we use systemStop as the primary limit.
            const effectiveTheta = Math.min(theta, systemStopTheta, gp.theta_stop_i);

            if (effectiveTheta >= gp.theta_start) {
                activeGroups.push(gp.id);
                totalK += gp.K_theta_deg * gp.n;
                totalTorqueLoad += gp.K_theta_deg * gp.n * (effectiveTheta - gp.theta_start);
            }
        });

        // Handle Rigid Stop
        if (isPastStop) {
            const deltaTheta = theta - systemStopTheta;
            const rigidK = fullNominalK * policy.stopMultiplier;
            totalTorqueLoad += rigidK * deltaTheta;
            totalK = rigidK;
        }

        // Hysteresis calculation
        // T_unload = T_load - 2 * Tf
        // Dead-zone: |T| < Tf => T = 0
        let torqueUnload = totalTorqueLoad - 2 * frictionTorque;
        if (totalTorqueLoad <= frictionTorque) {
            torqueUnload = 0;
        }

        curves.push({
            theta,
            torqueLoad: totalTorqueLoad,
            torqueUnload: torqueUnload,
            stiffness: totalK,
            activeGroups
        });
    }

    // 4. Calculate exact results at referenceAngle for summary
    let exactK = 0;
    let exactTorqueLoad = 0;
    const isPastStopRef = referenceAngle >= systemStopTheta;

    groupProps.forEach(gp => {
        if (!gp.enabled) return;
        const effectiveTheta = Math.min(referenceAngle, systemStopTheta, gp.theta_stop_i);
        if (effectiveTheta >= gp.theta_start) {
            exactK += gp.K_theta_deg * gp.n;
            exactTorqueLoad += gp.K_theta_deg * gp.n * (effectiveTheta - gp.theta_start);
        }
    });

    if (isPastStopRef) {
        const deltaTheta = referenceAngle - systemStopTheta;
        const rigidK = fullNominalK * policy.stopMultiplier;
        exactTorqueLoad += rigidK * deltaTheta;
        exactK = rigidK;
    }

    let exactTorqueUnload = exactTorqueLoad - 2 * frictionTorque;
    if (exactTorqueLoad <= frictionTorque) {
        exactTorqueUnload = 0;
    }

    const perGroup: TorsionalGroupResult[] = groupProps.map(gp => {
        let t_group = 0;
        let f_per = 0;
        let stress = 0;
        let utilization = 0;
        const isStopping = referenceAngle >= gp.theta_stop_i;

        const effectiveTheta = Math.min(referenceAngle, systemStopTheta, gp.theta_stop_i);
        let springDeltaX = 0;

        if (gp.enabled && effectiveTheta >= gp.theta_start) {
            springDeltaX = gp.R * (effectiveTheta - gp.theta_start) * (Math.PI / 180);

            // Group torque contribution (load balanced)
            const groupNominalK = gp.K_theta_deg * gp.n;
            const totalNominalKAtRef = groupProps.reduce((sum, g) =>
                (g.enabled && Math.min(referenceAngle, systemStopTheta, g.theta_stop_i) >= g.theta_start)
                    ? sum + g.K_theta_deg * g.n
                    : sum, 0
            );

            // Load sharing proportional to Ki
            t_group = (groupNominalK / (totalNominalKAtRef || 1)) * exactTorqueLoad;

            // Force per spring Fi,per = Ti / (ni * Ri)
            // Fi [N] = (Ti [Nm] * 1000) / (ni * Ri [mm])
            f_per = (t_group * 1000) / (gp.n * gp.R);

            // Stress τi = Kw * (8 * Fi,per * Dm,i) / (π * d_i^3)
            const C = gp.Dm / gp.d;
            const Kw = (4 * C - 1) / (4 * C - 4) + 0.615 / C;
            stress = Kw * (8 * f_per * gp.Dm) / (Math.PI * Math.pow(gp.d, 3));

            // Allowable Stress Policy
            const material = materials?.[gp.materialId || ""] || SPRING_MATERIALS.find(m => m.id === gp.materialId);
            let sy = material?.tensileStrength ? material.tensileStrength * policy.fallbackYieldRatio : 0;

            if (sy === 0 && material?.allowShearStatic) {
                sy = material.allowShearStatic / 0.65;
            }

            const tau_allow = Math.max(policy.allowableClampMin, Math.min(policy.allowableClampMax, policy.allowableStressRatio * sy));
            utilization = tau_allow > 0 ? stress / tau_allow : 0;

            if (!material) warnings.push(`Material missing for group ${gp.id}. Using default yield limits.`);
        }

        return {
            groupId: gp.id,
            torque: t_group,
            force: f_per,
            stress: stress,
            utilization,
            isStopping,
            springDeltaX
        };
    });

    return {
        curves,
        perGroup,
        totalTorque: {
            load: exactTorqueLoad,
            unload: exactTorqueUnload
        },
        totalStiffness: exactK,
        thetaStop: systemStopTheta,
        isPastStop: isPastStopRef,
        warnings
    };
}
