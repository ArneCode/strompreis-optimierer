"""FastAPI dependency wiring for services and Unit of Work.

Provides:
- get_uow: yields a Unit of Work per-request
- get_controller_service / get_interactor_service: shared singleton instances
- get_device_manager: composes dependencies into a DeviceManager
"""
from contextlib import contextmanager
from fastapi import Depends
from api.scopes import uow_scope
from uow import SqlAlchemyUnitOfWork, IUnitOfWork
from database import SessionLocal
from collections.abc import Generator
from services.controller_service import IControllerService
from services.interactor_service import IInteractorService
from services.orchestrator_service import IOrchestratorService
from instances import controller_service_instance, interactor_service_instance, orchestrator_service_instance, optimizer_service_instance
from device_manager import IDeviceManager, DeviceManager
from services.interfaces import IOptimizerService, ISettingsService


def get_controller_service() -> IControllerService:
    """Return the application-scoped controller service singleton."""
    return controller_service_instance


def get_interactor_service() -> IInteractorService:
    """Return the application-scoped interactor service singleton."""
    return interactor_service_instance


def get_orchestrator_service() -> IOrchestratorService:
    """Return the application-scoped orchestrator service singleton."""
    return orchestrator_service_instance


def get_optimizer_service() -> "IOptimizerService":
    """Return the application-scoped optimizer service singleton."""
    return optimizer_service_instance


def get_uow(
    interactor=Depends(get_interactor_service),
    controller=Depends(get_controller_service)
) -> Generator[IUnitOfWork, None, None]:
    """FastAPI dependency for UoW."""
    with uow_scope(interactor, controller) as uow:
        yield uow


def get_device_manager(uow: IUnitOfWork = Depends(get_uow)) -> IDeviceManager:
    """FastAPI dependency for DeviceManager."""
    return DeviceManager(uow=uow)


def get_settings_service(uow: IUnitOfWork = Depends(get_uow)) -> ISettingsService:
    """FastAPI dependency for the Settings Service."""
    return uow.settings_service
