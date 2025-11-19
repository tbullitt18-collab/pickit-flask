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
