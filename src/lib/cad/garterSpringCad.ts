
import { GarterSpringDesign } from "../springTypes/garter";

/**
 * Generate SVG for Garter Spring
 * V1:
 * - Top View: Concentric circles for the ring (ID, OD, Centerline)
 * - Detail View: Straight segment of the coil (showing pitch/diameter)
 * - Joint Symbol
 */
export function generateGarterSpringSvg(design: GarterSpringDesign): string {
    const {
        wireDiameter: d,
        meanDiameter: Dm,
        ringInstalledDiameter,
        ringFreeDiameter
    } = design;

    // Use installed if provided, else free
    const D_ring = ringInstalledDiameter ?? ringFreeDiameter;
    const R_ring = D_ring / 2;
    const r_coil = Dm / 2;
    const OD_ring = D_ring + Dm + d; // Ring's outer envelope (Toroid OD) = D_ring + tube_OD
    const ID_ring = D_ring - (Dm + d);

    // Viewport
    const padding = 20;
    const viewSize = OD_ring + padding * 2;
    const c = viewSize / 2; // Center

    // Detail View: Draw a small segment of helical coil
    // We'll draw it below the ring
    const detailWidth = 200;
    const detailHeight = Dm * 3;

    const svgContent = `
    <!-- Top View (Ring) -->
    <g transform="translate(${c}, ${c})">
      <!-- Centerline -->
      <circle cx="0" cy="0" r="${R_ring}" fill="none" stroke="#2563eb" stroke-width="1" stroke-dasharray="5,5" />
      <!-- Outer Tube Bound -->
      <circle cx="0" cy="0" r="${R_ring + r_coil}" fill="none" stroke="#334155" stroke-width="2" />
      <!-- Inner Tube Bound -->
      <circle cx="0" cy="0" r="${R_ring - r_coil}" fill="none" stroke="#334155" stroke-width="2" />
      
      <!-- Approx Spiral Texture (Visual only) -->
      <!-- Drawing many small circles along the path is expensive for SVG, simplified to bounds + centerline -->
      
      <!-- Joint Marker -->
      <circle cx="${R_ring}" cy="0" r="${r_coil * 0.8}" fill="#f59e0b" stroke="none" opacity="0.5" />
      <text x="${R_ring + r_coil + 5}" y="5" font-family="Arial" font-size="12" fill="#64748b">Joint (${design.jointType ?? 'Hook'})</text>
    </g>

    <!-- Detail View (Straight Segment) -->
    <g transform="translate(${padding}, ${viewSize + 20})">
      <text x="0" y="-10" font-family="Arial" font-size="14" fill="#0f172a" font-weight="bold">Detail View (Coil)</text>
      
      <!-- Wire Coil Representation -->
      ${renderCoilSegment(d, Dm, 10, detailWidth)}
    </g>
  `;

    return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewSize} ${viewSize + detailHeight + 50}">
      <rect width="100%" height="100%" fill="white" />
      ${svgContent}
    </svg>
  `;
}

function renderCoilSegment(d: number, Dm: number, count: number, width: number): string {
    // Draw a simple sine wave or series of circles to represent coils
    let path = `M 0 ${Dm / 2}`;
    const pitch = d; // Assume close wound
    for (let i = 0; i < count; i++) {
        // Simple zigzag for V1
        path += ` L ${i * pitch + pitch / 2} ${-Dm / 2} L ${i * pitch + pitch} ${Dm / 2}`;
    }

    return `
        <path d="${path}" stroke="#334155" stroke-width="${d}" fill="none" />
        <line x1="0" y1="0" x2="${count * pitch}" y2="0" stroke="#94a3b8" stroke-dasharray="4,2" />
        <text x="${count * pitch + 10}" y="5" font-family="Arial" font-size="12" fill="#64748b">d=${d}mm</text>
    `;
}

/**
 * Generate DXF for Garter Spring
 * V1: Simple entities
 */
export function generateGarterSpringDxf(design: GarterSpringDesign): string {
    // Minimal DXF header/footer
    const header = `0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n`;
    const footer = `0\nENDSEC\n0\nEOF\n`;

    const D_ring = design.ringInstalledDiameter ?? design.ringFreeDiameter;
    const R = D_ring / 2;
    const r_coil = design.meanDiameter / 2;

    // Circle entity helper
    const circle = (cx: number, cy: number, r: number, layer: string) => `0\nCIRCLE\n8\n${layer}\n10\n${cx}\n20\n${cy}\n40\n${r}\n`;

    let entities = "";
    entities += circle(0, 0, R, "CENTERLINE");
    entities += circle(0, 0, R + r_coil, "OUTER");
    entities += circle(0, 0, R - r_coil, "INNER");

    return header + entities + footer;
}
