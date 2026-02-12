from abc import ABC, abstractmethod
from typing import TYPE_CHECKING, Optional

from device import GeneratorPV
if TYPE_CHECKING:
    from electricity_price_optimizer_py import Schedule
    from controllers.base import DeviceController
    from controllers.battery_controller import BatteryController
    from controllers.constant_action_controller import ConstantActionController
    from controllers.generator_controller import GeneratorPvController
    from controllers.variable_action_controller import VariableActionController
    from device import Battery, ConstantActionDevice, Device, VariableActionDevice
    from device_manager import IDeviceManager
    from interactors.interfaces import BatteryInteractor, GeneratorInteractor, ConstantActionInteractor, VariableActionInteractor
    from rollback_map import RollbackMap


class IInteractorServiceReader(ABC):
    """Read-only interactor service API."""
    @abstractmethod
    def get_battery_interactor(self, interactor_id: "int") -> "Optional[BatteryInteractor]":
        """Retrieve battery interactor details by ID."""
        ...

    @abstractmethod
    def get_generator_interactor(self, interactor_id: "int") -> "Optional[GeneratorInteractor]":
        """Retrieve generator interactor details by ID."""
        ...

    @abstractmethod
    def get_constant_action_interactor(self, interactor_id: "int") -> "Optional[ConstantActionInteractor]":
        """Retrieve constant action interactor details by ID."""
        ...

    @abstractmethod
    def get_variable_action_interactor(self, interactor_id: "int") -> "Optional[VariableActionInteractor]":
        """Retrieve variable action interactor details by ID."""
        ...

    @abstractmethod
    def get_all_battery_interactors(self) -> "list[BatteryInteractor]":
        """Retrieve all battery interactors."""
        ...

    @abstractmethod
    def get_all_generator_interactors(self) -> "list[GeneratorInteractor]":
        """Retrieve all generator interactors."""
        ...

    @abstractmethod
    def get_all_constant_action_interactors(self) -> "list[ConstantActionInteractor]":
        """Retrieve all constant action interactors."""
        ...

    @abstractmethod
    def get_all_variable_action_interactors(self) -> "list[VariableActionInteractor]":
        """Retrieve all variable action interactors."""
        ...


class IInteractorService(IInteractorServiceReader):
    """Interactor service API with mutation operations."""

    @abstractmethod
    def add_battery_interactor(self, interactor: "BatteryInteractor") -> "int":
        """Add a new battery interactor and return its ID."""
        ...

    @abstractmethod
    def add_generator_interactor(self, interactor: "GeneratorInteractor") -> "int":
        """Add a new generator interactor and return its ID."""
        ...

    @abstractmethod
    def add_constant_action_interactor(self, interactor: "ConstantActionInteractor") -> "int":
        """Add a new constant action interactor and return its ID."""
        ...

    @abstractmethod
    def add_variable_action_interactor(self, interactor: "VariableActionInteractor") -> "int":
        """Add a new variable action interactor and return its ID."""
        ...

    @abstractmethod
    def remove_interactor(self, interactor_id: "int") -> "None":
        """Remove an interactor by ID."""
        ...

    @abstractmethod
    def rollback(self) -> "None":
        """Rollback all changes made since the last commit."""
        ...

    @abstractmethod
    def commit(self) -> "None":
        """Commit all staged changes, making them permanent."""
        ...


class IControllerServiceReader(ABC):
    """Read-only controller service API."""
    @abstractmethod
    def get_battery_controller(self, controller_id: int) -> Optional["BatteryController"]:
        """Retrieve battery controller details by ID."""
        ...

    @abstractmethod
    def get_generator_controller(self, controller_id: int) -> Optional["GeneratorPvController"]:
        """Retrieve generator controller details by ID."""
        ...

    @abstractmethod
    def get_constant_action_controller(self, controller_id: int) -> Optional["ConstantActionController"]:
        """Retrieve constant action controller details by ID."""
        ...

    @abstractmethod
    def get_variable_action_controller(self, controller_id: int) -> Optional["VariableActionController"]:
        """Retrieve variable action controller details by ID."""
        ...

    @abstractmethod
    def get_all_controllers(self) -> list["DeviceController"]:
        """Retrieve all controllers."""
        ...


class IControllerService(IControllerServiceReader):
    """Controller service API with mutation operations."""
    @abstractmethod
    def add_battery_controller(self, controller: "BatteryController") -> int:
        """Add a new battery controller and return its ID."""
        ...

    @abstractmethod
    def add_generator_controller(self, controller: "GeneratorPvController") -> int:
        """Add a new generator controller and return its ID."""
        ...

    @abstractmethod
    def add_constant_action_controller(self, controller: "ConstantActionController") -> int:
        """Add a new constant action controller and return its ID."""
        ...

    @abstractmethod
    def add_variable_action_controller(self, controller: "VariableActionController") -> int:
        """Add a new variable action controller and return its ID."""
        ...

    @abstractmethod
    def remove_controller(self, controller_id: int) -> None:
        """Remove a controller by ID."""
        ...

    @abstractmethod
    def rollback(self) -> None:
        """Rollback all changes made since the last commit."""
        ...

    @abstractmethod
    def commit(self) -> None:
        """Commit all changes to the database."""
        ...


class IDeviceServiceReader(ABC):
    """Read-only device service API."""
    @abstractmethod
    def get_device(self, device_id: "int") -> "Device | None":
        """Retrieve device details by ID."""
        ...

    @abstractmethod
    def get_battery(self, device_id: "int") -> "Battery | None":
        """Retrieve battery details by ID."""
        ...

    @abstractmethod
    def get_generator_pv(self, device_id: "int") -> "GeneratorPV | None":
        """Retrieve generator details by ID."""
        ...

    @abstractmethod
    def get_constant_action_device(self, device_id: "int") -> "ConstantActionDevice | None":
        """Retrieve constant action device details by ID."""
        ...

    @abstractmethod
    def get_variable_action_device(self, device_id: "int") -> "VariableActionDevice | None":
        """Retrieve variable action device details by ID."""
        ...

    @abstractmethod
    def get_all_devices(self) -> "list[Device]":
        """Retrieve all devices."""
        ...

    @abstractmethod
    def get_all_batteries(self) -> "list[Battery]":
        """Retrieve all batteries."""
        ...

    @abstractmethod
    def get_all_generators(self) -> "list[Generator]":
        """Retrieve all generators."""
        ...

    @abstractmethod
    def get_all_constant_action_devices(self) -> "list[ConstantActionDevice]":
        """Retrieve all constant action devices."""
        ...

    @abstractmethod
    def get_all_variable_action_devices(self) -> "list[VariableActionDevice]":
        """Retrieve all variable action devices."""
        ...

    # returns all device ids
    @abstractmethod
    def get_all_device_ids(self) -> "list[int]":
        """Retrieve all device IDs."""
        ...

    @abstractmethod
    def get_all_battery_ids(self) -> "list[int]":
        """Retrieve all battery IDs."""
        ...

    @abstractmethod
    def get_all_generator_ids(self) -> "list[int]":
        """Retrieve all generator IDs."""
        ...

    @abstractmethod
    def get_all_constant_action_device_ids(self) -> "list[int]":
        """Retrieve all constant action device IDs."""
        ...

    @abstractmethod
    def get_all_variable_action_device_ids(self) -> "list[int]":
        """Retrieve all variable action device IDs."""
        ...


class IDeviceService(IDeviceServiceReader):
    """Device service API with mutation operations."""
    @abstractmethod
    def add_device(self, device: "Device") -> "int":
        """Add a new device and return its ID."""
        ...

    @abstractmethod
    def remove_device(self, device_id: "int") -> "None":
        """Remove a device by ID."""
        ...


class IOrchestratorService(ABC):
    """Orchestrator service interface providing access to all services."""

    @abstractmethod
    def get_schedule(self) -> "Schedule":
        """Get the current schedule."""
        ...

    @abstractmethod
    def run_optimization(self, device_manager: "IDeviceManager") -> "None":
        """Run the optimization algorithm."""
        ...

    @property
    @abstractmethod
    def has_schedule(self) -> bool:
        """Check if a schedule has been generated."""
        ...

    @property
    @abstractmethod
    def currently_running(self) -> bool:
        """Check if optimization is currently running."""
        ...
