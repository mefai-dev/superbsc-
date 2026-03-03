import uvicorn
from proxy.config import settings

if __name__ == "__main__":
    uvicorn.run("proxy.main:app", host=settings.host, port=settings.port, reload=True)
