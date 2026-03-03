FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir fastapi uvicorn httpx python-dotenv

COPY proxy/ ./proxy/
COPY frontend/ ./frontend/

EXPOSE 8000

CMD ["uvicorn", "proxy.main:app", "--host", "0.0.0.0", "--port", "8000"]
