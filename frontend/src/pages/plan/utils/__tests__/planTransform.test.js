import { describe, it, expect } from "vitest";
import {
  toGanttTasks,
  computeGanttWindow,
  makePriceChartData,
  makeGeneratorChartData,
  buildBatterySeries,
  buildVariableActionSeries,
  buildConstantActionSeries,
  buildIdMap,
} from "../planTransform.js";

describe("planTransform utils", () => {
  it("toGanttTasks converts start/end to Date and adds gantt fields", () => {
    const tasks = toGanttTasks([
      {
        id: 1,
        name: "A",
        start: "2026-02-26T00:00:00.000Z",
        end: "2026-02-26T01:00:00.000Z",
      },
    ]);

    expect(tasks).toHaveLength(1);
    expect(tasks[0].start).toBeInstanceOf(Date);
    expect(tasks[0].end).toBeInstanceOf(Date);
    expect(tasks[0].type).toBe("task");
    expect(tasks[0].lazy).toBe(false);
  });

  it("computeGanttWindow falls back to tasks if no timeline", () => {
    const planData = { timeline: [] };
    const tasks = [
      {
        start: new Date("2026-02-26T02:00:00.000Z"),
        end: new Date("2026-02-26T03:00:00.000Z"),
      },
      {
        start: new Date("2026-02-26T01:00:00.000Z"),
        end: new Date("2026-02-26T04:00:00.000Z"),
      },
    ];

    const { ganttStart, ganttEnd } = computeGanttWindow(planData, tasks);
    expect(ganttStart.toISOString()).toBe("2026-02-26T01:00:00.000Z");
    expect(ganttEnd.toISOString()).toBe("2026-02-26T04:00:00.000Z");
  });

  it("buildIdMap creates a string-keyed map", () => {
    const m = buildIdMap([{ id: 7, name: "x" }]);
    expect(m.get("7")).toEqual({ id: 7, name: "x" });
  });

  it("battery/variable/constant series mapping works", () => {
    const planData = {
      timeline: ["2026-02-26T00:00:00.000Z", "2026-02-26T01:00:00.000Z"],
    };

    expect(buildBatterySeries(planData, { socWh: [100, 200] })).toEqual([
      { time: "2026-02-26T00:00:00.000Z", value: 100 },
      { time: "2026-02-26T01:00:00.000Z", value: 200 },
    ]);

    expect(buildVariableActionSeries(planData, { powerW: [5, 6] })).toEqual([
      { time: "2026-02-26T00:00:00.000Z", value: 5 },
      { time: "2026-02-26T01:00:00.000Z", value: 6 },
    ]);

    expect(buildConstantActionSeries(planData, { powerW: [9, 10] })).toEqual([
      { time: "2026-02-26T00:00:00.000Z", value: 9 },
      { time: "2026-02-26T01:00:00.000Z", value: 10 },
    ]);
  });
});