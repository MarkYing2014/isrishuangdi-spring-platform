# CalculiX FEA Worker
# Based on Debian with CalculiX pre-installed

FROM python:3.11-slim-bookworm

LABEL maintainer="ISRI Shuangdi Spring Platform"
LABEL description="CalculiX FEA Worker for suspension spring analysis"

# Install CalculiX and dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    calculix-ccx \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create temp directory for FEA jobs
RUN mkdir -p /tmp/fea_jobs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
