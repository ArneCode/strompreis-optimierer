from contextlib import contextmanager
from typing import Generator
from database import SessionLocal
from device_manager import DeviceManager, IDeviceManager
from services.interfaces import IControllerService, IInteractorService
from uow import IUnitOfWork, SqlAlchemyUnitOfWork
from instances import controller_service_instance, interactor_service_instance

# used for debugging to track UoW instances
uow_id = 0


@contextmanager
def uow_scope(
    interactor: IInteractorService = interactor_service_instance,
    controller: IControllerService = controller_service_instance
) -> Generator[IUnitOfWork, None, None]:
    """Standard context manager for the Unit of Work."""
    global uow_id
    uow = SqlAlchemyUnitOfWork(SessionLocal, interactor, controller)

    ownid = uow_id
    uow_id += 1
    with uow:
        yield uow


@contextmanager
def device_manager_scope() -> Generator[IDeviceManager, None, None]:
    """Standard context manager for the DeviceManager."""
    # We nest the uow_scope here because DeviceManager needs an active UoW
    with uow_scope() as uow:
        yield DeviceManager(uow=uow)
