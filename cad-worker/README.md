# FreeCAD Worker Deployment Guide

This service provides a Dockerized FreeCAD environment to generate spring geometry (STEP, IGES, STL, etc.) via an HTTP API. This decouples heavy CAD operations from the main Vercel application.

## 1. Local Testing

You can build and run the worker locally to verify it works.

```bash
# Build the image
docker build -t cad-worker ./cad-worker

# Run the container (mapping port 8000)
docker run -p 8000:8000 cad-worker
```

Once running, you can test it:
```bash
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "springType": "compression",
    "geometry": { "wireDiameter": 3.0, "meanDiameter": 20.0, "activeCoils": 10 },
    "export": { "formats": ["STEP"] }
  }'
```

To connect your local Next.js app to this local worker, add to your `.env.local`:
```
CAD_WORKER_URL=http://localhost:8000
```

## 2. Deployment on Railway / Fly.io / AWS

Since Vercel cannot run this container, you must deploy it to a platform that supports Docker.

### Option A: Railway (Recommended for Ease)
1.  Push your code to GitHub.
2.  Login to Railway and create a new project from your repo.
3.  Configure the **Root Directory** to `cad-worker` in Service Settings > General.
4.  Railway will detect the `Dockerfile` and build it.
5.  Variables: No special env vars needed for the worker itself.
6.  Copy the **Public URL** (e.g., `https://cad-worker-production.up.railway.app`) provided by Railway.
7.  Go to your **Vercel Project Settings > Environment Variables** and add:
    ```
    CAD_WORKER_URL=https://cad-worker-production.up.railway.app
    ```
8.  Redeploy Vercel.

### Option B: Fly.io
1.  Install `flyctl`.
2.  Navigate to `cad-worker`:
    ```bash
    cd cad-worker
    fly launch
    ```
3.  Follow prompts to deploy.
4.  Add the URL to Vercel env vars.

## 3. Architecture

*   **Next.js API (`/api/freecad/export`)**: Acts as a gateway. It checks if `CAD_WORKER_URL` is set.
    *   **If Set**: Forwards the request to the worker.
    *   **If Not Set**: Tries to find a local `freecadcmd` installation (runs locally on dev machine if FreeCAD is installed).
*   **Worker**: FastAPI app receiving JSON -> Generates file with FreeCAD -> Returns Base64 content.
