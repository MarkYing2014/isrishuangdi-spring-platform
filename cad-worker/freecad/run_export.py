#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FreeCAD Spring Export - 参数化弹簧建模
与 Three.js 前端使用相同的几何算法

用法:
    /Applications/FreeCAD.app/Contents/Resources/bin/python run_export.py design.json [output_dir]

算法说明 (与 Three.js compressionSpringGeometry.ts 同步):
    - 死圈 (dead coils): 两端各 deadCoilsPerEnd 圈，节距 = 线径
    - 有效圈 (active coils): 中间部分，节距可变
    - 端面磨平: 使用切割平面，磨削深度 = 0.3 * 线径
"""

import sys
import os

# 添加 FreeCAD 模块路径
if sys.platform == "darwin":
    freecad_paths = [
        "/Applications/FreeCAD.app/Contents/Resources/lib",
        "/Applications/FreeCAD.app/Contents/Resources/Mod",
        "/Applications/FreeCAD.app/Contents/Resources/Ext",
    ]
    for p in freecad_paths:
        if os.path.exists(p) and p not in sys.path:
            sys.path.insert(0, p)

try:
    import FreeCAD as App
    import Part
except ImportError as e:
    print(f"Error: Cannot import FreeCAD modules: {e}")
    sys.exit(1)

import math
import json

# 导入 HookBuilder (可选，用于拉簧)
try:
    from hook_builder import get_hook_spec, get_helix_end_info, build_hook_centerline, build_hook_solid
    HOOK_BUILDER_AVAILABLE = True
except ImportError:
    HOOK_BUILDER_AVAILABLE = False

# =============================================================================
# 参数化中心线生成器 (与 Three.js 同步)
# =============================================================================

def generate_compression_centerline(params):
    """
    生成压缩弹簧参数化中心线
    算法与 Three.js compressionSpringGeometry.ts 完全一致
    
    返回: [(x, y, z), ...] 点列表, min_z, max_z
    """
    total_coils = params.get("totalCoils", 10)
    active_coils = params.get("activeCoils", 8)
    mean_diameter = params.get("meanDiameter", 24.0)
    wire_diameter = params.get("wireDiameter", 3.2)
    free_length = params.get("freeLength", 50.0)
    current_deflection = params.get("currentDeflection", 0.0)
    
    # 死圈计算
    dead_coils = total_coils - active_coils
    dead_coils_per_end = dead_coils / 2.0
    
    # 尺寸
    R = mean_diameter / 2.0
    d = wire_diameter
    L0 = free_length
    delta_x = current_deflection
    
    # 节距计算
    pitch_dead = d  # 死圈节距 ≈ 线径
    dead_height = dead_coils * pitch_dead
    Hb = L0 - dead_height  # 有效区域高度 (自由状态)
    
    # 压缩后有效高度
    Hb_compressed = max(Hb - delta_x, active_coils * pitch_dead)
    pitch_active_compressed = Hb_compressed / active_coils if active_coils > 0 else d
    
    # 采样参数
    num_samples = 800
    total_angle = 2.0 * math.pi * total_coils
    
    points = []
    min_z = float('inf')
    max_z = float('-inf')
    
    for i in range(num_samples + 1):
        t = i / num_samples
        theta = t * total_angle
        n = theta / (2.0 * math.pi)  # 当前圈数
        
        # 根据所在区段计算 Z
        if n <= dead_coils_per_end:
            # Case A: 底部死圈
            z = pitch_dead * n
        elif n >= total_coils - dead_coils_per_end:
            # Case C: 顶部死圈
            n_dead_top = n - (total_coils - dead_coils_per_end)
            bottom_dead_height = dead_coils_per_end * pitch_dead
            z = bottom_dead_height + Hb_compressed + n_dead_top * pitch_dead
        else:
            # Case B: 有效圈 (可压缩)
            n_active = n - dead_coils_per_end
            bottom_dead_height = dead_coils_per_end * pitch_dead
            z = bottom_dead_height + pitch_active_compressed * n_active
        
        # X/Y 参数化
        x = R * math.cos(theta)
        y = R * math.sin(theta)
        
        points.append(App.Vector(x, y, z))
        min_z = min(min_z, z)
        max_z = max(max_z, z)
    
    return points, min_z, max_z


def make_bspline_from_points(points, max_degree=3):
    """
    从点列表创建 B-Spline 曲线
    
    对于大量点，使用分段逼近以提高稳定性
    """
    if len(points) < 2:
        raise ValueError("Need at least 2 points for B-Spline")
    
    # 如果点数较少，直接逼近
    if len(points) <= 100:
        bs = Part.BSplineCurve()
        bs.approximate(points, DegMax=max_degree, Tolerance=0.1)
        return bs.toShape()
    
    # 对于大量点，使用 interpolate 而不是 approximate
    # interpolate 更稳定，但会精确通过所有点
    try:
        bs = Part.BSplineCurve()
        bs.interpolate(points)
        shape = bs.toShape()
        print(f"B-Spline interpolate: {len(points)} points -> {len(shape.Edges)} edges")
        return shape
    except Exception as e:
        print(f"B-Spline interpolate failed: {e}, trying approximate with sampling")
    
    # 备用：对点进行采样后再逼近
    # 目标：最多 300 个点，高精度
    target_points = 300
    sample_rate = max(1, len(points) // target_points)
    sampled_points = [points[i] for i in range(0, len(points), sample_rate)]
    # 确保包含最后一个点
    if sampled_points[-1] != points[-1]:
        sampled_points.append(points[-1])
    
    print(f"Sampled {len(points)} points to {len(sampled_points)} points")
    
    bs = Part.BSplineCurve()
    bs.approximate(sampled_points, DegMax=max_degree, Tolerance=0.01)  # 高精度
    return bs.toShape()


def sweep_wire_along_path(path_shape, wire_diameter):
    """
    沿路径扫掠圆截面生成实体
    使用 Part.makeSweepSurface 或 Part.Wire.makePipe
    """
    if hasattr(path_shape, 'Edges'):
        edges = path_shape.Edges
    else:
        edges = [path_shape]
    
    path_wire = Part.Wire(edges)
    
    # 获取起点和切线
    start_point = path_wire.Vertexes[0].Point
    first_edge = path_wire.Edges[0]
    tangent = first_edge.tangentAt(first_edge.FirstParameter)
    
    # 创建圆截面
    radius = wire_diameter / 2.0
    circle = Part.makeCircle(radius, start_point, tangent)
    circle_wire = Part.Wire([circle])
    
    # 方法1: makePipe (最可靠)
    try:
        # makePipe 沿 spine 扫掠 profile
        pipe = path_wire.makePipe(circle_wire)
        print(f"makePipe result: ShapeType={pipe.ShapeType}, Volume={pipe.Volume:.2f}")
        # 如果是 Shell，转换为 Solid
        if pipe.ShapeType == "Shell":
            solid = Part.Solid(pipe)
            print(f"Converted to Solid: Volume={solid.Volume:.2f}")
            return solid
        return pipe
    except Exception as e:
        print(f"makePipe failed: {e}")
    
    # 方法2: makePipeShell
    try:
        solid = path_wire.makePipeShell([circle_wire], True, False)
        return solid
    except Exception as e:
        print(f"makePipeShell failed: {e}")
    
    # 方法3: 使用 BRepOffsetAPI
    try:
        from FreeCAD import Base
        sweeper = Part.BRepOffsetAPI.MakePipeShell(path_wire)
        sweeper.setFrenetMode(True)  # Frenet 模式
        sweeper.add(circle_wire)
        if sweeper.isReady():
            sweeper.build()
            shape = sweeper.shape()
            print(f"BRepOffsetAPI result: ShapeType={shape.ShapeType}, Volume={shape.Volume:.2f}")
            # 尝试生成实体
            try:
                sweeper.makeSolid()
                solid = sweeper.shape()
                print(f"BRepOffsetAPI solid: Volume={solid.Volume:.2f}")
                return solid
            except:
                return shape
    except Exception as e:
        print(f"BRepOffsetAPI failed: {e}")
    
    # 方法4: 使用 Part.makeTube 对整个 wire
    try:
        # 将 wire 转换为单个 edge (如果可能)
        tube = Part.makeTube(path_wire, radius)
        print(f"makeTube result: ShapeType={tube.ShapeType}, Volume={tube.Volume:.2f}")
        return tube
    except Exception as e:
        print(f"makeTube on wire failed: {e}")
    
    # 方法5: 最后备用 - 逐段扫掠并融合
    print("Warning: Using edge-by-edge sweep (may have gaps)")
    try:
        shapes = []
        for edge in path_wire.Edges:
            tube = Part.makeTube(edge, radius)
            shapes.append(tube)
        if shapes:
            result = shapes[0]
            print(f"Edge-by-edge: starting with {len(shapes)} segments")
            for i, s in enumerate(shapes[1:]):
                try:
                    result = result.fuse(s)
                except Exception as fe:
                    print(f"Fuse segment {i+1} failed: {fe}")
            print(f"Edge-by-edge result: ShapeType={result.ShapeType}, Volume={result.Volume:.2f}")
            return result
    except Exception as e:
        print(f"Edge-by-edge sweep failed: {e}")
    
    raise RuntimeError("All sweep methods failed")


# =============================================================================
# 压缩弹簧生成器 (与 Three.js 同步，带端面磨平)
# =============================================================================

def make_compression_spring_parametric(params):
    """
    使用与 Three.js compressionSpringGeometry.ts 完全相同的参数化算法
    
    关键点:
    - 死圈节距 = 线径 d (紧密)
    - 有效圈节距 = (L0 - deadHeight) / activeCoils (稀疏)
    - 端面磨平深度 = 0.3 * d
    """
    d = params.get("wireDiameter", 3.2)
    Dm = params.get("meanDiameter", 24.0)
    Na = params.get("activeCoils", 8)
    Nt = params.get("totalCoils", Na + 2)
    L0 = params.get("freeLength", 50.0)
    ground_ends = params.get("groundEnds", True)
    
    R = Dm / 2.0
    wire_radius = d / 2.0
    
    # === 与 Three.js 完全一致的参数计算 ===
    dead_coils = Nt - Na
    dead_coils_per_end = dead_coils / 2.0
    
    pitch_dead = d  # 死圈节距 = 线径 (紧密)
    dead_height = dead_coils * pitch_dead
    Hb = L0 - dead_height  # 有效区域高度
    pitch_active = Hb / Na if Na > 0 else d  # 有效圈节距
    
    print(f"Parameters: Nt={Nt}, Na={Na}, dead_coils_per_end={dead_coils_per_end}")
    print(f"Pitch: dead={pitch_dead:.2f}, active={pitch_active:.2f}")
    
    # === 使用参数化中心线生成点 (与 Three.js 一致) ===
    points, min_z, max_z = generate_compression_centerline({
        "totalCoils": Nt,
        "activeCoils": Na,
        "meanDiameter": Dm,
        "wireDiameter": d,
        "freeLength": L0,
        "currentDeflection": 0.0,
    })
    
    # 创建 B-Spline 路径
    path = make_bspline_from_points(points)
    path_wire = Part.Wire([path])
    
    # 获取起点和切线
    start_point = path_wire.Vertexes[0].Point
    first_edge = path_wire.Edges[0]
    tangent = first_edge.tangentAt(first_edge.FirstParameter)
    
    # 创建圆截面
    circle = Part.makeCircle(wire_radius, start_point, tangent)
    circle_wire = Part.Wire([circle])
    
    # 扫掠生成实体
    spring_solid = None
    
    # 方法1: makePipeShell
    try:
        spring_solid = path_wire.makePipeShell([circle_wire], True, True)
        print("makePipeShell succeeded")
    except Exception as e:
        print(f"makePipeShell failed: {e}")
    
    # 方法2: 逐边 makeTube
    if spring_solid is None:
        try:
            shapes = []
            for edge in path_wire.Edges:
                tube = Part.makeTube(edge, wire_radius)
                shapes.append(tube)
            if shapes:
                spring_solid = shapes[0]
                for s in shapes[1:]:
                    spring_solid = spring_solid.fuse(s)
                print("Edge-by-edge makeTube succeeded")
        except Exception as e:
            print(f"makeTube failed: {e}")
            raise RuntimeError("All sweep methods failed")
    
    # === 端面磨平 (与 Three.js createClipPlanes 一致) ===
    if ground_ends and spring_solid:
        grind_depth = 0.3 * d  # 与 Three.js 一致
        
        bottom_cut_z = min_z + grind_depth
        top_cut_z = max_z - grind_depth
        
        box_size = Dm * 3
        box_height = d * 2
        
        # 底部切割
        bottom_box = Part.makeBox(
            box_size, box_size, box_height,
            App.Vector(-box_size/2, -box_size/2, min_z - box_height + grind_depth)
        )
        
        # 顶部切割
        top_box = Part.makeBox(
            box_size, box_size, box_height,
            App.Vector(-box_size/2, -box_size/2, top_cut_z)
        )
        
        try:
            spring_solid = spring_solid.cut(bottom_box)
            spring_solid = spring_solid.cut(top_box)
            print(f"Ground ends: bottom={bottom_cut_z:.2f}, top={top_cut_z:.2f}")
        except Exception as e:
            print(f"Warning: Ground end cutting failed: {e}")
    
    return spring_solid


def make_compression_spring(params):
    """
    生成压缩弹簧 - 使用与 Three.js 同步的参数化算法
    """
    try:
        return make_compression_spring_parametric(params)
    except Exception as e:
        print(f"Parametric method failed: {e}, trying fallback...")
    
    # 备用：BSpline 方法
    d = params.get("wireDiameter", 3.2)
    Dm = params.get("meanDiameter", 24.0)
    Na = params.get("activeCoils", 8)
    Nt = params.get("totalCoils", Na + 2)
    L0 = params.get("freeLength", 50.0)
    ground_ends = params.get("groundEnds", True)
    
    centerline_params = {
        "totalCoils": Nt,
        "activeCoils": Na,
        "meanDiameter": Dm,
        "wireDiameter": d,
        "freeLength": L0,
        "currentDeflection": 0.0,
    }
    
    points, min_z, max_z = generate_compression_centerline(centerline_params)
    path = make_bspline_from_points(points)
    spring_solid = sweep_wire_along_path(path, d)
    
    if ground_ends:
        grind_depth = 0.3 * d
        bottom_cut_z = min_z + grind_depth
        top_cut_z = max_z - grind_depth
        
        box_size = Dm * 3
        box_height = d * 2
        
        bottom_box = Part.makeBox(
            box_size, box_size, box_height,
            App.Vector(-box_size/2, -box_size/2, min_z - box_height + grind_depth)
        )
        
        top_box = Part.makeBox(
            box_size, box_size, box_height,
            App.Vector(-box_size/2, -box_size/2, top_cut_z)
        )
        
        try:
            spring_solid = spring_solid.cut(bottom_box)
            spring_solid = spring_solid.cut(top_box)
            print(f"Ground ends applied: bottom={bottom_cut_z:.2f}, top={top_cut_z:.2f}")
        except Exception as e:
            print(f"Warning: Ground end cutting failed: {e}")
    
    return spring_solid


# =============================================================================
# 拉伸弹簧生成器 (与 Three.js extensionSpringGeometry.ts 同步)
# =============================================================================

def generate_helix_points(R, L, turns, num_samples, left_handed=False):
    """生成螺旋线点"""
    sign = -1 if left_handed else 1
    points = []
    for i in range(num_samples + 1):
        t = float(i) / num_samples
        theta = 2.0 * math.pi * turns * t * sign
        x = R * math.cos(theta)
        y = R * math.sin(theta)
        z = L * t
        points.append(App.Vector(x, y, z))
    return points


def cubic_bezier(p0, p1, p2, p3, t):
    """三次贝塞尔曲线插值"""
    omt = 1.0 - t
    return (p0 * (omt * omt * omt) + 
            p1 * (3 * omt * omt * t) + 
            p2 * (3 * omt * t * t) + 
            p3 * (t * t * t))


def clamp_radius(point, min_radius):
    """
    Radius clamp: 确保点不凹入线圈内部
    如果点的 XY 距离小于 min_radius，则投影到该半径上
    """
    r = math.sqrt(point.x**2 + point.y**2)
    if r < min_radius and r > 1e-8:
        scale = min_radius / r
        return App.Vector(point.x * scale, point.y * scale, point.z)
    return point


def generate_extension_body_centerline(params):
    """
    生成拉簧体中心线 - 紧密螺旋
    
    与 Three.js extensionSpringGeometry.ts 算法一致:
    - 自由状态节距 = 线径 (紧密贴合)
    - 拉伸时节距增加
    """
    d = params.get("wireDiameter", 2.0)
    OD = params.get("outerDiameter", 18.0)
    Na = params.get("activeCoils", 10)
    current_extension = params.get("currentExtension", 0.0)
    
    Dm = OD - d  # 中径
    R = Dm / 2.0
    
    # 自由状态体长 = Na × d (紧密贴合)
    solid_body_length = Na * d
    
    # 拉伸后体长
    extended_length = solid_body_length + current_extension
    
    # 采样参数 (减少点数以提高扫掠成功率)
    num_samples = max(200, int(Na * 30))
    total_angle = 2.0 * math.pi * Na
    
    points = []
    for i in range(num_samples + 1):
        t = i / num_samples
        theta = t * total_angle
        z = t * extended_length
        x = R * math.cos(theta)
        y = R * math.sin(theta)
        points.append(App.Vector(x, y, z))
    
    return points, 0.0, extended_length


def generate_hook_loop(hook_center, hook_radius, u, v, angle_deg, start_angle=-math.pi/2, num_points=20):
    """
    生成 Hook 环圆弧点
    
    参数:
    - hook_center: 环圆心 (在轴线上)
    - hook_radius: 环半径
    - u, v: 环平面的正交基向量
    - angle_deg: 环弧度数 (例如 270)
    - start_angle: 起始角度 (默认 -π/2)
    - num_points: 采样点数 (默认 20)
    """
    pts = []
    total_angle = math.radians(angle_deg)
    segments = num_points
    
    for i in range(segments + 1):
        t = i / segments
        theta = start_angle + total_angle * t
        p = (hook_center + 
             u * (hook_radius * math.cos(theta)) + 
             v * (hook_radius * math.sin(theta)))
        pts.append(p)
    
    return pts


def build_extension_hook_centerline(end_pos, prev_pos, params, is_start):
    """
    生成拉簧钩子中心线 - 与 Three.js HookBuilder.ts 完全同步
    
    Machine Hook 参数 (来自 HookBuilder.ts):
    - loopAngleDeg: 160 (不是 270!)
    - loopStartAngle: -π/2
    - hookRadiusFactor: 0.85
    - axialGapFactor: 1.2
    - handleLengthFactor: 2.0
    
    结构: 贝塞尔过渡段 + 钩环圆弧
    """
    d = params.get("wireDiameter", 2.0)
    OD = params.get("outerDiameter", 18.0)
    hook_type = params.get("hookType", "machine")
    
    Dm = OD - d
    R = Dm / 2.0  # meanRadius
    
    # === 与 HookBuilder.ts 同步的参数 ===
    hook_radius_factor = 0.85
    axial_gap_factor = 1.2
    handle_length_factor = 2.0
    loop_angle_deg = 160  # 关键: 不是 270!
    loop_start_angle = -math.pi / 2
    
    hook_radius = R * hook_radius_factor
    hook_gap = d * axial_gap_factor
    handle_length = d * handle_length_factor
    
    is_end = not is_start
    
    # 轴向方向
    spring_axis_dir = App.Vector(0, 0, 1 if is_end else -1)
    
    # 径向方向: 从轴线到端点的 XY 投影
    radial_dir = App.Vector(end_pos.x, end_pos.y, 0)
    if radial_dir.Length < 1e-8:
        radial_dir = App.Vector(1, 0, 0)
    else:
        radial_dir.normalize()
    
    # 螺旋线切线方向 (3D)
    helix_tangent = end_pos.sub(prev_pos)
    helix_tangent.normalize()
    
    # === Hook 环平面基向量 (axis-plane 类型) ===
    # u = 轴向 (拉力方向)
    # v = radial × axis (切向)
    u = App.Vector(spring_axis_dir.x, spring_axis_dir.y, spring_axis_dir.z)
    u.normalize()
    v = radial_dir.cross(spring_axis_dir)
    v.normalize()
    
    # === Hook 环圆心 (在轴线上) ===
    loop_center = App.Vector(0, 0, end_pos.z + (hook_gap if is_end else -hook_gap))
    
    # === 生成 Hook 环圆弧点 ===
    total_arc = math.radians(loop_angle_deg)
    loop_segments = 36  # 高精度
    hook_loop_pts = []
    
    for i in range(loop_segments + 1):
        t = i / loop_segments
        theta = loop_start_angle + total_arc * t
        cos_theta = math.cos(theta)
        sin_theta = math.sin(theta)
        
        p = loop_center + u * (hook_radius * cos_theta) + v * (hook_radius * sin_theta)
        hook_loop_pts.append(p)
    
    # === 贝塞尔过渡段 (C¹ 连续) ===
    attach_point = hook_loop_pts[0]
    
    # 螺旋线端点的切线方向
    if is_end:
        helix_tangent_dir = end_pos.sub(prev_pos)
    else:
        helix_tangent_dir = prev_pos.sub(end_pos)
        helix_tangent_dir = helix_tangent_dir * (-1)
    helix_tangent_dir.normalize()
    
    # 钩环起点的切线方向
    hook_tangent = u * (-math.sin(loop_start_angle)) + v * math.cos(loop_start_angle)
    hook_tangent.normalize()
    
    # 贝塞尔控制点
    control1 = end_pos + helix_tangent_dir * handle_length
    control2 = attach_point - hook_tangent * handle_length
    
    # 生成过渡段点
    transition_pts = []
    transition_segments = 24  # 高精度
    
    for i in range(1, transition_segments + 1):
        t = i / transition_segments
        p = cubic_bezier(end_pos, control1, control2, attach_point, t)
        transition_pts.append(p)
    
    # 确保最后一个点精确连接
    if transition_pts:
        transition_pts[-1] = attach_point
    
    # === 组合最终中心线 ===
    if is_end:
        # End Hook: 过渡段 + 钩环 (去掉第一个点避免重复)
        return transition_pts + hook_loop_pts[1:]
    else:
        # Start Hook: 反转顺序
        reversed_hook_pts = list(reversed(hook_loop_pts))
        reversed_transition_pts = list(reversed(transition_pts))
        # 钩环 (去掉最后一个点) + 过渡段
        return reversed_hook_pts[:-1] + reversed_transition_pts


def normalize_extension_params(geom: dict) -> dict:
    """
    参数归一化函数 - 确保 FreeCAD 和 Three.js 使用相同的参数
    
    解决问题:
    - activeCoils 可能为 0 或缺失
    - bodyLength 可能未定义
    - 前端可能传 meanDiameter 而不是 outerDiameter
    
    这个函数确保所有关键参数都有有效值
    """
    import json
    print(f"[normalize] Input params: {json.dumps(geom, indent=2)}")
    
    d = geom.get("wireDiameter", 2.0)
    
    # 1. 统一圈数：优先 activeCoils，否则 totalCoils
    Na = geom.get("activeCoils")
    Nt = geom.get("totalCoils")
    
    if Na is None or Na <= 0:
        if Nt is not None and Nt > 0:
            Na = Nt  # 拉簧密绕：有效圈 ≈ 总圈
        else:
            Na = 10  # 默认值
            print(f"[normalize] WARNING: activeCoils missing, using default {Na}")
    
    # 2. 统一外径：如果前端给的是 meanDiameter，转成 outerDiameter
    OD = geom.get("outerDiameter")
    if OD is None or OD <= 0:
        mean_d = geom.get("meanDiameter")
        if mean_d is not None and mean_d > 0:
            OD = mean_d + d
            print(f"[normalize] Converted meanDiameter {mean_d} to outerDiameter {OD}")
        else:
            OD = 18.0  # 默认值
            print(f"[normalize] WARNING: outerDiameter missing, using default {OD}")
    
    # 3. 统一本体长度：按 Three.js 的算法来算
    #    - 如果 design.json 已经有 bodyLength，用它
    #    - 否则按密绕：pitch ≈ d，bodyLength = Na * d
    body_len = geom.get("bodyLength")
    if body_len is None or body_len <= 0:
        # 尝试从 freeLengthInsideHooks 计算
        free_len = geom.get("freeLengthInsideHooks") or geom.get("freeLength")
        if free_len is not None and free_len > 0:
            # 假设钩子各占约 2*d 的长度
            hook_allowance = 4 * d
            body_len = max(free_len - hook_allowance, Na * d)
            print(f"[normalize] Calculated bodyLength from freeLength: {body_len}")
        else:
            # 密绕：pitch = d
            body_len = Na * d
            print(f"[normalize] Using close-wound bodyLength: {body_len}")
    
    result = {
        **geom,
        "wireDiameter": d,
        "activeCoils": Na,
        "bodyLength": body_len,
        "outerDiameter": OD,
    }
    
    print(f"[normalize] Output params: wireDiameter={d}, activeCoils={Na}, bodyLength={body_len}, outerDiameter={OD}")
    return result


def generate_extension_body_centerline(params):
    """
    生成拉簧本体中心线（紧密螺旋）
    
    与 Three.js extensionSpringGeometry.ts 完全对齐：
      - 自由状态本体长度 = activeCoils * wireDiameter（紧密缠绕，无节距）
      - 拉伸后长度 = solidBodyLength + currentExtension
      - 线圈总圈数 = activeCoils
    
    返回: (points, z_min, z_max)
    """
    d = params.get("wireDiameter", 2.0)
    OD = params.get("outerDiameter", 18.0)
    Na = params.get("activeCoils", 10)
    current_extension = params.get("currentExtension", 0.0)
    
    Dm = OD - d
    R = Dm / 2.0
    
    # === 与 Three.js 完全一致 ===
    # 拉簧在自由状态（Δx=0）时线圈紧密贴合
    # solidBodyLength = activeCoils × wireDiameter（线圈贴紧时的长度）
    solid_body_length = Na * d
    
    # 拉伸后才出现节距
    extended_length = solid_body_length + current_extension
    
    # 采样参数 - 高精度
    # 每圈约 36 个点，保证平滑
    num_samples = max(200, int(Na * 36))
    total_angle = 2.0 * math.pi * Na
    
    points = []
    for i in range(num_samples + 1):
        t = i / num_samples
        theta = t * total_angle
        z = t * extended_length
        x = R * math.cos(theta)
        y = R * math.sin(theta)
        points.append(App.Vector(x, y, z))
    
    return points, 0.0, extended_length


def make_extension_spring(params):
    """
    生成拉伸弹簧 (带钩子) - OpenAI 优化方案
    
    核心改进：
    1. 通过 normalize_extension_params 把 geometry 归一化
    2. generate_extension_body_centerline 生成本体螺旋线
    3. build_extension_hook_centerline 生成上下钩子中心线
    4. 三段中心线合并为一条，再 sweep_wire_along_path（只扫掠一次，避免 fuse 问题）
    
    这样可以确保 FreeCAD 和 Three.js 生成完全一致的几何。
    """
    # 先做参数归一化（解决 meanDiameter/bodyLength 等差异）
    params = normalize_extension_params(params)
    
    d = params["wireDiameter"]
    OD = params["outerDiameter"]
    Na = params["activeCoils"]
    body_length = params["bodyLength"]
    current_extension = params.get("currentExtension", 0.0)
    hook_type = params.get("hookType", "machine")
    
    Dm = OD - d
    R = Dm / 2.0
    
    # 与 Three.js 一致：紧密缠绕
    solid_body_length = Na * d
    extended_length = solid_body_length + current_extension
    
    print(f"Extension Spring (normalized): d={d}, OD={OD}, Dm={Dm}, Na={Na}, hookType={hook_type}")
    print(f"Body: solidBodyLength={solid_body_length:.2f} (Na*d), extended={extended_length:.2f}")
    
    # === 工程正确方案: 统一中心线 + 单次扫掠 (C¹ 连续) ===
    # 不使用 fuse，而是将钩子和主体的中心线合并后一次性扫掠
    # 这样可以保证几何连续性
    
    # === 备用方案: 统一中心线 + 单次扫掠 ===
    # 避免 fuse 操作导致的体积为 0 问题
    
    try:
        # === 1) 本体中心线 ===
        helix_pts, z_min, z_max = generate_extension_body_centerline(params)
        if len(helix_pts) < 3:
            raise RuntimeError("Helix points too few for extension spring")
        
        print(f"Generated {len(helix_pts)} helix points, z_range=[{z_min:.2f}, {z_max:.2f}]")
        
        # 本体起点/终点（用于钩子过渡）
        start_pos = helix_pts[0]
        end_pos = helix_pts[-1]
        # 倒数第二/第二个点，用来估算切线方向
        start_prev = helix_pts[1]
        end_prev = helix_pts[-2]
        
        # === 2) 钩子中心线 ===
        start_hook_pts = build_extension_hook_centerline(
            start_pos, start_prev, params, is_start=True
        )
        end_hook_pts = build_extension_hook_centerline(
            end_pos, end_prev, params, is_start=False
        )
        
        print(f"Hook centerlines: start={len(start_hook_pts)} pts, end={len(end_hook_pts)} pts")
        
        # === 3) 合并中心线 ===
        # 注意：build_extension_hook_centerline 已经处理了端点，这里需要正确拼接
        # start_hook_pts 是从钩尖到螺旋起点的顺序（反向）
        # end_hook_pts 是从螺旋终点到钩尖的顺序（正向）
        
        if len(start_hook_pts) > 0 and len(end_hook_pts) > 0:
            # 完整中心线: 底钩 + 螺旋体(去首尾) + 顶钩
            centerline_pts = (
                list(start_hook_pts) +
                helix_pts[1:-1] +  # 去掉首尾，与钩子端连接
                list(end_hook_pts)
            )
            print(f"Unified centerline: {len(centerline_pts)} points (with hooks)")
        else:
            # 如果钩子生成失败，只用螺旋体
            centerline_pts = helix_pts
            print(f"Unified centerline: {len(centerline_pts)} points (body only)")
        
        # === 4) 生成 B-Spline 路径并扫掠 ===
        path = make_bspline_from_points(centerline_pts)
        spring_solid = sweep_wire_along_path(path, d)
        
        if spring_solid is None or spring_solid.isNull():
            raise RuntimeError("Extension spring sweep failed (null shape)")
        
        # 验证形状
        print(f"Final shape: ShapeType={spring_solid.ShapeType}, Volume={spring_solid.Volume:.2f}, Area={spring_solid.Area:.2f}")
        
        if spring_solid.Volume <= 0:
            raise RuntimeError(f"Extension spring has zero volume")
        
        print("Extension spring generated successfully (unified centerline, Three.js-synced)")
        return spring_solid
        
    except Exception as e:
        print(f"Unified centerline method failed: {e}")
        import traceback
        traceback.print_exc()
    
    # === 备用方案: 只生成螺旋体（无钩子）===
    print("Trying fallback: body only (no hooks)")
    try:
        helix_pts, _, _ = generate_extension_body_centerline(params)
        path = make_bspline_from_points(helix_pts)
        spring_solid = sweep_wire_along_path(path, d)
        
        if spring_solid is None or spring_solid.isNull() or spring_solid.Volume <= 0:
            raise RuntimeError("Fallback sweep failed")
        
        print(f"Fallback shape: Volume={spring_solid.Volume:.2f}")
        print("Extension spring generated (body only, no hooks)")
        return spring_solid
    except Exception as e2:
        print(f"Fallback also failed: {e2}")
        raise


def make_simple_hook(attach_point, body_radius, wire_diameter, hook_radius, hook_gap, angle_deg, is_start):
    """
    生成简化版钩子 (只有圆弧，无过渡段)
    
    这是一个快速实现，后续可以添加过渡段
    """
    d = wire_diameter
    wire_radius = d / 2.0
    
    # 轴向方向
    axis_dir = App.Vector(0, 0, -1 if is_start else 1)
    
    # 径向方向
    radial_dir = App.Vector(attach_point.x, attach_point.y, 0)
    if radial_dir.Length < 1e-8:
        radial_dir = App.Vector(1, 0, 0)
    else:
        radial_dir.normalize()
    
    # 钩环圆心 (在轴线上)
    hook_center = App.Vector(0, 0, attach_point.z + axis_dir.z * hook_gap)
    
    # 钩环平面基向量
    u = App.Vector(axis_dir.x, axis_dir.y, axis_dir.z)
    u.normalize()
    v = radial_dir.cross(axis_dir)
    v.normalize()
    
    # 生成钩环圆弧点
    pts = []
    start_angle = -math.pi / 2
    total_angle = math.radians(angle_deg)
    segments = 24
    
    for i in range(segments + 1):
        t = i / segments
        theta = start_angle + total_angle * t
        p = (hook_center + 
             u * (hook_radius * math.cos(theta)) + 
             v * (hook_radius * math.sin(theta)))
        pts.append(p)
    
    # 添加过渡点 (从 attach_point 到钩环起点)
    transition_pts = []
    hook_start = pts[0]
    for i in range(5):
        t = i / 4.0
        p = attach_point * (1 - t) + hook_start * t
        transition_pts.append(p)
    
    # 合并: 过渡 + 钩环
    if is_start:
        all_pts = list(reversed(pts)) + list(reversed(transition_pts[1:]))
    else:
        all_pts = transition_pts[1:] + pts
    
    if len(all_pts) < 3:
        return None
    
    try:
        # 创建 B-Spline 路径
        path = make_bspline_from_points(all_pts)
        path_wire = Part.Wire([path])
        
        # 获取起点和切线
        start_point = path_wire.Vertexes[0].Point
        first_edge = path_wire.Edges[0]
        tangent = first_edge.tangentAt(first_edge.FirstParameter)
        
        # 创建圆截面
        circle = Part.makeCircle(wire_radius, start_point, tangent)
        circle_wire = Part.Wire([circle])
        
        # 扫掠
        hook_solid = path_wire.makePipeShell([circle_wire], True, True)
        return hook_solid
    except Exception as e:
        print(f"Hook generation failed: {e}")
        return None


# =============================================================================
# 扭转弹簧生成器
# =============================================================================

def make_torsion_spring(params):
    """生成扭转弹簧 (带腿)"""
    d = params.get("wireDiameter", 1.5)
    Dm = params.get("meanDiameter", 12.0)
    Na = params.get("activeCoils", 6)
    Lb = params.get("bodyLength", Na * d * 1.1)
    L1 = params.get("legLength1", 25.0)
    L2 = params.get("legLength2", 25.0)
    winding = params.get("windingDirection", "right")
    
    R = Dm / 2.0
    left_handed = (winding == "left")
    
    # 螺旋体
    helix_pts = generate_helix_points(R, Lb, Na, int(Na * 36), left_handed)
    
    start_pos = helix_pts[0]
    end_pos = helix_pts[-1]
    
    # 腿1 (径向向外)
    leg1_dir = App.Vector(start_pos.x, start_pos.y, 0)
    if leg1_dir.Length < 1e-8:
        leg1_dir = App.Vector(1, 0, 0)
    leg1_dir.normalize()
    
    leg1_pts = [start_pos + leg1_dir * (L1 * t / 20) for t in range(21)]
    
    # 腿2 (径向向外)
    leg2_dir = App.Vector(end_pos.x, end_pos.y, 0)
    if leg2_dir.Length < 1e-8:
        leg2_dir = App.Vector(1, 0, 0)
    leg2_dir.normalize()
    
    leg2_pts = [end_pos + leg2_dir * (L2 * t / 20) for t in range(21)]
    
    # 合并中心线
    leg1_pts.reverse()
    centerline_pts = leg1_pts + helix_pts[1:] + leg2_pts[1:]
    
    path = make_bspline_from_points(centerline_pts)
    spring = sweep_wire_along_path(path, d)
    
    return spring


# =============================================================================
# 锥形弹簧生成器
# =============================================================================

def make_conical_spring(params):
    """生成锥形弹簧 (变径螺旋)"""
    d = params.get("wireDiameter", 3.0)
    D1 = params.get("largeOuterDiameter", 30.0)
    D2 = params.get("smallOuterDiameter", 15.0)
    Na = params.get("activeCoils", 6)
    L0 = params.get("freeLength", 50.0)
    left_handed = params.get("leftHanded", False)
    
    R1 = (D1 - d) / 2.0  # 大端中径半径
    R2 = (D2 - d) / 2.0  # 小端中径半径
    
    samples = int(Na * 36)
    sign = -1 if left_handed else 1
    
    # 锥形螺旋线 (半径线性插值)
    conical_pts = []
    for i in range(samples + 1):
        t = float(i) / samples
        theta = 2.0 * math.pi * Na * t * sign
        z = L0 * t
        r = R1 + (R2 - R1) * t  # 线性插值半径
        x = r * math.cos(theta)
        y = r * math.sin(theta)
        conical_pts.append(App.Vector(x, y, z))
    
    path = make_bspline_from_points(conical_pts)
    spring = sweep_wire_along_path(path, d)
    
    return spring


# =============================================================================
# TechDraw 工程图生成 - 使用 FreeCAD 真实投影
# =============================================================================

def generate_techdraw_projection(shape, direction, scale=1.0):
    """
    使用 FreeCAD TechDraw.projectToSVG 生成真实的 2D 投影
    
    参数:
    - shape: Part.Shape 对象
    - direction: App.Vector 投影方向
    - scale: 缩放比例
    
    返回: SVG 路径字符串
    """
    try:
        import TechDraw
        svg = TechDraw.projectToSVG(shape, direction)
        
        # 添加缩放变换
        if scale != 1.0:
            svg = f'<g transform="scale({scale})">{svg}</g>'
        
        return svg
    except Exception as e:
        print(f"TechDraw projection failed: {e}")
        return ""


def generate_extension_characteristic_svg():
    """生成拉簧特性曲线 SVG"""
    return '''<!-- 拉簧特性线 (从初拉力开始) -->
      <!-- 初拉力点 -->
      <circle cx="0" cy="28" r="1" fill="black"/>
      <text x="2" y="26" class="small-text">F0</text>
      
      <!-- 特性线 (斜率 = k) -->
      <line x1="0" y1="28" x2="40" y2="5" class="medium"/>
      
      <!-- 工作点 -->
      <line x1="15" y1="35" x2="15" y2="20" class="extra-thin" stroke-dasharray="2,1"/>
      <circle cx="15" cy="20" r="1" fill="black"/>
      <text x="17" y="18" class="small-text">F1</text>
      
      <line x1="30" y1="35" x2="30" y2="12" class="extra-thin" stroke-dasharray="2,1"/>
      <circle cx="30" cy="12" r="1" fill="black"/>
      <text x="32" y="10" class="small-text">F2</text>
      
      <circle cx="40" cy="5" r="1" fill="black"/>
      <text x="42" y="7" class="small-text">Fmax</text>'''


def generate_compression_characteristic_svg(L0, L1, L2, max_deflection, F1, F2, Fs):
    """生成压簧特性曲线 SVG"""
    x1 = min((L0-L1)/max_deflection * 40, 35)
    y1 = max(35 - F1/max(Fs, 1) * 30, 5)
    x2 = min((L0-L2)/max_deflection * 40, 38)
    y2 = max(35 - F2/max(Fs, 1) * 30, 5)
    
    return f'''<!-- 压簧特性线 -->
      <line x1="0" y1="35" x2="40" y2="5" class="medium"/>
      
      <!-- 工作点标注 -->
      <line x1="{x1}" y1="35" x2="{x1}" y2="{y1}" class="extra-thin" stroke-dasharray="2,1"/>
      <circle cx="{x1}" cy="{y1}" r="1" fill="black"/>
      <text x="{x1 + 2}" y="{y1 - 2}" class="small-text">F1={F1:.0f}</text>
      
      <line x1="{x2}" y1="35" x2="{x2}" y2="{y2}" class="extra-thin" stroke-dasharray="2,1"/>
      <circle cx="{x2}" cy="{y2}" r="1" fill="black"/>
      <text x="{x2 + 2}" y="{y2 - 2}" class="small-text">F2={F2:.0f}</text>
      
      <circle cx="40" cy="5" r="1" fill="black"/>
      <text x="42" y="7" class="small-text">Fs={Fs:.0f}</text>'''


def generate_tech_requirements_svg(spring_type, L0_tol, L0):
    """生成技术要求 SVG"""
    if spring_type == "extension":
        return '''<text class="note-text">
      <tspan x="0" dy="5">1. 材料: 碳素弹簧钢丝 C级 GB/T 4357</tspan>
      <tspan x="0" dy="4">2. 热处理: 去应力退火 250-300C</tspan>
      <tspan x="0" dy="4">3. 表面处理: 发黑或镀锌</tspan>
      <tspan x="0" dy="4">4. 钩子形式: 机器钩 (Machine Hook)</tspan>
      <tspan x="0" dy="4">5. 旋向: 右旋</tspan>
      <tspan x="0" dy="4">6. 体长公差: +/-''' + f'{L0_tol:.1f}' + '''mm</tspan>
      <tspan x="0" dy="4">7. 刚度公差: +/-10%</tspan>
      <tspan x="0" dy="4">8. 初拉力公差: +/-15%</tspan>
      <tspan x="0" dy="4">9. 执行标准: GB/T 2089</tspan>
    </text>'''
    else:
        return '''<text class="note-text">
      <tspan x="0" dy="5">1. 材料: 碳素弹簧钢丝 C级 GB/T 4357</tspan>
      <tspan x="0" dy="4">2. 热处理: 去应力退火 250-300C</tspan>
      <tspan x="0" dy="4">3. 表面处理: 发黑或镀锌</tspan>
      <tspan x="0" dy="4">4. 两端并紧磨平，磨削量 3/4 圈</tspan>
      <tspan x="0" dy="4">5. 旋向: 右旋</tspan>
      <tspan x="0" dy="4">6. 自由长度公差: +/-''' + f'{L0_tol:.1f}' + '''mm</tspan>
      <tspan x="0" dy="4">7. 刚度公差: +/-10%</tspan>
      <tspan x="0" dy="4">8. 垂直度: ''' + f'{L0*0.03:.1f}' + '''mm</tspan>
      <tspan x="0" dy="4">9. 执行标准: GB/T 1239.2</tspan>
    </text>'''


def generate_params_table_svg(spring_type, d, Dm, OD, ID, L0, Na, Nt, pitch_active, spring_rate):
    """生成参数表 SVG"""
    if spring_type == "extension":
        initial_force = spring_rate * 0.1 * L0
        return f'''<text class="small-text">
      <tspan x="3" dy="15">线径 d</tspan><tspan x="45" dy="0">{d:.2f} mm</tspan>
      <tspan x="3" dy="4">中径 D</tspan><tspan x="45" dy="0">{Dm:.1f} mm</tspan>
      <tspan x="3" dy="4">外径 D2</tspan><tspan x="45" dy="0">{OD:.1f} mm</tspan>
      <tspan x="3" dy="4">内径 D1</tspan><tspan x="45" dy="0">{ID:.1f} mm</tspan>
      <tspan x="3" dy="4">体长 Lb</tspan><tspan x="45" dy="0">{L0:.1f} mm</tspan>
      <tspan x="3" dy="4">有效圈数 n</tspan><tspan x="45" dy="0">{Na}</tspan>
      <tspan x="3" dy="4">钩子类型</tspan><tspan x="45" dy="0">机器钩</tspan>
      <tspan x="3" dy="4">刚度 k</tspan><tspan x="45" dy="0">{spring_rate:.2f} N/mm</tspan>
      <tspan x="3" dy="4">初拉力 F0</tspan><tspan x="45" dy="0">{initial_force:.1f} N</tspan>
    </text>'''
    else:
        return f'''<text class="small-text">
      <tspan x="3" dy="15">线径 d</tspan><tspan x="45" dy="0">{d:.2f} mm</tspan>
      <tspan x="3" dy="4">中径 D</tspan><tspan x="45" dy="0">{Dm:.1f} mm</tspan>
      <tspan x="3" dy="4">外径 D2</tspan><tspan x="45" dy="0">{OD:.1f} mm</tspan>
      <tspan x="3" dy="4">内径 D1</tspan><tspan x="45" dy="0">{ID:.1f} mm</tspan>
      <tspan x="3" dy="4">自由长度 L0</tspan><tspan x="45" dy="0">{L0:.1f} mm</tspan>
      <tspan x="3" dy="4">有效圈数 n</tspan><tspan x="45" dy="0">{Na}</tspan>
      <tspan x="3" dy="4">总圈数 n1</tspan><tspan x="45" dy="0">{Nt}</tspan>
      <tspan x="3" dy="4">节距 t</tspan><tspan x="45" dy="0">{pitch_active:.2f} mm</tspan>
    </text>'''


def generate_techdraw(doc, spring_obj, geometry, spring_type, output_path, fmt):
    """
    生成标准 2D 工程图 SVG - 使用 FreeCAD TechDraw 真实投影
    
    包含:
    - 主视图: FreeCAD TechDraw 真实投影 (前视图)
    - 俯视图: FreeCAD TechDraw 真实投影 (顶视图)
    - 特性线图: 力-位移三角形 (含 F1, F2, Fs)
    - 标准尺寸标注 (带公差)
    - 技术要求
    - GB/T 10609.1 标题栏
    """
    import datetime
    import TechDraw
    
    # 获取参数
    d = geometry.get("wireDiameter", 3.2)
    Dm = geometry.get("meanDiameter", 24.0)
    OD = geometry.get("outerDiameter", Dm + d)
    ID = OD - 2 * d
    Na = geometry.get("activeCoils", 8)
    Nt = geometry.get("totalCoils", Na + 2)
    
    # 根据弹簧类型确定长度参数
    if spring_type == "extension":
        # 拉簧：紧密缠绕
        L0 = Na * d
        pitch_active = d
    else:
        # 压簧
        L0 = geometry.get("freeLength", 50.0)
        dead_coils = Nt - Na
        pitch_dead = d
        dead_height = dead_coils * pitch_dead
        pitch_active = (L0 - dead_height) / Na if Na > 0 else d
    
    # 计算弹簧刚度 (GB/T 1239.6)
    G = 79300  # MPa, 弹簧钢剪切模量
    spring_rate = (G * d**4) / (8 * Dm**3 * Na) if Na > 0 else 0
    
    # 计算特性参数
    Hs = Nt * d  # 并紧高度
    max_deflection = max(L0 - Hs, 1.0)
    Fs = spring_rate * max_deflection if spring_rate > 0 else 0
    
    # 工作状态参数 (示例)
    L1 = L0 * 0.85  # 安装长度
    L2 = L0 * 0.70  # 工作长度
    F1 = spring_rate * (L0 - L1)  # 安装力
    F2 = spring_rate * (L0 - L2)  # 工作力
    
    # 公差
    L0_tol = L0 * 0.02  # ±2%
    k_tol = spring_rate * 0.10  # ±10%
    
    # 页面尺寸 (A4 横向)
    page_width = 297
    page_height = 210
    margin = 8
    
    # 获取弹簧形状的边界框
    shape = spring_obj.Shape
    bbox = shape.BoundBox
    shape_width = max(bbox.XLength, bbox.YLength)
    shape_height = bbox.ZLength
    
    # 计算缩放 - 适配页面
    available_height = 90
    available_width = 50
    scale = min(available_height / shape_height, available_width / shape_width) * 0.85
    
    # === 使用 FreeCAD TechDraw 生成真实投影 ===
    print("Generating TechDraw projections...")
    
    # 前视图 (Y 方向)
    front_svg = TechDraw.projectToSVG(shape, App.Vector(0, 1, 0))
    print(f"Front view SVG: {len(front_svg)} chars")
    
    # 俯视图 (Z 方向)  
    top_svg = TechDraw.projectToSVG(shape, App.Vector(0, 0, 1))
    print(f"Top view SVG: {len(top_svg)} chars")
    
    # 侧视图 (X 方向)
    side_svg = TechDraw.projectToSVG(shape, App.Vector(1, 0, 0))
    print(f"Side view SVG: {len(side_svg)} chars")
    
    # 生成 SVG
    svg_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     width="{page_width}mm" height="{page_height}mm" 
     viewBox="0 0 {page_width} {page_height}"
     style="background: white;">
  
  <defs>
    <style>
      .thick {{ stroke: black; stroke-width: 0.5; fill: none; }}
      .medium {{ stroke: black; stroke-width: 0.35; fill: none; }}
      .thin {{ stroke: black; stroke-width: 0.25; fill: none; }}
      .extra-thin {{ stroke: black; stroke-width: 0.18; fill: none; }}
      .centerline {{ stroke: black; stroke-width: 0.18; stroke-dasharray: 12,3,2,3; fill: none; }}
      .hidden {{ stroke: black; stroke-width: 0.25; stroke-dasharray: 3,1.5; fill: none; }}
      .dimension {{ stroke: black; stroke-width: 0.18; fill: none; }}
      .hatch {{ stroke: black; stroke-width: 0.1; fill: none; }}
      .dim-text {{ font-family: 'SimSun', Arial, sans-serif; font-size: 3.5px; fill: black; }}
      .title-text {{ font-family: 'SimHei', Arial, sans-serif; font-size: 5px; fill: black; font-weight: bold; }}
      .label-text {{ font-family: 'SimSun', Arial, sans-serif; font-size: 3px; fill: black; }}
      .note-text {{ font-family: 'SimSun', Arial, sans-serif; font-size: 2.8px; fill: black; }}
      .small-text {{ font-family: 'SimSun', Arial, sans-serif; font-size: 2.2px; fill: black; }}
    </style>
    <!-- 标准尺寸箭头 (实心三角形, 30°) -->
    <marker id="dim-arrow" markerWidth="3" markerHeight="2" refX="3" refY="1" orient="auto">
      <path d="M0,0 L3,1 L0,2 Z" fill="black"/>
    </marker>
    <marker id="dim-arrow-rev" markerWidth="3" markerHeight="2" refX="0" refY="1" orient="auto">
      <path d="M3,0 L0,1 L3,2 Z" fill="black"/>
    </marker>
    <!-- 剖面线图案 -->
    <pattern id="hatch" patternUnits="userSpaceOnUse" width="2" height="2" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="2" class="hatch"/>
    </pattern>
  </defs>
  
  <!-- 图框 -->
  <rect x="{margin}" y="{margin}" width="{page_width - 2*margin}" height="{page_height - 2*margin}" class="thick"/>
  <rect x="{margin + 5}" y="{margin + 5}" width="{page_width - 2*margin - 10}" height="{page_height - 2*margin - 10}" class="thin"/>
  
  <!-- ==================== 主视图 (FreeCAD TechDraw 真实投影) ==================== -->
  <!-- 弹簧是横向放置的 (轴线水平)，所以 shape_height 是水平长度，shape_width 是垂直高度 -->
  <g transform="translate(75, 70)">
    <!-- FreeCAD 投影的 SVG (前视图) -->
    <g transform="scale({scale}, -{scale})" stroke="black" stroke-width="{0.3/scale}" fill="none">
      {front_svg}
    </g>
    
    <!-- 中心线 (水平) -->
    <line x1="{-shape_height * scale / 2 - 15}" y1="0" x2="{shape_height * scale / 2 + 15}" y2="0" class="centerline"/>
    
    <!-- 尺寸标注: 总长度 L (上方，水平方向) -->
    <!-- shape_height = bbox.ZLength 是弹簧的实际长度 -->
    <!-- bbox.ZMin 和 bbox.ZMax 确定弹簧的实际位置，需要计算中心偏移 -->
    <g transform="translate({(bbox.ZMin + bbox.ZMax) / 2 * scale}, {-OD/2 * scale - 12})">
      <line x1="{-shape_height * scale / 2}" y1="8" x2="{-shape_height * scale / 2}" y2="-2" class="extra-thin"/>
      <line x1="{shape_height * scale / 2}" y1="8" x2="{shape_height * scale / 2}" y2="-2" class="extra-thin"/>
      <line x1="{-shape_height * scale / 2}" y1="0" x2="{shape_height * scale / 2}" y2="0" class="dimension" marker-start="url(#dim-arrow-rev)" marker-end="url(#dim-arrow)"/>
      <text x="0" y="-3" class="dim-text" text-anchor="middle">L={shape_height:.1f}+/-{L0_tol:.1f}</text>
    </g>
    
    <!-- 尺寸标注: 外径 D (右侧，垂直方向) -->
    <g transform="translate({shape_height * scale / 2 + 12}, 0)">
      <line x1="-8" y1="{-OD/2 * scale}" x2="2" y2="{-OD/2 * scale}" class="extra-thin"/>
      <line x1="-8" y1="{OD/2 * scale}" x2="2" y2="{OD/2 * scale}" class="extra-thin"/>
      <line x1="0" y1="{-OD/2 * scale}" x2="0" y2="{OD/2 * scale}" class="dimension" marker-start="url(#dim-arrow-rev)" marker-end="url(#dim-arrow)"/>
      <text x="3" y="1" class="dim-text">D={OD:.1f}</text>
    </g>
    
    <!-- 尺寸标注: 线径 d (左下引出线) -->
    <g transform="translate({-shape_height * scale / 2 - 5}, {OD/2 * scale - d * scale})">
      <line x1="5" y1="0" x2="-10" y2="8" class="extra-thin"/>
      <line x1="-10" y1="8" x2="-20" y2="8" class="extra-thin"/>
      <text x="-27" y="-6" class="dim-text" text-anchor="end">d={d:.2f}</text>
    </g>
    
    <!-- 视图标记 -->
    <text x="0" y="{shape_height * scale / 2 + 22}" class="label-text" text-anchor="middle">主视图 (FreeCAD)</text>
  </g>
  
  <!-- ==================== 俯视图 (在主视图右方对齐，Y轴对齐) ==================== -->
  <!-- 主视图中心在 y=70，俯视图也应该在 y=70 -->
  <g transform="translate({75 + shape_height * scale / 2 + OD * scale / 2 + 30}, 70)">
    <!-- FreeCAD 投影的 SVG (俯视图/端面图) -->
    <g transform="scale({scale}, {scale})" stroke="black" stroke-width="{0.3/scale}" fill="none">
      {top_svg}
    </g>
    
    <!-- 中心线 -->
    <line x1="{-OD/2 * scale - 8}" y1="0" x2="{OD/2 * scale + 8}" y2="0" class="centerline"/>
    <line x1="0" y1="{-OD/2 * scale - 8}" x2="0" y2="{OD/2 * scale + 8}" class="centerline"/>
    
    <!-- 尺寸标注: 外径 -->
    <g transform="translate(0, {OD/2 * scale + 10})">
      <line x1="{-OD/2 * scale}" y1="-6" x2="{-OD/2 * scale}" y2="2" class="extra-thin"/>
      <line x1="{OD/2 * scale}" y1="-6" x2="{OD/2 * scale}" y2="2" class="extra-thin"/>
      <line x1="{-OD/2 * scale}" y1="0" x2="{OD/2 * scale}" y2="0" class="dimension" marker-start="url(#dim-arrow-rev)" marker-end="url(#dim-arrow)"/>
      <text x="0" y="5" class="dim-text" text-anchor="middle">D={OD:.1f}</text>
    </g>
    
    <!-- 视图标记 -->
    <text x="0" y="{OD/2 * scale + 20}" class="label-text" text-anchor="middle">俯视图</text>
  </g>
  
  <!-- ==================== 特性线图 ==================== -->
  <g transform="translate(220, 15)">
    <rect x="0" y="0" width="65" height="55" class="thin"/>
    <text x="30" y="8" class="label-text" text-anchor="middle" font-weight="bold">{"拉伸特性曲线" if spring_type == "extension" else "压缩特性曲线"}</text>
    
    <!-- 坐标轴 -->
    <g transform="translate(10, 15)">
      <!-- Y轴 (力 F) -->
      <line x1="0" y1="35" x2="0" y2="0" class="thin" marker-end="url(#dim-arrow)"/>
      <text x="-3" y="3" class="small-text">F/N</text>
      
      <!-- X轴 (位移/伸长量) -->
      <line x1="0" y1="35" x2="45" y2="35" class="thin" marker-end="url(#dim-arrow)"/>
      <text x="43" y="40" class="small-text">{"Δx/mm" if spring_type == "extension" else "δ/mm"}</text>
      
      {generate_extension_characteristic_svg() if spring_type == "extension" else ""}
      {generate_compression_characteristic_svg(L0, L1, L2, max_deflection, F1, F2, Fs) if spring_type != "extension" else ""}
    </g>
    
    <!-- 刚度 -->
    <text x="30" y="52" class="small-text" text-anchor="middle">k={spring_rate:.2f}±{k_tol:.2f} N/mm</text>
  </g>
  
  <!-- ==================== 技术要求 ==================== -->
  <g transform="translate({margin + 8}, 135)">
    <text class="label-text" font-weight="bold">
      <tspan x="0" dy="0">技术要求:</tspan>
    </text>
    {generate_tech_requirements_svg(spring_type, L0_tol, L0)}
  </g>
  
  <!-- ==================== 参数表 ==================== -->
  <g transform="translate(210, 75)">
    <rect x="0" y="0" width="75" height="{"58" if spring_type == "extension" else "50"}" class="thin"/>
    <text x="37.5" y="7" class="label-text" text-anchor="middle" font-weight="bold">{"拉簧参数" if spring_type == "extension" else "弹簧参数"}</text>
    <line x1="0" y1="9" x2="75" y2="9" class="extra-thin"/>
    
    {generate_params_table_svg(spring_type, d, Dm, OD, ID, L0, Na, Nt, pitch_active, spring_rate)}
  </g>
  
  <!-- ==================== 标题栏 (GB/T 10609.1) ==================== -->
  <g transform="translate({margin + 5}, {page_height - margin - 25})">
    <!-- 外框 -->
    <rect x="0" y="0" width="{page_width - 2*margin - 10}" height="20" class="thick"/>
    
    <!-- 竖线分隔 -->
    <line x1="50" y1="0" x2="50" y2="20" class="thin"/>
    <line x1="100" y1="0" x2="100" y2="20" class="thin"/>
    <line x1="160" y1="0" x2="160" y2="20" class="thin"/>
    <line x1="200" y1="0" x2="200" y2="20" class="thin"/>
    <line x1="230" y1="0" x2="230" y2="20" class="thin"/>
    
    <!-- 横线 -->
    <line x1="0" y1="10" x2="{page_width - 2*margin - 10}" y2="10" class="thin"/>
    
    <!-- 标签行 -->
    <text x="25" y="7" class="small-text" text-anchor="middle">图名</text>
    <text x="75" y="7" class="small-text" text-anchor="middle">材料</text>
    <text x="130" y="7" class="small-text" text-anchor="middle">图号</text>
    <text x="180" y="7" class="small-text" text-anchor="middle">比例</text>
    <text x="215" y="7" class="small-text" text-anchor="middle">日期</text>
    <text x="250" y="7" class="small-text" text-anchor="middle">张次</text>
    
    <!-- 内容行 -->
    <text x="25" y="17" class="title-text" text-anchor="middle">{"拉伸弹簧" if spring_type == "extension" else "压缩弹簧"}</text>
    <text x="75" y="17" class="small-text" text-anchor="middle">60Si2MnA</text>
    <text x="130" y="17" class="small-text" text-anchor="middle">{"EX" if spring_type == "extension" else "CP"}-{Nt:02d}{Na:02d}</text>
    <text x="180" y="17" class="small-text" text-anchor="middle">{scale:.1f}:1</text>
    <text x="215" y="17" class="small-text" text-anchor="middle">{datetime.date.today()}</text>
    <text x="250" y="17" class="small-text" text-anchor="middle">1/1</text>
  </g>
  
</svg>'''
    
    # 写入文件
    svg_path = output_path if output_path.endswith('.svg') else output_path.replace('.pdf', '.svg')
    with open(svg_path, 'w', encoding='utf-8') as f:
        f.write(svg_content)
    
    print(f"Generated engineering drawing SVG: {svg_path}")
    return svg_path


def generate_gb_spring_svg(Nt, Na, d, Dm, L0, scale):
    """
    生成标准弹簧侧视图 SVG - 工程图标准画法
    每圈画两条线：外轮廓线和内轮廓线，形成 X 交叉
    """
    import math
    
    R = Dm / 2.0  # 中径半径
    r = d / 2.0   # 线材半径
    OD = Dm + d   # 外径
    ID = Dm - d   # 内径
    
    # 计算节距
    dead_coils = Nt - Na
    dead_coils_per_end = dead_coils / 2.0
    pitch_dead = d
    pitch_active = (L0 - dead_coils * pitch_dead) / Na if Na > 0 else d
    
    paths = []
    
    # 中心线 (长点划线)
    paths.append(f'    <line x1="0" y1="-8" x2="0" y2="{L0 * scale + 8}" class="centerline"/>')
    
    # 每圈绘制：从左到右的斜线 + 从右到左的斜线，形成 X
    # 标准画法：每半圈画一条线
    
    points_per_half = 20  # 每半圈的点数
    
    for coil in range(int(Nt)):
        # 计算这一圈的起始和结束高度
        if coil < dead_coils_per_end:
            # 底部死圈
            z_start = coil * pitch_dead
            z_end = (coil + 1) * pitch_dead
            current_pitch = pitch_dead
        elif coil < dead_coils_per_end + Na:
            # 有效圈
            coil_in_active = coil - dead_coils_per_end
            z_start = dead_coils_per_end * pitch_dead + coil_in_active * pitch_active
            z_end = dead_coils_per_end * pitch_dead + (coil_in_active + 1) * pitch_active
            current_pitch = pitch_active
        else:
            # 顶部死圈
            coil_in_top = coil - dead_coils_per_end - Na
            z_start = dead_coils_per_end * pitch_dead + Na * pitch_active + coil_in_top * pitch_dead
            z_end = dead_coils_per_end * pitch_dead + Na * pitch_active + (coil_in_top + 1) * pitch_dead
            current_pitch = pitch_dead
        
        # 前半圈 (0 到 π): 从右到左，外轮廓实线
        front_outer_points = []
        front_inner_points = []
        for i in range(points_per_half + 1):
            t = i / points_per_half  # 0 到 1
            theta = t * math.pi  # 0 到 π
            z = z_start + t * current_pitch / 2
            
            # 外轮廓 (线材外边缘)
            x_outer = (R + r) * math.cos(theta)
            front_outer_points.append((x_outer * scale, z * scale))
            
            # 内轮廓 (线材内边缘)
            x_inner = (R - r) * math.cos(theta)
            front_inner_points.append((x_inner * scale, z * scale))
        
        # 后半圈 (π 到 2π): 从左到右，外轮廓虚线
        back_outer_points = []
        back_inner_points = []
        for i in range(points_per_half + 1):
            t = i / points_per_half  # 0 到 1
            theta = math.pi + t * math.pi  # π 到 2π
            z = z_start + current_pitch / 2 + t * current_pitch / 2
            
            # 外轮廓
            x_outer = (R + r) * math.cos(theta)
            back_outer_points.append((x_outer * scale, z * scale))
            
            # 内轮廓
            x_inner = (R - r) * math.cos(theta)
            back_inner_points.append((x_inner * scale, z * scale))
        
        # 绘制前半圈 - 实线
        if len(front_outer_points) > 1:
            pts = ' '.join([f'{p[0]:.2f},{p[1]:.2f}' for p in front_outer_points])
            paths.append(f'    <polyline points="{pts}" class="medium" fill="none"/>')
        if len(front_inner_points) > 1:
            pts = ' '.join([f'{p[0]:.2f},{p[1]:.2f}' for p in front_inner_points])
            paths.append(f'    <polyline points="{pts}" class="medium" fill="none"/>')
        
        # 绘制后半圈 - 虚线
        if len(back_outer_points) > 1:
            pts = ' '.join([f'{p[0]:.2f},{p[1]:.2f}' for p in back_outer_points])
            paths.append(f'    <polyline points="{pts}" class="hidden" fill="none"/>')
        if len(back_inner_points) > 1:
            pts = ' '.join([f'{p[0]:.2f},{p[1]:.2f}' for p in back_inner_points])
            paths.append(f'    <polyline points="{pts}" class="hidden" fill="none"/>')
    
    # 顶部和底部端面线
    paths.append(f'    <line x1="{-OD/2 * scale}" y1="0" x2="{OD/2 * scale}" y2="0" class="medium"/>')
    paths.append(f'    <line x1="{-OD/2 * scale}" y1="{L0 * scale}" x2="{OD/2 * scale}" y2="{L0 * scale}" class="medium"/>')
    
    # 两端线材截面圆
    # 底部
    paths.append(f'    <circle cx="{-R * scale}" cy="{r * scale}" r="{r * scale}" class="medium"/>')
    paths.append(f'    <circle cx="{R * scale}" cy="{r * scale}" r="{r * scale}" class="medium"/>')
    # 顶部
    paths.append(f'    <circle cx="{-R * scale}" cy="{(L0 - r) * scale}" r="{r * scale}" class="medium"/>')
    paths.append(f'    <circle cx="{R * scale}" cy="{(L0 - r) * scale}" r="{r * scale}" class="medium"/>')
    
    return '\n'.join(paths)


# =============================================================================
# 主函数
# =============================================================================

def main():
    if len(sys.argv) < 2:
        print("Usage: python run_export.py design.json [output_dir]")
        sys.exit(1)
    
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
    print(f"Output: {output_dir}/{export_name}")
    
    # 创建文档
    doc = App.newDocument("Spring")
    
    # 生成弹簧
    if spring_type == "compression":
        spring = make_compression_spring(geometry)
    elif spring_type == "extension":
        # make_extension_spring 内部已调用 normalize_extension_params
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
            import time
            stl_start = time.time()
            
            # 使用 Mesh 模块导出，可以控制精度
            try:
                import Mesh
                # 高精度设置
                linear_deflection = 0.02  # mm - 高精度
                angular_deflection = 0.1  # radians - 高精度
                
                # 创建 mesh 并导出
                mesh = Mesh.Mesh()
                shape = spring_obj.Shape
                
                # 使用 MeshPart 进行更好的控制
                try:
                    import MeshPart
                    mesh = MeshPart.meshFromShape(
                        Shape=shape,
                        LinearDeflection=linear_deflection,
                        AngularDeflection=angular_deflection,
                        Relative=False
                    )
                except:
                    # 备用：直接 tessellate
                    vertices, facets = shape.tessellate(linear_deflection)
                    for facet in facets:
                        mesh.addFacet(vertices[facet[0]], vertices[facet[1]], vertices[facet[2]])
                
                mesh.write(filepath)
                stl_time = time.time() - stl_start
                file_size = os.path.getsize(filepath)
                print(f"Exported STL ({file_size/1024/1024:.1f}MB, {stl_time:.1f}s): {filepath}")
                output_files.append(filepath)
            except Exception as e:
                print(f"Mesh export failed: {e}, trying exportStl")
                try:
                    spring_obj.Shape.exportStl(filepath)
                    stl_time = time.time() - stl_start
                    file_size = os.path.getsize(filepath)
                    print(f"Exported STL (fallback, {file_size/1024/1024:.1f}MB, {stl_time:.1f}s): {filepath}")
                    output_files.append(filepath)
                except Exception as e2:
                    print(f"exportStl also failed: {e2}")
            
        elif fmt_upper == "FCSTD":
            filepath = os.path.join(output_dir, f"{export_name}.FCStd")
            doc.saveAs(filepath)
            output_files.append(filepath)
            print(f"Exported: {filepath}")
            
        elif fmt_upper == "PDF" or fmt_upper == "SVG":
            # 使用 TechDraw 生成 2D 工程图
            filepath = os.path.join(output_dir, f"{export_name}.{fmt.lower()}")
            try:
                drawing_file = generate_techdraw(doc, spring_obj, geometry, spring_type, filepath, fmt_upper)
                if drawing_file:
                    output_files.append(drawing_file)
                    print(f"Exported TechDraw: {drawing_file}")
            except Exception as e:
                print(f"TechDraw export failed: {e}")
    
    print("=== Export Complete ===")
    
    # 输出结果 JSON
    result = {
        "status": "success",
        "springType": spring_type,
        "files": [
            {"format": os.path.splitext(f)[1][1:].upper(), "path": f}
            for f in output_files
        ]
    }
    print("RESULT_JSON:" + json.dumps(result))


if __name__ == "__main__":
    main()
