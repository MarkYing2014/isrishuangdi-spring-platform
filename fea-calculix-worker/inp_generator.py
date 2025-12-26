"""
Spring .inp Generator for CalculiX
Generates beam-based FEA model from centerline geometry for both 
circular (Suspension) and rectangular (Die) springs.
"""

import math
from dataclasses import dataclass
from typing import List, Tuple
from jinja2 import Template
from datetime import datetime


@dataclass
class Node:
    """FEA node with ID and coordinates"""
    id: int
    x: float
    y: float
    z: float


@dataclass
class Element:
    """Beam element connecting three nodes (for B32 quadratic)"""
    id: int
    n1: int  # Start node
    n2: int  # End node  
    n3: int  # Middle node (for B32)


@dataclass
class SpringGeometry:
    """Generic spring geometry for FEA"""
    section_type: str = "CIRC"  # "CIRC" or "RECT"
    wire_diameter: float = 0.0  # mm (for CIRC)
    wire_width: float = 0.0     # mm (for RECT, radial dimension 't')
    wire_thickness: float = 0.0 # mm (for RECT, axial dimension 'b')
    mean_diameter: float = 100.0  # mm
    active_coils: float = 5.0
    total_coils: float = 7.0
    free_length: float = 200.0  # mm
    end_type: str = "closed_ground"
    
    # Variable geometry (optional)
    dm_start: float | None = None
    dm_mid: float | None = None
    dm_end: float | None = None


@dataclass
class Material:
    """Material properties"""
    E: float = 206000.0  # MPa (Young's modulus)
    nu: float = 0.3  # Poisson's ratio
    G: float = 79000.0  # MPa (Shear modulus)
    name: str = "STEEL"


@dataclass
class LoadCase:
    """Load case definition (displacement controlled)"""
    name: str
    target_height: float  # mm


def generate_centerline(geom: SpringGeometry, segments_per_coil: int = 36) -> List[Tuple[float, float, float]]:
    """
    Generate centerline points for helical spring.
    Returns list of (x, y, z) tuples with monotonically increasing Z.
    """
    total_angle = geom.total_coils * 2 * math.pi
    num_points = int(geom.total_coils * segments_per_coil)
    
    # Dead coils at each end
    dead_coils_per_end = (geom.total_coils - geom.active_coils) / 2
    dead_angle = dead_coils_per_end * 2 * math.pi
    
    # Axial wire height (used for pitch calculations)
    h_wire = geom.wire_diameter if geom.section_type == "CIRC" else geom.wire_thickness
    
    # Calculate pitch for active and dead coils
    # Total height = dead_height_bottom + active_height + dead_height_top
    dead_pitch = h_wire  # Tight coils
    active_space = geom.free_length - h_wire * dead_coils_per_end * 2 - h_wire * geom.active_coils
    active_pitch = (active_space / geom.active_coils) + h_wire if geom.active_coils > 0 else 0
    
    # Ensure positive pitch (at least wire height)
    if active_pitch < h_wire:
        active_pitch = h_wire
    
    points = []
    z = h_wire / 2  # Start at half wire height
    prev_theta = 0.0
    
    for i in range(num_points + 1):
        theta = (i / num_points) * total_angle
        t = i / num_points  # Normalized position 0-1
        
        # Mean diameter (potentially variable)
        if geom.dm_start is not None and geom.dm_end is not None:
            dm = geom.dm_start + (geom.dm_end - geom.dm_start) * t
        else:
            dm = geom.mean_diameter
        
        radius = dm / 2
        
        # Determine pitch based on position
        if theta < dead_angle:
            pitch = dead_pitch
        elif theta > total_angle - dead_angle:
            pitch = dead_pitch
        else:
            pitch = active_pitch
        
        # Cumulative Z: add height increment since last point
        if i > 0:
            delta_theta = theta - prev_theta
            delta_z = (delta_theta / (2 * math.pi)) * pitch
            z += delta_z
        
        prev_theta = theta
        
        # X, Y from helix
        x = radius * math.cos(theta)
        y = radius * math.sin(theta)
        
        points.append((x, y, z))
    
    return points


def create_nodes_elements(centerline: List[Tuple[float, float, float]]) -> Tuple[List[Node], List[Element]]:
    """
    Convert centerline points to FEA nodes and B32 beam elements.
    B32 quadratic beam elements require 3 nodes: start, end, and midpoint.
    """
    nodes = []
    elements = []
    
    # First, add all centerline points as corner nodes
    for i, (x, y, z) in enumerate(centerline):
        nodes.append(Node(id=i+1, x=x, y=y, z=z))
    
    num_corner_nodes = len(centerline)
    
    # Then add midpoint nodes for each element and create elements
    for i in range(len(centerline) - 1):
        # Corner node IDs (1-indexed)
        n1_id = i + 1
        n2_id = i + 2
        
        # Create midpoint node
        mid_id = num_corner_nodes + i + 1
        x_mid = (centerline[i][0] + centerline[i+1][0]) / 2
        y_mid = (centerline[i][1] + centerline[i+1][1]) / 2
        z_mid = (centerline[i][2] + centerline[i+1][2]) / 2
        nodes.append(Node(id=mid_id, x=x_mid, y=y_mid, z=z_mid))
        
        # Create element with node order: start, end, mid (CalculiX B32 format)
        elements.append(Element(id=i+1, n1=n1_id, n2=n2_id, n3=mid_id))
    
    return nodes, elements


INP_TEMPLATE = """** ===============================================
** Spring Beam FEA - CalculiX
** Generated: {{ timestamp }}
** Design Code: {{ design_code }}
** ===============================================

*HEADING
Spring FEA (Beam Model) - {{ design_code }}

** -----------------------------------------------
** NODES
** -----------------------------------------------
*NODE, NSET=ALL
{%- for node in nodes %}
{{ node.id }}, {{ "%.6f"|format(node.x) }}, {{ "%.6f"|format(node.y) }}, {{ "%.6f"|format(node.z) }}
{%- endfor %}

** Node sets for boundary conditions
*NSET, NSET=BOTTOM
1

*NSET, NSET=TOP
{{ top_node_id }}

** -----------------------------------------------
** ELEMENTS
** -----------------------------------------------
*ELEMENT, TYPE=B32, ELSET=SPRING
{%- for elem in elements %}
{{ elem.id }}, {{ elem.n1 }}, {{ elem.n2 }}, {{ elem.n3 }}
{%- endfor %}

** -----------------------------------------------
** BEAM SECTION
** -----------------------------------------------
{% if section_type == "CIRC" %}
*BEAM SECTION, ELSET=SPRING, MATERIAL={{ material.name }}, SECTION=CIRC
{{ "%.4f"|format(wire_radius) }}
0.0, 0.0, 1.0
{% else %}
*BEAM SECTION, ELSET=SPRING, MATERIAL={{ material.name }}, SECTION=RECT
{{ "%.4f"|format(wire_width) }}, {{ "%.4f"|format(wire_thickness) }}
0.0, 0.0, 1.0
{% endif %}

** -----------------------------------------------
** MATERIAL
** -----------------------------------------------
*MATERIAL, NAME={{ material.name }}
*ELASTIC
{{ "%.1f"|format(material.E) }}, {{ "%.2f"|format(material.nu) }}

** ===============================================
** BOUNDARY CONDITIONS (Fixed bottom)
** ===============================================
*BOUNDARY
BOTTOM, 1, 6, 0.0

{% for lc in loadcases %}
** ===============================================
** STEP: {{ lc.name }}
** Target height: {{ "%.2f"|format(lc.target_height) }} mm
** ===============================================
*STEP
*STATIC


** Apply displacement to top node (Z direction = axial for helical spring)
** Displacement = target_height - free_length
*BOUNDARY
TOP, 3, 3, {{ "%.6f"|format(lc.target_height - free_length) }}
TOP, 4, 6, 0.0

** Output requests
*NODE FILE
U, RF

*EL FILE
S

*NODE PRINT, NSET=TOP
RF

*END STEP
{%- endfor %}
"""


def generate_inp(
    geom: SpringGeometry,
    material: Material,
    loadcases: List[LoadCase],
    design_code: str = "SPRING-001",
    segments_per_coil: int = 36
) -> str:
    """
    Generate complete CalculiX .inp file for spring FEA.
    """
    # Generate centerline
    centerline = generate_centerline(geom, segments_per_coil)
    
    # Create nodes and elements
    nodes, elements = create_nodes_elements(centerline)
    
    # Render template
    template = Template(INP_TEMPLATE)
    
    template_params = {
        "timestamp": datetime.now().isoformat(),
        "design_code": design_code,
        "nodes": nodes,
        "elements": elements,
        "top_node_id": len(nodes),
        "material": material,
        "loadcases": loadcases,
        "free_length": geom.free_length,
        "section_type": geom.section_type,
    }
    
    if geom.section_type == "CIRC":
        template_params["wire_radius"] = geom.wire_diameter / 2
    else:
        # wire_width is radial thickness 't'
        # wire_thickness is axial height 'b'
        template_params["wire_width"] = geom.wire_width
        template_params["wire_thickness"] = geom.wire_thickness
        
    return template.render(**template_params)


if __name__ == "__main__":
    # Test circular
    geom_susp = SpringGeometry(
        section_type="CIRC",
        wire_diameter=12.0,
        mean_diameter=100.0,
        active_coils=6.0,
        total_coils=8.0,
        free_length=350.0
    )
    
    # Test rectangular
    geom_die = SpringGeometry(
        section_type="RECT",
        wire_width=8.0,
        wire_thickness=4.5,
        mean_diameter=40.0,
        active_coils=8.5,
        total_coils=10.5,
        free_length=102.0
    )
    
    material = Material()
    loadcases = [LoadCase(name="WORK", target_height=80.0)]
    
    print("--- RECTANGULAR TEST ---")
    print(generate_inp(geom_die, material, loadcases, "DIE-TEST")[:1000])
