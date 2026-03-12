"""Application-scoped singleton service instances.

Provides shared InteractorService and ControllerService objects for dependency injection.
Not multiprocessing-safe;
"""
from services.interactor_service import InteractorService
from services.controller_service import ControllerService
from services.orchestrator_service import OrchestratorService
from services.optimizer_service import OptimizerService

interactor_service_instance = InteractorService()
controller_service_instance = ControllerService()
orchestrator_service_instance = OrchestratorService()
optimizer_service_instance = OptimizerService()
