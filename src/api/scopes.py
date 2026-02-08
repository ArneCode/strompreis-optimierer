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

    print("UoW with id :", uow_id, " started.")
    ownid = uow_id
    uow_id += 1
    with uow:
        yield uow
    print("UoW scope with id :", ownid, " ended.")


@contextmanager
def device_manager_scope() -> Generator[IDeviceManager, None, None]:
    """Standard context manager for the DeviceManager."""
    # We nest the uow_scope here because DeviceManager needs an active UoW
    with uow_scope() as uow:
        yield DeviceManager(uow=uow)
    print("DeviceManager scope ended, UoW should be committed/rolled back.")
