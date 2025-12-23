"""
CalculiX Result Parser
Extracts key results from .dat and .frd files

Key outputs:
- Reaction forces (RF) → Verify spring rate
- Displacements (U) → Verify height targets
- Stresses (S) → Max von Mises, per-node stress for visualization
"""

import re
from dataclasses import dataclass, field
from typing import List, Dict, Any, Tuple, Optional
from pathlib import Path
import math


@dataclass
class NodeStress:
    """Stress result at a specific node (for 3D visualization)"""
    node_id: int
    von_mises: float
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0


@dataclass
class StepResult:
    """Results for one analysis step (load case)"""
    step_number: int
    step_name: str
    reaction_force_z: float  # Axial reaction force
    max_displacement_z: float
    max_stress: float
    max_stress_node: int
    node_stresses: List[NodeStress] = field(default_factory=list)


@dataclass
class FeaResults:
    """Complete FEA results"""
    job_name: str
    num_steps: int
    steps: List[StepResult]
    errors: List[str]
    warnings: List[str]
    converged: bool = True


def parse_dat_file(dat_path: Path) -> Dict[str, Any]:
    """
    Parse CalculiX .dat file for reaction forces.
    
    Format example:
    forces (fx,fy,fz) for set TOP and time  0.1000000E+01
    
        73 -2.186114E-05 -3.846520E-05 -1.068554E+02
    """
    if not dat_path.exists():
        return {"error": f"File not found: {dat_path}", "rf_z": 0.0}
    
    content = dat_path.read_text()
    
    results = {
        "rf_z": 0.0,
        "rf_steps": []  # Store RF for each time step
    }
    
    # Parse reaction forces at the final time step (time = 1.0)
    # Pattern: "forces (fx,fy,fz) for set TOP and time 0.1000E+01" followed by node data
    lines = content.split('\n')
    
    current_time = 0.0
    for i, line in enumerate(lines):
        # Check for time header (case-insensitive)
        if "forces (fx,fy,fz) for set top" in line.lower():
            # Extract time value
            time_match = re.search(r"time\s+([\d.E+-]+)", line, re.IGNORECASE)
            if time_match:
                current_time = float(time_match.group(1))
            
            # Next non-empty line should have node data
            for j in range(i+1, min(i+5, len(lines))):
                next_line = lines[j].strip()
                if next_line:
                    # Format: node_id fx fy fz
                    parts = next_line.split()
                    if len(parts) >= 4:
                        try:
                            fz = float(parts[3])
                            results["rf_steps"].append({"time": current_time, "fz": fz})
                            # Keep the largest (final) time step result
                            if current_time >= 0.99:
                                results["rf_z"] = abs(fz)
                        except ValueError:
                            continue
                    break
    
    return results


def parse_frd_file(frd_path: Path) -> Dict[str, Any]:
    """
    Parse CalculiX .frd file for stress and displacement results.
    
    .frd format:
    - Header lines start with spaces and field code
    - Node coordinate block: "    2C" followed by "-1 node_id coords"
    - Data blocks: "-4 FIELDNAME" followed by "-1 node_id values"
    
    For B32 beam elements:
    - Stress is output at integration points
    - Need to interpolate/estimate nodal stresses
    """
    if not frd_path.exists():
        return {"error": f"File not found: {frd_path}"}
    
    content = frd_path.read_text(errors='ignore')
    lines = content.split('\n')
    
    results = {
        "node_coords": {},  # node_id -> (x, y, z)
        "node_stresses": [],  # List of NodeStress
        "displacements": {},  # node_id -> (u1, u2, u3)
        "max_stress": 0.0,
        "max_stress_node": 0,
        "max_disp_z": 0.0
    }
    
    i = 0
    current_block = None
    current_step = 1
    
    while i < len(lines):
        line = lines[i]
        
        # Node coordinates block (starts with "    2C")
        if "    2C" in line or line.strip().startswith("2C"):
            i += 1
            while i < len(lines) and lines[i].strip().startswith("-1"):
                parts = lines[i].split()
                if len(parts) >= 4:
                    try:
                        node_id = int(parts[1])
                        x = float(parts[2])
                        y = float(parts[3])
                        z = float(parts[4]) if len(parts) > 4 else 0.0
                        results["node_coords"][node_id] = (x, y, z)
                    except (ValueError, IndexError):
                        pass
                i += 1
            continue
        
        # Displacement block
        if "-4  DISP" in line or "DISPLACEMENT" in line.upper():
            current_block = "DISP"
            i += 1
            while i < len(lines) and lines[i].strip().startswith("-1"):
                parts = lines[i].split()
                if len(parts) >= 4:
                    try:
                        node_id = int(parts[1])
                        u1 = float(parts[2])
                        u2 = float(parts[3])
                        u3 = float(parts[4]) if len(parts) > 4 else 0.0
                        results["displacements"][node_id] = (u1, u2, u3)
                        if abs(u3) > abs(results["max_disp_z"]):
                            results["max_disp_z"] = u3
                    except (ValueError, IndexError):
                        pass
                i += 1
            continue
        
        # Stress block
        if "-4  STRESS" in line or "STRESS" in line.upper() and "-4" in line:
            current_block = "STRESS"
            i += 1
            while i < len(lines) and lines[i].strip().startswith("-1"):
                parts = lines[i].split()
                # For beam elements stress format may vary
                # Try to extract stress components
                if len(parts) >= 4:
                    try:
                        node_id = int(parts[1])
                        # Different formats for beam vs solid
                        if len(parts) >= 7:
                            # Full stress tensor: s11, s22, s33, s12, s13, s23
                            s11 = float(parts[2])
                            s22 = float(parts[3]) 
                            s33 = float(parts[4])
                            s12 = float(parts[5])
                            s13 = float(parts[6])
                            s23 = float(parts[7]) if len(parts) > 7 else 0.0
                            
                            # von Mises stress
                            vm = math.sqrt(0.5 * ((s11-s22)**2 + (s22-s33)**2 + (s33-s11)**2 + 
                                          6*(s12**2 + s13**2 + s23**2)))
                        else:
                            # Beam axial stress only
                            vm = abs(float(parts[2]))
                        
                        coords = results["node_coords"].get(node_id, (0, 0, 0))
                        results["node_stresses"].append(NodeStress(
                            node_id=node_id,
                            von_mises=vm,
                            x=coords[0],
                            y=coords[1],
                            z=coords[2]
                        ))
                        
                        if vm > results["max_stress"]:
                            results["max_stress"] = vm
                            results["max_stress_node"] = node_id
                            
                    except (ValueError, IndexError):
                        pass
                i += 1
            continue
        
        i += 1
    
    return results


def parse_sta_file(sta_path: Path) -> Dict[str, Any]:
    """Parse CalculiX .sta file for convergence status."""
    if not sta_path.exists():
        return {"converged": True, "steps_completed": 0}
    
    content = sta_path.read_text()
    
    results = {
        "converged": "did not converge" not in content.lower(),
        "steps_completed": 0
    }
    
    # Count completed steps
    step_lines = re.findall(r"^\s*(\d+)\s+\d+\s+\d+\s+\d+", content, re.MULTILINE)
    if step_lines:
        results["steps_completed"] = max(int(s) for s in step_lines)
    
    return results


def parse_all_results(job_dir: Path, job_name: str = "spring") -> FeaResults:
    """
    Parse all CalculiX output files and compile results.
    
    Returns FeaResults with per-node stress data for 3D visualization.
    """
    job_dir = Path(job_dir)
    
    dat_results = parse_dat_file(job_dir / f"{job_name}.dat")
    frd_results = parse_frd_file(job_dir / f"{job_name}.frd")
    sta_results = parse_sta_file(job_dir / f"{job_name}.sta")
    
    errors = []
    warnings = []
    
    if "error" in dat_results:
        warnings.append(dat_results["error"])
    if "error" in frd_results:
        warnings.append(frd_results["error"])
    
    converged = sta_results.get("converged", True)
    if not converged:
        errors.append("Solution did not converge")
    
    # Build step results
    steps = []
    
    step = StepResult(
        step_number=1,
        step_name="ANALYSIS",
        reaction_force_z=abs(dat_results.get("rf_z", 0.0)),
        max_displacement_z=abs(frd_results.get("max_disp_z", 0.0)),
        max_stress=frd_results.get("max_stress", 0.0),
        max_stress_node=frd_results.get("max_stress_node", 0),
        node_stresses=frd_results.get("node_stresses", [])
    )
    steps.append(step)
    
    return FeaResults(
        job_name=job_name,
        num_steps=sta_results.get("steps_completed", 1),
        steps=steps,
        errors=errors,
        warnings=warnings,
        converged=converged
    )


def results_to_json(results: FeaResults) -> Dict[str, Any]:
    """Convert FeaResults to JSON-serializable dict with per-node stress for 3D viz"""
    
    # Prepare node stresses for visualization (limit to key nodes if too many)
    all_stresses = []
    for step in results.steps:
        for ns in step.node_stresses:
            all_stresses.append({
                "nodeId": ns.node_id,
                "vonMises": ns.von_mises,
                "x": ns.x,
                "y": ns.y,
                "z": ns.z
            })
    
    # If too many nodes, sample for visualization
    MAX_VIZ_NODES = 500
    if len(all_stresses) > MAX_VIZ_NODES:
        step_size = len(all_stresses) // MAX_VIZ_NODES
        all_stresses = all_stresses[::step_size]
    
    return {
        "job_name": results.job_name,
        "num_steps": results.num_steps,
        "success": len(results.errors) == 0 and results.converged,
        "converged": results.converged,
        "errors": results.errors,
        "warnings": results.warnings,
        "steps": [
            {
                "step_number": step.step_number,
                "step_name": step.step_name,
                "reaction_force_z": step.reaction_force_z,
                "max_displacement_z": step.max_displacement_z,
                "max_stress": step.max_stress,
                "max_stress_node": step.max_stress_node
            }
            for step in results.steps
        ],
        # Per-node stress data for 3D visualization
        "node_stresses": all_stresses,
        "max_stress": results.steps[0].max_stress if results.steps else 0.0
    }


if __name__ == "__main__":
    import json
    results = parse_all_results(Path("/tmp/fea_test"), "spring")
    print(json.dumps(results_to_json(results), indent=2))
