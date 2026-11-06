# Etapa 1: compilar el frontend React
FROM node:20-slim AS frontend-builder
WORKDIR /build

COPY frontend/package.json ./
RUN npm install --no-audit

COPY frontend/ ./
RUN npm run build

# Etapa 2: backend FastAPI
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Dependencias
COPY requirements.txt .

RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements.txt

# Modelo sugerido por el taller
# Debe coincidir con el modelo usado en el código del proyecto
ENV HF_HOME=/app/.cache/huggingface
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('intfloat/multilingual-e5-small')"

# Código, documentos e índice existente
COPY . .

# Frontend compilado
COPY --from=frontend-builder /build/dist ./frontend/dist

# Usuario sin privilegios
RUN useradd --create-home app && chown -R app:app /app
USER app

# Puerto asignado por la plataforma
ENV PORT=8080
EXPOSE 8080

CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]