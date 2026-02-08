from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from database import init_db

from api.orchestrator import router as orchestrator_router
from api.devices import router as devices_router

init_db()

app = FastAPI()

# CORS for local frontend dev (Vite:5173, CRA:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(orchestrator_router)
app.include_router(devices_router)

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=5000)

