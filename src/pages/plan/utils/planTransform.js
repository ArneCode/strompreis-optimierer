/** Gantt scale configuration (day + hour) */
export const SCALES = [
  { unit: "day", step: 1, format: "%j" }, 
  { unit: "hour", step: 1, format: "%H" }, 
];

export const toGanttTasks = (apiTasks) =>
  (apiTasks ?? []).map((t) => ({
    ...t,
    start: new Date(t.start),
    end: new Date(t.end),
    type: "task",
    lazy: false,
  }));

export function computeGanttWindow(planData, tasks) {
  const ganttStart =
    planData.timeline?.length > 0
      ? new Date(planData.timeline[0])
      : tasks.length > 0
        ? new Date(Math.min(...tasks.map((t) => t.start.getTime())))
        : new Date();

  const ganttEnd =
    planData.timeline?.length > 0
      ? new Date(planData.timeline[planData.timeline.length - 1])
      : tasks.length > 0
        ? new Date(Math.max(...tasks.map((t) => t.end.getTime())))
        : new Date(Date.now() + 6 * 60 * 60 * 1000);

  return { ganttStart, ganttEnd };
}

export function makePriceChartData(planData) {
  return (planData.timeline ?? []).map((iso, i) => {
    const d = new Date(iso);
    return {
      hour: String(d.getHours()).padStart(2, "0") + ":00",
      price: planData.pricesCtPerKwh?.[i] ?? null,
    };
  });
}

export function makeGeneratorChartData(timeline, generationSeries) {
  return (timeline ?? []).map((iso, i) => {
    const d = new Date(iso);
    return {
      hour: String(d.getHours()).padStart(2, "0") + ":00",
      generation: generationSeries?.[i] ?? 0,
    };
  });
}

export function buildBatterySeries(planData, battery) {
  const t = planData.timeline ?? [];
  const y = battery?.socWh ?? [];
  return t.map((iso, i) => ({ time: iso, value: y[i] ?? null }));
}

export function buildVariableActionSeries(planData, va) {
  if (!va) return [];
  const timeline = planData.timeline ?? [];
  const values = va.powerW ?? [];
  return timeline.map((iso, i) => ({ time: iso, value: values[i] ?? 0 }));
}

export function buildConstantActionSeries(planData, ca) {
  if (!ca) return [];
  const timeline = planData.timeline ?? [];
  const values = ca.powerW ?? [];
  return timeline.map((iso, i) => ({ time: iso, value: values[i] ?? 0 }));
}

/** Helper: builds Map(String(id) -> object) */
export function buildIdMap(list, idKey = "id") {
  const m = new Map();
  for (const item of list ?? []) {
    m.set(String(item?.[idKey]), item);
  }
  return m;
}