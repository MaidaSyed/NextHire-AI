FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Minimal system deps: only what's needed for building wheels
RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install pip requirements
COPY requirements.txt ./requirements.txt
RUN python -m pip install --upgrade pip setuptools wheel && python -m pip install -r requirements.txt

# Copy application code
COPY . /app/

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--timeout", "60", "app:app"]
