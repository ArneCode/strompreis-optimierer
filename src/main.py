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
from api.example_price_24h_request import router as example_price_24h_request_router

from tasks import initialize_services_from_db, update_controllers, update_mock_interactors

from database import init_db

from api.orchestrator import router as orchestrator_router
from api.devices import router as devices_router
from api.actions import router as actions_router
from api.plan import router as plan_router
from fastapi.middleware.cors import CORSMiddleware

init_db()
initialize_services_from_db()

# create a new session

# main.py

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # This happens on Startup
    scheduler.add_job(update_controllers, 'interval', seconds=2)
    scheduler.add_job(update_mock_interactors, 'interval', seconds=0.5)
    scheduler.start()
    print("Scheduler started...")

    try:
        yield  # Server runs here

    # This happens on Shutdown
    finally:
        scheduler.shutdown()
        print("Scheduler shut down...")

app = FastAPI(lifespan=lifespan)


origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the orchestrator router
app.include_router(orchestrator_router)
app.include_router(example_router)
app.include_router(devices_router)
app.include_router(actions_router)
app.include_router(plan_router)
app.include_router(example_price_24h_request_router)

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=5000)
