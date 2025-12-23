"""
CalculiX FEA Worker Service
FastAPI service for suspension spring FEA analysis

Endpoints:
- POST /run   - Submit and run FEA job (sync)
- GET /health - Health check
"""

import os
import uuid
import subprocess
import tempfile
import shutil
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from inp_generator import (
    SuspensionSpringGeometry,
    Material,
    LoadCase,
    generate_inp
)
from result_parser import parse_all_results, results_to_json


# ============================================================================
# Pydantic Models
# ============================================================================

class GeometryInput(BaseModel):
    """Spring geometry from frontend"""
    wire_diameter: float = Field(..., description="Wire diameter in mm")
    mean_diameter: float = Field(..., description="Mean coil diameter in mm")
    active_coils: float = Field(..., description="Number of active coils")
    total_coils: float = Field(..., description="Total coils including dead coils")
    free_length: float = Field(..., description="Free length in mm")
    end_type: str = Field(default="closed_ground", description="End type: open, closed, closed_ground")
    
    # Variable diameter (optional)
    dm_start: Optional[float] = None
    dm_mid: Optional[float] = None
    dm_end: Optional[float] = None


class MaterialInput(BaseModel):
    """Material properties"""
    E: float = Field(default=206000.0, description="Young's modulus in MPa")
    nu: float = Field(default=0.3, description="Poisson's ratio")
    G: float = Field(default=79000.0, description="Shear modulus in MPa")
    name: str = Field(default="STEEL", description="Material name")


class LoadCaseInput(BaseModel):
    """Load case definition"""
    name: str = Field(..., description="Load case name (e.g., RIDE, BUMP)")
    target_height: float = Field(..., description="Target compressed height in mm")


class FeaJobRequest(BaseModel):
    """Complete FEA job request"""
    design_code: str = Field(default="SUSP-001", description="Design identifier")
    geometry: GeometryInput
    material: MaterialInput = MaterialInput()
    loadcases: List[LoadCaseInput]
    mesh_level: str = Field(default="medium", description="Mesh density: coarse, medium, fine")


class FeaJobResponse(BaseModel):
    """FEA job response"""
    job_id: str
    status: str  # "success", "failed", "error"
    elapsed_ms: int
    results: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None


# ============================================================================
# FastAPI App
# ============================================================================

app = FastAPI(
    title="CalculiX FEA Worker",
    description="Suspension Spring FEA Analysis using CalculiX",
    version="1.0.0"
)

# CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Health Check
# ============================================================================

@app.get("/health")
async def health_check():
    """Check if service is healthy and CalculiX is available"""
    ccx_available = shutil.which("ccx") is not None
    
    return {
        "status": "healthy" if ccx_available else "degraded",
        "ccx_available": ccx_available,
        "timestamp": datetime.now().isoformat()
    }


# ============================================================================
# FEA Job Endpoint
# ============================================================================

@app.post("/run", response_model=FeaJobResponse)
async def run_fea_job(request: FeaJobRequest):
    """
    Run FEA analysis synchronously.
    
    1. Generate .inp file from geometry
    2. Run CalculiX (ccx)
    3. Parse results
    4. Return compiled results
    """
    job_id = str(uuid.uuid4())[:8]
    start_time = datetime.now()
    
    # Create temp directory for this job
    job_dir = Path(tempfile.mkdtemp(prefix=f"fea_{job_id}_"))
    job_name = "spring"
    
    try:
        # Convert input to internal types
        geom = SuspensionSpringGeometry(
            wire_diameter=request.geometry.wire_diameter,
            mean_diameter=request.geometry.mean_diameter,
            active_coils=request.geometry.active_coils,
            total_coils=request.geometry.total_coils,
            free_length=request.geometry.free_length,
            end_type=request.geometry.end_type,
            dm_start=request.geometry.dm_start,
            dm_mid=request.geometry.dm_mid,
            dm_end=request.geometry.dm_end,
        )
        
        material = Material(
            E=request.material.E,
            nu=request.material.nu,
            G=request.material.G,
            name=request.material.name
        )
        
        loadcases = [
            LoadCase(name=lc.name, target_height=lc.target_height)
            for lc in request.loadcases
        ]
        
        # Mesh density based on level
        segments_per_coil = {"coarse": 18, "medium": 36, "fine": 72}.get(
            request.mesh_level, 36
        )
        
        # Generate .inp file
        inp_content = generate_inp(
            geom=geom,
            material=material,
            loadcases=loadcases,
            design_code=request.design_code,
            segments_per_coil=segments_per_coil
        )
        
        inp_path = job_dir / f"{job_name}.inp"
        inp_path.write_text(inp_content)
        
        # Run CalculiX
        ccx_path = shutil.which("ccx")
        if not ccx_path:
            raise HTTPException(status_code=500, detail="CalculiX (ccx) not found")
        
        result = subprocess.run(
            [ccx_path, "-i", job_name],
            cwd=job_dir,
            capture_output=True,
            text=True,
            timeout=120  # 2 minute timeout
        )
        
        if result.returncode != 0:
            # CalculiX might output errors to stdout or stderr
            error_output = result.stderr or result.stdout
            return FeaJobResponse(
                job_id=job_id,
                status="failed",
                elapsed_ms=int((datetime.now() - start_time).total_seconds() * 1000),
                error_message=f"CalculiX failed (exit code {result.returncode}): {error_output[:500]}"
            )
        
        # Parse results
        fea_results = parse_all_results(job_dir, job_name)
        results_json = results_to_json(fea_results)
        
        elapsed_ms = int((datetime.now() - start_time).total_seconds() * 1000)
        
        return FeaJobResponse(
            job_id=job_id,
            status="success" if results_json.get("success") else "failed",
            elapsed_ms=elapsed_ms,
            results=results_json
        )
        
    except subprocess.TimeoutExpired:
        return FeaJobResponse(
            job_id=job_id,
            status="error",
            elapsed_ms=int((datetime.now() - start_time).total_seconds() * 1000),
            error_message="CalculiX execution timed out after 120 seconds"
        )
        
    except Exception as e:
        return FeaJobResponse(
            job_id=job_id,
            status="error",
            elapsed_ms=int((datetime.now() - start_time).total_seconds() * 1000),
            error_message=str(e)
        )
        
    finally:
        # Cleanup temp directory
        try:
            shutil.rmtree(job_dir)
        except Exception:
            pass


# ============================================================================
# Debug Endpoint (for development)
# ============================================================================

@app.post("/debug/inp")
async def debug_generate_inp(request: FeaJobRequest):
    """Generate and return .inp file content without running FEA"""
    geom = SuspensionSpringGeometry(
        wire_diameter=request.geometry.wire_diameter,
        mean_diameter=request.geometry.mean_diameter,
        active_coils=request.geometry.active_coils,
        total_coils=request.geometry.total_coils,
        free_length=request.geometry.free_length,
        end_type=request.geometry.end_type,
        dm_start=request.geometry.dm_start,
        dm_mid=request.geometry.dm_mid,
        dm_end=request.geometry.dm_end,
    )
    
    material = Material(
        E=request.material.E,
        nu=request.material.nu,
        G=request.material.G,
        name=request.material.name
    )
    
    loadcases = [
        LoadCase(name=lc.name, target_height=lc.target_height)
        for lc in request.loadcases
    ]
    
    segments_per_coil = {"coarse": 18, "medium": 36, "fine": 72}.get(
        request.mesh_level, 36
    )
    
    inp_content = generate_inp(
        geom=geom,
        material=material,
        loadcases=loadcases,
        design_code=request.design_code,
        segments_per_coil=segments_per_coil
    )
    
    return {"inp_content": inp_content}


@app.get("/debug/ccx-test")
async def debug_ccx_test():
    """Test ccx with a minimal hardcoded B32 beam model"""
    minimal_inp = """*HEADING
Minimal B32 Beam Test
*NODE, NSET=ALL
1, 0.0, 0.0, 0.0
2, 10.0, 0.0, 0.0
3, 20.0, 0.0, 0.0
4, 5.0, 0.0, 0.0
5, 15.0, 0.0, 0.0
*NSET, NSET=BOTTOM
1
*NSET, NSET=TOP
3
*ELEMENT, TYPE=B32, ELSET=BEAM
1, 1, 2, 4
2, 2, 3, 5
*BEAM SECTION, ELSET=BEAM, MATERIAL=STEEL, SECTION=CIRC
1.0
0.0, 1.0, 0.0
*MATERIAL, NAME=STEEL
*ELASTIC
200000.0, 0.3
*BOUNDARY
BOTTOM, 1, 6, 0.0
*STEP
*STATIC
*BOUNDARY
TOP, 1, 1, -1.0
*NODE FILE
U
*END STEP
"""
    job_dir = Path(tempfile.mkdtemp(prefix="ccx_test_"))
    job_name = "test"
    
    try:
        inp_path = job_dir / f"{job_name}.inp"
        inp_path.write_text(minimal_inp)
        
        ccx_path = shutil.which("ccx")
        result = subprocess.run(
            [ccx_path, "-i", job_name],
            cwd=job_dir,
            capture_output=True,
            text=True,
            timeout=60
        )
        
        # Read any output files
        output_files = {}
        for ext in [".dat", ".sta", ".frd"]:
            f = job_dir / f"{job_name}{ext}"
            if f.exists():
                output_files[ext] = f.read_text()[:1000]
        
        return {
            "returncode": result.returncode,
            "stdout": result.stdout[:2000],
            "stderr": result.stderr[:2000],
            "output_files": output_files
        }
    finally:
        shutil.rmtree(job_dir)


# ============================================================================
# Main
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
