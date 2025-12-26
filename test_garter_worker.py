import json
import time
import urllib.request
import urllib.error

def test_worker():
    url = "http://localhost:8080/debug/raw-files"
    
    payload = {
        "design_code": "GARTER-TEST",
        "geometry": {
            "section_type": "CIRC",
            "wire_diameter": 1.0,
            "mean_diameter": 8.0,
            "active_coils": 5.0,
            "total_coils": 5.0,
            "free_length": 15.7,   # Pi * 5
            "end_type": "closed_ground"
        },
        "material": {
            "name": "STEEL",
            "E": 206000.0,
            "nu": 0.3,
            "G": 79000.0
        },
        "loadcases": [
            {
                "name": "TEST",
                "target_height": 20.0
            }
        ],
        "mesh_level": "coarse"
    }

    print("Sending request to worker...")
    print(f"URL: {url}")
    start = time.time()
    
    try:
        req = urllib.request.Request(
            url, 
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        
        with urllib.request.urlopen(req, timeout=130) as f:
            res = json.loads(f.read().decode('utf-8'))
            print(f"Status: {f.getcode()}")
            print(f"Return Code: {res.get('returncode')}")
            print("\nSTDOUT (Last 500 chars):")
            print(res.get("stdout", "")[-500:])
            
            files = res.get("files", {})
            if ".dat" in files:
                print("\n.DAT File Content (First 1000 chars):")
                print(files[".dat"][:1000])
                print("\n.DAT File Content (Last 1000 chars):")
                print(files[".dat"][-1000:])
            else:
                 print("\nNo .dat file found.")
                 
            if ".sta" in files:
                print("\n.STA File Content:")
                print(files[".sta"])

    except urllib.error.URLError as e:
        print(f"Connection Error: {e}")
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_worker()
