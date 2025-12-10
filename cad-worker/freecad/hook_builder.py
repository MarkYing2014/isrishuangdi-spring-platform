#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HookBuilder - Extension Spring Hook Geometry Builder for FreeCAD

与 Three.js HookBuilder.ts 保持一致的参数化设计。
每种 Hook 类型只需定义 HookSpec 参数，不需要重写几何逻辑。

设计原则：
1. 单一真相源：所有 Hook 类型使用相同的构建逻辑
2. 参数化：通过 HookSpec 控制几何差异
3. C¹ 连续：使用三次贝塞尔曲线保证过渡平滑
"""

import math
from dataclasses import dataclass
from typing import List, Literal, Optional

try:
    import FreeCAD as App
    import Part
except ImportError:
    # 允许在非 FreeCAD 环境中导入（用于类型检查）
    pass

# =============================================================================
# 类型定义 (与 TypeScript 对齐)
# =============================================================================

HookKind = Literal["machine", "side", "crossover", "extended", "doubleLoop"]


@dataclass
class HookSpec:
    """
    Hook 规格定义
    每种 Hook 类型只需要定义这些参数，不需要重写几何逻辑
    """
    kind: HookKind
    
    # 环参数
    loop_count: int = 1                    # 1 = 单环, 2 = 双环
    loop_angle_deg: float = 270            # 环弧度数
    loop_start_angle: float = -math.pi/2   # 环起始角 (rad)
    
    # 环平面类型
    # "axis-plane": 环平面包含轴线 (Machine Hook, Crossover Hook)
    # "orthogonal-plane": 环平面垂直于轴线 (Side Hook)
    loop_plane_type: str = "axis-plane"
    
    # 环中心位置
    # "on-axis": 环中心在轴线上 (Machine Hook)
    # "radial-offset": 环中心在弹簧外侧 (Side Hook)
    center_mode: str = "on-axis"
    
    # 间隙参数 (以 wire_diameter 为单位)
    axial_gap_factor: float = 1.2          # 轴向间隙 = factor * wire_diameter
    radial_offset_factor: float = 0.0      # 径向偏移 = factor * wire_diameter
    
    # Hook 半径因子 (以 mean_radius 为单位)
    hook_radius_factor: float = 0.85       # hookRadius = factor * mean_radius + 0.4 * d
    
    # 过渡段参数
    handle_length_factor: float = 2.0      # 控制点距离 = factor * wire_diameter
    
    # 延长段 (仅 Extended Hook)
    has_extended_leg: bool = False
    extended_leg_length_factor: float = 0.0


@dataclass
class HelixEndInfo:
    """螺旋线端点信息"""
    end_point: 'App.Vector'      # 端点位置
    axis_dir: 'App.Vector'       # 轴向方向 (0,0,±1)
    radial_dir: 'App.Vector'     # 径向方向 (从轴线指向端点)
    tangent_dir: 'App.Vector'    # 切线方向 (XY 平面投影)


# =============================================================================
# Hook 规格工厂
# =============================================================================

def get_hook_spec(kind: HookKind) -> HookSpec:
    """获取 Hook 规格"""
    specs = {
        "machine": HookSpec(
            kind="machine",
            loop_count=1,
            loop_angle_deg=160,              # 限制最大角度
            loop_start_angle=-math.pi/2,     # 从底部开始
            loop_plane_type="axis-plane",
            center_mode="on-axis",
            axial_gap_factor=1.2,
            radial_offset_factor=0,
            hook_radius_factor=0.85,
            handle_length_factor=2.0,
        ),
        "side": HookSpec(
            kind="side",
            loop_count=1,
            loop_angle_deg=270,
            loop_start_angle=math.pi/2,      # 从顶部开始
            loop_plane_type="axis-plane",    # 环平面包含轴线
            center_mode="radial-offset",     # 环中心在侧面
            axial_gap_factor=0.8,
            radial_offset_factor=0.0,
            hook_radius_factor=0.7,
            handle_length_factor=0.3,
        ),
        "crossover": HookSpec(
            kind="crossover",
            loop_count=1,
            loop_angle_deg=180,
            loop_start_angle=-math.pi/2,
            loop_plane_type="axis-plane",
            center_mode="on-axis",
            axial_gap_factor=1.4,
            radial_offset_factor=0,
            hook_radius_factor=1.0,
            handle_length_factor=2.5,
        ),
        "extended": HookSpec(
            kind="extended",
            loop_count=1,
            loop_angle_deg=200,
            loop_start_angle=-math.pi/2,
            loop_plane_type="axis-plane",
            center_mode="radial-offset",
            axial_gap_factor=1.5,
            radial_offset_factor=0.8,
            hook_radius_factor=0.85,
            handle_length_factor=2.0,
            has_extended_leg=True,
            extended_leg_length_factor=0.5,
        ),
        "doubleLoop": HookSpec(
            kind="doubleLoop",
            loop_count=2,
            loop_angle_deg=340,
            loop_start_angle=-math.pi/2,
            loop_plane_type="axis-plane",
            center_mode="on-axis",
            axial_gap_factor=1.8,
            radial_offset_factor=0,
            hook_radius_factor=0.85,
            handle_length_factor=2.0,
        ),
    }
    return specs.get(kind, specs["machine"])


# =============================================================================
# 工具函数
# =============================================================================

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
    """
    r = math.sqrt(point.x**2 + point.y**2)
    if r < min_radius and r > 1e-8:
        scale = min_radius / r
        return App.Vector(point.x * scale, point.y * scale, point.z)
    return point


def get_helix_end_info(helix_pts: List['App.Vector'], is_start: bool) -> HelixEndInfo:
    """从螺旋线点列表获取端点信息"""
    if is_start:
        end_point = helix_pts[0]
        prev_point = helix_pts[1]
        axis_dir = App.Vector(0, 0, -1)
    else:
        end_point = helix_pts[-1]
        prev_point = helix_pts[-2]
        axis_dir = App.Vector(0, 0, 1)
    
    # 径向方向
    radial_dir = App.Vector(end_point.x, end_point.y, 0)
    if radial_dir.Length < 1e-8:
        radial_dir = App.Vector(1, 0, 0)
    else:
        radial_dir.normalize()
    
    # 切线方向 (XY 平面投影)
    tangent_dir = end_point.sub(prev_point)
    tangent_dir.z = 0
    if tangent_dir.Length < 1e-8:
        tangent_dir = App.Vector(-radial_dir.y, radial_dir.x, 0)
    else:
        tangent_dir.normalize()
    
    return HelixEndInfo(
        end_point=end_point,
        axis_dir=axis_dir,
        radial_dir=radial_dir,
        tangent_dir=tangent_dir
    )


# =============================================================================
# Hook 中心线构建器
# =============================================================================

def build_hook_centerline(
    spec: HookSpec,
    end_info: HelixEndInfo,
    wire_diameter: float,
    mean_radius: float,
    is_start: bool
) -> List['App.Vector']:
    """
    构建 Hook 中心线
    
    参数:
    - spec: Hook 规格
    - end_info: 螺旋线端点信息
    - wire_diameter: 线径
    - mean_radius: 中径半径
    - is_start: True=底部钩, False=顶部钩
    
    返回:
    - Hook 中心线点列表
    """
    d = wire_diameter
    R = mean_radius
    
    end_pos = end_info.end_point
    axis_dir = end_info.axis_dir
    radial_dir = end_info.radial_dir
    tangent_dir = end_info.tangent_dir
    
    # Hook 参数
    hook_gap = d * spec.axial_gap_factor
    hook_radius = R * spec.hook_radius_factor + d * 0.4
    handle_length = d * spec.handle_length_factor
    
    # Hook 环圆心
    if spec.center_mode == "on-axis":
        hook_center = App.Vector(0, 0, end_pos.z + axis_dir.z * hook_gap)
    else:
        # radial-offset
        offset = d * spec.radial_offset_factor
        hook_center = App.Vector(
            radial_dir.x * offset,
            radial_dir.y * offset,
            end_pos.z + axis_dir.z * hook_gap
        )
    
    # Hook 平面基向量
    u = App.Vector(axis_dir.x, axis_dir.y, axis_dir.z)
    u.normalize()
    v = radial_dir.cross(axis_dir)
    v.normalize()
    
    # === 生成 Hook 环圆弧点 ===
    loop_pts = []
    start_angle = spec.loop_start_angle
    total_angle = math.radians(spec.loop_angle_deg)
    segments = 24
    
    for i in range(segments + 1):
        t = i / segments
        theta = start_angle + total_angle * t
        p = (hook_center + 
             u * (hook_radius * math.cos(theta)) + 
             v * (hook_radius * math.sin(theta)))
        loop_pts.append(p)
    
    # === Segment A: 沿切线的直线段 ===
    seg_a_len = d * 1.0
    seg_a_end = end_pos + tangent_dir * seg_a_len
    
    seg_a_pts = []
    seg_a_steps = 10
    for i in range(seg_a_steps + 1):
        t = i / seg_a_steps
        p = end_pos * (1 - t) + seg_a_end * t
        p = clamp_radius(p, R)
        seg_a_pts.append(p)
    
    # === Segment B: 贝塞尔过渡 ===
    p0 = seg_a_end
    p3 = loop_pts[0]
    p1 = seg_a_end + radial_dir * (0.5 * d) + axis_dir * (0.5 * d)
    p2 = loop_pts[0] - axis_dir * (0.5 * d)
    
    seg_b_pts = []
    seg_b_steps = 20
    for i in range(1, seg_b_steps + 1):
        t = i / seg_b_steps
        p = cubic_bezier(p0, p1, p2, p3, t)
        p = clamp_radius(p, R)
        seg_b_pts.append(p)
    
    # === 组合最终中心线 ===
    if is_start:
        all_pts = list(reversed(loop_pts)) + list(reversed(seg_b_pts)) + list(reversed(seg_a_pts))
        return all_pts[:-1]  # 去掉最后一个点
    else:
        return seg_a_pts[1:] + seg_b_pts + loop_pts


def build_hook_solid(
    centerline_pts: List['App.Vector'],
    wire_diameter: float
) -> Optional['Part.Shape']:
    """
    从中心线构建 Hook 实体
    
    参数:
    - centerline_pts: 中心线点列表
    - wire_diameter: 线径
    
    返回:
    - Hook 实体 (Part.Shape) 或 None
    """
    if len(centerline_pts) < 3:
        return None
    
    wire_radius = wire_diameter / 2.0
    
    try:
        # 创建 B-Spline 路径
        bs = Part.BSplineCurve()
        bs.approximate(centerline_pts)
        path = bs.toShape()
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
        print(f"Hook solid generation failed: {e}")
        return None


# =============================================================================
# 高级接口
# =============================================================================

def build_extension_hooks(
    helix_pts: List['App.Vector'],
    wire_diameter: float,
    mean_radius: float,
    hook_kind: HookKind = "machine"
) -> tuple:
    """
    构建拉簧两端的钩子
    
    参数:
    - helix_pts: 螺旋线点列表
    - wire_diameter: 线径
    - mean_radius: 中径半径
    - hook_kind: 钩子类型
    
    返回:
    - (start_hook_solid, end_hook_solid) 元组
    """
    spec = get_hook_spec(hook_kind)
    
    # 底部钩
    start_info = get_helix_end_info(helix_pts, is_start=True)
    start_centerline = build_hook_centerline(spec, start_info, wire_diameter, mean_radius, is_start=True)
    start_hook = build_hook_solid(start_centerline, wire_diameter)
    
    # 顶部钩
    end_info = get_helix_end_info(helix_pts, is_start=False)
    end_centerline = build_hook_centerline(spec, end_info, wire_diameter, mean_radius, is_start=False)
    end_hook = build_hook_solid(end_centerline, wire_diameter)
    
    return start_hook, end_hook
