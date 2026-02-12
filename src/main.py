from api.orchestrator import router as orchestrator_router
from api.example import router as example_router
from fastapi import FastAPI
import uvicorn
from sqlalchemy.orm import Session
from database import engine, init_db
from device import *
from electricity_price_optimizer_py import OptimizerContext, run_simulated_annealing
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from contextlib import asynccontextmanager
from api.example_price_24h_request import router as example_price_24h_request_router

from tasks import initialize_services_from_db, update_controllers, update_mock_interactors

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


# Include the orchestrator router
app.include_router(orchestrator_router)
app.include_router(example_router)
app.include_router(example_price_24h_request_router)

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
