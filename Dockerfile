<<<<<<< HEAD
# Build stage
FROM python:3.11-slim as builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels -r requirements.txt

# Production stage
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN useradd -m -u 1000 flaskuser && \
    chown -R flaskuser:flaskuser /app

# Copy installed dependencies from builder
COPY --from=builder /app/wheels /wheels
RUN pip install --no-cache-dir /wheels/* && rm -rf /wheels

# Copy application code
COPY --chown=flaskuser:flaskuser . .

# Switch to non-root user
USER flaskuser

# Expose port (Railway/Render will override with $PORT)
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:5000/api/health')" || exit 1

# Run with gunicorn (production WSGI server)
CMD gunicorn --bind 0.0.0.0:${PORT:-5000} \
    --workers ${GUNICORN_WORKERS:-2} \
    --threads ${GUNICORN_THREADS:-4} \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level info \
    app:app
=======
# Builder Stage
FROM python:3.11-slim as builder
WORKDIR /app

# Copy requirements and install build dependencies
COPY requirements.txt .
RUN pip install --upgrade pip setuptools wheel

# Build the wheels
RUN pip wheel --no-cache-dir --wheel-dir /app/wheels -r requirements.txt

# Production Stage
FROM python:3.11-slim
WORKDIR /app

# Copy wheels from builder stage
COPY --from=builder /app/wheels /wheels

# Copy requirements.txt (optional, for reference or fallback)
COPY requirements.txt .

# Install packages from wheels
RUN pip install --no-cache-dir /wheels/*.whl

# Copy app source
COPY . .

# Expose port
EXPOSE 5000

# Run server with gunicorn using Render's PORT environment variable
CMD ["gunicorn", "--bind", "0.0.0.0:$PORT", "app:app"]
>>>>>>> dcc173b2cf4e0f584c6551a50b4bcf19011e05ab
