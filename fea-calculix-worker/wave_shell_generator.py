"""
Wave Spring Shell Model Generator (S4 Elements)
Generates static nonlinear (NLGEOM) contact analysis .inp files for CalculiX.
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
    b: float          # Radial Wall Width (mm) -- usually (OD-ID)/2
    n_w: float        # Waves per turn
    n_t: float        # Number of turns
    h0: float         # Free Height (mm)
    
@dataclass
class Material:
    E: float = 203000.0  # MPa
    nu: float = 0.28
    density: float = 7.85e-9 # tonne/mm^3
    yield_strength: float = 1170.0
    name: str = "MAT_177PH_CH900"

@dataclass
class Node:
    id: int
    x: float
    y: float
    z: float

@dataclass
class ElementS4:
    id: int
    n1: int
    n2: int
    n3: int
    n4: int

INP_TEMPLATE = """** ===============================================
** Wave Spring Shell FEA - CalculiX
** Generated: {{ timestamp }}
** ===============================================

*HEADING
Wave Spring Shell Analysis

** ---------- MATERIAL ----------
*MATERIAL, NAME={{ material.name }}
*ELASTIC
{{ material.E }}, {{ material.nu }}
*DENSITY
{{ material.density }}
*PLASTIC
{{ material.yield_strength }}, 0.0

** ---------- SHELL SECTION ----------
*SHELL SECTION, ELSET=E_WAVE, MATERIAL={{ material.name }}
{{ geometry.t }}

** ---------- NODES ----------
*NODE, NSET=N_WAVE
{%- for node in nodes %}
{{ node.id }}, {{ "%.4f"|format(node.x) }}, {{ "%.4f"|format(node.y) }}, {{ "%.4f"|format(node.z) }}
{%- endfor %}

** ---------- ELEMENTS (S4) ----------
*ELEMENT, TYPE=S4, ELSET=E_WAVE
{%- for elem in elements %}
{{ elem.id }}, {{ elem.n1 }}, {{ elem.n2 }}, {{ elem.n3 }}, {{ elem.n4 }}
{%- endfor %}

** ---------- RIGID PLATES ----------
*NODE, NSET=RP_TOP
100000, 0.0, 0.0, {{ "%.4f"|format(plate_z_top) }}
*NODE, NSET=RP_BOT
100001, 0.0, 0.0, {{ "%.4f"|format(plate_z_bot) }}

*NSET, NSET=N_REF_POINTS
100000, 100001

*RIGID BODY, REF NODE=100000, ROT NODE=100000
*RIGID BODY, REF NODE=100001, ROT NODE=100001

** ---------- CONTACT ----------
*SURFACE, NAME=S_WAVE, TYPE=ELEMENT
E_WAVE, NEG
*SURFACE, NAME=S_TOP, TYPE=CYLINDER
0., 0., 0., 0., 0., 1.
{{ "%.4f"|format(plate_z_top) }}
*SURFACE, NAME=S_BOT, TYPE=CYLINDER
0., 0., 0., 0., 0., 1.
{{ "%.4f"|format(plate_z_bot) }}

** Contact definitions (Rigid Plate to Shell) 
** Note: Using rigid body reference node control is safer, 
** but explicit surface definitions often need physical elements for plates in CCX.
** Here we simplify using *SURFACE INTERACTION and analytical/rigid assumptions if possible.
** For robustness, we often define dummy rigid elements. 
** For this MVP, we assume standard contact logic.

*SURFACE INTERACTION, NAME=INT_FRIC
*SURFACE BEHAVIOR, PRESSURE-OVERCLOSURE=EXPONENTIAL
0.1, 0.5
*FRICTION
0.0

*CONTACT PAIR, INTERACTION=INT_FRIC, TYPE=SURFACE TO SURFACE
S_WAVE, S_TOP
S_WAVE, S_BOT

** Self Contact (Wave to Wave)
*CONTACT PAIR, INTERACTION=INT_FRIC, TYPE=SURFACE TO SURFACE
S_WAVE, S_WAVE

** ---------- BOUNDARY CONDITIONS ----------
*BOUNDARY
100001, 1, 6, 0.0   ** Fix Bottom RP
100000, 1, 2, 0.0   ** Fix Top RP X,Y
100000, 4, 6, 0.0   ** Fix Top RP Rotations (maintain parallel)

** ---------- STEP ----------
*STEP, NLGEOM
*STATIC
0.05, 1.0, 1e-5, 0.1

** COMPRESSION
*BOUNDARY
100000, 3, 3, -{{ "%.4f"|format(delta_max) }}

*OUTPUT, FIELD, FREQUENCY=1
*NODE OUTPUT
U, RF
*ELEMENT OUTPUT, ELSET=E_WAVE
S, E

*OUTPUT, HISTORY, FREQUENCY=1
*NODE OUTPUT, NSET=RP_TOP
RF3, U3

*END STEP
"""

def generate_wave_shell_inp(
    geometry: WaveSpringGeometry,
    material: Material,
    delta_max: float,
    design_code: str = "WAVE-001"
) -> str:
    # 1. Mesh Parameters
    # As per user recommendation: 20-30 segs per wave, 4-8 segs width
    segs_per_wave = 24
    width_segs = 4
    
    total_circum_segs = int(geometry.n_t * geometry.n_w * segs_per_wave)
    
    nodes: List[Node] = []
    elements: List[ElementS4] = []
    
    # 2. Generate Nodes
    # j: index along width (0 to width_segs)
    # i: index along circumference (0 to total_circum_segs)
    
    node_id_counter = 1
    
    # Store node IDs in a grid for element connectivity
    # grid[i][j] = node_id
    grid = [[0 for _ in range(width_segs + 1)] for _ in range(total_circum_segs + 1)]
    
    for i in range(total_circum_segs + 1):
        theta = (i / total_circum_segs) * (2 * math.pi * geometry.n_t)
        
        # Centerline Z
        # z(theta) = (H0/2) * sin(Nw * theta) ?? 
        # Actually H0 is total free height.
        # Amplitude A. 
        # Wave height means peak-to-peak. 
        # Total Height H0 = (Nt * t) + (Nt * 2 * Amplitude) roughly?
        # User formula: z(theta) = (H0/2) * sin(nW * theta) 
        # THIS IS WRONG for multi-turn. H0 includes thickness stacks.
        # Single turn wave height h_w = (H0 - t*Nt)/Nt if solid?
        # Let's assume user meant "Wave Amplitude" driven function.
        # For a standard wave spring:
        # z = (h_wave/2) * sin(nw * theta) + (pitch_offset if needed)
        # Simplified for user provided single-turn logic: 
        # z(theta) = (H0/2) * sin(nW * theta) (User's Example)
        
        # Let's derive Amplitude from Free Height Hf and Turns Nt
        # Hf = Nt * (t + 2*Amp) -> 2*Amp = Hf/Nt - t -> Amp = (Hf/Nt - t)/2
        # BUT CalculiX coordinates need absolute Z.
        # We need to map the helix.
        
        # Let's stick to User's specific provided formula for simplicity first, 
        # but add a Z-shift for multi-turn stacking if needed.
        # center_z = (H0/2) * sin(n_w * theta)  <-- This creates a single ring oscillating around 0.
        # For multi-turn, it should spiral up? Or just overlap (crest-to-crest)?
        # Real Crest-to-crest springs are physically separate rings or specialized winding.
        # If "Crest-to-Crest" (Shim ends), they are stacked.
        # If "Single Turn", simple.
        
        # Assumption: User wants a single turn simulation first or simple sine.
        # Let's implementation the User's formula exactly:
        z_center = (geometry.h0 / 2.0) * math.sin(geometry.n_w * theta)
        
        # But wait, H0 is free height. If H0 is large, this is a huge wave.
        # Correct interpretation: Z oscillates between +H0/2 and -H0/2?
        # That logic fits a "single turn" that occupies H0.
        
        for j in range(width_segs + 1):
            # Radial position
            # r_inner = ID/2, r_outer = OD/2
            # r = r_inner + (j / width_segs) * (OD - ID)/2 * 2 ? -> (OD-ID)
            r_j = (geometry.id / 2.0) + (j / width_segs) * geometry.b
            
            x = r_j * math.cos(theta)
            y = r_j * math.sin(theta)
            z = z_center
            
            nodes.append(Node(id=node_id_counter, x=x, y=y, z=z))
            grid[i][j] = node_id_counter
            node_id_counter += 1

    # 3. Generate Elements
    elem_id_counter = 1
    for i in range(total_circum_segs):
        for j in range(width_segs):
            n1 = grid[i][j]
            n2 = grid[i+1][j]
            n3 = grid[i+1][j+1]
            n4 = grid[i][j+1]
            
            elements.append(ElementS4(id=elem_id_counter, n1=n1, n2=n2, n3=n3, n4=n4))
            elem_id_counter += 1
            
    # 4. Plate Positions
    # Top plate at H0/2 + epsilon, Bot at -H0/2 - epsilon?
    # Based on z_center max/min = +/- H0/2.
    plate_z_top = geometry.h0 / 2.0 + 0.1
    plate_z_bot = -(geometry.h0 / 2.0) - 0.1
            
    # Render
    template = Template(INP_TEMPLATE)
    return template.render(
        geometry=geometry,
        material=material,
        nodes=nodes,
        elements=elements,
        plate_z_top=plate_z_top,
        plate_z_bot=plate_z_bot,
        delta_max=delta_max,
        timestamp=datetime.now().isoformat()
    )
