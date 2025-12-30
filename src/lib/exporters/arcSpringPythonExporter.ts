export type ArcProfile = "ARC" | "BOW";

export interface ArcSpringFreeCADParams {
    d: number;
    D: number;
    n: number;
    r: number;
    alphaDeg: number;             // currentAlphaDeg
    profile: ArcProfile;

    deadCoilsStart: number;
    deadCoilsEnd: number;
    k: number;                    // deadTightnessK

    bowLeanDeg?: number;
    bowPlaneTiltDeg?: number;

    samples?: number;             // default 400
    phaseDeg?: number;            // default 0
    capRatio?: number;            // default 0.95
    makeSolid?: boolean;          // default true
    exportSTEP?: boolean;         // default false
    exportSTL?: boolean;          // default false
    fileStem?: string;            // default "ArcSpring"
}

function f(n: number) {
    return Number.isFinite(n) ? n.toFixed(6) : "0.0";
}

export function generateFreeCADScript(p: ArcSpringFreeCADParams): string {
    const samples = p.samples ?? 400;
    const capRatio = p.capRatio ?? 0.95;
    const makeSolid = p.makeSolid ?? true;
    const phaseDeg = p.phaseDeg ?? 0;

    return `# FreeCAD Macro: Arc Spring (Blended-Anchor) Export
# Generated from Web Visualizer - 1:1 Parity with Three.js Algorithm
import FreeCAD as App
import Part
import math

DOC_NAME = "${p.fileStem ?? "ArcSpring"}"
try:
    doc = App.getDocument(DOC_NAME)
except:
    doc = App.newDocument(DOC_NAME)

# ---------------- Parameters (mm, deg) ----------------
d = ${f(p.d)}                 # wire diameter (mm)
D_mean = ${f(p.D)}            # mean coil diameter (mm)
n_active = ${f(p.n)}          # active turns
r_arc = ${f(p.r)}             # backbone arc radius (mm)
alpha_deg = ${f(p.alphaDeg)}  # current sweep angle (deg)

profile = "${p.profile}"
bowLeanDeg = ${f(p.bowLeanDeg ?? 0)}
bowPlaneTiltDeg = ${f(p.bowPlaneTiltDeg ?? 0)}

deadStart = ${f(p.deadCoilsStart)}
deadEnd = ${f(p.deadCoilsEnd)}
k = max(0.0, min(1.0, ${f(p.k)}))

samples = int(${samples})
phaseDeg = ${f(phaseDeg)}
capRatio = ${f(capRatio)}

makeSolid = ${makeSolid ? "True" : "False"}
exportSTEP = ${p.exportSTEP ? "True" : "False"}
exportSTL = ${p.exportSTL ? "True" : "False"}
fileStem = "${p.fileStem ?? "ArcSpring"}"

# ---------------- Helpers ----------------
def vec(x,y,z): 
    return App.Vector(float(x), float(y), float(z))

def unit(v):
    l = v.Length
    return v.multiply(1.0/l) if l > 1e-12 else vec(0,0,0)

# ---------------- Backbone Frames (p, t, n, b) ----------------
# Ported from Three.js arcBackbone.ts for 1:1 parity
def build_backbone():
    frames = []
    deg2rad = math.pi / 180
    alphaRad = alpha_deg * deg2rad
    startAngle = -alphaRad / 2
    
    planeTiltRad = (bowPlaneTiltDeg if profile == "BOW" else 0) * deg2rad
    cosTilt = math.cos(planeTiltRad)
    sinTilt = math.sin(planeTiltRad)
    
    leanRad = (bowLeanDeg if profile == "BOW" else 0) * deg2rad
    cosLean = math.cos(leanRad)
    sinLean = math.sin(leanRad)
    
    for i in range(samples + 1):
        u = i / samples
        theta = startAngle + u * alphaRad
        
        # 1. Base circle in XY plane
        px, py, pz = r_arc * math.cos(theta), r_arc * math.sin(theta), 0.0
        tx, ty, tz = -math.sin(theta), math.cos(theta), 0.0
        nx, ny, nz = -math.cos(theta), -math.sin(theta), 0.0
        bx, by, bz = 0.0, 0.0, 1.0
        
        # 2. Apply Plane Tilt (Rotation around X)
        if abs(planeTiltRad) > 1e-4:
            # y' = y*cos - z*sin, z' = y*sin + z*cos
            py, pz = py * cosTilt - pz * sinTilt, py * sinTilt + pz * cosTilt
            ty, tz = ty * cosTilt - tz * sinTilt, ty * sinTilt + tz * cosTilt
            ny, nz = ny * cosTilt - nz * sinTilt, ny * sinTilt + nz * cosTilt
            by, bz = by * cosTilt - bz * sinTilt, by * sinTilt + bz * cosTilt
            
        # 3. Apply Lean (Rotate n, b around t)
        if abs(leanRad) > 1e-4:
            # n' = n*cos + b*sin, b' = -n*sin + b*cos
            nx_new = nx * cosLean + bx * sinLean
            ny_new = ny * cosLean + by * sinLean
            nz_new = nz * cosLean + bz * sinLean
            bx_new = -nx * sinLean + bx * cosLean
            by_new = -ny * sinLean + by * cosLean
            bz_new = -nz * sinLean + bz * cosLean
            nx, ny, nz = nx_new, ny_new, nz_new
            bx, by, bz = bx_new, by_new, bz_new
            
        frames.append({
            "p": vec(px, py, pz),
            "t": unit(vec(tx, ty, tz)),
            "n": unit(vec(nx, ny, nz)),
            "b": unit(vec(bx, by, bz))
        })
    return frames

frames = build_backbone()

# ---------------- Accumulated Physical Length ----------------
L = [0.0] * len(frames)
totalLength = 0.0
for i in range(1, len(frames)):
    totalLength += (frames[i]["p"] - frames[i-1]["p"]).Length
    L[i] = totalLength

# ---------------- Blended-Anchor Turn Mapping ----------------
totalCoils = n_active + deadStart + deadEnd
Ls_solid = deadStart * d
Le_solid = deadEnd * d
Ls_uniform = (deadStart / totalCoils * totalLength) if totalCoils > 0 else 0
Le_uniform = (deadEnd / totalCoils * totalLength) if totalCoils > 0 else 0

anchorLs = Ls_uniform * (1 - k) + Ls_solid * k
anchorLe = Le_uniform * (1 - k) + Le_solid * k

currentSum = anchorLs + anchorLe
maxAllowedSum = totalLength * capRatio
limitScale = maxAllowedSum / currentSum if currentSum > maxAllowedSum else 1.0

finalLs = anchorLs * limitScale
finalLe = anchorLe * limitScale

turnsMap = [0.0] * len(frames)
for i in range(len(frames)):
    curL = L[i]
    if curL <= finalLs:
        turnsMap[i] = deadStart * (curL / max(1e-6, finalLs))
    elif curL >= (totalLength - finalLe):
        u = (curL - (totalLength - finalLe)) / max(1e-6, finalLe)
        turnsMap[i] = (deadStart + n_active) + deadEnd * min(1.0, u)
    else:
        activeRange = totalLength - finalLs - finalLe
        u = (curL - finalLs) / max(1e-6, activeRange)
        turnsMap[i] = deadStart + n_active * u

# ---------------- Coil Centerline ----------------
R = D_mean * 0.5
phaseRad = phaseDeg * math.pi / 180
coil_pts = []
for i, f in enumerate(frames):
    phi = 2 * math.pi * turnsMap[i] + phaseRad
    # P = p + cos(phi)*n*R + sin(phi)*b*R
    q = f["p"] + f["n"].multiply(math.cos(phi) * R) + f["b"].multiply(math.sin(phi) * R)
    coil_pts.append(q)

# ---------------- Verification Logs ----------------
def first_index_ge(target):
    for i, val in enumerate(L):
        if val >= target: return i
    return len(L) - 1

iL = first_index_ge(finalLs)
iR = first_index_ge(totalLength - finalLe)
print(f"[ArcSpring] Ltot={totalLength:.3f} Ls={finalLs:.3f} Le={finalLe:.3f}")
print(f"[ArcSpring] T(0)={turnsMap[0]:.6f} T(Ltot)={turnsMap[-1]:.6f}")
print(f"[ArcSpring] ΔT_start={turnsMap[iL]:.6f} (target: {deadStart})")
print(f"[ArcSpring] ΔT_end={totalCoils - turnsMap[iR]:.6f} (target: {deadEnd})")

# ---------------- Create FreeCAD Solid ----------------
curve = Part.BSplineCurve()
curve.interpolate(coil_pts)
edge = curve.toShape()
spine = Part.Wire([edge])

# Profile circle aligned with initial frame tangent
p0 = coil_pts[0]
norm0 = frames[0]["t"]
circle = Part.Circle()
circle.Radius = d * 0.5
circle.Center = p0
circle.Axis = norm0
prof = Part.Wire([circle.toShape()])

# makePipeShell(profiles, makeSolid, isFrenet)
# set isFrenet=True for smooth torsion along the path
shape = spine.makePipeShell([prof], makeSolid, True)
obj = doc.addObject("Part::Feature", fileStem)
obj.Shape = shape
doc.recompute()

if exportSTEP:
    Part.export([obj], fileStem + ".step")
if exportSTL:
    import Mesh
    Mesh.export([obj], fileStem + ".stl")

print("[ArcSpring] Export Complete.")
`;
}
