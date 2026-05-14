FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Minimal system deps for PDF generation (WeasyPrint)
RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    python3-dev \
    libpangocairo-1.0-0 \
    libpango-1.0-0 \
    libharfbuzz0b \
    libpangoft2-1.0-0 \
    libffi-dev \
    libjpeg-dev \
    libopenjp2-7-dev \
    libgdk-pixbuf-2.0-0 \
    libglib2.0-0 \
    shared-mime-info \
    fontconfig \
    fonts-liberation \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install pip requirements
COPY requirements.txt ./requirements.txt
RUN python -m pip install --upgrade pip setuptools wheel && python -m pip install -r requirements.txt

# Copy application code
COPY . /app/

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--timeout", "60", "app:app"]
