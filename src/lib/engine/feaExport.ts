/**
 * Spring Analysis Engine - FEA Mesh Export Module
 * 弹簧分析引擎 - FEA 网格导出模块
 * 
 * Exports spring geometry for FEA analysis:
 * - STEP format
 * - IGES format
 * - Abaqus .inp mesh format
 * - ANSYS mesh format
 */

import type { SpringGeometry, CompressionSpringGeometry, ConicalSpringGeometry } from './types';
import type { CoilingProcessResult } from './coilingProcess';
import type { ShotPeeningResult } from './shotPeening';

/**
 * FEA export format
 */
export type FEAExportFormat = 'step' | 'iges' | 'abaqus' | 'ansys' | 'nastran';

/**
 * Residual stress field data for FEA
 */
export interface ResidualStressField {
  /** Coiling process residual stresses */
  coilingStress?: CoilingProcessResult;
  /** Shot peening residual stresses */
  shotPeeningStress?: ShotPeeningResult;
  /** Combined residual stress at each node (MPa) */
  nodalStress?: {
    nodeId: number;
    axial: number;
    hoop: number;
    radial: number;
    vonMises: number;
  }[];
}

/**
 * Mesh node
 */
export interface MeshNode {
  id: number;
  x: number;
  y: number;
  z: number;
}

/**
 * Mesh element
 */
export interface MeshElement {
  id: number;
  type: 'beam' | 'solid' | 'shell';
  nodes: number[];
}

/**
 * FEA mesh data
 */
export interface FEAMeshData {
  /** Mesh nodes */
  nodes: MeshNode[];
  /** Mesh elements */
  elements: MeshElement[];
  /** Total wire length (mm) */
  wireLength: number;
  /** Node count */
  nodeCount: number;
  /** Element count */
  elementCount: number;
  /** Mesh quality metrics */
  quality: {
    minElementLength: number;
    maxElementLength: number;
    avgElementLength: number;
    aspectRatio: number;
  };
}

/**
 * Export options
 */
export interface FEAExportOptions {
  /** Export format */
  format: FEAExportFormat;
  /** Element type */
  elementType: 'beam' | 'solid';
  /** Nodes per coil */
  nodesPerCoil: number;
  /** Include material properties */
  includeMaterial: boolean;
  /** Include boundary conditions */
  includeBoundaryConditions: boolean;
  /** Mesh refinement at ends */
  refineEnds: boolean;
  /** Wire diameter for solid mesh */
  wireDiameter?: number;
  /** Circumferential divisions for solid mesh */
  circumferentialDivisions?: number;
  /** Include residual stress field (Phase 6) */
  includeResidualStress?: boolean;
  /** Residual stress data */
  residualStressField?: ResidualStressField;
}

/**
 * Default export options
 */
export const DEFAULT_EXPORT_OPTIONS: FEAExportOptions = {
  format: 'abaqus',
  elementType: 'beam',
  nodesPerCoil: 36,
  includeMaterial: true,
  includeBoundaryConditions: true,
  refineEnds: true,
};

/**
 * Generate spring centerline points
 */
export function generateCenterlinePoints(
  geometry: SpringGeometry,
  nodesPerCoil: number = 36,
  refineEnds: boolean = true
): Array<{ x: number; y: number; z: number; theta: number }> {
  const points: Array<{ x: number; y: number; z: number; theta: number }> = [];
  
  if (geometry.type === 'compression') {
    const compGeom = geometry as CompressionSpringGeometry;
    const { wireDiameter, meanDiameter, activeCoils, freeLength } = compGeom;
    const totalCoils = compGeom.totalCoils ?? activeCoils + 2;
    const deadCoils = totalCoils - activeCoils;
    
    const R = meanDiameter / 2;
    const pitch = (freeLength - deadCoils * wireDiameter) / activeCoils;
    const deadPitch = wireDiameter;
    
    // Calculate total points
    const totalPoints = Math.ceil(totalCoils * nodesPerCoil);
    const refineFactor = refineEnds ? 2 : 1;
    
    for (let i = 0; i <= totalPoints; i++) {
      const t = i / totalPoints;
      const theta = t * 2 * Math.PI * totalCoils;
      const coilNum = theta / (2 * Math.PI);
      
      // Determine if in dead or active region
      const deadBottom = deadCoils / 2;
      const deadTop = totalCoils - deadCoils / 2;
      
      let z: number;
      if (coilNum < deadBottom) {
        z = coilNum * deadPitch;
      } else if (coilNum > deadTop) {
        z = deadBottom * deadPitch + activeCoils * pitch + (coilNum - deadTop) * deadPitch;
      } else {
        z = deadBottom * deadPitch + (coilNum - deadBottom) * pitch;
      }
      
      const x = R * Math.cos(theta);
      const y = R * Math.sin(theta);
      
      points.push({ x, y, z, theta });
    }
  } else if (geometry.type === 'conical') {
    const conicalGeom = geometry as ConicalSpringGeometry;
    const { wireDiameter, largeOuterDiameter, smallOuterDiameter, activeCoils, freeLength } = conicalGeom;
    const totalCoils = conicalGeom.totalCoils ?? activeCoils + 2;
    
    const R_large = (largeOuterDiameter - wireDiameter) / 2;
    const R_small = (smallOuterDiameter - wireDiameter) / 2;
    
    const totalPoints = Math.ceil(totalCoils * nodesPerCoil);
    
    for (let i = 0; i <= totalPoints; i++) {
      const t = i / totalPoints;
      const theta = t * 2 * Math.PI * totalCoils;
      
      // Linearly varying radius
      const R = R_large - (R_large - R_small) * t;
      const z = freeLength * t;
      
      const x = R * Math.cos(theta);
      const y = R * Math.sin(theta);
      
      points.push({ x, y, z, theta });
    }
  }
  
  return points;
}

/**
 * Generate FEA mesh from geometry
 */
export function generateFEAMesh(
  geometry: SpringGeometry,
  options: Partial<FEAExportOptions> = {}
): FEAMeshData {
  const opts = { ...DEFAULT_EXPORT_OPTIONS, ...options };
  
  // Generate centerline points
  const centerlinePoints = generateCenterlinePoints(geometry, opts.nodesPerCoil, opts.refineEnds);
  
  // Create nodes
  const nodes: MeshNode[] = centerlinePoints.map((pt, i) => ({
    id: i + 1,
    x: pt.x,
    y: pt.y,
    z: pt.z,
  }));
  
  // Create elements
  const elements: MeshElement[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    elements.push({
      id: i + 1,
      type: opts.elementType,
      nodes: [nodes[i].id, nodes[i + 1].id],
    });
  }
  
  // Calculate wire length
  let wireLength = 0;
  for (let i = 0; i < nodes.length - 1; i++) {
    const dx = nodes[i + 1].x - nodes[i].x;
    const dy = nodes[i + 1].y - nodes[i].y;
    const dz = nodes[i + 1].z - nodes[i].z;
    wireLength += Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  
  // Calculate mesh quality
  const elementLengths: number[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const dx = nodes[i + 1].x - nodes[i].x;
    const dy = nodes[i + 1].y - nodes[i].y;
    const dz = nodes[i + 1].z - nodes[i].z;
    elementLengths.push(Math.sqrt(dx * dx + dy * dy + dz * dz));
  }
  
  const minElementLength = Math.min(...elementLengths);
  const maxElementLength = Math.max(...elementLengths);
  const avgElementLength = elementLengths.reduce((a, b) => a + b, 0) / elementLengths.length;
  const aspectRatio = maxElementLength / minElementLength;
  
  return {
    nodes,
    elements,
    wireLength,
    nodeCount: nodes.length,
    elementCount: elements.length,
    quality: {
      minElementLength,
      maxElementLength,
      avgElementLength,
      aspectRatio,
    },
  };
}

/**
 * Export to Abaqus .inp format
 */
export function exportToAbaqus(
  mesh: FEAMeshData,
  geometry: SpringGeometry,
  options: Partial<FEAExportOptions> = {}
): string {
  const opts = { ...DEFAULT_EXPORT_OPTIONS, ...options };
  
  let inp = `*HEADING
Spring FEA Model - Generated by ISRI-SHUANGDI Platform
Spring Type: ${geometry.type}
Wire Diameter: ${geometry.wireDiameter} mm
Active Coils: ${geometry.activeCoils}
**
`;

  // Nodes
  inp += `*NODE\n`;
  for (const node of mesh.nodes) {
    inp += `${node.id}, ${node.x.toFixed(6)}, ${node.y.toFixed(6)}, ${node.z.toFixed(6)}\n`;
  }
  
  // Elements
  if (opts.elementType === 'beam') {
    inp += `*ELEMENT, TYPE=B31, ELSET=SPRING_COIL\n`;
  } else {
    inp += `*ELEMENT, TYPE=C3D8, ELSET=SPRING_COIL\n`;
  }
  
  for (const elem of mesh.elements) {
    inp += `${elem.id}, ${elem.nodes.join(', ')}\n`;
  }
  
  // Material
  if (opts.includeMaterial) {
    inp += `**
*MATERIAL, NAME=SPRING_STEEL
*ELASTIC
207000.0, 0.3
*DENSITY
7.85E-09
**
*BEAM SECTION, ELSET=SPRING_COIL, MATERIAL=SPRING_STEEL, SECTION=CIRC
${geometry.wireDiameter / 2}
**
`;
  }
  
  // Boundary conditions
  if (opts.includeBoundaryConditions) {
    inp += `**
*BOUNDARY
1, 1, 6
${mesh.nodes.length}, 3, 3
**
`;
  }

  // Residual stress field (Phase 6)
  if (opts.includeResidualStress && opts.residualStressField) {
    const rsf = opts.residualStressField;
    
    inp += `** ============================================
** RESIDUAL STRESS FIELD (Phase 6 Manufacturing)
** ============================================
`;
    
    // Coiling residual stress
    if (rsf.coilingStress) {
      inp += `** Coiling Process Residual Stresses:
** - Bending Stress: ${rsf.coilingStress.residualBendingStress.toFixed(1)} MPa
** - Torsional Stress: ${rsf.coilingStress.residualTorsionalStress.toFixed(1)} MPa
** - Springback Angle: ${rsf.coilingStress.springbackAngle.toFixed(2)} deg
**
`;
    }
    
    // Shot peening residual stress
    if (rsf.shotPeeningStress) {
      inp += `** Shot Peening Residual Stresses:
** - Surface Compressive: ${rsf.shotPeeningStress.surfaceStress.toFixed(0)} MPa
** - Effective Depth: ${rsf.shotPeeningStress.effectiveDepth.toFixed(3)} mm
** - Endurance Enhancement: ${rsf.shotPeeningStress.enduranceEnhancementFactor.toFixed(2)}x
**
`;
      
      // Add shot peening stress profile as initial stress
      inp += `*INITIAL CONDITIONS, TYPE=STRESS
** Element, S11, S22, S33, S12, S13, S23
`;
      // Apply surface compressive stress to all elements
      const surfaceStress = rsf.shotPeeningStress.surfaceStress;
      for (const elem of mesh.elements) {
        // Simplified: apply uniform compressive stress in hoop direction
        inp += `${elem.id}, ${(-surfaceStress * 0.3).toFixed(1)}, ${(-surfaceStress).toFixed(1)}, 0.0, 0.0, 0.0, 0.0\n`;
      }
      inp += `**\n`;
    }
    
    // Nodal residual stress field
    if (rsf.nodalStress && rsf.nodalStress.length > 0) {
      inp += `** Nodal Residual Stress Field (von Mises):
*NSET, NSET=RESIDUAL_STRESS_NODES
`;
      const nodeIds = rsf.nodalStress.map(ns => ns.nodeId);
      for (let i = 0; i < nodeIds.length; i += 10) {
        inp += nodeIds.slice(i, i + 10).join(', ') + '\n';
      }
      inp += `**
** Node stress values stored as user-defined field
*INITIAL CONDITIONS, TYPE=FIELD, VARIABLE=1
`;
      for (const ns of rsf.nodalStress) {
        inp += `${ns.nodeId}, ${ns.vonMises.toFixed(1)}\n`;
      }
      inp += `**\n`;
    }
  }
  
  // Step
  inp += `*STEP, NAME=LOAD
*STATIC
1.0, 1.0
*CLOAD
${mesh.nodes.length}, 3, -100.0
*OUTPUT, FIELD
*NODE OUTPUT
U, RF
*ELEMENT OUTPUT
S, E
*END STEP
`;

  return inp;
}

/**
 * Export to ANSYS format
 */
export function exportToANSYS(
  mesh: FEAMeshData,
  geometry: SpringGeometry
): string {
  let ansys = `/PREP7
! Spring FEA Model - Generated by ISRI-SHUANGDI Platform
! Spring Type: ${geometry.type}
! Wire Diameter: ${geometry.wireDiameter} mm

! Material Properties
MP,EX,1,207000
MP,PRXY,1,0.3
MP,DENS,1,7.85E-9

! Element Type
ET,1,BEAM188
SECTYPE,1,BEAM,CSOLID
SECDATA,${geometry.wireDiameter / 2}

! Nodes
`;

  for (const node of mesh.nodes) {
    ansys += `N,${node.id},${node.x.toFixed(6)},${node.y.toFixed(6)},${node.z.toFixed(6)}\n`;
  }
  
  ansys += `\n! Elements\n`;
  for (const elem of mesh.elements) {
    ansys += `E,${elem.nodes.join(',')}\n`;
  }
  
  ansys += `
! Boundary Conditions
D,1,ALL
D,${mesh.nodes.length},UX,0
D,${mesh.nodes.length},UY,0

! Load
F,${mesh.nodes.length},FZ,-100

FINISH
/SOLU
SOLVE
FINISH
`;

  return ansys;
}

/**
 * Export to NASTRAN format
 */
export function exportToNASTRAN(
  mesh: FEAMeshData,
  geometry: SpringGeometry
): string {
  let nastran = `$ Spring FEA Model - Generated by ISRI-SHUANGDI Platform
$ Spring Type: ${geometry.type}
$ Wire Diameter: ${geometry.wireDiameter} mm
BEGIN BULK
`;

  // Grid points (nodes)
  for (const node of mesh.nodes) {
    nastran += `GRID    ${node.id.toString().padStart(8)}        ${node.x.toFixed(4).padStart(8)}${node.y.toFixed(4).padStart(8)}${node.z.toFixed(4).padStart(8)}\n`;
  }
  
  // CBAR elements
  for (const elem of mesh.elements) {
    nastran += `CBAR    ${elem.id.toString().padStart(8)}       1${elem.nodes[0].toString().padStart(8)}${elem.nodes[1].toString().padStart(8)}0.0     1.0     0.0\n`;
  }
  
  // Material
  nastran += `MAT1           1  207000.             0.3   7.85-9\n`;
  
  // Property
  const area = Math.PI * Math.pow(geometry.wireDiameter / 2, 2);
  const I = Math.PI * Math.pow(geometry.wireDiameter / 2, 4) / 4;
  nastran += `PBAR           1       1${area.toFixed(4).padStart(8)}${I.toFixed(4).padStart(8)}${I.toFixed(4).padStart(8)}${(2 * I).toFixed(4).padStart(8)}\n`;
  
  nastran += `ENDDATA\n`;
  
  return nastran;
}

/**
 * Export to STEP format (simplified representation)
 */
export function exportToSTEP(
  mesh: FEAMeshData,
  geometry: SpringGeometry
): string {
  // STEP format is complex - this generates a simplified version
  // In production, use a proper CAD kernel like OpenCascade
  
  let step = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('Spring Geometry'),'2;1');
FILE_NAME('spring.step','${new Date().toISOString()}',('ISRI-SHUANGDI'),(''),'',' ','');
FILE_SCHEMA(('AUTOMOTIVE_DESIGN'));
ENDSEC;
DATA;
`;

  // Add points as cartesian points
  let entityId = 1;
  const pointIds: number[] = [];
  
  for (const node of mesh.nodes) {
    step += `#${entityId}=CARTESIAN_POINT('',( ${node.x.toFixed(6)}, ${node.y.toFixed(6)}, ${node.z.toFixed(6)} ));\n`;
    pointIds.push(entityId);
    entityId++;
  }
  
  // Create polyline
  step += `#${entityId}=POLYLINE('Spring_Centerline',(${pointIds.map(id => `#${id}`).join(',')}));\n`;
  
  step += `ENDSEC;
END-ISO-10303-21;
`;

  return step;
}

/**
 * Export to IGES format (simplified)
 */
export function exportToIGES(
  mesh: FEAMeshData,
  geometry: SpringGeometry
): string {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}.${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
  
  let iges = `                                                                        S      1
1H,,1H;,7Hspring;,12Hspring.iges,44HISRI-SHUANGDI Spring Engineering Platform,G      1
32,38,6,308,15,,1.,1,2HMM,1,0.001,${dateStr},0.0001,1000.,                    G      2
5Hguest,11HISRI-SHUANGDI,11,0,${dateStr};                                    G      3
`;

  // Directory entries and parameter data would go here
  // This is a simplified version
  
  iges += `S      1G      3D      0P      0                                        T      1\n`;
  
  return iges;
}

/**
 * Export mesh to specified format
 */
export function exportFEAMesh(
  geometry: SpringGeometry,
  format: FEAExportFormat,
  options: Partial<FEAExportOptions> = {}
): {
  content: string;
  filename: string;
  mimeType: string;
  mesh: FEAMeshData;
} {
  const mesh = generateFEAMesh(geometry, options);
  
  let content: string;
  let filename: string;
  let mimeType: string;
  
  switch (format) {
    case 'abaqus':
      content = exportToAbaqus(mesh, geometry, options);
      filename = 'spring_model.inp';
      mimeType = 'text/plain';
      break;
    case 'ansys':
      content = exportToANSYS(mesh, geometry);
      filename = 'spring_model.ans';
      mimeType = 'text/plain';
      break;
    case 'nastran':
      content = exportToNASTRAN(mesh, geometry);
      filename = 'spring_model.bdf';
      mimeType = 'text/plain';
      break;
    case 'step':
      content = exportToSTEP(mesh, geometry);
      filename = 'spring_model.step';
      mimeType = 'application/step';
      break;
    case 'iges':
      content = exportToIGES(mesh, geometry);
      filename = 'spring_model.igs';
      mimeType = 'application/iges';
      break;
    default:
      throw new Error(`Unknown export format: ${format}`);
  }
  
  return { content, filename, mimeType, mesh };
}

/**
 * Download FEA mesh file
 */
export function downloadFEAMesh(
  geometry: SpringGeometry,
  format: FEAExportFormat,
  options: Partial<FEAExportOptions> = {}
): void {
  const { content, filename, mimeType } = exportFEAMesh(geometry, format, options);
  
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate residual stress field from manufacturing data (Phase 6)
 */
export function generateResidualStressField(
  mesh: FEAMeshData,
  coilingResult?: CoilingProcessResult,
  shotPeeningResult?: ShotPeeningResult
): ResidualStressField {
  const nodalStress: ResidualStressField['nodalStress'] = [];
  
  for (const node of mesh.nodes) {
    let axial = 0;
    let hoop = 0;
    let radial = 0;
    
    // Add coiling residual stress (varies through wire cross-section)
    if (coilingResult) {
      // Simplified: apply average residual stress
      // In reality, this varies with position in wire cross-section
      axial += coilingResult.residualBendingStress * 0.5;
      hoop += coilingResult.residualTorsionalStress * 0.3;
    }
    
    // Add shot peening residual stress (surface compressive)
    if (shotPeeningResult) {
      // Surface compressive stress (negative = compressive)
      hoop -= shotPeeningResult.surfaceStress;
      axial -= shotPeeningResult.surfaceStress * 0.3;
    }
    
    // Calculate von Mises equivalent stress
    const vonMises = Math.sqrt(
      0.5 * (
        Math.pow(axial - hoop, 2) +
        Math.pow(hoop - radial, 2) +
        Math.pow(radial - axial, 2)
      )
    );
    
    nodalStress.push({
      nodeId: node.id,
      axial,
      hoop,
      radial,
      vonMises,
    });
  }
  
  return {
    coilingStress: coilingResult,
    shotPeeningStress: shotPeeningResult,
    nodalStress,
  };
}

/**
 * Export FEA mesh with residual stress field (Phase 6 enhanced)
 */
export function exportFEAMeshWithResidualStress(
  geometry: SpringGeometry,
  format: FEAExportFormat,
  coilingResult?: CoilingProcessResult,
  shotPeeningResult?: ShotPeeningResult,
  options: Partial<FEAExportOptions> = {}
): {
  content: string;
  filename: string;
  mimeType: string;
  mesh: FEAMeshData;
  residualStressField: ResidualStressField;
} {
  const mesh = generateFEAMesh(geometry, options);
  
  // Generate residual stress field
  const residualStressField = generateResidualStressField(
    mesh,
    coilingResult,
    shotPeeningResult
  );
  
  // Add residual stress to options
  const enhancedOptions: Partial<FEAExportOptions> = {
    ...options,
    includeResidualStress: true,
    residualStressField,
  };
  
  const { content, filename, mimeType } = exportFEAMesh(geometry, format, enhancedOptions);
  
  return { content, filename, mimeType, mesh, residualStressField };
}
