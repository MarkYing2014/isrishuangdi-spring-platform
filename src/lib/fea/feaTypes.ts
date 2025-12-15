/**
 * FEA Types and Color Mapping Utilities
 * 
 * Provides TypeScript interfaces for FEA results and helper functions
 * for mapping FEA scalar data to vertex colors in Three.js.
 */

import * as THREE from "three";

// ============================================================================
// FEA Result Types
// ============================================================================

export interface FEAResultNode {
  id: number;
  x: number;
  y: number;
  z: number;
  sigma_vm: number;  // von Mises stress (MPa)
  ux: number;        // displacement X (mm)
  uy: number;        // displacement Y (mm)
  uz: number;        // displacement Z (mm)
}

export interface FEAResult {
  nodes: FEAResultNode[];
  maxSigma: number;
  maxDisplacement: number;
  safetyFactor?: number | null;
  maxSigmaNodeIndex?: number;  // Index of node with max stress
  maxDispNodeIndex?: number;   // Index of node with max displacement
  minSigma?: number;           // Min stress for legend
  minDisplacement?: number;    // Min displacement for legend
}

/**
 * Find the index of the node with maximum von Mises stress
 */
export function findMaxSigmaNodeIndex(nodes: FEAResultNode[]): number {
  let maxIndex = 0;
  let maxVal = -Infinity;
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].sigma_vm > maxVal) {
      maxVal = nodes[i].sigma_vm;
      maxIndex = i;
    }
  }
  return maxIndex;
}

/**
 * Find the index of the node with maximum displacement magnitude
 */
export function findMaxDispNodeIndex(nodes: FEAResultNode[]): number {
  let maxIndex = 0;
  let maxVal = -Infinity;
  for (let i = 0; i < nodes.length; i++) {
    const disp = Math.sqrt(nodes[i].ux ** 2 + nodes[i].uy ** 2 + nodes[i].uz ** 2);
    if (disp > maxVal) {
      maxVal = disp;
      maxIndex = i;
    }
  }
  return maxIndex;
}

/**
 * Get min/max values for a given color mode
 */
export function getFeaMinMax(
  nodes: FEAResultNode[],
  mode: FeaColorMode,
  allowableStress?: number
): { min: number; max: number } {
  let minVal = Infinity;
  let maxVal = -Infinity;
  
  for (const node of nodes) {
    let val = 0;
    switch (mode) {
      case "fea_sigma":
        val = node.sigma_vm;
        break;
      case "fea_disp":
        val = Math.sqrt(node.ux ** 2 + node.uy ** 2 + node.uz ** 2);
        break;
      case "fea_sf":
        if (allowableStress && node.sigma_vm > 0) {
          val = allowableStress / node.sigma_vm;
        }
        break;
    }
    if (val < minVal) minVal = val;
    if (val > maxVal) maxVal = val;
  }
  
  return { min: minVal, max: maxVal };
}

export type FeaColorMode = "formula" | "fea_sigma" | "fea_disp" | "fea_sf";

// ============================================================================
// Color LUT (Lookup Table) - Blue → Green → Yellow → Red
// ============================================================================

const LUT_COLORS = [
  new THREE.Color(0x0000ff), // Blue (low)
  new THREE.Color(0x00ffff), // Cyan
  new THREE.Color(0x00ff00), // Green
  new THREE.Color(0xffff00), // Yellow
  new THREE.Color(0xff0000), // Red (high)
];

/**
 * Interpolate color from LUT based on normalized value [0, 1]
 */
function lerpLUT(t: number): THREE.Color {
  const clampedT = Math.max(0, Math.min(1, t));
  const segments = LUT_COLORS.length - 1;
  const scaledT = clampedT * segments;
  const index = Math.floor(scaledT);
  const frac = scaledT - index;

  if (index >= segments) {
    return LUT_COLORS[segments].clone();
  }

  const c1 = LUT_COLORS[index];
  const c2 = LUT_COLORS[index + 1];
  return c1.clone().lerp(c2, frac);
}

// ============================================================================
// FEA Color Application
// ============================================================================

export interface FeaColorOptions {
  mode: FeaColorMode;
  feaResult: FEAResult | null;
  allowableStress?: number;  // For safety factor calculation
}

/**
 * Get scalar value from FEA node based on color mode
 */
function getNodeScalar(node: FEAResultNode, mode: FeaColorMode, allowableStress?: number): number {
  switch (mode) {
    case "fea_sigma":
      return node.sigma_vm;
    case "fea_disp":
      return Math.sqrt(node.ux ** 2 + node.uy ** 2 + node.uz ** 2);
    case "fea_sf":
      if (allowableStress && node.sigma_vm > 0) {
        return allowableStress / node.sigma_vm;
      }
      return 0;
    default:
      return 0;
  }
}

/**
 * Build a spatial lookup map from FEA nodes for fast nearest-neighbor queries
 */
function buildNodeLookup(nodes: FEAResultNode[]): Map<string, FEAResultNode> {
  const map = new Map<string, FEAResultNode>();
  for (const node of nodes) {
    // Round to 2 decimal places for spatial binning
    const key = `${node.x.toFixed(2)},${node.y.toFixed(2)},${node.z.toFixed(2)}`;
    map.set(key, node);
  }
  return map;
}

/**
 * Find nearest FEA node to a given position
 */
function findNearestNode(
  position: THREE.Vector3,
  nodes: FEAResultNode[],
  nodeLookup: Map<string, FEAResultNode>
): FEAResultNode | null {
  // Try exact match first (with rounding)
  const key = `${position.x.toFixed(2)},${position.y.toFixed(2)},${position.z.toFixed(2)}`;
  const exact = nodeLookup.get(key);
  if (exact) return exact;

  // Fall back to brute force nearest neighbor
  let nearest: FEAResultNode | null = null;
  let minDist = Infinity;

  for (const node of nodes) {
    const dx = position.x - node.x;
    const dy = position.y - node.y;
    const dz = position.z - node.z;
    const dist = dx * dx + dy * dy + dz * dz;
    if (dist < minDist) {
      minDist = dist;
      nearest = node;
    }
  }

  return nearest;
}

/**
 * Apply FEA-based vertex colors to a BufferGeometry
 * 
 * Uses normalized Z-position to map FEA node values to vertices,
 * since FEA nodes and Three.js geometry may have different scales.
 * 
 * @param geometry - The Three.js BufferGeometry to colorize
 * @param options - FEA color options including mode and result data
 * @returns true if colors were applied, false otherwise
 */
export function applyFeaColors(
  geometry: THREE.BufferGeometry,
  options: FeaColorOptions
): boolean {
  const { mode, feaResult, allowableStress } = options;

  // If not in FEA mode or no results, return false
  if (mode === "formula" || !feaResult || feaResult.nodes.length === 0) {
    return false;
  }

  const positionAttr = geometry.getAttribute("position");
  if (!positionAttr) return false;

  const vertexCount = positionAttr.count;
  
  // Find geometry bounding box for normalization
  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox;
  if (!bbox) return false;
  
  const nodes = feaResult.nodes;
  const numNodes = nodes.length;

  // Check FEA nodes Z range to determine mapping strategy
  // For spiral springs, FEA nodes are all in XY plane (Z=0), so use radius mapping
  let nodeMinZ = Infinity;
  let nodeMaxZ = -Infinity;
  for (const node of nodes) {
    if (node.z < nodeMinZ) nodeMinZ = node.z;
    if (node.z > nodeMaxZ) nodeMaxZ = node.z;
  }
  const nodeRangeZ = nodeMaxZ - nodeMinZ;
  const usePlanarMapping = nodeRangeZ < 1e-6; // FEA nodes are in same plane

  const nodeLookup = buildNodeLookup(nodes);

  // Calculate min/max scalar values for color normalization
  let minVal = Infinity;
  let maxVal = -Infinity;

  for (const node of nodes) {
    const val = getNodeScalar(node, mode, allowableStress);
    if (val < minVal) minVal = val;
    if (val > maxVal) maxVal = val;
  }

  // Handle edge case where all values are the same
  const range = maxVal - minVal;
  const safeRange = range > 0 ? range : 1;

  // Create or update color attribute
  let colorAttr = geometry.getAttribute("color") as THREE.BufferAttribute | null;
  if (!colorAttr || colorAttr.count !== vertexCount) {
    colorAttr = new THREE.Float32BufferAttribute(new Float32Array(vertexCount * 3), 3);
    geometry.setAttribute("color", colorAttr);
  }

  const colors = colorAttr.array as Float32Array;

  const tmp = new THREE.Vector3();

  if (usePlanarMapping) {
    let minR = Infinity;
    let maxR = -Infinity;
    for (let i = 0; i < vertexCount; i++) {
      const x = positionAttr.getX(i);
      const y = positionAttr.getY(i);
      const r = Math.sqrt(x * x + y * y);
      if (r < minR) minR = r;
      if (r > maxR) maxR = r;
    }

    const rangeR = maxR - minR;
    if (rangeR > 1e-12) {
      for (let i = 0; i < vertexCount; i++) {
        const x = positionAttr.getX(i);
        const y = positionAttr.getY(i);
        const r = Math.sqrt(x * x + y * y);

        const normalizedR = (r - minR) / rangeR;
        const nodeIndex = Math.min(Math.floor(normalizedR * numNodes), numNodes - 1);
        const node = nodes[Math.max(0, nodeIndex)];

        const val = getNodeScalar(node, mode, allowableStress);
        const t = (val - minVal) / safeRange;
        const color = lerpLUT(t);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }
    } else {
      for (let i = 0; i < vertexCount; i++) {
        tmp.set(positionAttr.getX(i), positionAttr.getY(i), positionAttr.getZ(i));
        const nearest = findNearestNode(tmp, nodes, nodeLookup) ?? nodes[0];

        const val = getNodeScalar(nearest, mode, allowableStress);
        const t = (val - minVal) / safeRange;
        const color = lerpLUT(t);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }
    }
  } else {
    // Use Z-axis mapping for 3D springs (compression, extension, torsion)
    const geomMinZ = bbox.min.z;
    const geomMaxZ = bbox.max.z;
    const geomRangeZ = geomMaxZ - geomMinZ;
    const safeGeomRangeZ = geomRangeZ > 1e-12 ? geomRangeZ : 1;

    for (let i = 0; i < vertexCount; i++) {
      const vertexZ = positionAttr.getZ(i);

      // Normalize vertex Z position to [0, 1]
      const normalizedZ = (vertexZ - geomMinZ) / safeGeomRangeZ;

      // Find corresponding FEA node by normalized position
      const nodeIndex = Math.min(Math.floor(normalizedZ * numNodes), numNodes - 1);
      const node = nodes[Math.max(0, nodeIndex)];

      const val = getNodeScalar(node, mode, allowableStress);
      const t = (val - minVal) / safeRange;

      const color = lerpLUT(t);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
  }

  colorAttr.needsUpdate = true;
  return true;
}

/**
 * Get color range info for legend display
 */
export function getFeaColorRange(
  feaResult: FEAResult | null,
  mode: FeaColorMode,
  allowableStress?: number
): { min: number; max: number; unit: string } | null {
  if (!feaResult || mode === "formula") return null;

  const nodes = feaResult.nodes;
  let minVal = Infinity;
  let maxVal = -Infinity;

  for (const node of nodes) {
    const val = getNodeScalar(node, mode, allowableStress);
    if (val < minVal) minVal = val;
    if (val > maxVal) maxVal = val;
  }

  let unit = "";
  switch (mode) {
    case "fea_sigma":
      unit = "MPa";
      break;
    case "fea_disp":
      unit = "mm";
      break;
    case "fea_sf":
      unit = "";
      break;
  }

  return { min: minVal, max: maxVal, unit };
}
