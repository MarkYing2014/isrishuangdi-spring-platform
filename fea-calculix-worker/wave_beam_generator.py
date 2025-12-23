"""
Wave Spring Beam Model Generator (B32 Elements)
Generates static nonlinear (NLGEOM) analysis .inp files for CalculiX.
Simplified model using Centerline as Beam (Rectangular Section).
"""

import math
from dataclasses import dataclass
from typing import List, Tuple
from jinja2 import Template
from datetime import datetime

@dataclass
class WaveSpringGeometry:
    id: float         # Inner Diameter (mm)
    od: float         # Outer Diameter (mm)
    t: float          # Thickness (mm)
    b: float          # Radial Wall Width (mm)
    n_w: float        # Waves per turn
    n_t: float        # Number of turns
    h0: float         # Free Height (mm)

@dataclass
class Material:
    E: float = 203000.0  # MPa
    nu: float = 0.28
    density: float = 7.85e-9 
    yield_strength: float = 1170.0
    name: str = "MAT_177PH_CH900"

@dataclass
class Node:
    id: int
    x: float
    y: float
    z: float

@dataclass
class ElementB32:
    id: int
    n1: int
    n2: int
    n3: int

INP_TEMPLATE = """** ===============================================
** Wave Spring Beam FEA (B32) - CalculiX
** Generated: {{ timestamp }}
** ===============================================

*HEADING
Wave Spring Beam Analysis

** ---------- MATERIAL ----------
*MATERIAL, NAME={{ material.name }}
*ELASTIC
{{ material.E }}, {{ material.nu }}
*DENSITY
{{ material.density }}
*PLASTIC
{{ material.yield_strength }}, 0.0

** ---------- BEAM SECTION (RECT) ----------
** Sect Rect: width (radial b), height (axial t)
*BEAM SECTION, ELSET=E_WAVE, MATERIAL={{ material.name }}, SECTION=RECT
{{ geometry.b }}, {{ geometry.t }}
0.0, 0.0, 1.0

** ---------- NODES ----------
*NODE, NSET=N_ALL
{%- for node in nodes %}
{{ node.id }}, {{ "%.4f"|format(node.x) }}, {{ "%.4f"|format(node.y) }}, {{ "%.4f"|format(node.z) }}
{%- endfor %}

*NSET, NSET=N_BOT
1

*NSET, NSET=N_TOP
{{ top_node_id }}

** ---------- ELEMENTS (B32) ----------
*ELEMENT, TYPE=B32, ELSET=E_WAVE
{%- for elem in elements %}
{{ elem.id }}, {{ elem.n1 }}, {{ elem.n2 }}, {{ elem.n3 }}
{%- endfor %}

** ---------- BOUNDARY CONDITIONS ----------
** Fix Bottom Node
*BOUNDARY
N_BOT, 1, 6, 0.0

** Constrain Top Node (Allow Z movement, fix others for stability)
*BOUNDARY
N_TOP, 1, 2, 0.0
N_TOP, 4, 6, 0.0

** ---------- STEP ----------
*STEP, NLGEOM
*STATIC
0.02, 1.0, 1e-5, 0.1

** COMPRESSION DISPLACEMENT
*BOUNDARY
N_TOP, 3, 3, -{{ "%.4f"|format(delta_max) }}

*OUTPUT, FIELD, FREQUENCY=1
*NODE OUTPUT
U, RF
*ELEMENT OUTPUT, ELSET=E_WAVE
S, E

*OUTPUT, HISTORY, FREQUENCY=1
*NODE OUTPUT, NSET=N_TOP
RF3, U3

*END STEP
"""

def generate_wave_beam_inp(
    geometry: WaveSpringGeometry,
    material: Material,
    delta_max: float,
    design_code: str = "WAVE-BEAM-001"
) -> str:
    # 1. Mesh Parameters
    # Segments per wave leg
    segs_per_wave = 12
    nodes_per_turn = int(geometry.n_w * segs_per_wave)
    total_elements = int(geometry.n_t * nodes_per_turn)
    # B32 needs 2 elements per segment visually? No, 1 elem = 3 nodes
    
    nodes: List[Node] = []
    elements: List[ElementB32] = []
    
    # 2. Generate Centerline Nodes
    # Using Quadratic Beam B32 -> We need corner nodes + mid nodes.
    # Total points = 2 * num_elements + 1
    
    num_elements = total_elements
    num_nodes = 2 * num_elements + 1
    
    dm = (geometry.od + geometry.id) / 2.0
    radius = dm / 2.0
    
    # Calculate wave amplitude from H0 and thickness
    # H0_free = Nt * t + Nt * (2 * Amp) ??
    # User formula: z = (H0/2) * sin(nw * theta)
    # Let's interpret H0 as total envelope height.
    # Amplitude = (H0/2) is the envelope limit.
    # Effective centerline amplitude?
    # If H0 includes thickness, centerline Amp should be smaller.
    # Amp_center = (H0 - t) / 2
    # But user specifically said: z(theta) = (H0/2) sin(...)
    # We'll use a safer amplitude: (H0 - geometry.t) / 2.0 to account for thickness
    amp = (geometry.h0 - geometry.t) / 2.0
    if amp < 0: amp = 0 # Safety
    
    # Pitch for multi-turn stacking
    pitch_per_turn = geometry.t * 1.05 # Slight gap?
    
    for i in range(num_nodes):
        # t parameter 0 to 1
        t_param = i / (num_nodes - 1)
        
        # Angle
        total_angle = 2 * math.pi * geometry.n_t
        theta = t_param * total_angle
        
        # Z position
        # Base helical rise (stacking)
        z_base = (theta / (2 * math.pi)) * pitch_per_turn
        
        # Wave oscillation
        # We need to make sure phase aligns. sin(Nw * theta)
        z_wave = amp * math.sin(geometry.n_w * theta)
        
        z = z_base + z_wave
        
        x = radius * math.cos(theta)
        y = radius * math.sin(theta)
        
        nodes.append(Node(id=i+1, x=x, y=y, z=z))
        
    # 3. Generate Elements (B32)
    # Elem 1: Nodes 1, 3, Mid=2 ? 
    # CalculiX B32: N1, N2, N3 (Start, End, Mid)
    # Node list is linear: 1, 2, 3, 4, 5...
    # Elem 1: Start=1, End=3, Mid=2
    # Elem 2: Start=3, End=5, Mid=4
    
    for k in range(num_elements):
        start_idx = 2 * k
        n1 = nodes[start_idx].id
        n2 = nodes[start_idx + 2].id
        n3 = nodes[start_idx + 1].id
        
        elements.append(ElementB32(id=k+1, n1=n1, n2=n2, n3=n3))
            
    # Render
    template = Template(INP_TEMPLATE)
    return template.render(
        geometry=geometry,
        material=material,
        nodes=nodes,
        elements=elements,
        top_node_id=nodes[-1].id,
        delta_max=delta_max,
        timestamp=datetime.now().isoformat()
    )
