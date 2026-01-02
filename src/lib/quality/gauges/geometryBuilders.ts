/**
 * Geometry Builders (Low-poly Mesh)
 * Q1: Smart Gauge Generator
 */

export interface Mesh {
    vertices: number[][]; // [x, y, z]
    faces: number[][];    // [v1, v2, v3]
}

/**
 * Build a simple cylinder (for ID GO/NO-GO or Pins)
 */
export function buildCylinderMesh(radius: number, height: number, segments: number = 32): Mesh {
    const vertices: number[][] = [];
    const faces: number[][] = [];

    // Vertices
    for (let i = 0; i < segments; i++) {
        const theta = (i / segments) * 2 * Math.PI;
        const x = radius * Math.cos(theta);
        const y = radius * Math.sin(theta);

        // Bottom circle
        vertices.push([x, y, 0]);
        // Top circle
        vertices.push([x, y, height]);
    }

    // Center points for caps
    const bottomCenterIdx = vertices.length;
    vertices.push([0, 0, 0]);
    const topCenterIdx = vertices.length;
    vertices.push([0, 0, height]);

    // Faces (Side)
    for (let i = 0; i < segments; i++) {
        const next = (i + 1) % segments;
        const b1 = i * 2;
        const t1 = i * 2 + 1;
        const b2 = next * 2;
        const t2 = next * 2 + 1;

        // Quad face as two triangles
        faces.push([b1, b2, t1]);
        faces.push([t1, b2, t2]);
    }

    // Faces (Caps)
    for (let i = 0; i < segments; i++) {
        const next = (i + 1) % segments;
        const b1 = i * 2;
        const b2 = next * 2;
        const t1 = i * 2 + 1;
        const t2 = next * 2 + 1;

        // Bottom cap (Clockwise)
        faces.push([bottomCenterIdx, b2, b1]);
        // Top cap (Counter-clockwise)
        faces.push([topCenterIdx, t1, t2]);
    }

    return { vertices, faces };
}

/**
 * Build a sleeve (for OD GO/NO-GO)
 */
export function buildSleeveMesh(innerRadius: number, outerRadius: number, height: number, segments: number = 32): Mesh {
    const vertices: number[][] = [];
    const faces: number[][] = [];

    // Vertices (Inner and Outer rings)
    for (let i = 0; i < segments; i++) {
        const theta = (i / segments) * 2 * Math.PI;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);

        // Inner Bottom
        vertices.push([innerRadius * cosT, innerRadius * sinT, 0]);
        // Inner Top
        vertices.push([innerRadius * cosT, innerRadius * sinT, height]);
        // Outer Bottom
        vertices.push([outerRadius * cosT, outerRadius * sinT, 0]);
        // Outer Top
        vertices.push([outerRadius * cosT, outerRadius * sinT, height]);
    }

    // Faces
    for (let i = 0; i < segments; i++) {
        const next = (i + 1) % segments;
        const base = i * 4;
        const nextBase = next * 4;

        const ib1 = base;
        const it1 = base + 1;
        const ob1 = base + 2;
        const ot1 = base + 3;

        const ib2 = nextBase;
        const it2 = nextBase + 1;
        const ob2 = nextBase + 2;
        const ot2 = nextBase + 3;

        // Inner Side
        faces.push([ib1, it1, ib2]);
        faces.push([it1, it2, ib2]);

        // Outer Side
        faces.push([ob1, ob2, ot1]);
        faces.push([ot1, ob2, ot2]);

        // Bottom Cap (Ring)
        faces.push([ib1, ib2, ob1]);
        faces.push([ob1, ib2, ob2]);

        // Top Cap (Ring)
        faces.push([it1, ot1, it2]);
        faces.push([ot1, ot2, it2]);
    }

    return { vertices, faces };
}
