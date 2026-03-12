from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo

from device_manager import IDeviceManager
from devices import Battery, ConstantActionDevice, VariableActionDevice, ConsumerScheduled
from electricity_price_optimizer_py import Schedule
from electricity_price_optimizer_py.units import Watt, WattHour
from external_api_services.api_services import api_services


BERLIN = ZoneInfo("Europe/Berlin")


@dataclass(frozen=True)
class PlanContext:
    """Shared, per-request computed values for plan data collectors."""

    timeline: list[datetime]
    plan_start: datetime
    plan_end: datetime


PLAN_HOURS = 24
TIMELINE_STEP = timedelta(minutes=1)


def create_timeline(
    hours: int = PLAN_HOURS,
    step: timedelta = TIMELINE_STEP,
) -> list[datetime]:
    """Create the plan timeline in 1-minute resolution."""
    start_time = datetime.now(timezone.utc)
    steps = int(timedelta(hours=hours) / step)
    return [start_time + i * step for i in range(steps)]


def _timeline_step(timeline: list[datetime]) -> timedelta:
    if len(timeline) > 1:
        return timeline[1] - timeline[0]
    return TIMELINE_STEP


def build_plan_context(
    hours: int = PLAN_HOURS,
    step: timedelta = TIMELINE_STEP,
) -> PlanContext:
    timeline = create_timeline(hours=hours, step=step)
    actual_step = _timeline_step(timeline)
    plan_start = timeline[0]
    plan_end = timeline[-1] + actual_step
    return PlanContext(timeline=timeline, plan_start=plan_start, plan_end=plan_end)


def _collect_constant_power_series(
    start: datetime,
    end: datetime,
    power_w: float,
    timeline: list[datetime],
) -> list[float]:
    return [float(power_w) if start <= t < end else 0.0 for t in timeline]


def collect_generation_by_generator_kw(
    manager: IDeviceManager,
    timeline: list[datetime],
) -> list[dict[str, Any]]:
    """Calculate generation time series per generator."""

    step = (timeline[1] - timeline[0]
            ) if len(timeline) > 1 else timedelta(hours=1)
    end = timeline[-1] + step

    gen_controllers = manager.get_controller_service().get_all_generator_controllers()
    result: list[dict[str, Any]] = []

    for ctrl in gen_controllers:
        try:
            device = manager.get_device_service().get_device(ctrl.device_id)
        except Exception:
            device = None

        name = device.name if device is not None else f"Generator {ctrl.device_id}"

        series: list[float] = [0.0 for _ in timeline]

        try:
            prognoses = ctrl.get_prognoses(manager, timeline, end)
        except Exception:
            prognoses = []

        if prognoses:
            for i in range(min(len(prognoses), len(timeline))):
                try:
                    wh = WattHour.get_value(prognoses[i])
                except Exception:
                    continue
                series[i] += float(wh)

        result.append(
            {"id": ctrl.device_id, "name": name, "generationKw": series})

    return result


def collect_total_generation_kw(
    manager: IDeviceManager,
    timeline: list[datetime],
) -> list[float]:
    """Calculate total generation in kW aligned with `timeline`."""

    step = (timeline[1] - timeline[0]
            ) if len(timeline) > 1 else timedelta(hours=1)
    end = timeline[-1] + step

    total_kw: list[float] = [0.0 for _ in timeline]
    gen_controllers = manager.get_controller_service().get_all_generator_controllers()

    for ctrl in gen_controllers:
        try:
            prognoses = ctrl.get_prognoses(manager, timeline, end)
        except Exception:
            continue

        if not prognoses:
            continue

        for i in range(min(len(prognoses), len(timeline))):
            try:
                wh = WattHour.get_value(prognoses[i])
            except Exception:
                continue
            total_kw[i] += float(wh) 

    return total_kw


def collect_fixed_consumption_w(
    manager: IDeviceManager,
    timeline: list[datetime],
) -> list[float]:
    """Calculate total consumption in kW aligned with `timeline`.

    Includes consumption from scheduled consumers only (constant/variable actions
    are handled separately in the schedule).
    """

    step = (timeline[1] - timeline[0]
            ) if len(timeline) > 1 else timedelta(hours=1)
    end = timeline[-1] + step

    total_kw: list[float] = [0.0 for _ in timeline]
    consumer_controllers = manager.get_controller_service(
    ).get_all_consumer_scheduled_controllers()

    for ctrl in consumer_controllers:
        try:
            prognoses = ctrl.get_prognoses(manager, timeline, end)
        except Exception:
            continue

        if not prognoses:
            continue

        for i in range(min(len(prognoses), len(timeline))):
            try:
                wh = WattHour.get_value(prognoses[i])
            except Exception:
                continue
            total_kw[i] += float(wh)

    return total_kw


def collect_hourly_prices_ct_per_kwh(timeline: list[datetime]) -> list[float | None]:
    """Collect hourly electricity prices aligned with the given timeline."""

    blocks = api_services.price_cache.get_blocks()
    prices: list[float | None] = []

    for t in timeline:
        hour = t.astimezone(BERLIN).replace(minute=0, second=0, microsecond=0)
        block = blocks.get(hour)
        prices.append(None if block is None else float(block) / 10.0)

    return prices


def _collect_power_values_timeline_aligned(
    action,
    assigned_action,
    timeline: list[datetime],
) -> list[float]:
    """Return power values aligned exactly to the plan timeline."""

    start = action.start
    end = action.end

    values: list[float] = []
    for t in timeline:
        if start <= t < end:
            try:
                power = assigned_action.get_consumption(t)
                values.append(float(Watt.get_value(power)))
            except Exception:
                values.append(0.0)
        else:
            values.append(0.0)
    return values


def _collect_soc_values(battery, timeline: list[datetime]) -> list[float]:
    values: list[float] = []
    last_value: float | None = None

    for t in timeline:
        try:
            value = WattHour.get_value(battery.get_charge_level(t))
            last_value = value
            values.append(value)
        except ValueError:
            values.append(last_value if last_value is not None else 0.0)

    return values


def collect_device_tasks_and_series(
    manager: IDeviceManager,
    schedule: Schedule,
    ctx: PlanContext,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    """Collect tasks and per-device series.

    Returns: (tasks, batteries, variable_actions, constant_actions, scheduled_consumers)
    """

    tasks: list[dict[str, Any]] = []
    batteries: list[dict[str, Any]] = []
    variable_actions: list[dict[str, Any]] = []
    constant_actions: list[dict[str, Any]] = []
    scheduled_consumers: list[dict[str, Any]] = []

    i = 1
    for device in manager.get_device_service().get_all_devices():
        if isinstance(device, ConstantActionDevice):
            assigned = schedule.get_constant_action(device.id)
            if assigned is None:
                continue

            action = device.actions[0] if device.actions else None
            power_w = float(Watt.get_value(action.consumption)
                            ) if action is not None else 0.0

            start_dt = assigned.get_start_time()
            end_dt = assigned.get_end_time()

            tasks.append(
                {
                    "id": str(i),
                    "name": device.name,
                    "text": device.name,
                    "start": start_dt.isoformat(),
                    "end": end_dt.isoformat(),
                }
            )

            constant_actions.append(
                {
                    "id": str(i),
                    "name": device.name,
                    "powerW": _collect_constant_power_series(start_dt, end_dt, power_w, ctx.timeline),
                }
            )
            i += 1

        if isinstance(device, VariableActionDevice):
            for action in device.actions:
                assigned_action = schedule.get_variable_action(device.id)
                if assigned_action is None:
                    continue

                tasks.append(
                    {
                        "id": str(i),
                        "name": device.name,
                        "text": device.name,
                        "start": action.start.isoformat(),
                        "end": action.end.isoformat(),
                    }
                )

                variable_actions.append(
                    {
                        "id": str(i),
                        "name": device.name,
                        "powerW": _collect_power_values_timeline_aligned(action, assigned_action, ctx.timeline),
                    }
                )
                i += 1

        if isinstance(device, ConsumerScheduled):
            tasks.append(
                {
                    "id": str(i),
                    "name": device.name,
                    "text": device.name,
                    "start": ctx.plan_start.isoformat(),
                    "end": ctx.plan_end.isoformat(),
                }
            )

            # Collect power consumption series aligned to timeline
            power_series: list[float] = []
            for t in ctx.timeline:
                try:
                    power = device.get_consumption(t)
                    power_series.append(float(Watt.get_value(power)))
                except Exception:
                    power_series.append(0.0)

            scheduled_consumers.append(
                {
                    "id": str(i),
                    "name": device.name,
                    "powerW": power_series,
                }
            )
            i += 1

        if isinstance(device, Battery):
            assigned_battery = schedule.get_battery(device.id)
            if assigned_battery is None:
                continue

            tasks.append(
                {
                    "id": str(i),
                    "name": device.name,
                    "text": device.name,
                    "start": ctx.plan_start.isoformat(),
                    "end": ctx.plan_end.isoformat(),
                }
            )

            batteries.append(
                {
                    "id": str(i),
                    "name": device.name,
                    "socWh": _collect_soc_values(assigned_battery, ctx.timeline),
                }
            )
            i += 1

    return tasks, batteries, variable_actions, constant_actions, scheduled_consumers


def collect_plan_data(manager: IDeviceManager, schedule: Schedule) -> dict[str, Any]:
    """Transform schedule + devices into the frontend plan payload."""

    ctx = build_plan_context(hours=PLAN_HOURS, step=TIMELINE_STEP)

    generation_kw = collect_total_generation_kw(manager, ctx.timeline)
    generation_by_generator_kw = collect_generation_by_generator_kw(manager, ctx.timeline)
    consumption_w = collect_fixed_consumption_w(manager, ctx.timeline)
    prices_ct_per_kwh = collect_hourly_prices_ct_per_kwh(ctx.timeline)

    tasks, batteries, variable_actions, constant_actions, scheduled_consumers = collect_device_tasks_and_series(
        manager=manager,
        schedule=schedule,
        ctx=ctx,
    )

    return {
        "tasks": tasks,
        "timeline": [t.isoformat() for t in ctx.timeline],
        "batteries": batteries,
        "variableActions": variable_actions,
        "pricesCtPerKwh": prices_ct_per_kwh,
        "generationKw": generation_kw,
        "generationByGeneratorKw": generation_by_generator_kw,
        "constantActions": constant_actions,
        "scheduledConsumers": scheduled_consumers,
        "consumptionW": consumption_w,
    }
