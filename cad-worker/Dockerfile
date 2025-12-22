# Use Debian Bookworm Slim for a balance of size and stability
FROM debian:bookworm-slim

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install FreeCAD and Python dependencies
# - freecad: The core application
# - python3-pip: To install FastAPI and Uvicorn
# - python3-venv: Good practice for python environments
RUN apt-get update && apt-get install -y \
    freecad \
    python3-pip \
    python3-venv \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Set up work directory
WORKDIR /app

# Create a virtual environment to avoid conflicts with system packages
RUN python3 -m venv /app/venv
ENV PATH="/app/venv/bin:$PATH"

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run the application
# We use xvfb-run to provide a virtual display for FreeCAD if it tries to access GUI methods
CMD ["xvfb-run", "-a", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
