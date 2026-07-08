# Stage 1: Build the React Frontend
FROM node:20 AS frontend-build
WORKDIR /app/frontend/ui-react

COPY frontend/ui-react/package*.json ./
RUN npm install

COPY frontend/ui-react ./
RUN npm run build

# Stage 2: Build the Python Backend
FROM python:3.11-slim
WORKDIR /app/backend

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./

RUN mkdir -p /app/frontend/ui/public
COPY --from=frontend-build /app/frontend/ui/public /app/frontend/ui/public

EXPOSE 8080

CMD ["sh", "-c", "uvicorn api.server:app --host 0.0.0.0 --port 8080 2>&1 | sed -u 's/0.0.0.0:8080/localhost:8080/g'"]
