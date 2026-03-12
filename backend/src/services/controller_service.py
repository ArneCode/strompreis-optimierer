"""Controller service layer.

Manages controller instances in memory with transactional staging (RollbackMap).
Provides add/remove and lookup operations per controller type.

Caveats:
- Not suitable for multiprocessing due to shared state.
- Use a concurrency-safe or persistent approach in production.
"""
from abc import ABC, abstractmethod
from typing import Optional
from controllers import BatteryController, ConstantActionController, VariableActionController
from controllers.base import DeviceController, GeneratorController
from controllers.consumer_scheduled_controller import ConsumerScheduledController
from services.interfaces import IControllerService
from rollback_map import RollbackMap


# IMPORTANT: Does not work in multiprocessing environments due to shared state in RollbackMap. Consider using a different approach for concurrency.


class ControllerService(IControllerService):
    """In-memory controller store using RollbackMap for transactional changes."""
    battery_controllers: RollbackMap[BatteryController]
    generator_controllers: RollbackMap[GeneratorController]
    constant_action_controllers: RollbackMap[ConstantActionController]
    variable_action_controllers: RollbackMap[VariableActionController]
    consumer_scheduled_controllers: RollbackMap[ConsumerScheduledController]

    def __init__(self):
        self.battery_controllers = RollbackMap()
        self.generator_controllers = RollbackMap()
        self.constant_action_controllers = RollbackMap()
        self.variable_action_controllers = RollbackMap()
        self.consumer_scheduled_controllers = RollbackMap()

    def get_battery_controller(self, controller_id: int) -> Optional[BatteryController]:
        return self.battery_controllers.get(controller_id)

    def get_generator_controller(self, controller_id: int) -> Optional[GeneratorController]:
        return self.generator_controllers.get(controller_id)

    def get_constant_action_controller(self, controller_id: int) -> Optional[ConstantActionController]:
        return self.constant_action_controllers.get(controller_id)

    def get_variable_action_controller(self, controller_id: int) -> Optional[VariableActionController]:
        return self.variable_action_controllers.get(controller_id)

    def get_consumer_scheduled_controller(self, controller_id: int) -> Optional[ConsumerScheduledController]:
        return self.consumer_scheduled_controllers.get(controller_id)

    def get_all_controllers(self) -> list[DeviceController]:
        return list(self.battery_controllers.values()) + \
            list(self.generator_controllers.values()) + \
            list(self.constant_action_controllers.values()) + \
            list(self.variable_action_controllers.values()) + \
            list(self.consumer_scheduled_controllers.values())

    def get_variable_action_controller(self, controller_id: int) -> Optional[VariableActionController]:
        return self.variable_action_controllers.get(controller_id)

    def add_battery_controller(self, controller: BatteryController) -> int:
        return self.battery_controllers.set(controller.device_id, controller)

    def add_generator_controller(self, controller: GeneratorController) -> int:
        return self.generator_controllers.set(controller.device_id, controller)

    def add_constant_action_controller(self, controller: ConstantActionController) -> int:
        return self.constant_action_controllers.set(controller.device_id, controller)

    def add_variable_action_controller(self, controller: VariableActionController) -> int:
        return self.variable_action_controllers.set(controller.device_id, controller)

    def add_consumer_scheduled_controller(self, controller: ConsumerScheduledController) -> int:
        return self.consumer_scheduled_controllers.set(controller.device_id, controller)

    def get_all_battery_controllers(self):
        return self.battery_controllers.values()

    def get_all_generator_controllers(self):
        return self.generator_controllers.values()

    def get_all_constant_action_controllers(self):
        return self.constant_action_controllers.values()

    def get_all_variable_action_controllers(self):
        return self.variable_action_controllers.values()

    def get_all_consumer_scheduled_controllers(self):
        return list(self.consumer_scheduled_controllers.values())

    def remove_controller(self, controller_id: int) -> None:
        self.battery_controllers.delete(controller_id)
        self.generator_controllers.delete(controller_id)
        self.constant_action_controllers.delete(controller_id)
        self.variable_action_controllers.delete(controller_id)
        self.consumer_scheduled_controllers.delete(controller_id)

    def rollback(self) -> None:
        self.battery_controllers.rollback()
        self.generator_controllers.rollback()
        self.constant_action_controllers.rollback()
        self.variable_action_controllers.rollback()
        self.consumer_scheduled_controllers.rollback()

    def commit(self) -> None:
        self.battery_controllers.commit()
        self.generator_controllers.commit()
        self.constant_action_controllers.commit()
        self.variable_action_controllers.commit()
        self.consumer_scheduled_controllers.commit()
