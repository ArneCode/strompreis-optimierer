"""Interactor service layer.

Provides reader and writer interfaces and an in-memory implementation backed by
RollbackMap for transactional staging (add/update/delete) with commit/rollback.

Caveats:
- Not suitable for multiprocessing due to shared state.
"""
from abc import ABC, abstractmethod
from typing import Optional, TYPE_CHECKING

from services.interfaces import IInteractorService

if TYPE_CHECKING:
    from interactors.interfaces import BatteryInteractor, GeneratorInteractor, ConstantActionInteractor, VariableActionInteractor
from rollback_map import RollbackMap


class InteractorService(IInteractorService):
    """In-memory interactor store with transactional staging.

    Uses RollbackMap for staging changes until commit. Rollback discards staged changes.
    """
    battery_interactors: "RollbackMap[BatteryInteractor]"
    generator_interactors: "RollbackMap[GeneratorInteractor]"
    constant_action_interactors: "RollbackMap[ConstantActionInteractor]"
    variable_action_interactors: "RollbackMap[VariableActionInteractor]"

    def __init__(self):
        self.battery_interactors = RollbackMap()
        self.generator_interactors = RollbackMap()
        self.constant_action_interactors = RollbackMap()
        self.variable_action_interactors = RollbackMap()

    def get_battery_interactor(self, interactor_id: "int") -> "Optional[BatteryInteractor]":
        return self.battery_interactors.get(interactor_id)

    def get_generator_interactor(self, interactor_id: "int") -> "Optional[GeneratorInteractor]":
        return self.generator_interactors.get(interactor_id)

    def get_constant_action_interactor(self, interactor_id: "int") -> "Optional[ConstantActionInteractor]":
        return self.constant_action_interactors.get(interactor_id)

    def get_variable_action_interactor(self, interactor_id: "int") -> "Optional[VariableActionInteractor]":
        return self.variable_action_interactors.get(interactor_id)

    def get_all_battery_interactors(self) -> "list[BatteryInteractor]":
        return list(self.battery_interactors.values())

    def get_all_generator_interactors(self) -> "list[GeneratorInteractor]":
        return list(self.generator_interactors.values())

    def get_all_constant_action_interactors(self) -> "list[ConstantActionInteractor]":
        return list(self.constant_action_interactors.values())

    def get_all_variable_action_interactors(self) -> "list[VariableActionInteractor]":
        return list(self.variable_action_interactors.values())

    def add_battery_interactor(self, interactor: "BatteryInteractor") -> "int":
        self.battery_interactors.set(interactor.device_id, interactor)
        return interactor.device_id

    def add_generator_interactor(self, interactor: "GeneratorInteractor") -> "int":
        self.generator_interactors.set(interactor.device_id, interactor)
        return interactor.device_id

    def add_constant_action_interactor(self, interactor: "ConstantActionInteractor") -> "int":
        self.constant_action_interactors.set(interactor.device_id, interactor)
        return interactor.device_id

    def add_variable_action_interactor(self, interactor: "VariableActionInteractor") -> "int":
        self.variable_action_interactors.set(interactor.device_id, interactor)
        return interactor.device_id

    def remove_interactor(self, interactor_id: "int") -> "None":
        self.battery_interactors.delete(interactor_id)
        self.generator_interactors.delete(interactor_id)
        self.constant_action_interactors.delete(interactor_id)
        self.variable_action_interactors.delete(interactor_id)

    def rollback(self) -> "None":
        self.battery_interactors.rollback()
        self.generator_interactors.rollback()
        self.constant_action_interactors.rollback()
        self.variable_action_interactors.rollback()

    def commit(self) -> "None":
        self.battery_interactors.commit()
        self.generator_interactors.commit()
        self.constant_action_interactors.commit()
        self.variable_action_interactors.commit()
