# test.py
"""
Simple test to verify the optimizer works with all device types:
- Battery
- ConstantActionDevice (with ConstantAction)
- VariableActionDevice (with VariableAction)
"""
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from database import engine, init_db
from devices import (
    Battery,
    ConstantActionDevice, ConstantAction,
    VariableActionDevice, VariableAction
)
from electricity_price_optimizer_py import (
    OptimizerContext,
    PrognosesProvider,
    run_simulated_annealing,
)
from electricity_price_optimizer_py.units import WattHour, Watt

from services.device_service import SqlAlchemyDeviceService
from services.interactor_service import InteractorService
from services.controller_service import ControllerService

from interactors.mock.mock_battery import MockBatteryInteractor
from interactors.mock.mock_constant_action import MockConstantActionInteractor
from interactors.mock.mock_variable_action import MockVariableActionInteractor

from controllers.battery_controller import BatteryController
from controllers.constant_action_controller import ConstantActionController
from controllers.variable_action_controller import VariableActionController


# =============================================================================
# Simple DeviceManager Implementation
# =============================================================================
class DeviceManager:
    """Simple device manager that wires services together."""

    def __init__(self, device_service, interactor_service, controller_service=None):
        self._device_service = device_service
        self._interactor_service = interactor_service
        self._controller_service = controller_service

    def get_device_service(self):
        return self._device_service

    def get_interactor_service(self):
        return self._interactor_service

    def get_controller_service(self):
        return self._controller_service


# =============================================================================
# Price Callback
# =============================================================================
def price_callback(start: datetime, end: datetime) -> int:
    """Cheap at night (10 cents), expensive during day (50 cents)."""
    if 8 <= start.hour <= 20:
        return 50
    return 10


# =============================================================================
# Main Test
# =============================================================================
def main():
    print("=" * 60)
    print("OPTIMIZER INTEGRATION TEST")
    print("=" * 60)

    # Initialize database
    init_db()

    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    print(f"Current time: {now}")

    with Session(engine) as session:
        # =====================================================================
        # STEP 1: Create Device Models in Database
        # =====================================================================
        print("\n[1] Creating device models...")

        # Battery
        battery = Battery(
            name="Home Battery",
            capacity=WattHour(10000),
            current_charge=WattHour(5000),
            max_charge_rate=Watt(3000),
            max_discharge_rate=Watt(3000),
            efficiency=0.95
        )
        session.add(battery)

        # Constant Action Device (e.g., Dishwasher)
        dishwasher = ConstantActionDevice(name="Dishwasher")
        dishwasher.actions = [
            ConstantAction(
                start_from=now,
                end_before=now + timedelta(hours=8),
                duration=timedelta(minutes=90),
                consumption=Watt(1800),
            )
        ]
        session.add(dishwasher)

        # Variable Action Device (e.g., EV Charger)
        ev_charger = VariableActionDevice(name="EV Charger")
        ev_charger.actions = [
            VariableAction(
                start=now,
                end=now + timedelta(hours=12),
                total_consumption=WattHour(20000),
                max_consumption=Watt(7000),
            )
        ]
        session.add(ev_charger)

        session.commit()

        print(f"    Battery ID:     {battery.id}")
        print(f"    Dishwasher ID:  {dishwasher.id}")
        print(f"    EV Charger ID:  {ev_charger.id}")

        # =====================================================================
        # STEP 2: Create Services & DeviceManager
        # =====================================================================
        print("\n[2] Creating services...")

        device_service = SqlAlchemyDeviceService(session)
        interactor_service = InteractorService()
        controller_service = ControllerService()

        device_manager = DeviceManager(
            device_service,
            interactor_service,
            controller_service
        )

        # =====================================================================
        # STEP 3: Create and Register Mock Interactors
        # =====================================================================
        print("\n[3] Creating mock interactors...")

        # Battery interactor
        battery_interactor = MockBatteryInteractor(battery.id)
        battery_interactor.id = battery.id  # InteractorService expects .id
        interactor_service.add_battery_interactor(battery_interactor)

        # Constant action interactor (dishwasher)
        dishwasher_interactor = MockConstantActionInteractor(dishwasher.id)
        dishwasher_interactor.id = dishwasher.id
        interactor_service.add_constant_action_interactor(
            dishwasher_interactor)

        # Variable action interactor (EV charger)
        ev_interactor = MockVariableActionInteractor(ev_charger.id)
        ev_interactor.id = ev_charger.id
        interactor_service.add_variable_action_interactor(ev_interactor)

        interactor_service.commit()
        print("    Interactors registered.")

        # =====================================================================
        # STEP 4: Create and Register Controllers
        # =====================================================================
        print("\n[4] Creating controllers...")

        battery_controller = BatteryController(battery.id)
        controller_service.add_battery_controller(battery_controller)

        dishwasher_controller = ConstantActionController(dishwasher.id)
        controller_service.add_constant_action_controller(
            dishwasher_controller)

        ev_controller = VariableActionController(ev_charger.id)
        controller_service.add_variable_action_controller(ev_controller)

        controller_service.commit()
        print("    Controllers registered.")

        controllers = [battery_controller,
                       dishwasher_controller, ev_controller]

        # =====================================================================
        # STEP 5: Build Optimizer Context
        # =====================================================================
        print("\n[5] Building optimizer context...")

        provider = PrognosesProvider(price_callback)
        context = OptimizerContext(now, provider)

        for controller in controllers:
            controller.add_to_optimizer_context(context, now, device_manager)
            print(f"    Added: {controller.__class__.__name__}")

        # =====================================================================
        # STEP 6: Run Optimization
        # =====================================================================
        print("\n[6] Running simulated annealing optimization...")

        cost, schedule = run_simulated_annealing(context)

        print(f"    Optimization complete!")
        print(f"    Total cost: {cost}")

        # =====================================================================
        # STEP 7: Distribute Schedule to Controllers
        # =====================================================================
        print("\n[7] Distributing schedule to controllers...")

        for controller in controllers:
            controller.use_schedule(schedule, device_manager)

        # =====================================================================
        # STEP 8: Inspect Schedule Results
        # =====================================================================
        print("\n[8] Schedule Results:")

        # Battery
        assigned_battery = schedule.get_battery(battery.id)
        if assigned_battery:
            print(f"    Battery ({battery.id}): Scheduled ✓")
            try:
                charge_speed = assigned_battery.get_charge_speed(now)
                print(
                    f"        Charge speed at {now.hour}:00 = {charge_speed} W")
            except Exception as e:
                print(f"        Could not get charge speed: {e}")
        else:
            print(f"    Battery ({battery.id}): Not in schedule")

        # Dishwasher (Constant Action)
        assigned_dishwasher = schedule.get_constant_action(dishwasher.id)
        if assigned_dishwasher:
            start_time = assigned_dishwasher.get_start_time()
            print(f"    Dishwasher ({dishwasher.id}): Start at {start_time} ✓")
        else:
            print(f"    Dishwasher ({dishwasher.id}): Not in schedule")

        # EV Charger (Variable Action)
        assigned_ev = schedule.get_variable_action(ev_charger.id)
        if assigned_ev:
            print(f"    EV Charger ({ev_charger.id}): Scheduled ✓")
            for hour_offset in [0, 2, 4]:
                check_time = now + timedelta(hours=hour_offset)
                try:
                    consumption = assigned_ev.get_consumption(check_time)
                    print(
                        f"        Power at +{hour_offset}h = {consumption} W")
                except Exception as e:
                    print(
                        f"        Could not get consumption at +{hour_offset}h: {e}")
        else:
            print(f"    EV Charger ({ev_charger.id}): Not in schedule")

        # =====================================================================
        # STEP 9: Simulate Device Update Cycle
        # =====================================================================
        print("\n[9] Simulating device update cycle...")

        for controller in controllers:
            controller.update_device(now, device_manager)
            print(f"    Updated: {controller.__class__.__name__}")

        # =====================================================================
        # STEP 10: Check Device States
        # =====================================================================
        print("\n[10] Current device states:")

        # Battery state
        battery_charge = battery_interactor.get_charge(device_manager)
        battery_current = battery_interactor.get_current(device_manager)
        print(
            f"    Battery: charge={battery_charge}, current={battery_current}")

        # Dishwasher state
        dishwasher_state = dishwasher_interactor.get_action_state(
            device_manager)
        dishwasher_power = dishwasher_interactor.get_current(device_manager)
        dishwasher_start = dishwasher_interactor.get_start_time(device_manager)
        print(
            f"    Dishwasher: state={dishwasher_state.value}, power={dishwasher_power}, started={dishwasher_start}")

        # EV state
        ev_power = ev_interactor.get_current(device_manager)
        ev_consumed = ev_interactor.get_total_consumed(device_manager)
        print(f"    EV Charger: power={ev_power}, consumed={ev_consumed}")

        # =====================================================================
        # STEP 11: Simulate Time Passing (Optional)
        # =====================================================================
        print("\n[11] Simulating 2 hours passing...")

        future_time = now + timedelta(hours=2)

        # Update mock interactor states
        battery_interactor.update(future_time, device_manager)
        dishwasher_interactor.update(future_time, device_manager)
        ev_interactor.update(future_time, device_manager)

        # Update controllers with new time
        for controller in controllers:
            controller.update_device(future_time, device_manager)

        print(f"    Time now: {future_time}")
        print(
            f"    Battery: charge={battery_interactor.get_charge(device_manager)}, current={battery_interactor.get_current(device_manager)}")
        print(
            f"    Dishwasher: state={dishwasher_interactor.get_action_state(device_manager).value}")
        print(
            f"    EV Charger: consumed={ev_interactor.get_total_consumed(device_manager)}")

    print("\n" + "=" * 60)
    print("TEST COMPLETED SUCCESSFULLY")
    print("=" * 60)


if __name__ == "__main__":
    main()
