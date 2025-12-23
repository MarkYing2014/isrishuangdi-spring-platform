"""
Suspension Spring .inp Generator for CalculiX
Generates beam-based FEA model from centerline geometry

Uses B31 (3-node beam) elements for helical spring modeling.
"""

import math
from dataclasses import dataclass
from typing import List, Tuple
from jinja2 import Template


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
class SuspensionSpringGeometry:
    """Suspension spring geometry for FEA"""
    wire_diameter: float  # mm
    mean_diameter: float  # mm (can be variable)
    active_coils: float
    total_coils: float
    free_length: float  # mm
    end_type: str  # "open", "closed", "closed_ground"
    
    # Variable geometry (optional)
    dm_start: float | None = None
    dm_mid: float | None = None
    dm_end: float | None = None
    
    # Pitch profile (optional)
    pitch_center: float | None = None
    pitch_end: float | None = None


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


def generate_centerline(geom: SuspensionSpringGeometry, segments_per_coil: int = 36) -> List[Tuple[float, float, float]]:
    """
    Generate centerline points for helical spring.
    Returns list of (x, y, z) tuples with monotonically increasing Z.
    """
    total_angle = geom.total_coils * 2 * math.pi
    num_points = int(geom.total_coils * segments_per_coil)
    
    # Dead coils at each end
    dead_coils_per_end = (geom.total_coils - geom.active_coils) / 2
    dead_angle = dead_coils_per_end * 2 * math.pi
    
    # Calculate pitch for active and dead coils
    # Total height = dead_height_bottom + active_height + dead_height_top
    dead_pitch = geom.wire_diameter  # Tight coils
    active_pitch = (geom.free_length - geom.wire_diameter * dead_coils_per_end * 2 - geom.wire_diameter * geom.active_coils) / geom.active_coils if geom.active_coils > 0 else 0
    
    # Ensure positive pitch
    if active_pitch < geom.wire_diameter:
        active_pitch = geom.wire_diameter
    
    points = []
    z = 0.0  # Start at z=0
    prev_theta = 0.0
    
    for i in range(num_points + 1):
        theta = (i / num_points) * total_angle
        t = i / num_points  # Normalized position 0-1
        
        # Mean diameter (potentially variable)
        if geom.dm_start and geom.dm_end:
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
            delta_z = (delta_theta / (2 * math.pi)) * (pitch + geom.wire_diameter)
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
** Suspension Spring Beam FEA - CalculiX
** Generated: {{ timestamp }}
** Design Code: {{ design_code }}
** ===============================================

*HEADING
Suspension Spring FEA (Beam Model) - {{ design_code }}

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
** BEAM SECTION (Circular wire)
** -----------------------------------------------
*BEAM SECTION, ELSET=SPRING, MATERIAL={{ material.name }}, SECTION=CIRC
{{ "%.4f"|format(wire_radius) }}
1.0, 0.0, 0.0

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
*STEP, NLGEOM
*STATIC
0.1, 1.0, 0.001, 1.0

** Apply displacement to top node (Z direction = axial for helical spring)
** Displacement = target_height - free_length
*BOUNDARY
TOP, 3, 3, {{ "%.6f"|format(lc.target_height - free_length) }}

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
    geom: SuspensionSpringGeometry,
    material: Material,
    loadcases: List[LoadCase],
    design_code: str = "SUSP-001",
    segments_per_coil: int = 36
) -> str:
    """
    Generate complete CalculiX .inp file for suspension spring analysis.
    
    Args:
        geom: Spring geometry
        material: Material properties
        loadcases: List of load cases (Ride, Bump, etc.)
        design_code: Design identifier
        segments_per_coil: Mesh density
    
    Returns:
        Complete .inp file content as string
    """
    from datetime import datetime
    
    # Generate centerline
    centerline = generate_centerline(geom, segments_per_coil)
    
    # Create nodes and elements
    nodes, elements = create_nodes_elements(centerline)
    
    # Render template
    template = Template(INP_TEMPLATE)
    inp_content = template.render(
        timestamp=datetime.now().isoformat(),
        design_code=design_code,
        nodes=nodes,
        elements=elements,
        top_node_id=len(nodes),
        wire_radius=geom.wire_diameter / 2,
        material=material,
        loadcases=loadcases,
        free_length=geom.free_length
    )
    
    return inp_content


# Example usage
if __name__ == "__main__":
    # Test geometry
    geom = SuspensionSpringGeometry(
        wire_diameter=12.0,
        mean_diameter=100.0,
        active_coils=6.0,
        total_coils=8.0,
        free_length=350.0,
        end_type="closed_ground"
    )
    
    material = Material()
    
    loadcases = [
        LoadCase(name="RIDE", target_height=260.0),
        LoadCase(name="BUMP", target_height=220.0),
    ]
    
    inp = generate_inp(geom, material, loadcases, "SUSP-TEST")
    print(inp)
