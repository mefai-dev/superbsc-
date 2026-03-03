.PHONY: dev run lint install clean

install:
	pip install fastapi uvicorn httpx python-dotenv

dev:
	cd proxy && uvicorn main:app --reload --host 0.0.0.0 --port 8000

run:
	cd proxy && uvicorn main:app --host 0.0.0.0 --port 8000

lint:
	ruff check proxy/
	ruff format --check proxy/

format:
	ruff format proxy/

clean:
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
