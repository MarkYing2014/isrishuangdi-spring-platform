from __future__ import annotations

"""
fea_service.py

Phase 1: Beam + CalculiX placeholder pipeline
- Generate simple helical centerline (torsion only for now)
- Write CalculiX beam .inp
- (Optional) run ccx
- Parse placeholder results and return node field suitable for Three.js coloring
"""

import json
import math
import os
import re
import subprocess
import shutil
import tempfile
from dataclasses import dataclass
from typing import Any, Dict, List, Literal, Tuple

SpringType = Literal["compression", "extension", "torsion", "conical", "spiralTorsion"]


@dataclass
class LoadCase:
  spring_type: SpringType
  load_value: float
  lever_arm: float | None = None
  angle_deg: float | None = None
  constraint_type: str = "default"


@dataclass
class FEAResultNode:
  id: int
  x: float
  y: float
  z: float
  sigma_vm: float
  ux: float
  uy: float
  uz: float


@dataclass
class FEAResult:
  nodes: List[FEAResultNode]
  max_sigma: float
  max_displacement: float
  safety_factor: float | None = None

  def to_dict(self) -> Dict[str, Any]:
    return {
      "nodes": [
        {
          "id": n.id,
          "x": n.x,
          "y": n.y,
          "z": n.z,
          "sigma_vm": n.sigma_vm,
          "ux": n.ux,
          "uy": n.uy,
          "uz": n.uz,
        }
        for n in self.nodes
      ],
      "maxSigma": self.max_sigma,
      "maxDisplacement": self.max_displacement,
      "safetyFactor": self.safety_factor,
    }


def find_ccx_executable() -> str | None:
  ccx_env = os.environ.get("CCX_PATH") or os.environ.get("CCX_BIN")
  if ccx_env and os.path.isfile(ccx_env):
    return ccx_env

  exe = shutil.which("ccx")
  if exe:
    return exe

  for name in ("ccx_2.22", "ccx_2.21", "ccx_2.20", "ccx_2.19"):
    exe = shutil.which(name)
    if exe:
      return exe

  for base in (
    "/opt/homebrew/opt/calculix-ccx/bin",
    "/usr/local/opt/calculix-ccx/bin",
  ):
    if not os.path.isdir(base):
      continue

    for name in ("ccx", "ccx_2.22", "ccx_2.21", "ccx_2.20", "ccx_2.19"):
      candidate = os.path.join(base, name)
      if os.path.isfile(candidate) and os.access(candidate, os.X_OK):
        return candidate

    try:
      for fn in os.listdir(base):
        if not fn.startswith("ccx_"):
          continue
        candidate = os.path.join(base, fn)
        if os.path.isfile(candidate) and os.access(candidate, os.X_OK):
          return candidate
    except Exception:
      pass

  return None


def generate_centerline_points(
  spring_type: SpringType,
  geometry: Dict[str, Any],
  num_samples: int = 80,
) -> List[Tuple[float, float, float]]:
  """Generate helix centerline for all spring types."""
  pts: List[Tuple[float, float, float]] = []

  if spring_type == "compression":
    # Compression spring: constant radius helix
    dm = geometry.get("meanDiameter", 12.0)
    d = geometry.get("wireDiameter", 1.6)
    total_coils = geometry.get("totalCoils", geometry.get("activeCoils", 6) + 2)
    free_length = geometry.get("freeLength", total_coils * d * 1.5)
    radius = dm / 2.0
    pitch = free_length / total_coils
    total_angle = 2.0 * math.pi * total_coils

    for i in range(num_samples + 1):
      t = i / num_samples
      theta = t * total_angle
      z = t * free_length
      x = radius * math.cos(theta)
      y = radius * math.sin(theta)
      pts.append((x, y, z))

  elif spring_type == "extension":
    # Extension spring: close-wound helix (pitch ≈ wire diameter)
    dm = geometry.get("meanDiameter", 12.0)
    d = geometry.get("wireDiameter", 1.6)
    coils = geometry.get("activeCoils", 6)
    radius = dm / 2.0
    pitch = d  # Close-wound
    length = pitch * coils
    total_angle = 2.0 * math.pi * coils

    for i in range(num_samples + 1):
      t = i / num_samples
      theta = t * total_angle
      z = t * length
      x = radius * math.cos(theta)
      y = radius * math.sin(theta)
      pts.append((x, y, z))

  elif spring_type == "torsion":
    # Torsion spring: close-wound helix
    dm = geometry.get("meanDiameter", 12.0)
    d = geometry.get("wireDiameter", 1.6)
    coils = geometry.get("activeCoils", 6)
    pitch = geometry.get("pitch", d)
    radius = dm / 2.0
    total_angle = 2.0 * math.pi * coils
    length = pitch * coils

    for i in range(num_samples + 1):
      t = i / num_samples
      theta = t * total_angle
      z = t * length
      x = radius * math.cos(theta)
      y = radius * math.sin(theta)
      pts.append((x, y, z))

  elif spring_type == "conical":
    # Conical spring: variable radius helix (linear taper)
    d1 = geometry.get("largeEndDiameter", geometry.get("outerDiameter", 20.0))
    d2 = geometry.get("smallEndDiameter", geometry.get("outerDiameter", 20.0) * 0.5)
    d = geometry.get("wireDiameter", 1.6)
    coils = geometry.get("activeCoils", 6)
    free_length = geometry.get("freeLength", coils * d * 2)
    
    r1 = (d1 - d) / 2.0  # Large end mean radius
    r2 = (d2 - d) / 2.0  # Small end mean radius
    total_angle = 2.0 * math.pi * coils

    for i in range(num_samples + 1):
      t = i / num_samples
      theta = t * total_angle
      z = t * free_length
      # Linear interpolation of radius
      radius = r1 + t * (r2 - r1)
      x = radius * math.cos(theta)
      y = radius * math.sin(theta)
      pts.append((x, y, z))

  elif spring_type == "spiralTorsion":
    di = geometry.get("innerDiameter", 15.0)
    do = geometry.get("outerDiameter", 50.0)
    turns = geometry.get("turns", geometry.get("activeCoils", 5))
    ri = float(di) / 2.0
    ro = float(do) / 2.0
    turns = float(turns)
    total_angle = 2.0 * math.pi * turns
    a = (ro - ri) / total_angle if total_angle != 0 else 0.0
    handedness = geometry.get("handedness", geometry.get("windingDirection", "cw"))

    for i in range(num_samples + 1):
      t = i / num_samples
      theta = t * total_angle
      r = ri + a * theta
      angle = -theta if handedness == "cw" else theta
      x = r * math.cos(angle)
      y = r * math.sin(angle)
      z = 0.0
      pts.append((x, y, z))

  else:
    raise NotImplementedError(f"Centerline generation for {spring_type} is not implemented")

  return pts


def write_beam_inp(
  path: str,
  centerline: List[Tuple[float, float, float]],
  geometry: Dict[str, Any],
  load_case: LoadCase,
  job_name: str = "spring_beam",
) -> None:
  d = geometry.get("wireDiameter", 1.6)
  radius = d / 2.0
  strip_width = geometry.get("stripWidth", 10.0)
  strip_thickness = geometry.get("stripThickness", 0.8)

  e_mod = 2.06e5  # MPa
  poisson = 0.3
  density = 7.8e-9  # tonne/mm^3

  lines: List[str] = []
  lines.append("*HEADING")
  lines.append("Spring beam model generated by fea_service.py\n")
  lines.append("*NODE")
  for i, (x, y, z) in enumerate(centerline, start=1):
    lines.append(f"{i}, {x:.6f}, {y:.6f}, {z:.6f}")

  lines.append("*ELEMENT, TYPE=B31, ELSET=EALL")
  for i in range(1, len(centerline)):
    lines.append(f"{i}, {i}, {i + 1}")

  last_node = len(centerline)
  lines.append("*NSET, NSET=NALL, GENERATE")
  lines.append(f"1, {last_node}, 1")

  if load_case.spring_type == "spiralTorsion":
    lines.append("*BEAM SECTION, SECTION=RECT, MATERIAL=SPRINGSTEEL, ELSET=EALL")
    lines.append(f"{float(strip_thickness):.6f}, {float(strip_width):.6f}, 0., 0., 1.")
  else:
    lines.append("*BEAM SECTION, SECTION=CIRCLE, MATERIAL=SPRINGSTEEL, ELSET=EALL")
    lines.append(f"{radius:.6f}, 0., 0., 1., 1., 0., 0.")

  lines.append("*MATERIAL, NAME=SPRINGSTEEL")
  lines.append("*ELASTIC")
  lines.append(f"{e_mod:.1f}, {poisson:.3f}")
  lines.append("*DENSITY")
  lines.append(f"{density:.6e}")

  lines.append("*BOUNDARY")
  lines.append("1, 1, 6")

  lines.append("*STEP")
  lines.append("*STATIC")

  lines.append("*CLOAD")
  fy = load_case.load_value
  if load_case.spring_type == "spiralTorsion":
    target_dof = 6
  else:
    target_dof = 2 if load_case.spring_type == "torsion" else 3
  lines.append(f"{last_node}, {target_dof}, {fy:.3f}")

  lines.append("*NODE PRINT, NSET=NALL")
  lines.append("U")
  lines.append("*EL PRINT, ELSET=EALL")
  lines.append("S")
  lines.append("*END STEP")

  with open(path, "w", encoding="utf-8") as fh:
    fh.write("\n".join(lines))


def run_ccx(workdir: str, job_name: str, ccx_exe: str) -> None:
  subprocess.run(
    [ccx_exe, job_name],
    cwd=workdir,
    check=True,
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
  )


def parse_ccx_dat(
  dat_path: str,
  centerline: List[Tuple[float, float, float]],
  spring_type: SpringType,
  geometry: Dict[str, Any],
  load_case: LoadCase,
  allow_stress: float | None = None,
) -> FEAResult:
  """
  Parse CalculiX .dat output file.
  Currently returns simulated placeholder values for visualization testing.
  Uses engineering formulas to generate realistic stress values.
  """
  num_nodes = len(centerline)

  if os.path.exists(dat_path):
    try:
      with open(dat_path, "r", encoding="utf-8", errors="ignore") as fh:
        dat_text = fh.read()

      disp_map: Dict[int, Tuple[float, float, float]] = {}
      in_u = False
      blank_count = 0
      for line in dat_text.splitlines():
        low = line.lower()
        if "displacements" in low:
          in_u = True
          blank_count = 0
          continue
        if in_u:
          if line.strip() == "":
            blank_count += 1
            if blank_count > 1:
              in_u = False
            continue
          m = re.match(r"^\s*(\d+)\s+([-+0-9Ee.]+)\s+([-+0-9Ee.]+)\s+([-+0-9Ee.]+)", line)
          if m:
            nid = int(m.group(1))
            disp_map[nid] = (float(m.group(2)), float(m.group(3)), float(m.group(4)))

      el_mises: Dict[int, float] = {}
      in_s = False
      s_blank_count = 0
      for line in dat_text.splitlines():
        low = line.lower()
        if "stresses" in low:
          in_s = True
          s_blank_count = 0
          continue
        if in_s:
          if line.strip() == "":
            s_blank_count += 1
            if s_blank_count > 1:
              in_s = False
            continue
        if in_s:
          m = re.match(
            r"^\s*(\d+)\s+(\d+)\s+([-+0-9Ee.]+)\s+([-+0-9Ee.]+)\s+([-+0-9Ee.]+)\s+([-+0-9Ee.]+)\s+([-+0-9Ee.]+)\s+([-+0-9Ee.]+)",
            line,
          )
          if m:
            eid = int(m.group(1))
            sxx = float(m.group(3))
            syy = float(m.group(4))
            szz = float(m.group(5))
            sxy = float(m.group(6))
            sxz = float(m.group(7))
            syz = float(m.group(8))
            mises = math.sqrt(
              0.5 * ((sxx - syy) ** 2 + (syy - szz) ** 2 + (szz - sxx) ** 2) + 3.0 * (sxy ** 2 + syz ** 2 + sxz ** 2)
            )
            if eid not in el_mises or mises > el_mises[eid]:
              el_mises[eid] = mises

      if disp_map:
        nodes: List[FEAResultNode] = []
        max_sigma = 0.0
        max_disp = 0.0

        for i, (x, y, z) in enumerate(centerline, start=1):
          ux, uy, uz = disp_map.get(i, (0.0, 0.0, 0.0))
          sigma_vm = 0.0
          if el_mises:
            sigma_vm = max(el_mises.get(i - 1, 0.0), el_mises.get(i, 0.0))
          nodes.append(FEAResultNode(id=i, x=x, y=y, z=z, sigma_vm=sigma_vm, ux=ux, uy=uy, uz=uz))
          max_sigma = max(max_sigma, sigma_vm)
          max_disp = max(max_disp, math.sqrt(ux * ux + uy * uy + uz * uz))

        safety_factor = (allow_stress / max_sigma) if allow_stress and max_sigma > 0 else None
        return FEAResult(nodes=nodes, max_sigma=max_sigma, max_displacement=max_disp, safety_factor=safety_factor)
    except Exception:
      pass

  nodes: List[FEAResultNode] = []
  
  # Get geometry parameters
  d = geometry.get("wireDiameter", 1.6)  # Wire diameter (mm)
  D = geometry.get("meanDiameter", geometry.get("outerDiameter", 12.0) - d)  # Mean diameter (mm)
  C = D / d  # Spring index
  
  load_value = load_case.load_value
  lever_arm = load_case.lever_arm or 20.0
  
  # Calculate base stress using engineering formulas
  if spring_type == "torsion":
    # Torsion spring: bending stress σ = Ki * 32 * M / (π * d³)
    # Ki = (4C² - C - 1) / (4C * (C - 1)) inner stress correction
    Ki = (4 * C * C - C - 1) / (4 * C * (C - 1)) if C > 1 else 1.0
    M = load_value * lever_arm  # Moment (N·mm)
    base_sigma = (Ki * 32 * M) / (math.pi * d ** 3)
  elif spring_type in ("compression", "extension"):
    # Compression/Extension: shear stress τ = 8 * F * D * Kw / (π * d³)
    # Wahl correction factor
    Kw = (4 * C - 1) / (4 * C - 4) + 0.615 / C if C > 1 else 1.0
    base_sigma = (8 * load_value * D * Kw) / (math.pi * d ** 3)
  elif spring_type == "conical":
    # Conical: use large end diameter for max stress
    D1 = geometry.get("largeOuterDiameter", geometry.get("outerDiameter", 20.0)) - d
    C1 = D1 / d
    Kw = (4 * C1 - 1) / (4 * C1 - 4) + 0.615 / C1 if C1 > 1 else 1.0
    base_sigma = (8 * load_value * D1 * Kw) / (math.pi * d ** 3)
  elif spring_type == "spiralTorsion":
    b = float(geometry.get("stripWidth", geometry.get("b", 10.0)))
    t = float(geometry.get("stripThickness", geometry.get("t", 0.8)))
    b = max(1e-9, b)
    t = max(1e-9, t)
    torque = load_value  # N·mm
    base_sigma = (6.0 * torque) / (b * t * t)
  else:
    base_sigma = load_value * 2.0
  
  max_sigma = 0.0
  max_disp = 0.0
  
  for i, (x, y, z) in enumerate(centerline, start=1):
    t = i / num_nodes  # Normalized position [0, 1]
    
    # Simulated von Mises stress (MPa)
    # Stress varies along the spring with some distribution
    # Higher near fixed end for torsion, more uniform for compression
    if spring_type == "torsion":
      # Torsion: stress highest at fixed end
      stress_factor = 1.0 - t * 0.3
    elif spring_type == "spiralTorsion":
      stress_factor = 1.0 - t * 0.35
    else:
      # Compression/Extension: stress more uniform with coil variation
      stress_factor = 0.85 + 0.15 * math.sin(t * math.pi * 2)
    
    coil_variation = 0.1 * math.sin(t * math.pi * 8)  # Small coil-to-coil variation
    sigma_vm = max(0.0, base_sigma * stress_factor * (1.0 + coil_variation))
    
    # Simulated displacement (mm)
    # Increases toward free end
    disp_scale = load_value / 100.0
    ux = t * 0.1 * disp_scale
    uy = t * 0.05 * disp_scale
    uz = t * 0.5 * disp_scale
    
    nodes.append(FEAResultNode(
      id=i, x=x, y=y, z=z,
      sigma_vm=sigma_vm,
      ux=ux, uy=uy, uz=uz
    ))
    
    max_sigma = max(max_sigma, sigma_vm)
    disp_mag = math.sqrt(ux**2 + uy**2 + uz**2)
    max_disp = max(max_disp, disp_mag)
  
  safety_factor = (allow_stress / max_sigma) if allow_stress and max_sigma > 0 else None
  return FEAResult(nodes=nodes, max_sigma=max_sigma, max_displacement=max_disp, safety_factor=safety_factor)


def run_fea(design: Dict[str, Any]) -> Dict[str, Any]:
  spring_type: SpringType = design["springType"]
  geometry = design["geometry"]
  load_case_raw = design.get("loadCase", {})
  allow_stress = design.get("allowableStress")
  load_case = LoadCase(
    spring_type=spring_type,
    load_value=float(load_case_raw.get("loadValue", 0.0)),
    lever_arm=load_case_raw.get("leverArm"),
    angle_deg=load_case_raw.get("angleDeg"),
    constraint_type=load_case_raw.get("constraintType", "default"),
  )

  centerline = generate_centerline_points(spring_type, geometry)

  keep_tmp = os.environ.get("FEA_KEEP_TMP") in ("1", "true", "TRUE", "yes", "YES")
  tmpctx: tempfile.TemporaryDirectory[str] | None = None
  tmpdir: str

  if keep_tmp:
    tmpdir = tempfile.mkdtemp(prefix="fea_")
  else:
    tmpctx = tempfile.TemporaryDirectory()
    tmpdir = tmpctx.name

  try:
    job_name = "spring_beam"
    inp_path = os.path.join(tmpdir, f"{job_name}.inp")
    write_beam_inp(inp_path, centerline, geometry, load_case, job_name=job_name)

    ccx_exe = find_ccx_executable()
    if ccx_exe is not None:
      try:
        run_ccx(tmpdir, job_name, ccx_exe)
      except Exception:
        pass

    dat_path = os.path.join(tmpdir, f"{job_name}.dat")
    result = parse_ccx_dat(
      dat_path,
      centerline,
      spring_type=spring_type,
      geometry=geometry,
      load_case=load_case,
      allow_stress=float(allow_stress) if allow_stress is not None else None,
    )
    out = result.to_dict()
    if keep_tmp:
      out["debugWorkdir"] = tmpdir
    return out
  finally:
    if tmpctx is not None:
      tmpctx.cleanup()


def main() -> None:
  payload = json.loads(input())
  result = run_fea(payload)
  print(json.dumps(result))


if __name__ == "__main__":
  main()
