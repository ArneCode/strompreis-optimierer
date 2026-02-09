from api.example import router as example_router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from sqlalchemy.orm import Session
from database import engine, init_db
from device import *
from electricity_price_optimizer_py import OptimizerContext, run_simulated_annealing
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from contextlib import asynccontextmanager

from tasks import initialize_services_from_db, update_controllers, update_mock_interactors

from database import init_db

from api.orchestrator import router as orchestrator_router
from api.devices import router as devices_router
from api.actions import router as actions_router

init_db()
initialize_services_from_db()

# create a new session

# main.py

app = FastAPI()

# Include the orchestrator router
app.include_router(orchestrator_router)
app.include_router(example_router)
app.include_router(devices_router)
app.include_router(actions_router)

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=5000)

