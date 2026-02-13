"""Device manager coordinating services via Unit of Work.

Handles creation/removal of devices and attaches corresponding interactors/controllers.
All operations occur within the provided Unit of Work context.
"""
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

from controllers.generator_random_controller import GeneratorRandomController
from device import GeneratorRandom
from interactors.mock import MockConstantActionInteractor, MockBatteryInteractor, MockGeneratorInteractor, MockVariableActionInteractor
from controllers import ConstantActionController, VariableActionController, BatteryController, GeneratorPvController

if TYPE_CHECKING:
    from device import Battery, VariableActionDevice, GeneratorPV, ConstantActionDevice
    from services.interfaces import IControllerServiceReader, IDeviceServiceReader, IInteractorServiceReader
    from uow import IUnitOfWork


class IDeviceManager(ABC):
    """Device manager interface exposing device operations and service accessors."""

    @abstractmethod
    def add_battery(self, device: "Battery") -> "int":
        """Add a new battery device and return its ID."""
        ...

    @abstractmethod
    def add_generator_pv(self, device: "GeneratorPV") -> "int":
        """Add a new generator device and return its ID."""
        ...

    @abstractmethod
    def add_generator_random(self, device: "GeneratorRandom") -> "int":
        """Add a new random generator device and return its ID."""
        ...

    def add_constant_action_device(self, device: "ConstantActionDevice") -> "int":
        """Add a new constant action device and return its ID."""
        ...

    def add_variable_action_device(self, device: "VariableActionDevice") -> "int":
        """Add a new variable action device and return its ID."""
        ...

    @abstractmethod
    def remove_device(self, device_id: "int") -> "None":
        """Remove a device by ID."""
        ...

    @abstractmethod
    def get_device_service(self) -> "IDeviceServiceReader":
        """Get the device service."""
        ...

    @abstractmethod
    def get_interactor_service(self) -> "IInteractorServiceReader":
        """Get the interactor service."""
        ...

    @abstractmethod
    def get_controller_service(self) -> "IControllerServiceReader":
        """Get the controller service."""
        ...


class DeviceManager(IDeviceManager):
    """Default device manager implementation using an injected Unit of Work."""

    def __init__(self, uow: "IUnitOfWork"):
        self._uow = uow

    def add_battery(self, device: "Battery") -> "int":
        id = self._uow.device_service.add_device(device)
        self._uow.interactor_service.add_battery_interactor(
            MockBatteryInteractor(device.id))
        self._uow.controller_service.add_battery_controller(
            BatteryController(device.id))
        return id

    def add_generator_pv(self, device: "GeneratorPV") -> "int":
        id = self._uow.device_service.add_device(device)
        self._uow.interactor_service.add_generator_interactor(
            MockGeneratorInteractor(device.id))
        self._uow.controller_service.add_generator_controller(
            GeneratorPvController(device.id))
        return id

    def add_generator_random(self, device: "GeneratorRandom") -> "int":
        id = self._uow.device_service.add_device(device)
        self._uow.interactor_service.add_generator_interactor(
            MockGeneratorInteractor(device.id))
        self._uow.controller_service.add_generator_controller(
            GeneratorRandomController(device.id))

    def add_constant_action_device(self, device: "ConstantActionDevice") -> "int":
        id = self._uow.device_service.add_device(device)
        self._uow.interactor_service.add_constant_action_interactor(
            MockConstantActionInteractor(device.id))
        self._uow.controller_service.add_constant_action_controller(
            ConstantActionController(device.id))
        return id

    def add_variable_action_device(self, device: "VariableActionDevice") -> "int":
        id = self._uow.device_service.add_device(device)
        self._uow.interactor_service.add_variable_action_interactor(
            MockVariableActionInteractor(device.id))
        self._uow.controller_service.add_variable_action_controller(
            VariableActionController(device.id))
        return id

    def remove_device(self, device_id: "int") -> "None":
        self._uow.device_service.remove_device(device_id)
        self._uow.interactor_service.remove_interactor(device_id)
        self._uow.controller_service.remove_controller(device_id)

    def get_device_service(self) -> "IDeviceServiceReader":
        return self._uow.device_service

    def get_interactor_service(self) -> "IInteractorServiceReader":
        return self._uow.interactor_service

    def get_controller_service(self) -> "IControllerServiceReader":
        return self._uow.controller_service
