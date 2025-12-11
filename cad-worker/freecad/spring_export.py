#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Spring Export for FreeCAD
弹簧 CAD 导出脚本

用法 (Windows):
    "C:\Program Files\FreeCAD 0.21\bin\FreeCADCmd.exe" spring_export.py design.json [output_dir]

用法 (macOS/Linux):
    freecadcmd spring_export.py design.json [output_dir]

支持的弹簧类型:
    - compression: 压缩弹簧
    - extension: 拉伸弹簧 (带钩)
    - torsion: 扭转弹簧 (带腿)
    - conical: 锥形弹簧

输出格式:
    - STEP (.step)
    - IGES (.iges)
    - STL (.stl)
    - OBJ (.obj)
    - glTF (.glb) - 用于 Web 预览
    - FreeCAD (.FCStd)

Windows 安装:
    1. 下载: https://github.com/FreeCAD/FreeCAD/releases/download/0.21.2/FreeCAD-0.21.2-WIN-x64-installer-1.exe
    2. 安装到默认路径: C:\Program Files\FreeCAD 0.21
    3. 设置环境变量 FREECAD_CMD (可选)
"""

import FreeCAD as App
import Part
import math
import json
import sys
import os

# =============================================================================
# 工具函数
# =============================================================================

def helix_point_and_tangent(t, R, L, turns, left_handed=False):
    """
    计算螺旋线上的点和切线
    
    参数:
        t: 参数 [0, 1]
        R: 半径 (mm)
        L: 高度 (mm)
        turns: 圈数
        left_handed: 是否左旋
    
    返回:
        (位置向量, 单位切线向量)
    """
    sign = -1 if left_handed else 1
    theta = 2.0 * math.pi * turns * t * sign
    x = R * math.cos(theta)
    y = R * math.sin(theta)
    z = L * t

    # 导数
    dtheta_dt = 2.0 * math.pi * turns * sign
    dx = -R * dtheta_dt * math.sin(theta)
    dy = R * dtheta_dt * math.cos(theta)
    dz = L

    tan = App.Vector(dx, dy, dz)
    tan.normalize()
    return App.Vector(x, y, z), tan


def cubic_bezier(p0, p1, p2, p3, t):
    """三次贝塞尔曲线"""
    omt = 1.0 - t
    return (p0 * (omt * omt * omt) +
            p1 * (3 * omt * omt * t) +
            p2 * (3 * omt * t * t) +
            p3 * (t * t * t))


def clamp_radius_min(p, min_r):
    """防止凹进：如果半径 < min_r，就投影到 min_r"""
    r_vec = App.Vector(p.x, p.y, 0)
    r_len = r_vec.Length
    if r_len < 1e-8:
        return p
    if r_len < min_r:
        r_vec.normalize()
        return App.Vector(r_vec.x * min_r, r_vec.y * min_r, p.z)
    return p


def make_bspline_from_points(points):
    """从点列表创建 B-Spline 曲线"""
    bs = Part.BSplineCurve()
    bs.approximate(points)
    return bs.toShape()


def sweep_circle_along_path(path_wire, wire_diameter):
    """沿路径扫掠圆截面"""
    # 获取路径起点和切线
    start_point = path_wire.Vertexes[0].Point
    
    # 创建圆截面
    circle = Part.makeCircle(
        wire_diameter / 2.0,
        start_point,
        App.Vector(0, 0, 1)
    )
    
    # 扫掠
    try:
        solid = Part.Wire(path_wire).makePipeShell([Part.Wire([circle])], True, True)
        return solid
    except Exception as e:
        print(f"Sweep failed: {e}, trying alternative method...")
        # 备用方法：使用 makePipe
        return path_wire.makePipe(Part.Wire([circle]))


# =============================================================================
# 压缩弹簧生成器
# =============================================================================

def make_compression_spring(params):
    """
    生成压缩弹簧
    
    参数:
        params: {
            wireDiameter: 线径 (mm)
            meanDiameter: 中径 (mm)
            activeCoils: 有效圈数
            totalCoils: 总圈数
            freeLength: 自由长度 (mm)
            pitch: 节距 (mm, 可选)
            leftHanded: 是否左旋 (可选)
            groundEnds: 端面磨平 (可选)
        }
    """
    d = params.get("wireDiameter", 3.2)
    Dm = params.get("meanDiameter", 24.0)
    Na = params.get("activeCoils", 8)
    Nt = params.get("totalCoils", Na + 2)
    L0 = params.get("freeLength", 50.0)
    left_handed = params.get("leftHanded", False)
    ground_ends = params.get("groundEnds", True)
    
    R = Dm / 2.0
    pitch = params.get("pitch", L0 / Na)
    
    # 采样点数
    samples = int(Nt * 36)  # 每圈 36 个点
    
    # 生成螺旋线点
    helix_pts = []
    for i in range(samples + 1):
        t = float(i) / samples
        pos, _ = helix_point_and_tangent(t, R, L0, Nt, left_handed)
        helix_pts.append(pos)
    
    # 创建 B-Spline 路径
    path = make_bspline_from_points(helix_pts)
    
    # 扫掠生成实体
    spring = sweep_circle_along_path(path, d)
    
    return spring


# =============================================================================
# 拉伸弹簧生成器 (带钩)
# =============================================================================

def make_extension_spring(params):
    """
    生成拉伸弹簧 (带钩)
    
    参数:
        params: {
            wireDiameter: 线径 (mm)
            outerDiameter: 外径 (mm)
            activeCoils: 有效圈数
            bodyLength: 本体长度 (mm)
            hookType: 钩类型 (machine, crossover, side, extended, doubleLoop)
            hookRadius: 钩环半径因子 (可选, 默认 0.9)
            hookAngle: 钩环角度 (可选, 默认 270°)
        }
    """
    d = params.get("wireDiameter", 2.0)
    OD = params.get("outerDiameter", 18.0)
    Na = params.get("activeCoils", 10)
    Lb = params.get("bodyLength", Na * d)
    hook_type = params.get("hookType", "machine")
    hook_radius_factor = params.get("hookRadius", 0.9)
    hook_angle = params.get("hookAngle", 270)
    
    Dm = OD - d
    R = Dm / 2.0
    
    # 密绕节距
    pitch = d
    
    # 采样参数
    samples_helix = int(Na * 36)
    samples_bezier = 40
    samples_arc = 80
    
    # 1) 螺旋体中心线
    helix_pts = []
    for i in range(samples_helix + 1):
        t = float(i) / samples_helix
        pos, _ = helix_point_and_tangent(t, R, Lb, Na)
        helix_pts.append(pos)
    
    # 末端位置与切线
    end_pos, end_tan = helix_point_and_tangent(1.0, R, Lb, Na)
    start_pos, start_tan = helix_point_and_tangent(0.0, R, Lb, Na)
    
    # 2) 顶部钩 (End Hook)
    hook_gap = d * 1.5
    hook_radius = R * hook_radius_factor
    
    # 径向方向
    radial_dir = App.Vector(end_pos.x, end_pos.y, 0)
    if radial_dir.Length < 1e-8:
        radial_dir = App.Vector(1, 0, 0)
    radial_dir.normalize()
    
    # 钩圆心
    hook_center = App.Vector(0, 0, end_pos.z + hook_gap)
    
    # 钩平面基底
    axis_dir = App.Vector(0, 0, 1)
    u = axis_dir
    v = radial_dir.cross(u)
    v.normalize()
    
    # 钩弧点
    arc_start_angle = -math.pi * 0.5
    arc_total_angle = math.radians(hook_angle)
    hook_arc_pts = []
    for i in range(samples_arc + 1):
        t = float(i) / samples_arc
        theta = arc_start_angle + arc_total_angle * t
        c = math.cos(theta)
        s = math.sin(theta)
        p = hook_center + u * (hook_radius * c) + v * (hook_radius * s)
        hook_arc_pts.append(p)
    
    hook_attach = hook_arc_pts[0]
    
    # Segment A: 沿切线拉出
    segA_len = d * 1.0
    segA_end = end_pos + end_tan * segA_len
    
    segA_pts = []
    for i in range(9):
        t = float(i) / 8.0
        p = end_pos + (segA_end - end_pos) * t
        p = clamp_radius_min(p, R)
        segA_pts.append(p)
    
    # Segment B: Bezier 过渡
    ctrl1 = segA_end + end_tan * (d * 0.7) + radial_dir * (d * 0.3) + axis_dir * (d * 0.3)
    ctrl2 = hook_attach + axis_dir * (-d * 0.4)
    
    segB_pts = []
    for i in range(samples_bezier + 1):
        t = float(i) / samples_bezier
        p = cubic_bezier(segA_end, ctrl1, ctrl2, hook_attach, t)
        p = clamp_radius_min(p, R)
        segB_pts.append(p)
    
    # 3) 底部钩 (Start Hook) - 镜像
    bottom_hook_center = App.Vector(0, 0, start_pos.z - hook_gap)
    
    bottom_radial = App.Vector(start_pos.x, start_pos.y, 0)
    if bottom_radial.Length < 1e-8:
        bottom_radial = App.Vector(1, 0, 0)
    bottom_radial.normalize()
    
    bottom_u = App.Vector(0, 0, -1)  # 向下
    bottom_v = bottom_radial.cross(bottom_u)
    bottom_v.normalize()
    
    bottom_arc_pts = []
    for i in range(samples_arc + 1):
        t = float(i) / samples_arc
        theta = arc_start_angle + arc_total_angle * t
        c = math.cos(theta)
        s = math.sin(theta)
        p = bottom_hook_center + bottom_u * (hook_radius * c) + bottom_v * (hook_radius * s)
        bottom_arc_pts.append(p)
    
    bottom_hook_attach = bottom_arc_pts[0]
    
    # 底部过渡
    bottom_segA_end = start_pos - start_tan * segA_len
    bottom_segA_pts = []
    for i in range(9):
        t = float(i) / 8.0
        p = start_pos + (bottom_segA_end - start_pos) * t
        p = clamp_radius_min(p, R)
        bottom_segA_pts.append(p)
    
    bottom_ctrl1 = bottom_segA_end - start_tan * (d * 0.7) + bottom_radial * (d * 0.3) - axis_dir * (d * 0.3)
    bottom_ctrl2 = bottom_hook_attach - axis_dir * (d * 0.4)
    
    bottom_segB_pts = []
    for i in range(samples_bezier + 1):
        t = float(i) / samples_bezier
        p = cubic_bezier(bottom_segA_end, bottom_ctrl1, bottom_ctrl2, bottom_hook_attach, t)
        p = clamp_radius_min(p, R)
        bottom_segB_pts.append(p)
    
    # 4) 合并中心线
    # 底部钩 (反向) + 螺旋体 + 顶部过渡 + 顶部钩
    bottom_arc_pts.reverse()
    bottom_segB_pts.reverse()
    bottom_segA_pts.reverse()
    
    centerline_pts = (
        bottom_arc_pts +
        bottom_segB_pts[1:] +
        bottom_segA_pts[1:] +
        helix_pts[1:] +
        segA_pts[1:] +
        segB_pts[1:] +
        hook_arc_pts[1:]
    )
    
    # 创建路径并扫掠
    path = make_bspline_from_points(centerline_pts)
    spring = sweep_circle_along_path(path, d)
    
    return spring


# =============================================================================
# 扭转弹簧生成器 (带腿)
# =============================================================================

def make_torsion_spring(params):
    """
    生成扭转弹簧 (带腿)
    
    参数:
        params: {
            wireDiameter: 线径 (mm)
            meanDiameter: 中径 (mm)
            activeCoils: 有效圈数
            bodyLength: 本体长度 (mm)
            legLength1: 腿长1 (mm)
            legLength2: 腿长2 (mm)
            freeAngle: 自由角度 (度)
            windingDirection: 旋向 (left/right)
        }
    """
    d = params.get("wireDiameter", 1.5)
    Dm = params.get("meanDiameter", 12.0)
    Na = params.get("activeCoils", 6)
    Lb = params.get("bodyLength", Na * d * 1.1)
    L1 = params.get("legLength1", 25.0)
    L2 = params.get("legLength2", 25.0)
    free_angle = params.get("freeAngle", 90.0)
    winding = params.get("windingDirection", "right")
    
    R = Dm / 2.0
    pitch = Lb / Na
    left_handed = (winding == "left")
    
    samples_helix = int(Na * 36)
    samples_leg = 20
    
    # 1) 螺旋体
    helix_pts = []
    for i in range(samples_helix + 1):
        t = float(i) / samples_helix
        pos, _ = helix_point_and_tangent(t, R, Lb, Na, left_handed)
        helix_pts.append(pos)
    
    start_pos, start_tan = helix_point_and_tangent(0.0, R, Lb, Na, left_handed)
    end_pos, end_tan = helix_point_and_tangent(1.0, R, Lb, Na, left_handed)
    
    # 2) 腿1 (起始端，径向向外)
    leg1_dir = App.Vector(start_pos.x, start_pos.y, 0)
    if leg1_dir.Length < 1e-8:
        leg1_dir = App.Vector(1, 0, 0)
    leg1_dir.normalize()
    
    leg1_pts = []
    for i in range(samples_leg + 1):
        t = float(i) / samples_leg
        p = start_pos + leg1_dir * (L1 * t)
        leg1_pts.append(p)
    
    # 3) 腿2 (末端，径向向外)
    leg2_dir = App.Vector(end_pos.x, end_pos.y, 0)
    if leg2_dir.Length < 1e-8:
        leg2_dir = App.Vector(1, 0, 0)
    leg2_dir.normalize()
    
    leg2_pts = []
    for i in range(samples_leg + 1):
        t = float(i) / samples_leg
        p = end_pos + leg2_dir * (L2 * t)
        leg2_pts.append(p)
    
    # 4) 合并中心线
    leg1_pts.reverse()
    centerline_pts = leg1_pts + helix_pts[1:] + leg2_pts[1:]
    
    # 创建路径并扫掠
    path = make_bspline_from_points(centerline_pts)
    spring = sweep_circle_along_path(path, d)
    
    return spring


# =============================================================================
# 锥形弹簧生成器 (改进版 - 支持死圈、端面磨平)
# =============================================================================

def generate_conical_centerline(params):
    """
    锥形压簧中心线（简化版）
    
    算法思路:
    - 锥形弹簧通常全部为有效圈，不需要死圈分段
    - 所有圈使用统一节距: pitch = L0 / totalCoils
    - 半径沿 z 线性插值 (大端 → 小端)
    - 这样可以避免死圈/有效圈交界处的节距跳变，使末圈连接更光滑
    """
    d = params.get("wireDiameter", 3.0)
    D_large_outer = params.get("largeOuterDiameter", 30.0)
    D_small_outer = params.get("smallOuterDiameter", 15.0)
    Na = params.get("activeCoils", 6)
    # 锥形弹簧: totalCoils 默认等于 activeCoils (无死圈)
    Nt = params.get("totalCoils", Na)
    L0 = params.get("freeLength", 50.0)
    left_handed = params.get("leftHanded", False)
    
    # 中径半径: 外径减掉一根线径
    R_large = (D_large_outer - d) / 2.0
    R_small = (D_small_outer - d) / 2.0
    
    # 统一节距 (无死圈分段)
    pitch = L0 / float(Nt) if Nt > 0 else d
    
    sign = -1 if left_handed else 1
    num_samples = max(400, int(Nt * 50))  # 每圈约 50 个点，足够光滑
    
    centerline_pts = []
    min_z = 0.0
    max_z = L0
    
    for i in range(num_samples + 1):
        t = i / float(num_samples)  # 0~1
        theta = 2.0 * math.pi * Nt * t * sign
        n = Nt * t  # 当前圈数 (0~Nt)
        z = n * pitch  # 统一节距，线性分布
        
        # 轴向进度 0~1，用于半径插值
        u = z / L0 if L0 > 1e-6 else 0.0
        # 中径半径线性插值: 底部大端 → 顶部小端
        R = R_large + (R_small - R_large) * u
        
        x = R * math.cos(theta)
        y = R * math.sin(theta)
        
        centerline_pts.append(App.Vector(x, y, z))
    
    return centerline_pts, min_z, max_z


def make_conical_spring(params):
    """
    生成锥形压缩弹簧实体 (改进版)
    
    特性:
    - 均匀螺旋 + 半径线性插值 (无死圈分段，末圈更光滑)
    - 支持端面磨平 (groundEnds, 默认启用)
    
    参数:
        params: {
            wireDiameter: 线径 (mm)
            largeOuterDiameter: 大端外径 (mm)
            smallOuterDiameter: 小端外径 (mm)
            activeCoils: 有效圈数 Na
            totalCoils: 总圈数 Nt (可选, 默认等于 Na)
            freeLength: 自由长度 L0 (mm)
            leftHanded: 是否左旋 (可选)
            groundEnds: 端面磨平 (可选, 默认 True)
        }
    """
    d = params.get("wireDiameter", 3.0)
    ground_ends = params.get("groundEnds", True)  # 默认启用端面磨平
    D_large_outer = params.get("largeOuterDiameter", 30.0)
    
    # 生成中心线
    centerline_pts, min_z, max_z = generate_conical_centerline(params)
    
    # B-Spline 路径
    path = make_bspline_from_points(centerline_pts)
    
    # 扫掠生成实体
    spring = sweep_circle_along_path(path, d)
    
    # 端面磨平 (可选)
    if ground_ends and spring is not None:
        grind_depth = 0.3 * d
        box_size = D_large_outer * 3
        box_height = d * 2
        
        bottom_box = Part.makeBox(
            box_size, box_size, box_height,
            App.Vector(-box_size/2, -box_size/2, min_z - box_height + grind_depth)
        )
        top_box = Part.makeBox(
            box_size, box_size, box_height,
            App.Vector(-box_size/2, -box_size/2, max_z - grind_depth)
        )
        
        try:
            spring = spring.cut(bottom_box)
            spring = spring.cut(top_box)
        except Exception as e:
            print(f"Warning: ground end cutting failed: {e}")
    
    return spring


# =============================================================================
# 主函数
# =============================================================================

def main():
    if len(sys.argv) < 2:
        print("Usage: freecadcmd spring_export.py design.json [output_dir]")
        print("")
        print("Example design.json:")
        print(json.dumps({
            "springType": "compression",
            "geometry": {
                "wireDiameter": 3.2,
                "meanDiameter": 24,
                "activeCoils": 8,
                "freeLength": 50
            },
            "export": {
                "formats": ["STEP", "STL"],
                "name": "MySpring"
            }
        }, indent=2))
        sys.exit(1)
    
    # 读取设计文件
    design_file = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else os.path.dirname(design_file) or "."
    
    with open(design_file, "r", encoding="utf-8") as f:
        design = json.load(f)
    
    spring_type = design.get("springType", "compression")
    geometry = design.get("geometry", {})
    export_config = design.get("export", {})
    
    export_formats = export_config.get("formats", ["STEP"])
    export_name = export_config.get("name", f"{spring_type}_spring")
    
    print(f"=== Spring Export ===")
    print(f"Type: {spring_type}")
    print(f"Geometry: {json.dumps(geometry, indent=2)}")
    print(f"Output: {output_dir}/{export_name}")
    print("")
    
    # 创建文档
    doc = App.newDocument("Spring")
    
    # 根据类型生成弹簧
    if spring_type == "compression":
        spring = make_compression_spring(geometry)
    elif spring_type == "extension":
        spring = make_extension_spring(geometry)
    elif spring_type == "torsion":
        spring = make_torsion_spring(geometry)
    elif spring_type == "conical":
        spring = make_conical_spring(geometry)
    else:
        print(f"Unknown spring type: {spring_type}")
        sys.exit(1)
    
    # 添加到文档
    spring_obj = doc.addObject("Part::Feature", "Spring")
    spring_obj.Shape = spring
    
    doc.recompute()
    
    # 导出
    output_files = []
    
    for fmt in export_formats:
        fmt_upper = fmt.upper()
        
        if fmt_upper == "STEP":
            filepath = os.path.join(output_dir, f"{export_name}.step")
            Part.export([spring_obj], filepath)
            output_files.append(filepath)
            print(f"Exported: {filepath}")
            
        elif fmt_upper == "IGES":
            filepath = os.path.join(output_dir, f"{export_name}.iges")
            Part.export([spring_obj], filepath)
            output_files.append(filepath)
            print(f"Exported: {filepath}")
            
        elif fmt_upper == "STL":
            filepath = os.path.join(output_dir, f"{export_name}.stl")
            spring_obj.Shape.exportStl(filepath)
            output_files.append(filepath)
            print(f"Exported: {filepath}")
            
        elif fmt_upper == "FCSTD":
            filepath = os.path.join(output_dir, f"{export_name}.FCStd")
            doc.saveAs(filepath)
            output_files.append(filepath)
            print(f"Exported: {filepath}")
            
        elif fmt_upper == "OBJ":
            filepath = os.path.join(output_dir, f"{export_name}.obj")
            # 导出为网格
            import Mesh
            mesh = doc.addObject("Mesh::Feature", "SpringMesh")
            mesh.Mesh = Mesh.Mesh(spring_obj.Shape.tessellate(0.1))
            Mesh.export([mesh], filepath)
            output_files.append(filepath)
            print(f"Exported: {filepath}")
            
        elif fmt_upper in ["GLTF", "GLB"]:
            # 先导出为 OBJ，然后转换为 glTF
            obj_filepath = os.path.join(output_dir, f"{export_name}_temp.obj")
            glb_filepath = os.path.join(output_dir, f"{export_name}.glb")
            
            import Mesh
            mesh = doc.addObject("Mesh::Feature", "SpringMesh")
            # 使用更精细的网格
            mesh.Mesh = Mesh.Mesh(spring_obj.Shape.tessellate(0.05))
            Mesh.export([mesh], obj_filepath)
            
            # 尝试使用 trimesh 转换（如果可用）
            try:
                import trimesh
                scene = trimesh.load(obj_filepath)
                scene.export(glb_filepath)
                output_files.append(glb_filepath)
                print(f"Exported: {glb_filepath}")
                # 清理临时文件
                os.remove(obj_filepath)
            except ImportError:
                # trimesh 不可用，直接输出 OBJ
                print("Warning: trimesh not available, exporting OBJ instead of glTF")
                final_obj = os.path.join(output_dir, f"{export_name}.obj")
                os.rename(obj_filepath, final_obj)
                output_files.append(final_obj)
                print(f"Exported: {final_obj}")
    
    print("")
    print("=== Export Complete ===")
    print(f"Files: {output_files}")
    
    # 输出结果 JSON（供后端解析）
    result = {
        "status": "success",
        "springType": spring_type,
        "files": [
            {"format": os.path.splitext(f)[1][1:].upper(), "path": f}
            for f in output_files
        ]
    }
    print("")
    print("RESULT_JSON:" + json.dumps(result))


if __name__ == "__main__":
    main()
