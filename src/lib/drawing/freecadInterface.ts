/**
 * FreeCAD Interface
 * FreeCAD 接口模块
 * 
 * 提供与 FreeCAD 后端服务的通信接口
 * 支持 STEP/IGES 导出和 3D 预览
 */

import type { FreeCADExportRequest, FreeCADExportResponse } from "./types";
import type { SpringGeometry, MaterialInfo } from "@/lib/stores/springDesignStore";

// ============================================================================
// FreeCAD 服务配置
// ============================================================================

/** FreeCAD 服务端点 */
const FREECAD_API_ENDPOINT = process.env.NEXT_PUBLIC_FREECAD_API_URL || "/api/freecad";

/** FreeCAD 服务状态 */
export interface FreeCADServiceStatus {
  available: boolean;
  version?: string;
  capabilities?: string[];
  error?: string;
}

// ============================================================================
// FreeCAD Python 脚本模板
// ============================================================================

/**
 * 生成压缩弹簧的 FreeCAD Python 脚本
 */
export function generateCompressionSpringScript(params: {
  wireDiameter: number;
  meanDiameter: number;
  activeCoils: number;
  totalCoils: number;
  freeLength: number;
  pitch?: number;
}): string {
  const { wireDiameter: d, meanDiameter: Dm, activeCoils: Na, totalCoils: Nt, freeLength: L0 } = params;
  const pitch = params.pitch ?? L0 / Na;
  const radius = Dm / 2;
  
  return `
# FreeCAD Compression Spring Generator
# 压缩弹簧生成脚本

import FreeCAD
import Part
import math

# Parameters / 参数
d = ${d}        # Wire diameter / 线径 (mm)
Dm = ${Dm}      # Mean diameter / 中径 (mm)
Na = ${Na}      # Active coils / 有效圈数
Nt = ${Nt}      # Total coils / 总圈数
L0 = ${L0}      # Free length / 自由长度 (mm)
pitch = ${pitch}  # Pitch / 节距 (mm)

# Derived values / 派生值
radius = Dm / 2
wire_radius = d / 2

# Create helix / 创建螺旋线
helix = Part.makeHelix(pitch, L0, radius)

# Create wire profile / 创建线材截面
wire_profile = Part.makeCircle(wire_radius, FreeCAD.Vector(radius, 0, 0), FreeCAD.Vector(0, 1, 0))
wire_face = Part.Face(Part.Wire(wire_profile))

# Sweep to create spring body / 扫掠生成弹簧本体
spring = Part.Wire(helix).makePipeShell([wire_face], True, True)

# Create document and add shape / 创建文档并添加形状
doc = FreeCAD.newDocument("CompressionSpring")
obj = doc.addObject("Part::Feature", "Spring")
obj.Shape = spring

# Export to STEP / 导出 STEP
Part.export([obj], "/tmp/spring_output.step")

print("Spring generated successfully!")
print(f"Wire diameter: {d} mm")
print(f"Mean diameter: {Dm} mm")
print(f"Active coils: {Na}")
print(f"Free length: {L0} mm")
`;
}

/**
 * 生成拉伸弹簧的 FreeCAD Python 脚本
 */
export function generateExtensionSpringScript(params: {
  wireDiameter: number;
  outerDiameter: number;
  activeCoils: number;
  bodyLength: number;
  hookType: string;
}): string {
  const { wireDiameter: d, outerDiameter: OD, activeCoils: Na, bodyLength: Lb, hookType } = params;
  const Dm = OD - d;
  const radius = Dm / 2;
  
  return `
# FreeCAD Extension Spring Generator
# 拉伸弹簧生成脚本

import FreeCAD
import Part
import math

# Parameters / 参数
d = ${d}        # Wire diameter / 线径 (mm)
OD = ${OD}      # Outer diameter / 外径 (mm)
Na = ${Na}      # Active coils / 有效圈数
Lb = ${Lb}      # Body length / 本体长度 (mm)
hook_type = "${hookType}"  # Hook type / 钩部类型

# Derived values / 派生值
Dm = OD - d
radius = Dm / 2
wire_radius = d / 2
pitch = d  # Close-wound / 密绕

# Create helix for body / 创建本体螺旋线
helix = Part.makeHelix(pitch, Lb, radius)

# Create wire profile / 创建线材截面
wire_profile = Part.makeCircle(wire_radius, FreeCAD.Vector(radius, 0, 0), FreeCAD.Vector(0, 1, 0))
wire_face = Part.Face(Part.Wire(wire_profile))

# Sweep to create spring body / 扫掠生成弹簧本体
spring_body = Part.Wire(helix).makePipeShell([wire_face], True, True)

# Create hooks (simplified) / 创建钩部（简化）
hook_radius = radius
hook_arc = Part.makeCircle(hook_radius, FreeCAD.Vector(0, 0, 0), FreeCAD.Vector(1, 0, 0), 0, 180)
hook_profile = Part.makeCircle(wire_radius, FreeCAD.Vector(0, hook_radius, 0), FreeCAD.Vector(0, 0, 1))
hook_face = Part.Face(Part.Wire(hook_profile))

# Bottom hook
bottom_hook = Part.Wire(hook_arc).makePipeShell([hook_face], True, True)
bottom_hook.translate(FreeCAD.Vector(0, 0, -hook_radius))

# Top hook
top_hook = bottom_hook.copy()
top_hook.rotate(FreeCAD.Vector(0, 0, 0), FreeCAD.Vector(0, 0, 1), 180)
top_hook.translate(FreeCAD.Vector(0, 0, Lb + hook_radius))

# Combine all parts / 合并所有部件
spring = spring_body.fuse(bottom_hook).fuse(top_hook)

# Create document and add shape / 创建文档并添加形状
doc = FreeCAD.newDocument("ExtensionSpring")
obj = doc.addObject("Part::Feature", "Spring")
obj.Shape = spring

# Export to STEP / 导出 STEP
Part.export([obj], "/tmp/spring_output.step")

print("Extension spring generated successfully!")
`;
}

/**
 * 生成扭转弹簧的 FreeCAD Python 脚本
 */
export function generateTorsionSpringScript(params: {
  wireDiameter: number;
  meanDiameter: number;
  activeCoils: number;
  bodyLength: number;
  legLength1: number;
  legLength2: number;
  windingDirection: "left" | "right";
}): string {
  const { wireDiameter: d, meanDiameter: Dm, activeCoils: Na, bodyLength: Lb, legLength1: L1, legLength2: L2, windingDirection } = params;
  const radius = Dm / 2;
  const pitch = Lb / Na;
  
  return `
# FreeCAD Torsion Spring Generator
# 扭转弹簧生成脚本

import FreeCAD
import Part
import math

# Parameters / 参数
d = ${d}        # Wire diameter / 线径 (mm)
Dm = ${Dm}      # Mean diameter / 中径 (mm)
Na = ${Na}      # Active coils / 有效圈数
Lb = ${Lb}      # Body length / 本体长度 (mm)
L1 = ${L1}      # Leg length 1 / 腿长1 (mm)
L2 = ${L2}      # Leg length 2 / 腿长2 (mm)
winding = "${windingDirection}"  # Winding direction / 旋向

# Derived values / 派生值
radius = Dm / 2
wire_radius = d / 2
pitch = Lb / Na

# Create helix for body / 创建本体螺旋线
helix = Part.makeHelix(pitch, Lb, radius, 0, ${windingDirection === "left" ? "True" : "False"})

# Create wire profile / 创建线材截面
wire_profile = Part.makeCircle(wire_radius, FreeCAD.Vector(radius, 0, 0), FreeCAD.Vector(0, 1, 0))
wire_face = Part.Face(Part.Wire(wire_profile))

# Sweep to create spring body / 扫掠生成弹簧本体
spring_body = Part.Wire(helix).makePipeShell([wire_face], True, True)

# Create legs / 创建腿部
leg1_line = Part.makeLine(FreeCAD.Vector(radius, 0, 0), FreeCAD.Vector(radius + L1, 0, 0))
leg1_profile = Part.makeCircle(wire_radius, FreeCAD.Vector(radius, 0, 0), FreeCAD.Vector(1, 0, 0))
leg1_face = Part.Face(Part.Wire(leg1_profile))
leg1 = Part.Wire(leg1_line).makePipeShell([leg1_face], True, True)

leg2_line = Part.makeLine(FreeCAD.Vector(radius, 0, Lb), FreeCAD.Vector(radius + L2, 0, Lb))
leg2_profile = Part.makeCircle(wire_radius, FreeCAD.Vector(radius, 0, Lb), FreeCAD.Vector(1, 0, 0))
leg2_face = Part.Face(Part.Wire(leg2_profile))
leg2 = Part.Wire(leg2_line).makePipeShell([leg2_face], True, True)

# Combine all parts / 合并所有部件
spring = spring_body.fuse(leg1).fuse(leg2)

# Create document and add shape / 创建文档并添加形状
doc = FreeCAD.newDocument("TorsionSpring")
obj = doc.addObject("Part::Feature", "Spring")
obj.Shape = spring

# Export to STEP / 导出 STEP
Part.export([obj], "/tmp/spring_output.step")

print("Torsion spring generated successfully!")
`;
}

/**
 * 生成锥形弹簧的 FreeCAD Python 脚本
 */
export function generateConicalSpringScript(params: {
  wireDiameter: number;
  largeOuterDiameter: number;
  smallOuterDiameter: number;
  activeCoils: number;
  freeLength: number;
}): string {
  const { wireDiameter: d, largeOuterDiameter: D1, smallOuterDiameter: D2, activeCoils: Na, freeLength: L0 } = params;
  
  return `
# FreeCAD Conical Spring Generator
# 锥形弹簧生成脚本

import FreeCAD
import Part
import math

# Parameters / 参数
d = ${d}        # Wire diameter / 线径 (mm)
D1 = ${D1}      # Large outer diameter / 大端外径 (mm)
D2 = ${D2}      # Small outer diameter / 小端外径 (mm)
Na = ${Na}      # Active coils / 有效圈数
L0 = ${L0}      # Free length / 自由长度 (mm)

# Derived values / 派生值
R1 = (D1 - d) / 2  # Large mean radius
R2 = (D2 - d) / 2  # Small mean radius
wire_radius = d / 2
pitch = L0 / Na

# Create conical helix points / 创建锥形螺旋线点
points = []
segments = int(Na * 36)  # 36 points per coil
for i in range(segments + 1):
    t = i / segments
    angle = t * Na * 2 * math.pi
    z = t * L0
    r = R1 + (R2 - R1) * t
    x = r * math.cos(angle)
    y = r * math.sin(angle)
    points.append(FreeCAD.Vector(x, y, z))

# Create spline from points / 从点创建样条曲线
spline = Part.BSplineCurve()
spline.interpolate(points)

# Create wire profile / 创建线材截面
wire_profile = Part.makeCircle(wire_radius, points[0], FreeCAD.Vector(0, 0, 1))
wire_face = Part.Face(Part.Wire(wire_profile))

# Sweep to create spring / 扫掠生成弹簧
spring = Part.Wire([spline.toShape()]).makePipeShell([wire_face], True, True)

# Create document and add shape / 创建文档并添加形状
doc = FreeCAD.newDocument("ConicalSpring")
obj = doc.addObject("Part::Feature", "Spring")
obj.Shape = spring

# Export to STEP / 导出 STEP
Part.export([obj], "/tmp/spring_output.step")

print("Conical spring generated successfully!")
`;
}

// ============================================================================
// API 接口函数
// ============================================================================

/**
 * 检查 FreeCAD 服务状态
 */
export async function checkFreeCADStatus(): Promise<FreeCADServiceStatus> {
  try {
    const response = await fetch(`${FREECAD_API_ENDPOINT}/status`);
    if (!response.ok) {
      return { available: false, error: "Service unavailable" };
    }
    const data = await response.json();
    return {
      available: true,
      version: data.version,
      capabilities: data.capabilities,
    };
  } catch (error) {
    return { 
      available: false, 
      error: error instanceof Error ? error.message : "Connection failed" 
    };
  }
}

/**
 * 请求 FreeCAD 导出
 */
export async function requestFreeCADExport(
  request: FreeCADExportRequest
): Promise<FreeCADExportResponse> {
  try {
    const response = await fetch(`${FREECAD_API_ENDPOINT}/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const error = await response.json();
      return {
        status: "failed",
        error: {
          code: "EXPORT_FAILED",
          message: error.message || "Export failed",
        },
      };
    }
    
    return await response.json();
  } catch (error) {
    return {
      status: "failed",
      error: {
        code: "CONNECTION_ERROR",
        message: error instanceof Error ? error.message : "Connection failed",
      },
    };
  }
}

/**
 * 从设计数据构建 FreeCAD 导出请求
 */
export function buildFreeCADRequest(
  geometry: SpringGeometry,
  material: MaterialInfo,
  outputFormats: ("STEP" | "IGES" | "STL" | "OBJ" | "FCStd")[] = ["STEP"]
): FreeCADExportRequest {
  const design: FreeCADExportRequest["design"] = {
    springType: geometry.type,
    wireDiameter: geometry.wireDiameter,
    activeCoils: geometry.activeCoils,
  };
  
  switch (geometry.type) {
    case "compression":
      design.meanDiameter = geometry.meanDiameter;
      design.totalCoils = geometry.totalCoils;
      design.freeLength = geometry.freeLength;
      break;
    case "extension":
      design.outerDiameter = geometry.outerDiameter;
      design.hookType = geometry.hookType;
      break;
    case "torsion":
      design.meanDiameter = geometry.meanDiameter;
      design.legLength1 = geometry.legLength1;
      design.legLength2 = geometry.legLength2;
      design.windingDirection = geometry.windingDirection;
      break;
    case "conical":
      design.largeOuterDiameter = geometry.largeOuterDiameter;
      design.smallOuterDiameter = geometry.smallOuterDiameter;
      design.freeLength = geometry.freeLength;
      break;
  }
  
  return {
    design,
    outputFormats,
    generateDrawing: true,
  };
}

/**
 * 生成 FreeCAD Python 脚本
 */
export function generateFreeCADScript(geometry: SpringGeometry): string {
  switch (geometry.type) {
    case "compression":
      return generateCompressionSpringScript({
        wireDiameter: geometry.wireDiameter,
        meanDiameter: geometry.meanDiameter ?? (geometry as { outerDiameter?: number }).outerDiameter ?? 20 - geometry.wireDiameter,
        activeCoils: geometry.activeCoils,
        totalCoils: geometry.totalCoils ?? geometry.activeCoils + 2,
        freeLength: geometry.freeLength ?? 50,
      });
    case "extension":
      return generateExtensionSpringScript({
        wireDiameter: geometry.wireDiameter,
        outerDiameter: geometry.outerDiameter,
        activeCoils: geometry.activeCoils,
        bodyLength: geometry.bodyLength,
        hookType: geometry.hookType ?? "machine",
      });
    case "torsion":
      return generateTorsionSpringScript({
        wireDiameter: geometry.wireDiameter,
        meanDiameter: geometry.meanDiameter,
        activeCoils: geometry.activeCoils,
        bodyLength: geometry.bodyLength ?? geometry.activeCoils * geometry.wireDiameter,
        legLength1: geometry.legLength1,
        legLength2: geometry.legLength2,
        windingDirection: geometry.windingDirection ?? "right",
      });
    case "conical":
      return generateConicalSpringScript({
        wireDiameter: geometry.wireDiameter,
        largeOuterDiameter: geometry.largeOuterDiameter,
        smallOuterDiameter: geometry.smallOuterDiameter,
        activeCoils: geometry.activeCoils,
        freeLength: geometry.freeLength,
      });
  }
}
