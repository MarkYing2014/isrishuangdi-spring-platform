
import os
import json
import uuid
import base64
import subprocess
import shutil
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel

app = FastAPI()

# Configuration
# Configuration
def find_freecad_binary():
    candidates = ["freecadcmd", "FreeCADCmd", "freecad", "FreeCAD"]
    for c in candidates:
        path = shutil.which(c)
        if path:
            print(f"Found FreeCAD binary: {path}")
            return path
    
    # Fallback to hardcoded paths if shutil.which fails
    common_paths = [
        "/usr/bin/freecadcmd",
        "/usr/bin/freecad",
        "/usr/local/bin/freecadcmd"
    ]
    for p in common_paths:
        if os.path.exists(p):
            print(f"Found FreeCAD binary at: {p}")
            return p
            
    return "freecadcmd" # Default fallback

FREECAD_CMD = find_freecad_binary()
SCRIPT_PATH = "/app/freecad/run_export.py"
TEMP_DIR = "/tmp/freecad_worker"

class Geometry(BaseModel):
    wireDiameter: float
    meanDiameter: Optional[float] = None
    outerDiameter: Optional[float] = None
    activeCoils: float
    totalCoils: Optional[float] = None
    freeLength: Optional[float] = None
    bodyLength: Optional[float] = None
    hookType: Optional[str] = None
    hookRadius: Optional[float] = None
    hookAngle: Optional[float] = None
    legLength1: Optional[float] = None
    legLength2: Optional[float] = None
    windingDirection: Optional[str] = None
    freeAngle: Optional[float] = None
    largeOuterDiameter: Optional[float] = None
    smallOuterDiameter: Optional[float] = None

class ExportConfig(BaseModel):
    formats: List[str]
    name: Optional[str] = None

class ExportRequest(BaseModel):
    springType: str
    geometry: Dict[str, Any] # Use generic dict to be flexible with incoming geometry params
    export: ExportConfig

@app.post("/generate")
async def generate(request: ExportRequest):
    job_id = str(uuid.uuid4())
    job_dir = os.path.join(TEMP_DIR, job_id)
    
    try:
        os.makedirs(job_dir, exist_ok=True)
        
        # Write design.json
        design_path = os.path.join(job_dir, "design.json")
        with open(design_path, "w") as f:
            json.dump(request.model_dump(), f)
            
        # Run FreeCAD
        # We assume freecadcmd is in PATH. 
        # Note: In some environments 'freecadcmd' might be 'FreeCADCmd' or just 'freecad'
        
        # FIX: Pass arguments via environment variables to avoid FreeCAD trying to "open" the JSON file
        env = os.environ.copy()
        env["DESIGN_FILE"] = design_path
        env["OUTPUT_DIR"] = job_dir
        
        cmd = [FREECAD_CMD, SCRIPT_PATH]
        
        print(f"Running command: {' '.join(cmd)}")
        
        # Run process
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120, # Increased timeout
            env=env
        )
        
        if result.returncode != 0:
            print(f"Error output: {result.stderr}")
            raise HTTPException(status_code=500, detail=f"FreeCAD execution failed: {result.stderr}")
            
        # Parse output for RESULT_JSON
        stdout = result.stdout
        print(f"Stdout: {stdout}")
        
        result_json_marker = "RESULT_JSON:"
        if result_json_marker not in stdout:
             # Include stdout/stderr in the error to facilitate debugging from the client
             debug_info = f"STDOUT: {stdout[:1000]}... STDERR: {result.stderr[:1000]}..."
             print(f"Failed to find RESULT_JSON. {debug_info}")
             raise HTTPException(status_code=500, detail=f"Could not find RESULT_JSON in FreeCAD output. {debug_info}")
             
        json_str = stdout.split(result_json_marker)[1].strip()
        export_result = json.loads(json_str)
        
        if export_result.get("status") != "success":
             raise HTTPException(status_code=500, detail="FreeCAD script returned failure status")
             
        # Read files and convert to base64
        response_files = []
        for file_info in export_result.get("files", []):
            file_path = file_info["path"]
            file_name = os.path.basename(file_path)
            file_fmt = file_info["format"]
            
            with open(file_path, "rb") as f:
                file_content = f.read()
                
            b64_content = base64.b64encode(file_content).decode('utf-8')
            
            # Determine mime type
            mime_type = "application/octet-stream"
            if file_fmt == "STEP": mime_type = "application/step"
            elif file_fmt == "IGES": mime_type = "application/iges"
            elif file_fmt == "STL": mime_type = "application/sla"
            
            response_files.append({
                "format": file_fmt,
                "fileName": file_name,
                "downloadUrl": f"data:{mime_type};base64,{b64_content}",
                "fileSize": len(file_content)
            })
            
        return {
            "status": "success",
            "jobId": job_id,
            "files": response_files
        }
        
    except Exception as e:
        print(f"Exception: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        # Cleanup
        if os.path.exists(job_dir):
            shutil.rmtree(job_dir)

@app.get("/health")
def health_check():
    return {"status": "ok"}
