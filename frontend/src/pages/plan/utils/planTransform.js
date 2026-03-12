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

const floorToHour = (date) => {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  return d;
};

const ceilToHour = (date) => {
  const d = new Date(date);
  if (
    d.getMinutes() === 0 &&
    d.getSeconds() === 0 &&
    d.getMilliseconds() === 0
  ) {
    return d;
  }
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
};

export function getTimelineStepMs(timeline = []) {
  if ((timeline?.length ?? 0) < 2) return 60 * 60 * 1000;
  return new Date(timeline[1]).getTime() - new Date(timeline[0]).getTime();
}

export function getXAxisInterval(timeline = [], labelEveryMinutes = 60) {
  const stepMs = getTimelineStepMs(timeline);
  const stepMinutes = Math.max(1, Math.round(stepMs / (60 * 1000)));
  const pointsPerTick = Math.max(1, Math.round(labelEveryMinutes / stepMinutes));
  return Math.max(0, pointsPerTick - 1);
}

export function formatTimeTick(iso) {
  const d = new Date(iso);
  return [
    String(d.getHours()).padStart(2, "0"),
    String(d.getMinutes()).padStart(2, "0"),
  ].join(":");
}

export function computeGanttWindow(planData, tasks) {
  if ((planData.timeline?.length ?? 0) > 0) {
    const stepMs = getTimelineStepMs(planData.timeline);
    const rawStart = new Date(planData.timeline[0]);
    const rawEnd = new Date(
      new Date(planData.timeline[planData.timeline.length - 1]).getTime() + stepMs
    );

    return {
      ganttStart: floorToHour(rawStart),
      ganttEnd: ceilToHour(rawEnd),
    };
  }

  if ((tasks?.length ?? 0) > 0) {
    return {
      ganttStart: floorToHour(new Date(Math.min(...tasks.map((t) => t.start.getTime())))),
      ganttEnd: ceilToHour(new Date(Math.max(...tasks.map((t) => t.end.getTime())))),
    };
  }

  const now = new Date();
  return {
    ganttStart: floorToHour(now),
    ganttEnd: ceilToHour(new Date(now.getTime() + 6 * 60 * 60 * 1000)),
  };
}

export function makePriceChartData(planData) {
  return (planData.timeline ?? []).map((iso, i) => ({
    time: iso,
    price: planData.pricesCtPerKwh?.[i] ?? null,
  }));
}

export function makeGeneratorChartData(timeline, generationSeries) {
  return (timeline ?? []).map((iso, i) => ({
    time: iso,
    generation: generationSeries?.[i] ?? 0,
  }));
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

export function buildScheduledConsumerSeries(planData, sc) {
  if (!sc) return [];
  const timeline = planData.timeline ?? [];
  const values = sc.powerW ?? [];
  return timeline.map((iso, i) => ({
    time: iso,
    value: values[i] ?? 0,
  }));
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