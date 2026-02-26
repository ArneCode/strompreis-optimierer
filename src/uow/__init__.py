"""Unit of Work pattern integrating services and SQLAlchemy sessions.

Provides transactional boundaries for:
- SQLAlchemy-backed device service
- In-memory interactor and controller services

Usage:
with SqlAlchemyUnitOfWork(session_factory, interactor_service, controller_service) as uow:
    # use uow.device_service / uow.interactor_service / uow.controller_service
    # on success: commit; on error: rollback
"""
from abc import ABC, abstractmethod
from typing import Callable, List, Optional, Type, Any
from sqlalchemy.orm import Session, sessionmaker
from typing import Protocol
from services.controller_service import IControllerService
from services.device_service import IDeviceService, SqlAlchemyDeviceService
from services.interactor_service import IInteractorService
from services.settings_service import ISettingsService, SqlAlchemySettingsService


__all__ = ["IUnitOfWork", "SqlAlchemyUnitOfWork"]


class IUnitOfWork(ABC):
    """Interface for a unit of work coordinating services and transactions."""
    device_service: IDeviceService
    settings_service: ISettingsService
    interactor_service: IInteractorService
    controller_service: IControllerService

    def __enter__(self) -> "IUnitOfWork":
        """Enter the UoW context.

        Intended to be overridden by implementations to start transactional resources
        (e.g., open a database session) and wire dependent services.
        """
        pass

    def __exit__(self, exc_type, exc_value, traceback) -> None:
        """Exit the UoW context.

        Commits if no exception occurred; otherwise rolls back. Implementations should
        also release resources (e.g., close DB sessions) after delegating to _commit/_rollback.
        """
        if exc_type is None:
            try:
                self._commit()
            except Exception:
                self._rollback()
                raise
        else:
            self._rollback()

    @abstractmethod
    def _rollback(self) -> None:
        """Rollback all changes made since the last commit.

        Implementations should revert in-memory staged changes and database transactions.
        """
        ...

    @abstractmethod
    def _commit(self) -> None:
        """Commit all changes to the database and in-memory services.

        Implementations should flush/persist DB changes and finalize staged changes.
        """
        ...


class SqlAlchemyUnitOfWork(IUnitOfWork):
    """SQLAlchemy-based unit of work.

    Opens a session on enter, commits/rolls back device and in-memory services,
    and closes the session on exit.
    """

    def __init__(self, session_factory: sessionmaker, interactor_service: IInteractorService, controller_service: IControllerService):
        self.session_factory = session_factory
        self.session: Optional[Session] = None
        self.device_service: Optional[IDeviceService] = None
        self.settings_service: Optional[ISettingsService] = None
        self.interactor_service = interactor_service
        self.controller_service = controller_service

    def __enter__(self) -> "SqlAlchemyUnitOfWork":
        """Open a SQLAlchemy Session and wire the device service.

        - Creates a Session using session_factory.
        - Instantiates SqlAlchemyDeviceService bound to the session.
        - Instantiates SqlAlchemySettingsService bound to the session.
        - Returns self for use within the with-block.
        """
        super().__enter__()
        self.session = self.session_factory()
        self.device_service = SqlAlchemyDeviceService(self.session)
        self.settings_service = SqlAlchemySettingsService(self.session)
        return self

    def _rollback(self) -> None:
        """Rollback the database transaction and in-memory staged changes.

        - If a Session exists: session.rollback()
        - Calls rollback() on interactor and controller services (in-memory RollbackMap).
        """
        if self.session:
            self.session.rollback()
        self.interactor_service.rollback()
        self.controller_service.rollback()

    def _commit(self) -> None:
        """Commit the database transaction and in-memory staged changes.

        - If a Session exists: session.commit()
        - Calls commit() on interactor and controller services (in-memory RollbackMap).
        """
        if self.session:
            self.session.commit()
        self.interactor_service.commit()
        self.controller_service.commit()

    def __exit__(self, exc_type: Optional[Type[BaseException]],
                 exc_val: Optional[BaseException],
                 exc_tb: Any) -> None:
        """Finalize the UoW and release resources.

        - Delegates commit/rollback logic to the base class.
        - Closes the SQLAlchemy Session if present.
        """
        super().__exit__(exc_type, exc_val, exc_tb)
        if self.session:
            self.session.close()
