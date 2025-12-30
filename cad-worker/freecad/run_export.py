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
# 辅助函数
# =============================================================================

def vec(x,y,z): 
    return App.Vector(float(x), float(y), float(z))

def unit(v):
    l = v.Length
    return v.multiply(1.0/l) if l > 1e-12 else vec(0,0,0)

def clamp(x, a, b):
    return max(a, min(b, x))

def first_index_ge(L, target):
    for i, li in enumerate(L):
        if li >= target:
            return i
    return len(L)-1

def rot_axis_angle(v, axis, deg):
    """Rodrigues rotation formula"""
    a = unit(axis)
    th = math.radians(deg)
    c = math.cos(th); s = math.sin(th)
    return v.multiply(c) + a.cross(v).multiply(s) + a.multiply(a.dot(v)*(1-c))

def make_basis_matrix(nx, bx, tx):
    """
    Build a 3x3 basis matrix whose columns are (n, b, t) in world coordinates.
    FreeCAD's App.Matrix is 4x4; we fill the upper-left 3x3.
    """
    m = App.Matrix()
    m.A11, m.A12, m.A13 = nx.x, bx.x, tx.x
    m.A21, m.A22, m.A23 = nx.y, bx.y, tx.y
    m.A31, m.A32, m.A33 = nx.z, bx.z, tx.z
    return m

def rotation_from_basis(n, b, t):
    """
    Create a Rotation that maps local axes (X,Y,Z) to (n,b,t).
    """
    m = make_basis_matrix(n, b, t)
    return App.Rotation(m)

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
    
    # 方法1: makePipeShell (生成有效的 Solid，支持布尔运算)
    try:
        solid = path_wire.makePipeShell([circle_wire], True, True)
        print(f"makePipeShell result: ShapeType={solid.ShapeType}, Volume={solid.Volume:.2f}, isValid={solid.isValid()}")
        if solid.isValid():
            return solid
        # 如果无效，尝试修复
        fixed = solid.removeSplitter()
        if fixed.isValid():
            print(f"makePipeShell fixed: isValid={fixed.isValid()}")
            return fixed
        return solid
    except Exception as e:
        print(f"makePipeShell failed: {e}")
    
    # 方法2: makePipe (备用，可能生成无效形状)
    try:
        # makePipe 沿 spine 扫掠 profile
        pipe = path_wire.makePipe(circle_wire)
        print(f"makePipe result: ShapeType={pipe.ShapeType}, Volume={pipe.Volume:.2f}")
        # 如果是 Shell，转换为 Solid
        if pipe.ShapeType == "Shell":
            solid = Part.Solid(pipe)
            print(f"Converted to Solid: Volume={solid.Volume:.2f}, isValid={solid.isValid()}")
            return solid
        return pipe
    except Exception as e:
        print(f"makePipe failed: {e}")
    
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
    
    # === 端面磨平 (工业级稳健性) ===
    if ground_ends and spring_solid:
        # 工程级容差 - 解决 OCC/FreeCAD 布尔运算稳健性问题
        EPS = max(0.05 * d, 0.05)
        
        # 修复形状 - 提高布尔运算成功率
        if not spring_solid.isValid():
            print(f"[Compression] Spring shape is invalid, attempting to fix...")
            spring_solid = spring_solid.removeSplitter()
        
        grind_depth = 0.3 * d  # 与 Three.js 一致
        
        # 使用中心线 Z 范围 (0 到 L0)，而不是 BoundBox
        bottom_cut_z = grind_depth
        top_cut_z = L0 - grind_depth
        
        box_size = Dm * 3
        box_height = d * 5  # 足够高的盒子
        
        # 底部切割盒 - 必须穿透弹簧实体
        bottom_box = Part.makeBox(
            box_size, box_size, box_height,
            App.Vector(-box_size/2, -box_size/2, grind_depth + EPS - box_height)
        )
        
        # 顶部切割盒 - 必须穿透弹簧实体
        top_box = Part.makeBox(
            box_size, box_size, box_height,
            App.Vector(-box_size/2, -box_size/2, L0 - grind_depth - EPS)
        )
        
        try:
            # 验证几何交集
            bottom_common = spring_solid.common(bottom_box)
            top_common = spring_solid.common(top_box)
            print(f"[Compression] Common volume: bottom={bottom_common.Volume:.2f}, top={top_common.Volume:.2f}")
            
            cut_result = spring_solid.cut(bottom_box)
            cut_result = cut_result.cut(top_box)
            
            # 如果结果是 Compound，取最大的 Solid
            if cut_result.ShapeType == "Compound" and cut_result.Solids:
                cut_result = max(cut_result.Solids, key=lambda s: s.Volume)
            
            spring_solid = cut_result
            print(f"[Compression] Ground ends applied: bottom={bottom_cut_z:.2f}, top={top_cut_z:.2f}")
        except Exception as e:
            print(f"[Compression] Warning: Ground end cutting failed: {e}")
    
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
        # 工程级容差 - 解决 OCC/FreeCAD 布尔运算稳健性问题
        EPS = max(0.05 * d, 0.05)
        
        # 修复形状
        if spring_solid and not spring_solid.isValid():
            spring_solid = spring_solid.removeSplitter()
        
        grind_depth = 0.3 * d
        bottom_cut_z = grind_depth
        top_cut_z = L0 - grind_depth
        
        box_size = Dm * 3
        box_height = d * 5
        
        # 底部切割盒 - 必须穿透弹簧实体
        bottom_box = Part.makeBox(
            box_size, box_size, box_height,
            App.Vector(-box_size/2, -box_size/2, grind_depth + EPS - box_height)
        )
        
        # 顶部切割盒 - 必须穿透弹簧实体
        top_box = Part.makeBox(
            box_size, box_size, box_height,
            App.Vector(-box_size/2, -box_size/2, L0 - grind_depth - EPS)
        )
        
        try:
            cut_result = spring_solid.cut(bottom_box)
            cut_result = cut_result.cut(top_box)
            
            # 如果结果是 Compound，取最大的 Solid
            if cut_result.ShapeType == "Compound" and cut_result.Solids:
                cut_result = max(cut_result.Solids, key=lambda s: s.Volume)
            
            spring_solid = cut_result
            print(f"[Compression Fallback] Ground ends applied: bottom={bottom_cut_z:.2f}, top={top_cut_z:.2f}")
        except Exception as e:
            print(f"[Compression Fallback] Warning: Ground end cutting failed: {e}")
    
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


# NOTE: generate_extension_body_centerline is defined later with full Three.js alignment


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
    # json is already imported at module level
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


def smoothstep01(x):
    """0到1之间的平滑步进函数"""
    t = max(0, min(1, x))
    return t * t * (3 - 2 * t)


def wPitch(theta, thetaClosed, thetaTotal):
    """计算节距权重（用于并紧端处理）"""
    if thetaClosed <= 0: return 1
    if theta < thetaClosed:
        return smoothstep01(theta / thetaClosed)
    if theta > thetaTotal - thetaClosed:
        u = (thetaTotal - theta) / thetaClosed
        return smoothstep01(u)
    return 1


def numericAvgWPitch(thetaClosed, thetaTotal, segments=200):
    """数值计算 wPitch 的平均值，用于反推 pitchActive"""
    if thetaTotal <= 0: return 1
    total = 0
    dTheta = thetaTotal / segments
    for i in range(segments):
        theta = (i + 0.5) * dTheta
        total += wPitch(theta, thetaClosed, thetaTotal)
    return total / segments


def groundWeight(theta, thetaGround, thetaTotal):
    """计算磨平权重"""
    if thetaGround <= 0: return 0
    if theta < thetaGround:
        u = 1 - theta / thetaGround
        return smoothstep01(u)
    if theta > thetaTotal - thetaGround:
        u = 1 - (thetaTotal - theta) / thetaGround
        return smoothstep01(u)
    return 0


def generate_suspension_centerline(params):
    """
    生成悬架弹簧/减震器弹簧中心线点集
    支持变节距、变中径、并紧端和磨平处理
    """
    d = params.get("wireDiameter", 12.0)
    Na = params.get("activeCoils", 6.0)
    Nt_in = params.get("totalCoils", 8.0)
    L0 = params.get("freeLength", 300.0)
    
    pitch_prof = params.get("pitchProfile", {"mode": "uniform"})
    diam_prof = params.get("diameterProfile", {"mode": "constant", "DmStart": 100.0})
    
    # 解析端部定义
    end_type = pitch_prof.get("endType", "closed_ground")
    closed_turns = pitch_prof.get("endClosedTurns", 1.0)
    ground_turns = 0.5 if end_type == "closed_ground" else 0.0
    
    # 悬架弹簧通常总圈数 > 有效圈数
    Nt = Nt_in if Nt_in > Na else Na + 2.0
    
    segments_per_coil = 80
    num_segs = int(max(120, Nt * segments_per_coil))
    theta_total = 2.0 * math.pi * Nt
    d_theta = theta_total / num_segs
    
    has_closed = end_type in ["closed", "closed_ground"]
    theta_closed = 2.0 * math.pi * closed_turns if has_closed else 0.0
    theta_ground = 2.0 * math.pi * ground_turns if end_type == "closed_ground" else 0.0
    
    # 计算 pitchActive 保证总高度一致
    w_avg = numericAvgWPitch(theta_closed, theta_total, num_segs)
    pitch_active = L0 / (Nt * max(w_avg, 0.1))
    
    # 1. 积分生成 Z 坐标
    z_raw = [0.0]
    z_current = 0.0
    
    for i in range(1, num_segs + 1):
        theta_mid = (i - 0.5) * d_theta
        
        # 计算该位置的节距权重
        w = wPitch(theta_mid, theta_closed, theta_total)
        
        # 处理渐进节距 (Two-Stage/Three-Stage)
        p_center = pitch_prof.get("pitchCenter", pitch_active)
        if p_center <= 0: p_center = pitch_active
        
        p_end = pitch_prof.get("pitchEnd", p_center * 0.15)
        
        trans_turns = pitch_prof.get("transitionTurns", 0.75)
        theta_trans = 2.0 * math.pi * trans_turns
        
        p = pitch_active # 默认
        
        if not has_closed:
            p = p_center if pitch_prof.get("mode") != "uniform" else pitch_active
        else:
            # 权重化的节距
            if pitch_prof.get("mode") == "uniform":
                p = pitch_active * w
            else:
                # 渐进模式
                if theta_mid < theta_closed:
                    p = p_end
                elif theta_mid < theta_closed + theta_trans:
                    u = smoothstep01((theta_mid - theta_closed) / theta_trans)
                    p = p_end + (p_center - p_end) * u
                elif theta_mid > theta_total - (theta_closed + theta_trans):
                    if theta_mid < theta_total - theta_closed:
                        u = smoothstep01((theta_total - theta_closed - theta_mid) / theta_trans)
                        p = p_end + (p_center - p_end) * u
                    else:
                        p = p_end
                else:
                    p = p_center
        
        z_current += (p / (2.0 * math.pi)) * d_theta
        z_raw.append(z_current)
        
    z_end = z_raw[-1]
    
    # 2. 磨平处理 (Flattening)
    z_flattened = []
    for i in range(num_segs + 1):
        theta = i * d_theta
        z = z_raw[i]
        
        if end_type == "closed_ground" and theta_ground > 0:
            wg = groundWeight(theta, theta_ground, theta_total)
            if theta < theta_ground:
                z = z * (1.0 - wg) # 向 0 靠拢
            elif theta > theta_total - theta_ground:
                z = z_end - (z_end - z) * (1.0 - wg) # 向 z_end 靠拢
        
        z_flattened.append(z)
        
    # 3. 修正 Z 缩放
    total_h_flat = z_flattened[-1] - z_flattened[0]
    scale_z = L0 / total_h_flat if total_h_flat > 1e-6 else 1.0
    
    # 4. 生成 3D 点
    points = []
    for i in range(num_segs + 1):
        theta = i * d_theta
        
        # 计算该位置的中径 Dm
        t_pos = theta / theta_total
        mode_d = diam_prof.get("mode", "constant")
        dm_start = diam_prof.get("DmStart", 100.0)
        dm_mid = diam_prof.get("DmMid", 120.0)
        dm_end = diam_prof.get("DmEnd", 100.0)
        
        if mode_d == "constant":
            dm = dm_start
        elif mode_d == "conical":
            dm = dm_start + (dm_end - dm_start) * t_pos
        elif mode_d == "barrel":
            if t_pos < 0.5:
                u = smoothstep01(t_pos / 0.5)
                dm = dm_start + (dm_mid - dm_start) * u
            else:
                u = smoothstep01((t_pos - 0.5) / 0.5)
                dm = dm_mid + (dm_end - dm_mid) * u
        else:
            dm = dm_start
            
        R_pos = dm / 2.0
        x = R_pos * math.cos(theta)
        y = R_pos * math.sin(theta)
        z = (z_flattened[i] - z_flattened[0]) * scale_z
        
        points.append(App.Vector(x, y, z))
        
    return points, 0.0, L0

def generate_variable_pitch_centerline(params):
    """
    生成变节距压缩弹簧中心线
    """
    wire_diameter = params.get("wireDiameter", 3.2)
    mean_diameter = params.get("meanDiameter", 24.0)
    total_coils = params.get("totalCoils", 10)
    active_coils = params.get("activeCoils", 8)
    segments = params.get("segments", [])
    
    R = mean_diameter / 2.0
    d = wire_diameter
    
    # 采样参数
    num_samples = 800
    total_angle = 2.0 * math.pi * total_coils
    
    dead_coils = total_coils - active_coils
    dead_coils_per_end = dead_coils / 2.0
    
    points = []
    min_z = float('inf')
    max_z = float('-inf')
    
    for i in range(num_samples + 1):
        t = i / num_samples
        theta = t * total_angle
        n = theta / (2.0 * math.pi)
        
        z = 0
        if n <= dead_coils_per_end:
            z = n * d
        elif n >= total_coils - dead_coils_per_end:
            active_height = 0
            for seg in segments:
                active_height += seg.get('coils', 0) * seg.get('pitch', 0)
            
            n_top = n - (total_coils - dead_coils_per_end)
            z = dead_coils_per_end * d + active_height + n_top * d
        else:
            n_active = n - dead_coils_per_end
            z = dead_coils_per_end * d
            
            curr_n = 0
            for seg in segments:
                s_coils = seg.get('coils', 0)
                s_pitch = seg.get('pitch', 0)
                if curr_n + s_coils >= n_active:
                    z += (n_active - curr_n) * s_pitch
                    break
                else:
                    z += s_coils * s_pitch
                    curr_n += s_coils
        
        x = R * math.cos(theta)
        y = R * math.sin(theta)
        
        p = App.Vector(x, y, z)
        points.append(p)
        min_z = min(min_z, z)
        max_z = max(max_z, z)
        
    return points, min_z, max_z


def make_variable_pitch_compression_spring(params):
    """
    生成变节距压缩弹簧
    """
    d = params.get("wireDiameter", 3.2)
    Dm = params.get("meanDiameter", 24.0)
    total_coils = params.get("totalCoils", 10)
    ground_ends = params.get("groundEnds", True)
    
    points, min_z, max_z = generate_variable_pitch_centerline(params)
    path = make_bspline_from_points(points)
    spring_solid = sweep_wire_along_path(path, d)
    
    if ground_ends and spring_solid:
        EPS = max(0.05 * d, 0.05)
        if not spring_solid.isValid():
            spring_solid = spring_solid.removeSplitter()
        
        grind_depth = 0.3 * d
        
        box_size = Dm * 3
        box_height = d * 5
        
        bottom_box = Part.makeBox(
            box_size, box_size, box_height,
            App.Vector(-box_size/2, -box_size/2, grind_depth + EPS - box_height)
        )
        
        top_box = Part.makeBox(
            box_size, box_size, box_height,
            App.Vector(-box_size/2, -box_size/2, max_z - grind_depth - EPS)
        )
        
        try:
            cut_result = spring_solid.cut(bottom_box)
            cut_result = cut_result.cut(top_box)
            if cut_result.ShapeType == "Compound" and cut_result.Solids:
                cut_result = max(cut_result.Solids, key=lambda s: s.Volume)
            spring_solid = cut_result
        except Exception as e:
            print(f"[VariablePitch] Ground end cutting failed: {e}")
            
    return spring_solid

def make_suspension_spring(params):
    """
    生成悬架弹簧/减震器弹簧固态模型
    """
    d = params.get("wireDiameter", 12.0)
    pitch_prof = params.get("pitchProfile", {})
    end_type = pitch_prof.get("endType", "closed_ground")
    
    # 1. 生成中心线
    points, min_z, max_z = generate_suspension_centerline(params)
    
    # 2. 创建 B-Spline 路径并进行平面扫掠
    path = make_bspline_from_points(points)
    spring_solid = sweep_wire_along_path(path, d)
    
    # 3. 处理磨平 (端部切削)
    if end_type == "closed_ground" and spring_solid:
        EPS = max(0.05 * d, 0.05)
        if not spring_solid.isValid():
            spring_solid = spring_solid.removeSplitter()
        
        grind_depth = d * 0.4
        dm_start = params.get("diameterProfile", {}).get("DmStart", 100.0)
        box_size = dm_start * 4
        box_height = d * 6
        
        bottom_box = Part.makeBox(
            box_size, box_size, box_height,
            App.Vector(-box_size/2, -box_size/2, grind_depth + EPS - box_height)
        )
        
        top_box = Part.makeBox(
            box_size, box_size, box_height,
            App.Vector(-box_size/2, -box_size/2, max_z - grind_depth - EPS)
        )
        
        try:
            cut_result = spring_solid.cut(bottom_box)
            cut_result = cut_result.cut(top_box)
            
            if cut_result.ShapeType == "Compound" and cut_result.Solids:
                cut_result = max(cut_result.Solids, key=lambda s: s.Volume)
            
            spring_solid = cut_result
            print(f"[Suspension] Boolean cut applied: max_z={max_z:.2f}")
        except Exception as e:
            print(f"[Suspension] Warning: Boolean cut failed: {e}")
            
    return spring_solid


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
# 扭转弹簧生成器 v2（平面线圈 + 切线腿，与 Three.js 对齐）
# =============================================================================

def normalize_torsion_params(geom: dict) -> dict:
    """
    扭簧参数归一化：
      - 统一 meanDiameter / outerDiameter
      - 补全 activeCoils / legLength1 / legLength2 / windingDirection / freeAngle
    """
    d = geom.get("wireDiameter", 1.5)

    # 圈数
    Na = geom.get("activeCoils")
    if Na is None or Na <= 0:
        Na = 6
        print(f"[torsion normalize] WARNING: activeCoils missing, use default {Na}")

    # 中径：优先 meanDiameter，其次 outerDiameter - d
    Dm = geom.get("meanDiameter")
    OD = geom.get("outerDiameter")
    if Dm is None or Dm <= 0.0:
        if OD is not None and OD > 0:
            Dm = OD - d
            print(f"[torsion normalize] Converted outerDiameter {OD} -> meanDiameter {Dm}")
        else:
            Dm = 12.0
            print(f"[torsion normalize] WARNING: meanDiameter missing, use default {Dm}")
    if OD is None or OD <= 0.0:
        OD = Dm + d

    # 腿长
    L1 = geom.get("legLength1", geom.get("legLength", 25.0))
    L2 = geom.get("legLength2", geom.get("legLength", 25.0))

    # 旋向
    winding = geom.get("windingDirection", "right")
    if winding not in ("right", "left"):
        winding = "right"

    # freeAngle 和 workingAngle（控制腿之间夹角）
    free_angle = geom.get("freeAngle", 90.0)
    working_angle = geom.get("workingAngle", 0.0)

    result = {
        **geom,
        "wireDiameter": d,
        "activeCoils": Na,
        "meanDiameter": Dm,
        "outerDiameter": OD,
        "legLength1": L1,
        "legLength2": L2,
        "windingDirection": winding,
        "freeAngle": free_angle,
        "workingAngle": working_angle,
    }

    print(
        f"[torsion normalize] d={d}, Na={Na}, Dm={Dm}, "
        f"L1={L1}, L2={L2}, winding={winding}, freeAngle={free_angle}"
    )
    return result


def normalize_angle_torsion(angle):
    """
    Normalize angle to (-π, π]
    与 Three.js normalizeAngle 完全一致
    """
    TWO_PI = 2.0 * math.pi
    a = angle % TWO_PI
    if a <= -math.pi:
        a += TWO_PI
    if a > math.pi:
        a -= TWO_PI
    return a


def calculate_torsion_total_angle(active_coils, free_angle_deg, working_angle_deg, winding_direction):
    """
    计算扭簧总角度，使得两条腿之间的夹角等于 freeAngle - workingAngle
    与 Three.js calculateHelixTotalAngle 完全一致
    
    数学推导：
    - Leg1 在 θ=0, 腿角度 = -90°
    - Leg2 在 θ=totalAngle, 腿角度 = 90° - totalAngle
    - 两腿夹角 = 180° - totalAngle (mod 360°)
    - 要得到目标夹角: totalAngle = 180° - targetAngle (mod 360°)
    """
    TWO_PI = 2.0 * math.pi
    dir_mult = -1.0 if winding_direction == "left" else 1.0
    
    # 当前腿间夹角（度 → 弧度）
    current_leg_angle_rad = math.radians(free_angle_deg - working_angle_deg)
    
    # 基础角度（完整圈数）
    base_angle = TWO_PI * active_coils
    
    # 目标结束角度 (mod 2π): θ_total ≡ π - currentLegAngle
    target_end_angle = normalize_angle_torsion(math.pi - current_leg_angle_rad)
    base_end_angle = normalize_angle_torsion(base_angle)
    
    # 额外旋转（取最小调整量）
    extra_angle = normalize_angle_torsion(target_end_angle - base_end_angle)
    
    # 总角度
    total_angle = base_angle + extra_angle
    
    print(f"[torsion angle] activeCoils={active_coils}, freeAngle={free_angle_deg}°")
    print(f"[torsion angle] base={math.degrees(base_angle):.1f}°, extra={math.degrees(extra_angle):.1f}°")
    print(f"[torsion angle] total_angle={math.degrees(total_angle):.1f}° ({total_angle/(TWO_PI):.2f} coils)")
    
    return total_angle * dir_mult


def generate_torsion_body_centerline(params):
    """
    生成扭簧"本体"中心线（螺旋，pitch = wireDiameter）
    
    与 Three.js generateTorsionBodyCenterline 完全一致：
      - 使用 calculateHelixTotalAngle 计算总角度（控制腿夹角）
      - Z = t * L，其中 L = pitch * actualCoils
    """
    d = params["wireDiameter"]
    Dm = params["meanDiameter"]
    Na = params["activeCoils"]
    winding = params["windingDirection"]
    free_angle = params.get("freeAngle", 90.0)
    working_angle = params.get("workingAngle", 0.0)
    
    # pitch：扭簧的节距，默认等于线径（紧密缠绕）
    pitch = params.get("pitch", d)

    R = Dm / 2.0
    
    # 使用 Three.js 的算法计算总角度（考虑 freeAngle 控制腿夹角）
    total_angle = calculate_torsion_total_angle(Na, free_angle, working_angle, winding)
    
    # 体长 = pitch × 实际圈数
    actual_coils = abs(total_angle) / (2.0 * math.pi)
    body_length = pitch * actual_coils

    # 采样精度：每圈约 90 个点（略高于 Three.js，提升光滑度）
    samples_per_turn = 90
    num_samples = max(500, int(actual_coils * samples_per_turn))

    pts = []
    for i in range(num_samples + 1):
        t = i / num_samples
        theta = t * total_angle
        x = R * math.cos(theta)
        y = R * math.sin(theta)
        z = t * body_length  # ✅ 与 Three.js 一致：z = t * L
        pts.append(App.Vector(x, y, z))

    print(f"[torsion body] {len(pts)} points, R={R}, pitch={pitch}, bodyLength={body_length:.2f}")
    print(f"[torsion body] actual_coils={actual_coils:.2f}")
    return pts, total_angle


def make_torsion_spring(params):
    """
    扭转弹簧 v2：
      1. normalize_torsion_params 统一参数
      2. generate_torsion_body_centerline 生成平面线圈中心线（Z=0）
      3. 从起点/终点切线方向生成两条腿（直线）
      4. 三段中心线合并后，调用 sweep_wire_along_path 一次扫掠

    关键：使用 freeAngle 控制两条腿之间的夹角（与 Three.js 一致）
    """
    # 1) 归一化参数
    params = normalize_torsion_params(params)

    d = params["wireDiameter"]
    L1 = params["legLength1"]
    L2 = params["legLength2"]

    # 2) 本体中心线（平面圆线圈，Z=0）
    body_pts, total_angle = generate_torsion_body_centerline(params)
    if len(body_pts) < 3:
        raise RuntimeError("Not enough points for torsion spring body")

    start_pos = body_pts[0]
    end_pos = body_pts[-1]
    
    winding = params["windingDirection"]
    dir_mult = -1.0 if winding == "left" else 1.0

    # 3) 计算切线方向（与 Three.js 完全一致）
    # 注意：total_angle 已经包含了 dir_mult，所以计算切线时要用绝对值
    # Three.js 在 generateLegGeometry 中使用的是 bodyEndAngle（不带 dir_mult 的原始角度）
    
    # 计算不带 dir_mult 的原始结束角度
    raw_end_angle = abs(total_angle)  # 去掉方向符号
    
    # Leg1 at start (θ = 0)
    # tangent at θ=0: (-sin(0), cos(0)) = (0, 1)
    tangent1_x = 0
    tangent1_y = 1
    # Leg1 extends OPPOSITE to helix travel
    leg1_dir = App.Vector(
        -tangent1_x * dir_mult,
        -tangent1_y * dir_mult,
        0
    )
    
    # Leg2 at end (θ = raw_end_angle)
    # tangent at θ: (-sin(θ), cos(θ))
    tangent2_x = -math.sin(raw_end_angle)
    tangent2_y = math.cos(raw_end_angle)
    # Leg2 extends in SAME direction as helix travel
    sign = 1.0 if winding == "right" else -1.0
    leg2_dir = App.Vector(
        tangent2_x * sign,
        tangent2_y * sign,
        0
    )

    print(f"[torsion] total_angle={math.degrees(total_angle):.1f}°, raw_end_angle={math.degrees(raw_end_angle):.1f}°")
    print(f"[torsion] leg1_dir=({leg1_dir.x:.3f}, {leg1_dir.y:.3f}), "
          f"leg2_dir=({leg2_dir.x:.3f}, {leg2_dir.y:.3f})")

    # ===== 3. 生成两条腿的直线 Edge =====
    leg1_end = App.Vector(start_pos.x + leg1_dir.x * L1,
                          start_pos.y + leg1_dir.y * L1,
                          start_pos.z)
    leg2_end = App.Vector(end_pos.x + leg2_dir.x * L2,
                          end_pos.y + leg2_dir.y * L2,
                          end_pos.z)

    print(f"[torsion] leg1: ({leg1_end.x:.2f},{leg1_end.y:.2f}) -> ({start_pos.x:.2f},{start_pos.y:.2f})")
    print(f"[torsion] leg2: ({end_pos.x:.2f},{end_pos.y:.2f}) -> ({leg2_end.x:.2f},{leg2_end.y:.2f})")

    # 4) 用 Edge 拼接（保持腿为直线，不被 B-Spline 弯曲）
    # Leg1: 直线 Edge
    leg1_edge = Part.makeLine(leg1_end, start_pos)
    
    # Body: B-Spline Edge
    body_path = make_bspline_from_points(body_pts)
    
    # Leg2: 直线 Edge
    leg2_edge = Part.makeLine(end_pos, leg2_end)

    # 5) 拼成 Wire：腿1 -> 线圈 -> 腿2
    if hasattr(body_path, "Edges"):
        edges = [leg1_edge] + list(body_path.Edges) + [leg2_edge]
    else:
        edges = [leg1_edge, body_path, leg2_edge]
    
    wire = Part.Wire(edges)
    print(f"[torsion] Wire created with {len(wire.Edges)} edges")

    # 6) 扫掠
    spring_solid = sweep_wire_along_path(wire, d)

    if spring_solid is None or spring_solid.isNull():
        raise RuntimeError("Torsion spring sweep failed")

    print(f"[torsion] Generated spring: ShapeType={spring_solid.ShapeType}, "
          f"Volume={spring_solid.Volume:.2f}, Area={spring_solid.Area:.2f}")
    return spring_solid


# =============================================================================
# 螺旋扭转弹簧生成器 (Spiral Torsion Spring - 带材卷绕式)
# 与 Three.js spiralTorsionGeometry.ts 完全同步
# =============================================================================

def make_spiral_torsion_spring(params):
    """
    螺旋扭转弹簧 (Spiral Torsion Spring) - 带材卷绕式
    
    与 Three.js spiralTorsionGeometry.ts 完全同步的算法:
    - 阿基米德螺线中心线: r(θ) = r_i + a·θ
    - 矩形截面: 宽度 = stripWidth (b), 厚度 = stripThickness (t)
    - 内端: 直线穿过轴心 + 小弧过渡
    - 外端: 直臂 + 90°折弯 + 侧边 + 顶部
    
    参数:
        innerDiameter: 内径 Di (mm)
        outerDiameter: 外径 Do (mm)
        turns: 圈数 N
        stripWidth: 带材宽度 b (mm)
        stripThickness: 带材厚度 t (mm)
        handedness: 绕向 "cw" | "ccw"
    """
    import time
    t0 = time.time()
    def mark(msg):
        print(f"[spiral_torsion {time.time()-t0:8.3f}s] {msg}", flush=True)
    
    mark("start")
    
    # 提取参数
    Di = params.get("innerDiameter", 12.7)
    Do = params.get("outerDiameter", 50.0)
    N = params.get("turns", 4.5)
    b = params.get("stripWidth", 6.35)
    t = params.get("stripThickness", 0.81)
    handedness = params.get("handedness", "ccw")
    
    # 计算几何参数
    inner_radius = Di / 2.0
    outer_radius = Do / 2.0
    total_angle = 2.0 * math.pi * N
    a = (outer_radius - inner_radius) / total_angle  # 螺距系数
    
    # 端部几何参数 (与 Three.js 一致)
    inner_leg_length = max(b * 1.2, 10.0)
    outer_leg_length = max(3.0 * b, 25.0)
    hook_depth = max(0.45 * b, 5.0)
    hook_gap = max(0.9 * b, 8.0)
    bend_radius = max(3.0 * t, 3.0)
    inner_arc_radius = max(2.0 * t, 2.0)
    
    # 采样参数
    spiral_pts_count = 400
    inner_leg_segments = 15
    inner_arc_segments = 12  # 增加内端小弧采样
    outer_leg_segments = 20
    bend_segments = 24       # 增加 90° 折弯采样
    hook_side_segments = 6
    hook_top_segments = 40   # 增加 U 钩顶部圆弧采样
    
    Z = App.Vector(0, 0, 1)
    
    print(f"[spiral_torsion] Di={Di}, Do={Do}, N={N}, b={b}, t={t}")
    print(f"[spiral_torsion] inner_leg={inner_leg_length:.2f}, outer_leg={outer_leg_length:.2f}")
    
    # ========================================
    # 1. 螺旋部分点列 (阿基米德螺线)
    # ========================================
    spiral_pts = []
    for i in range(spiral_pts_count + 1):
        u = i / spiral_pts_count
        theta = u * total_angle
        r = inner_radius + a * theta
        angle = theta if handedness == "ccw" else -theta
        x = r * math.cos(angle)
        y = r * math.sin(angle)
        spiral_pts.append(App.Vector(x, y, 0))
    
    # 螺旋切线
    def get_spiral_tangent(idx):
        if idx == 0:
            return (spiral_pts[1] - spiral_pts[0]).normalize()
        elif idx == len(spiral_pts) - 1:
            return (spiral_pts[-1] - spiral_pts[-2]).normalize()
        else:
            return (spiral_pts[idx + 1] - spiral_pts[idx - 1]).normalize()
    
    t_spiral_start = get_spiral_tangent(0)
    t_spiral_end = get_spiral_tangent(len(spiral_pts) - 1)
    
    p_start = spiral_pts[0]
    p_end = spiral_pts[-1]
    
    # ========================================
    # 2. 内端固定臂 - 直线穿过轴心 + 小弧过渡
    # ========================================
    # 径向内方向 (指向轴心)
    radial_in = App.Vector(-p_start.x, -p_start.y, 0)
    if radial_in.Length > 1e-12:
        radial_in.normalize()
    else:
        radial_in = App.Vector(-1, 0, 0)
    
    # 内端直线切线 (从轴心往外)
    t_inner_leg = radial_in * (-1)
    
    # 计算小弧参数
    dot_inner = t_inner_leg.dot(t_spiral_start)
    inner_arc_angle = math.acos(max(-1, min(1, dot_inner)))
    
    # 小弧旋转轴
    inner_arc_axis = t_inner_leg.cross(t_spiral_start)
    if inner_arc_axis.Length < 1e-12:
        inner_arc_axis = Z
    else:
        inner_arc_axis.normalize()
    
    # 圆弧圆心 (从 p_start 反推，确保圆弧终点在 p_start)
    n_arc_at_end = inner_arc_axis.cross(t_spiral_start)
    n_arc_at_end.normalize()
    arc_center = p_start + n_arc_at_end * inner_arc_radius
    
    # 圆弧起点
    n_arc_at_start = App.Vector(n_arc_at_end.x, n_arc_at_end.y, n_arc_at_end.z)
    # 绕 inner_arc_axis 旋转 -inner_arc_angle
    rot = App.Rotation(inner_arc_axis, math.degrees(-inner_arc_angle))
    n_arc_at_start = rot.multVec(n_arc_at_start) * (-1)
    p_arc_start = arc_center + n_arc_at_start * inner_arc_radius
    
    # 直线终点 (往轴心方向延伸)
    p_inner_end = p_arc_start + radial_in * inner_leg_length
    
    # 生成内端点列
    inner_pts = []
    
    # 2a. 内端直线
    for i in range(inner_leg_segments):
        u = i / inner_leg_segments
        p = p_inner_end + (p_arc_start - p_inner_end) * u
        inner_pts.append(p)
    
    # 2b. 内端小弧
    radius_vec = p_arc_start - arc_center
    for i in range(1, inner_arc_segments + 1):
        phi = (i / inner_arc_segments) * inner_arc_angle
        rot = App.Rotation(inner_arc_axis, math.degrees(phi))
        p = arc_center + rot.multVec(radius_vec)
        inner_pts.append(p)
    
    # ========================================
    # 3. 外端几何 - 直臂 + 90°折弯 + 侧边 + 顶部
    # ========================================
    # 外端局部坐标系
    ex = App.Vector(t_spiral_end.x, t_spiral_end.y, t_spiral_end.z)
    ex.normalize()
    
    # 径向外方向
    R_end = App.Vector(p_end.x, p_end.y, 0)
    if R_end.Length > 1e-12:
        R_end.normalize()
    else:
        R_end = App.Vector(1, 0, 0)
    
    # ey = R 投影到 ⟂ex 平面
    ey = R_end - ex * R_end.dot(ex)
    if ey.Length < 1e-9:
        ey = App.Vector(-ex.y, ex.x, 0)
    ey.normalize()
    
    # 右手系修正
    if ex.cross(ey).dot(Z) < 0:
        ey = ey * (-1)
    
    ez = Z
    
    outer_pts = []
    
    # 3a. 外端直臂 (不包含起点 p_end，因为它已在 spiral_pts 末尾)
    leg_len = max(outer_leg_length - bend_radius, 0)
    Q0 = p_end + ex * leg_len  # 直臂终点 = 折弯起点
    
    for i in range(1, outer_leg_segments + 1):
        u = (i / outer_leg_segments) * leg_len
        p = p_end + ex * u
        outer_pts.append(p)
    
    # 3b. 90° 折弯圆角 (从 i=1 开始，因为 i=0 的点就是 Q0，已在直臂末尾)
    for i in range(1, bend_segments + 1):
        phi = (i / bend_segments) * (math.pi / 2)
        p = Q0 + ex * (bend_radius * math.sin(phi)) + ey * (bend_radius * (1 - math.cos(phi)))
        outer_pts.append(p)
    
    end_bend = outer_pts[-1]  # 折弯终点
    
    # 3c. 侧边直线 (从 i=1 开始，因为 i=0 的点就是 end_bend)
    side_len = max(hook_depth - bend_radius, 0)
    Q1 = end_bend + ey * side_len  # 侧边终点
    
    if side_len > 0:
        for i in range(1, hook_side_segments + 1):
            u = i / hook_side_segments
            p = end_bend + (Q1 - end_bend) * u
            outer_pts.append(p)
    
    # 3d. 顶部直线 (hookTopMode = "line")
    g = hook_gap
    Q2 = Q1 - ex * g
    
    for i in range(1, hook_top_segments + 1):
        u = i / hook_top_segments
        p = Q1 + (Q2 - Q1) * u
        outer_pts.append(p)
    
    # ========================================
    # 4. 合并所有点列
    # ========================================
    all_pts = inner_pts + spiral_pts + outer_pts
    
    mark(f"points generated: {len(all_pts)} (inner={len(inner_pts)}, spiral={len(spiral_pts)}, outer={len(outer_pts)})")
    
    # ========================================
    # 5. 创建 B-Spline 路径
    # ========================================
    mark("before bspline")
    path = make_bspline_from_points(all_pts)
    mark("after bspline")
    
    # ========================================
    # 6. 创建矩形截面并扫掠
    # ========================================
    # 获取起点和切线
    if hasattr(path, 'Edges'):
        path_wire = Part.Wire(path.Edges)
    else:
        path_wire = Part.Wire([path])
    
    start_point = path_wire.Vertexes[0].Point
    first_edge = path_wire.Edges[0]
    tangent = first_edge.tangentAt(first_edge.FirstParameter)
    
    # 计算截面法向 (厚度方向)
    # 使用径向投影法
    radial = App.Vector(start_point.x, start_point.y, 0)
    if radial.Length < 1e-12:
        radial = App.Vector(1, 0, 0)
    else:
        radial.normalize()
    
    # N = radial 投影到 ⟂tangent 平面
    normal = radial - tangent * radial.dot(tangent)
    if normal.Length < 1e-9:
        normal = App.Vector(-tangent.y, tangent.x, 0)
    normal.normalize()
    
    # B = tangent × normal
    binormal = tangent.cross(normal)
    binormal.normalize()
    
    # 创建矩形截面 (厚度沿 normal, 宽度沿 binormal)
    half_t = t / 2.0
    half_b = b / 2.0
    
    # 矩形四个角点
    p1 = start_point - normal * half_t - binormal * half_b
    p2 = start_point + normal * half_t - binormal * half_b
    p3 = start_point + normal * half_t + binormal * half_b
    p4 = start_point - normal * half_t + binormal * half_b
    
    rect_wire = Part.makePolygon([p1, p2, p3, p4, p1])
    rect_face = Part.Face(rect_wire)
    
    # 扫掠 - 对直线段使用 loft 而不是 sweep 来避免截面扭转
    mark("before sweep")
    
    # 方法：对整条路径使用 makePipe (不是 makePipeShell)
    # makePipe 使用 "corrected Frenet" 模式，对直线段更稳定
    try:
        spring_solid = path_wire.makePipe(rect_face)
        if spring_solid.ShapeType == "Shell":
            spring_solid = Part.Solid(spring_solid)
        mark("makePipe succeeded")
    except Exception as e:
        mark(f"makePipe failed: {e}, trying makePipeShell")
        try:
            spring_solid = path_wire.makePipeShell([rect_wire], True, True)
            mark("makePipeShell succeeded")
        except Exception as e2:
            mark(f"makePipeShell failed: {e2}")
            raise RuntimeError("Spiral torsion spring sweep failed")
    
    if spring_solid is None or spring_solid.isNull():
        raise RuntimeError("Spiral torsion spring sweep failed")
    
    mark(f"done: ShapeType={spring_solid.ShapeType}, Volume={spring_solid.Volume:.2f}")
    
    return spring_solid


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
    
    参数:
        params: {
            wireDiameter: 线径 (mm)
            largeOuterDiameter: 大端外径 (mm)
            smallOuterDiameter: 小端外径 (mm)
            activeCoils: 有效圈数 Na
            totalCoils: 总圈数 Nt (= Na + deadTop + deadBottom)
            freeLength: 自由长度 L0 (mm)
            endType: 端面形式 ("natural" | "closed" | "closed_ground")
            leftHanded: 是否左旋 (可选)
        }
    
    返回:
        (centerline_pts, min_z, max_z)
    
    工业级设计 (DIN / GB 标准):
    - Dead Coils: 密绕端圈，pitch → ε (不为0)
    - Active Coils: 线性变径螺旋
    - Ground: 后处理切割 (在 make_conical_spring 中执行)
    """
    d = params.get("wireDiameter", 3.0)
    D_large_outer = params.get("largeOuterDiameter", 30.0)
    D_small_outer = params.get("smallOuterDiameter", 15.0)
    Na = params.get("activeCoils", 6)
    Nt = params.get("totalCoils", Na)
    L0 = params.get("freeLength", 50.0)
    end_type = params.get("endType", "natural")
    left_handed = params.get("leftHanded", False)
    
    # 中径半径: 外径减掉一根线径
    R_large = (D_large_outer - d) / 2.0
    R_small = (D_small_outer - d) / 2.0
    
    sign = -1 if left_handed else 1
    steps_per_turn = 50  # 每圈采样点数
    
    # ================================================================
    # 工业级 Dead Coil 参数 (DIN 2096 / GB/T 1239)
    # ================================================================
    # 密绕节距: 接近线径但略小，确保密绕效果
    # 工业标准: 死圈节距 ≈ 线径 (相邻圈接触)
    DEAD_PITCH = d * 0.95  # 密绕节距，略小于线径避免干涉
    
    # 判断是否有死圈
    has_dead_coils = end_type in ("closed", "closed_ground")
    
    if has_dead_coils:
        # 死圈数 = (Nt - Na) / 2，每端各一半
        total_dead_turns = max(0, Nt - Na)
        dead_turns_per_end = total_dead_turns / 2.0
        if dead_turns_per_end < 0.5:
            dead_turns_per_end = 1.0  # 最少每端 1 圈死圈
    else:
        dead_turns_per_end = 0.0
    
    # 计算各段高度
    dead_height_per_end = dead_turns_per_end * DEAD_PITCH
    active_length = L0 - 2 * dead_height_per_end
    
    if active_length <= 0:
        # 如果自由长度太短，回退到无死圈模式
        print(f"[Conical] Warning: freeLength too short for dead coils, falling back to open end")
        has_dead_coils = False
        dead_turns_per_end = 0.0
        dead_height_per_end = 0.0
        active_length = L0
    
    # 活动圈节距
    active_pitch = active_length / Na if Na > 0 else d
    
    print(f"[Conical] endType={end_type}, Na={Na}, Nt={Nt}")
    print(f"[Conical] dead_turns_per_end={dead_turns_per_end:.2f}, dead_height={dead_height_per_end:.2f}")
    print(f"[Conical] active_length={active_length:.2f}, active_pitch={active_pitch:.2f}")
    
    centerline_pts = []
    current_theta = 0.0
    current_z = 0.0
    
    # ================================================================
    # 1. Bottom Dead Coil (密绕，半径 = R_large)
    # ================================================================
    if has_dead_coils and dead_turns_per_end > 0:
        num_samples = max(20, int(dead_turns_per_end * steps_per_turn))
        for i in range(num_samples + 1):
            t = i / float(num_samples)
            theta = current_theta + 2.0 * math.pi * dead_turns_per_end * t * sign
            z = current_z + DEAD_PITCH * dead_turns_per_end * t
            
            # 底部死圈: 半径固定为大端
            R = R_large
            
            x = R * math.cos(theta)
            y = R * math.sin(theta)
            centerline_pts.append(App.Vector(x, y, z))
        
        # 更新起点
        current_theta += 2.0 * math.pi * dead_turns_per_end * sign
        current_z += dead_height_per_end
    
    # ================================================================
    # 2. Active Coils (线性变径螺旋)
    # ================================================================
    active_start_z = current_z
    num_samples = max(200, int(Na * steps_per_turn))
    
    for i in range(num_samples + 1):
        t = i / float(num_samples)
        theta = current_theta + 2.0 * math.pi * Na * t * sign
        z = current_z + active_length * t
        
        # 半径线性插值: 大端 → 小端
        R = R_large + (R_small - R_large) * t
        
        x = R * math.cos(theta)
        y = R * math.sin(theta)
        
        # 避免与底部死圈最后一点重复
        if i > 0 or not has_dead_coils:
            centerline_pts.append(App.Vector(x, y, z))
    
    # 更新起点
    current_theta += 2.0 * math.pi * Na * sign
    current_z += active_length
    
    # ================================================================
    # 3. Top Dead Coil (密绕，半径 = R_small)
    # ================================================================
    if has_dead_coils and dead_turns_per_end > 0:
        num_samples = max(20, int(dead_turns_per_end * steps_per_turn))
        for i in range(num_samples + 1):
            t = i / float(num_samples)
            theta = current_theta + 2.0 * math.pi * dead_turns_per_end * t * sign
            z = current_z + DEAD_PITCH * dead_turns_per_end * t
            
            # 顶部死圈: 半径固定为小端
            R = R_small
            
            x = R * math.cos(theta)
            y = R * math.sin(theta)
            
            # 避免与活动圈最后一点重复
            if i > 0:
                centerline_pts.append(App.Vector(x, y, z))
    
    min_z = 0.0
    max_z = L0
    
    print(f"[Conical] Generated {len(centerline_pts)} centerline points")
    
    return centerline_pts, min_z, max_z


def make_conical_spring(params):
    """
    生成锥形压缩弹簧实体 (改进版)
    
    特性:
    - 均匀螺旋 + 半径线性插值 (无死圈分段，末圈更光滑)
    - 支持端面磨平 (通过 endType 参数控制)
    - 与 Three.js 算法风格统一
    
    参数:
        params: {
            wireDiameter: 线径 (mm)
            largeOuterDiameter: 大端外径 (mm)
            smallOuterDiameter: 小端外径 (mm)
            activeCoils: 有效圈数 Na
            totalCoils: 总圈数 Nt (可选, 默认等于 Na)
            freeLength: 自由长度 L0 (mm)
            leftHanded: 是否左旋 (可选)
            endType: 端面类型 (natural/closed/closed_ground)
            groundEnds: 端面磨平 (兼容旧参数)
        }
    """
    d = params.get("wireDiameter", 3.0)
    D_large_outer = params.get("largeOuterDiameter", 30.0)
    
    # 端面类型: 优先使用 endType，兼容旧的 groundEnds 参数
    end_type = params.get("endType", "natural")
    ground_ends_legacy = params.get("groundEnds", False)
    # 只有 closed_ground 才磨端，或者旧参数 groundEnds=True
    should_grind = (end_type == "closed_ground") or ground_ends_legacy
    
    print(f"[Conical] endType={end_type}, groundEnds={ground_ends_legacy}, should_grind={should_grind}")
    
    # 生成中心线
    centerline_pts, min_z, max_z = generate_conical_centerline(params)
    
    print(f"Conical spring centerline: {len(centerline_pts)} points, z=[{min_z:.2f}, {max_z:.2f}]")
    
    # B-Spline 路径
    path_shape = make_bspline_from_points(centerline_pts)
    
    # 扫掠生成实体
    spring_solid = sweep_wire_along_path(path_shape, d)
    
    if spring_solid is None or spring_solid.isNull():
        raise RuntimeError("Conical spring sweep failed")
    
    # 端面磨平 (只有 closed_ground 才执行)
    if should_grind:
        # ============================================================
        # 工程级容差 - 解决 OCC/FreeCAD 布尔运算稳健性问题
        # 切割盒必须"穿透"被切实体，而不是刚好对齐
        # ============================================================
        EPS = max(0.05 * d, 0.05)  # 工程级容差
        
        # 修复形状 - 提高布尔运算成功率
        if not spring_solid.isValid():
            print(f"[Conical] Spring shape is invalid, attempting to fix...")
            spring_solid = spring_solid.removeSplitter()
            print(f"[Conical] After removeSplitter: isValid={spring_solid.isValid()}")
        
        # 使用中心线的 min_z/max_z（而不是 BoundBox）
        # 因为 BoundBox 包含了圆截面的延伸，不是实际的切割位置
        # min_z 和 max_z 是中心线的 Z 范围，代表弹簧的"工程"高度
        L0 = params.get("freeLength", 40.0)
        
        grind_depth = 0.3 * d
        # 底部切割：切掉 Z < grind_depth 的部分
        bottom_cut_z = grind_depth
        # 顶部切割：切掉 Z > (L0 - grind_depth) 的部分
        top_cut_z = L0 - grind_depth
        
        box_size = D_large_outer * 3
        box_height = d * 5  # 足够高的盒子，确保覆盖圆截面延伸
        
        # 底部切割盒 - 切掉 Z < grind_depth 的部分
        # 盒子从 Z = -很大 到 Z = grind_depth + EPS
        bottom_box = Part.makeBox(
            box_size, box_size, box_height,
            App.Vector(-box_size/2, -box_size/2, grind_depth + EPS - box_height)
        )
        
        # 顶部切割盒 - 切掉 Z > (L0 - grind_depth) 的部分
        # 盒子从 Z = L0 - grind_depth - EPS 到 Z = 很大
        top_box = Part.makeBox(
            box_size, box_size, box_height,
            App.Vector(-box_size/2, -box_size/2, L0 - grind_depth - EPS)
        )
        
        try:
            bb = spring_solid.BoundBox
            print(f"[Conical] Spring BoundBox: Z={bb.ZMin:.2f} to {bb.ZMax:.2f}, isValid={spring_solid.isValid()}")
            print(f"[Conical] Cutting at: bottom={bottom_cut_z:.2f}, top={top_cut_z:.2f}")
            print(f"[Conical] Bottom box Z: {bottom_box.BoundBox.ZMin:.2f} to {bottom_box.BoundBox.ZMax:.2f}")
            print(f"[Conical] Top box Z: {top_box.BoundBox.ZMin:.2f} to {top_box.BoundBox.ZMax:.2f}")
            
            # 验证几何交集
            bottom_common = spring_solid.common(bottom_box)
            top_common = spring_solid.common(top_box)
            print(f"[Conical] Common volume: bottom={bottom_common.Volume:.2f}, top={top_common.Volume:.2f}")
            
            # 执行切割
            cut_result = spring_solid.cut(bottom_box)
            print(f"[Conical] After bottom cut: Z={cut_result.BoundBox.ZMin:.2f} to {cut_result.BoundBox.ZMax:.2f}")
            
            cut_result = cut_result.cut(top_box)
            print(f"[Conical] After top cut: Z={cut_result.BoundBox.ZMin:.2f} to {cut_result.BoundBox.ZMax:.2f}")
            
            # 如果结果是 Compound，取最大的 Solid
            if cut_result.ShapeType == "Compound" and cut_result.Solids:
                cut_result = max(cut_result.Solids, key=lambda s: s.Volume)
                print(f"[Conical] Extracted main solid: Volume={cut_result.Volume:.2f}")
            
            spring_solid = cut_result
            print(f"[Conical] Ground ends applied: bottom={bottom_cut_z:.2f}, top={top_cut_z:.2f}")
        except Exception as e:
            import traceback
            print(f"[Conical] Warning: ground end cutting failed: {e}")
            traceback.print_exc()
    
    return spring_solid


# =============================================================================
# 弧形弹簧生成器 (Arc Spring - Blended-Anchor 算法)
# 与 Three.js arcSpringGeometry.ts / arcBackbone.ts 完全同步
# =============================================================================

def build_arc_backbone_frames(r, alphaDeg, samples, profile, bowLeanDeg=0.0, bowPlaneTiltDeg=0.0):
    """
    计算弧形弹簧骨架帧 (Position, Tangent, Normal, Binormal)
    支持 ARC 和 BOW 两种轮廓
    """
    frames = []
    a0 = -math.radians(alphaDeg) * 0.5
    a1 =  math.radians(alphaDeg) * 0.5

    axisZ = vec(0, 0, 1)

    for i in range(samples):
        u = i / (samples - 1)
        th = a0 + (a1 - a0) * u

        # base arc in XY
        p = vec(r * math.cos(th), r * math.sin(th), 0.0)
        t = unit(vec(-math.sin(th), math.cos(th), 0.0))
        n = unit(vec(-math.cos(th), -math.sin(th), 0.0))
        b = unit(t.cross(n))

        if profile == "BOW":
            # plane tilt: rotate (n,b) around local tangent t
            if abs(bowPlaneTiltDeg) > 1e-9:
                n = unit(rot_axis_angle(n, t, bowPlaneTiltDeg))
                b = unit(t.cross(n))

            # lean: rotate entire frame about global Z
            if abs(bowLeanDeg) > 1e-9:
                p = rot_axis_angle(p, axisZ, bowLeanDeg)
                t = unit(rot_axis_angle(t, axisZ, bowLeanDeg))
                n = unit(rot_axis_angle(n, axisZ, bowLeanDeg))
                b = unit(rot_axis_angle(b, axisZ, bowLeanDeg))

        frames.append((p, t, n, b))
    return frames

def accumulated_lengths(frames):
    L = [0.0] * len(frames)
    Ltot = 0.0
    for i in range(1, len(frames)):
        Ltot += (frames[i][0] - frames[i-1][0]).Length
        L[i] = Ltot
    return L, Ltot

def blended_anchor_turns_map(L, Ltot, d, n_active, deadStart, deadEnd, k, capRatio=0.95):
    """
    Blended-Anchor 圈数映射算法 (Optimized)
    """
    totalCoils = n_active + deadStart + deadEnd
    if totalCoils <= 1e-12 or Ltot <= 1e-12:
        return [0.0] * len(L), 0.0, 0.0, 0.0, 0.0

    k = clamp(k, 0.0, 1.0)

    Ls_solid = deadStart * d
    Le_solid = deadEnd * d

    Ls_uniform = (deadStart / totalCoils) * Ltot if totalCoils > 0 else 0.0
    Le_uniform = (deadEnd / totalCoils) * Ltot if totalCoils > 0 else 0.0

    anchorLs = Ls_uniform * (1 - k) + Ls_solid * k
    anchorLe = Le_uniform * (1 - k) + Le_solid * k

    sumLen = anchorLs + anchorLe
    maxAllowed = capRatio * Ltot
    if sumLen > maxAllowed and sumLen > 1e-12:
        scale = maxAllowed / sumLen
        anchorLs *= scale
        anchorLe *= scale

    Lb = Ltot - anchorLe
    Ls = anchorLs
    Le = anchorLe

    T = [0.0] * len(L)
    for i, curL in enumerate(L):
        if curL <= Ls + 1e-9:
            T[i] = deadStart * (curL / max(1e-9, Ls))
        elif curL >= Lb - 1e-9:
            u = (curL - Lb) / max(1e-9, Le)
            u = clamp(u, 0.0, 1.0)
            T[i] = (deadStart + n_active) + deadEnd * u
        else:
            activeRange = max(1e-9, Lb - Ls)
            u = (curL - Ls) / activeRange
            u = clamp(u, 0.0, 1.0)
            T[i] = deadStart + n_active * u

    T[0] = 0.0
    T[-1] = totalCoils
    return T, totalCoils, Ls, Le, Lb

def make_arc_spring(params, doc=None, fileStem="ArcSpring"):
    """
    生成弧形弹簧实体 (Axial Lock + Loft based)
    """
    # ---- required ----
    required = ["d", "D", "n", "r", "alphaDeg", "profile"]
    missing = [k for k in required if k not in params]
    if missing:
        raise ValueError("ARC_SPRING missing params: " + ", ".join(missing))

    d = float(params["d"])
    D = float(params["D"])
    n_active = float(params["n"])
    r = float(params["r"])
    alphaDeg = float(params["alphaDeg"])
    profile = str(params.get("profile", "ARC"))

    # ---- optional ----
    deadStart = float(params.get("deadCoilsStart", 0.0))
    deadEnd = float(params.get("deadCoilsEnd", 0.0))
    k = float(params.get("k", 1.0))
    samples = int(params.get("samples", 400))
    phaseDeg = float(params.get("phaseDeg", 0.0))
    capRatio = float(params.get("capRatio", 0.95))
    bowLeanDeg = float(params.get("bowLeanDeg", 0.0))
    bowPlaneTiltDeg = float(params.get("bowPlaneTiltDeg", 0.0))
    sectionStride = int(params.get("sectionStride", 1)) # One section per point for max fidelity
    makeSolid = bool(params.get("solid", True))

    # 1. 生成骨架
    frames = build_arc_backbone_frames(r, alphaDeg, samples, profile, bowLeanDeg, bowPlaneTiltDeg)
    L, Ltot = accumulated_lengths(frames)

    # 2. 生成圈数映射
    T_map, totalCoils, Ls, Le, Lb = blended_anchor_turns_map(
        L, Ltot, d, n_active, deadStart, deadEnd, k, capRatio
    )

    # --- Axial Lock / Frame Freezing for dead zones ---
    iL = first_index_ge(L, Ls)
    iR = first_index_ge(L, Lb)

    nL, bL = frames[iL][2], frames[iL][3]
    nR, bR = frames[iR][2], frames[iR][3]

    # ---- build oriented sections for loft ----
    Rcoil = D * 0.5
    phase_rad = math.radians(phaseDeg)

    # Pass 1: Generate all points on the helical path
    # Note: Removed Axial Lock (nv/bv freezing) - the BSpline sweep handles orientation naturally
    # The T_map already controls pitch (tight spacing in dead zones)
    pts = []
    for i, (p, t, nv, bv) in enumerate(frames):
        phi = 2.0 * math.pi * T_map[i] + phase_rad
        q = p + nv.multiply(math.cos(phi) * Rcoil) + bv.multiply(math.sin(phi) * Rcoil)
        pts.append(q)


    # Pass 2: Create Spine as Smooth BSpline (eliminates fold lines)
    # Convert points to a smooth BSpline curve instead of segmented polyline
    try:
        bspline = Part.BSplineCurve()
        bspline.interpolate(pts)
        spine_wire = Part.Wire([bspline.toShape()])
        print(f"[ArcSpring] BSpline spine created with {len(pts)} points")
    except Exception as e:
        print(f"[ArcSpring] BSpline failed ({e}), falling back to polyline")
        spine_wire = Part.makePolygon(pts)


    # Pass 3: Create Profile (Single Section at Start)
    # Align initial profile with the ACTUAL BSpline tangent at start point (not chord approximation)
    # This prevents the "twisted end" artifact caused by mismatch between profile normal and spine tangent
    try:
        # Use BSpline derivative at parameter 0 (start) for exact tangent
        t0 = vec(*bspline.tangent(0)[0]).normalize()
        print(f"[ArcSpring] Using BSpline tangent at start: {t0}")
    except:
        # Fallback to chord approximation
        if len(pts) > 1:
            t0 = (pts[1] - pts[0]).normalize()
        else:
            t0 = vec(0,0,1)

    p0 = pts[0]
    # Create the circular wire for sweeping (single profile - maintains circular cross-section)
    profile_edge = Part.makeCircle(d * 0.5, p0, t0)
    profile_wire = Part.Wire([profile_edge])

    print(f"[ArcSpring] Generating Pipe (Sweep)...")
    
    # 4. Sweep / PipeShell with single profile
    # For helical paths, Frenet=True often works better than auxiliary frame
    # Single profile ensures circular cross-section is preserved
    try:
        # Try Frenet frame first - better for 3D curves like helices
        solid = spine_wire.makePipeShell([profile_wire], True, True) # solid=True, frenet=True
        # Refine shape to merge faces and eliminate bamboo-joint artifacts
        try:
            solid = solid.removeSplitter()
        except:
            pass # Ignore if removeSplitter fails, solid is still valid
        print(f"[ArcSpring] Frenet Pipe Success. ShapeType={solid.ShapeType} Volume={solid.Volume:.2f}")

    except Exception as e:
        print(f"[ArcSpring] Frenet Pipe failed: {e}. Fallback to Auxiliary...")
        try:
            solid = spine_wire.makePipeShell([profile_wire], True, False) # Try Auxiliary

            try:
                solid = solid.removeSplitter()
            except:
                pass
            print(f"[ArcSpring] Auxiliary Pipe Success. Volume={solid.Volume:.2f}")
        except Exception as e2:
             print(f"[ArcSpring] All Pipe attempts failed: {e2}")
             raise




    # 5. Export Centerline (for debug)
    if doc:
        try:
            centerline_obj = doc.addObject("Part::Feature", f"{fileStem}_Centerline")
            centerline_obj.Shape = spine_wire
        except: pass

    return solid


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
    elif spring_type == "arc" or spring_type == "arcSpring":
        return '''<text class="note-text">
      <tspan x="0" dy="5">1. 材料: 碳素弹簧钢丝 C级 GB/T 4357</tspan>
      <tspan x="0" dy="4">2. 热处理: 去应力退火 250-300C</tspan>
      <tspan x="0" dy="4">3. 表面处理: 发黑或镀锌</tspan>
      <tspan x="0" dy="4">4. 形式: 弧形弹簧 (Arc/Bow Spring)</tspan>
      <tspan x="0" dy="4">5. 旋向: 右旋</tspan>
      <tspan x="0" dy="4">6. 执行标准: 工艺规范 Q/ISRI-001</tspan>
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
    elif spring_type == "arc" or spring_type == "arcSpring":
        return f'''<text class="small-text">
      <tspan x="3" dy="15">线径 d</tspan><tspan x="45" dy="0">{d:.2f} mm</tspan>
      <tspan x="3" dy="4">中径 D</tspan><tspan x="45" dy="0">{Dm:.1f} mm</tspan>
      <tspan x="3" dy="4">弧半径 R</tspan><tspan x="45" dy="0">{geometry.get("arcRadius", 0):.1f} mm</tspan>
      <tspan x="3" dy="4">弧角度 α</tspan><tspan x="45" dy="0">{geometry.get("arcAlpha", 0):.1f} °</tspan>
      <tspan x="3" dy="4">有效圈数 n</tspan><tspan x="45" dy="0">{Na}</tspan>
      <tspan x="3" dy="4">刚度 k</tspan><tspan x="45" dy="0">{spring_rate:.2f} N/mm</tspan>
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
    if spring_type == "arc" or spring_type == "arcSpring":
        # 弧形弹簧简化的特性参数
        L1, L2, F1, F2, Fs = 0, 0, 0, 0, 0
    else:
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
  '''
    # 计算标题和图号
    if spring_type == "arc" or spring_type == "arcSpring":
        title = "弧形弹簧"
        doc_no = f"AS-{Na:02d}"
    elif spring_type == "extension":
        title = "拉伸弹簧"
        doc_no = f"EX-{Nt:02d}{Na:02d}"
    else:
        title = "压缩弹簧"
        doc_no = f"CP-{Nt:02d}{Na:02d}"

    svg_content += f'''
    <text x="25" y="17" class="title-text" text-anchor="middle">{title}</text>
    <text x="75" y="17" class="small-text" text-anchor="middle">60Si2MnA</text>
    <text x="130" y="17" class="small-text" text-anchor="middle">{doc_no}</text>
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
    # Priority: Environment Variables -> Command Line Arguments
    design_file = os.environ.get("DESIGN_FILE")
    output_dir = os.environ.get("OUTPUT_DIR")

    if not design_file:
        if len(sys.argv) < 2:
            print("Usage: python run_export.py design.json [output_dir]")
            # Also support env vars: DESIGN_FILE, OUTPUT_DIR
            sys.exit(1)
        design_file = sys.argv[1]
        output_dir = sys.argv[2] if len(sys.argv) > 2 else None

    if not output_dir:
        output_dir = os.path.dirname(design_file) or "."
    
    # Debug info
    print(f"Running with: design_file={design_file}, output_dir={output_dir}")
    
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
    print(f"Geometry: {json.dumps(geometry, indent=2)}")
    
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
    elif spring_type == "spiral_torsion":
        spring = make_spiral_torsion_spring(geometry)
    elif spring_type == "conical":
        spring = make_conical_spring(geometry)
    elif spring_type == "variable_pitch_compression":
        spring = make_variable_pitch_compression_spring(geometry)
    elif spring_type == "suspension_spring":
        spring = make_suspension_spring(geometry)
    elif spring_type == "arc" or spring_type == "arcSpring" or spring_type == "ARC_SPRING":
        # 强制字段验证
        required = ["d", "D", "n", "r", "alphaDeg", "profile"]
        missing = [k for k in required if k not in geometry]
        if missing:
            print(f"Error: ARC_SPRING missing required params: {','.join(missing)}")
            sys.exit(1)
        spring = make_arc_spring(geometry, doc=doc)
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
                # 预览用高精度（弹簧专用参数 - 追求视觉平滑）
                # LinearDeflection: 控制沿路径平滑度, 越小越顺 (mm)
                # AngularDeflection: 控制圆截面多边形感, 8°≈45边非常圆 (degrees)
                linear_deflection = 0.01  # mm - 高精度预览
                angular_deflection = 0.14  # radians ≈ 8° - 极圆
                
                # 创建 mesh 并导出
                mesh = Mesh.Mesh()
                shape = spring_obj.Shape
                
                # 使用 MeshPart 进行更好的控制（弹簧专用设置）
                try:
                    import MeshPart
                    mesh = MeshPart.meshFromShape(
                        Shape=shape,
                        LinearDeflection=linear_deflection,
                        AngularDeflection=angular_deflection,
                        Relative=False  # 绝对值更可控，适用于弹簧这种高曲率物体
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
    
    # 批处理模式强制退出（避免卡在 recompute/后处理）
    sys.exit(0)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"CRITICAL ERROR in run_export.py: {e}")
        sys.exit(1)
