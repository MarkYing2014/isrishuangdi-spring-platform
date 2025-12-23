"""
CalculiX Result Parser
Extracts key results from .dat and .frd files

Key outputs:
- Reaction forces (RF) → Verify spring rate
- Displacements (U) → Verify height targets
- Stresses (S) → Max von Mises, location
"""

import re
from dataclasses import dataclass
from typing import List, Dict, Any, Tuple
from pathlib import Path


@dataclass
class NodeResult:
    """Result at a specific node"""
    node_id: int
    values: List[float]  # Component values (e.g., RF1, RF2, RF3 or U1, U2, U3)


@dataclass
class StepResult:
    """Results for one analysis step (load case)"""
    step_number: int
    step_name: str
    reaction_force: Dict[int, Tuple[float, float, float]]  # node_id -> (RF1, RF2, RF3)
    displacement: Dict[int, Tuple[float, float, float]]  # node_id -> (U1, U2, U3)
    max_stress: float
    max_stress_element: int
    max_stress_location: Tuple[float, float, float] | None


@dataclass
class FeaResults:
    """Complete FEA results"""
    job_name: str
    num_steps: int
    steps: List[StepResult]
    errors: List[str]
    warnings: List[str]


def parse_dat_file(dat_path: str | Path) -> Dict[str, Any]:
    """
    Parse CalculiX .dat file for reaction forces and node output.
    
    The .dat file contains ASCII output of requested results.
    """
    dat_path = Path(dat_path)
    if not dat_path.exists():
        return {"error": f"File not found: {dat_path}"}
    
    content = dat_path.read_text()
    
    results = {
        "reaction_forces": {},
        "displacements": {}
    }
    
    # Parse reaction forces
    # Format: 
    #  total force (fx,fy,fz) for set TOP and target load
    #    5.0000E+02   2.0000E+03   1.0000E+01
    rf_pattern = r"total force.*?for set (\w+).*?\n\s*([-\d.E+]+)\s+([-\d.E+]+)\s+([-\d.E+]+)"
    rf_matches = re.findall(rf_pattern, content, re.IGNORECASE | re.MULTILINE)
    
    for match in rf_matches:
        set_name, fx, fy, fz = match
        results["reaction_forces"][set_name] = {
            "fx": float(fx),
            "fy": float(fy),
            "fz": float(fz),
            "magnitude": (float(fx)**2 + float(fy)**2 + float(fz)**2)**0.5
        }
    
    return results


def parse_frd_file(frd_path: str | Path) -> Dict[str, Any]:
    """
    Parse CalculiX .frd file for stress results.
    
    The .frd file is a binary/ASCII hybrid format.
    We focus on extracting max stress values.
    """
    frd_path = Path(frd_path)
    if not frd_path.exists():
        return {"error": f"File not found: {frd_path}"}
    
    content = frd_path.read_text(errors='ignore')
    
    results = {
        "stresses": [],
        "displacements": [],
        "max_stress": 0.0,
        "max_stress_element": 0
    }
    
    # Parse stress output
    # FRD format has blocks starting with -4 or -5 followed by field type
    # Stress block pattern (simplified)
    stress_pattern = r"-4\s+STRESS.*?\n((?:\s*-1.*?\n)+)"
    stress_blocks = re.findall(stress_pattern, content, re.MULTILINE)
    
    max_stress = 0.0
    max_elem = 0
    
    # Parse stress values from each block
    for block in stress_blocks:
        lines = block.strip().split('\n')
        for line in lines:
            # -1 node_id s11 s22 s33 s12 s13 s23
            parts = line.split()
            if len(parts) >= 7 and parts[0] == '-1':
                try:
                    node_id = int(parts[1])
                    s11 = float(parts[2])
                    s22 = float(parts[3])
                    s33 = float(parts[4])
                    s12 = float(parts[5])
                    s13 = float(parts[6])
                    s23 = float(parts[7]) if len(parts) > 7 else 0.0
                    
                    # Calculate von Mises stress
                    vm = ((s11-s22)**2 + (s22-s33)**2 + (s33-s11)**2 + 
                          6*(s12**2 + s13**2 + s23**2))**0.5 / (2**0.5)
                    
                    if vm > max_stress:
                        max_stress = vm
                        max_elem = node_id
                        
                except (ValueError, IndexError):
                    continue
    
    results["max_stress"] = max_stress
    results["max_stress_element"] = max_elem
    
    return results


def parse_sta_file(sta_path: str | Path) -> Dict[str, Any]:
    """
    Parse CalculiX .sta file for convergence status.
    
    The .sta file contains step-by-step convergence information.
    """
    sta_path = Path(sta_path)
    if not sta_path.exists():
        return {"error": f"File not found: {sta_path}"}
    
    content = sta_path.read_text()
    
    results = {
        "converged": True,
        "steps_completed": 0,
        "warnings": [],
        "errors": []
    }
    
    # Check for convergence issues
    if "did not converge" in content.lower():
        results["converged"] = False
        results["errors"].append("Solution did not converge")
    
    # Count completed steps
    step_pattern = r"step\s+(\d+)"
    steps = re.findall(step_pattern, content, re.IGNORECASE)
    if steps:
        results["steps_completed"] = max(int(s) for s in steps)
    
    return results


def parse_all_results(job_dir: str | Path, job_name: str = "spring") -> FeaResults:
    """
    Parse all CalculiX output files and compile results.
    
    Args:
        job_dir: Directory containing output files
        job_name: Base name of the job (without extension)
    
    Returns:
        FeaResults with compiled data
    """
    job_dir = Path(job_dir)
    
    dat_results = parse_dat_file(job_dir / f"{job_name}.dat")
    frd_results = parse_frd_file(job_dir / f"{job_name}.frd")
    sta_results = parse_sta_file(job_dir / f"{job_name}.sta")
    
    errors = []
    warnings = []
    
    if "error" in dat_results:
        errors.append(dat_results["error"])
    if "error" in frd_results:
        errors.append(frd_results["error"])
    if "error" in sta_results:
        errors.append(sta_results["error"])
    
    if not sta_results.get("converged", True):
        errors.extend(sta_results.get("errors", []))
    
    warnings.extend(sta_results.get("warnings", []))
    
    # Build step results
    steps = []
    
    # For now, create a single aggregated result
    # In production, would parse per-step data
    if not errors:
        step = StepResult(
            step_number=1,
            step_name="COMBINED",
            reaction_force=dat_results.get("reaction_forces", {}),
            displacement={},
            max_stress=frd_results.get("max_stress", 0.0),
            max_stress_element=frd_results.get("max_stress_element", 0),
            max_stress_location=None
        )
        steps.append(step)
    
    return FeaResults(
        job_name=job_name,
        num_steps=sta_results.get("steps_completed", 0),
        steps=steps,
        errors=errors,
        warnings=warnings
    )


def results_to_json(results: FeaResults) -> Dict[str, Any]:
    """Convert FeaResults to JSON-serializable dict"""
    return {
        "job_name": results.job_name,
        "num_steps": results.num_steps,
        "success": len(results.errors) == 0,
        "errors": results.errors,
        "warnings": results.warnings,
        "steps": [
            {
                "step_number": step.step_number,
                "step_name": step.step_name,
                "reaction_force": step.reaction_force,
                "max_stress": step.max_stress,
                "max_stress_element": step.max_stress_element,
            }
            for step in results.steps
        ]
    }


# Example usage
if __name__ == "__main__":
    import json
    
    # Test with example directory
    results = parse_all_results("/tmp/fea_test", "spring")
    print(json.dumps(results_to_json(results), indent=2))
