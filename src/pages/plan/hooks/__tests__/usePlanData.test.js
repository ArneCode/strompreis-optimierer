import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePlanData } from "../usePlanData.js";

vi.mock("../../../../services/apiService.js", () => {
  return {
    default: {
      fetchPlanStatus: vi.fn(),
      fetchPlan: vi.fn(),
      fetchPlanData: vi.fn(),
      generatePlan: vi.fn(),
    },
  };
});

import apiService from "../../../../services/apiService.js";

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("usePlanData", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads plan + planData on mount when hasSchedule=true", async () => {
    apiService.fetchPlanStatus.mockResolvedValue({
      currentlyRunning: false,
      hasSchedule: true,
    });

    apiService.fetchPlan.mockResolvedValue({
      tasks: [
        {
          id: 1,
          name: "T1",
          start: "2026-02-26T00:00:00.000Z",
          end: "2026-02-26T01:00:00.000Z",
        },
      ],
    });

    apiService.fetchPlanData.mockResolvedValue({
      timeline: ["2026-02-26T00:00:00.000Z"],
      pricesCtPerKwh: [10],
      generationKw: [1],
      batteries: [],
      variableActions: [],
      generationByGeneratorKw: [],
      constantActions: [],
    });

    const setSelectedGeneratorId = vi.fn();

    const { result } = renderHook(() =>
      usePlanData({
        compareView: false,
        selectedGeneratorId: "total",
        setSelectedGeneratorId,
        onTaskClicked: vi.fn(),
      })
    );

    await act(async () => {
      await flush();
    });

    expect(apiService.fetchPlanStatus).toHaveBeenCalled();
    expect(apiService.fetchPlan).toHaveBeenCalled();
    expect(apiService.fetchPlanData).toHaveBeenCalled();

    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.planData.timeline).toHaveLength(1);
  });

  it("clears data when hasSchedule=false", async () => {
    apiService.fetchPlanStatus.mockResolvedValue({
      currentlyRunning: false,
      hasSchedule: false,
    });

    const { result } = renderHook(() =>
      usePlanData({
        compareView: false,
        selectedGeneratorId: "total",
        setSelectedGeneratorId: vi.fn(),
        onTaskClicked: vi.fn(),
      })
    );

    await act(async () => {
      await flush();
    });

    expect(result.current.tasks).toEqual([]);
    expect(result.current.planData.timeline ?? []).toEqual([]);
  });

  it("handleGeneratePlan starts polling and loads plan when finished", async () => {
    apiService.generatePlan.mockResolvedValue(undefined);

    apiService.fetchPlanStatus
      .mockResolvedValueOnce({ currentlyRunning: false, hasSchedule: false }) // initial refresh
      .mockResolvedValueOnce({ currentlyRunning: true, hasSchedule: false }) // after generate
      .mockResolvedValueOnce({ currentlyRunning: true, hasSchedule: false }) // poll tick 1
      .mockResolvedValueOnce({ currentlyRunning: false, hasSchedule: true }); // poll tick 2 finished

    apiService.fetchPlan.mockResolvedValue({
      tasks: [
        {
          id: 2,
          name: "T2",
          start: "2026-02-26T02:00:00.000Z",
          end: "2026-02-26T03:00:00.000Z",
        },
      ],
    });

    apiService.fetchPlanData.mockResolvedValue({
      timeline: ["2026-02-26T02:00:00.000Z"],
      pricesCtPerKwh: [15],
      generationKw: [2],
      batteries: [],
      variableActions: [],
      generationByGeneratorKw: [],
      constantActions: [],
    });

    const { result } = renderHook(() =>
      usePlanData({
        compareView: false,
        selectedGeneratorId: "total",
        setSelectedGeneratorId: vi.fn(),
        onTaskClicked: vi.fn(),
      })
    );

    await act(async () => {
      await flush();
    });

    await act(async () => {
      await result.current.handleGeneratePlan();
      await flush();
    });

    await act(async () => {
      vi.advanceTimersByTime(1000);
      await flush();
    });

    await act(async () => {
      vi.advanceTimersByTime(1000);
      await flush();
    });

    expect(apiService.fetchPlan).toHaveBeenCalled();
    expect(apiService.fetchPlanData).toHaveBeenCalled();
    expect(result.current.tasks).toHaveLength(1);
  });

  it("forces selectedGeneratorId back to total if selected not found", async () => {
    apiService.fetchPlanStatus.mockResolvedValue({
      currentlyRunning: false,
      hasSchedule: true,
    });
    apiService.fetchPlan.mockResolvedValue({ tasks: [] });

    apiService.fetchPlanData.mockResolvedValue({
      timeline: [],
      pricesCtPerKwh: [],
      generationKw: [],
      batteries: [],
      variableActions: [],
      constantActions: [],
      generationByGeneratorKw: [{ id: 1, name: "G1", generationKw: [1] }],
    });

    const setSelectedGeneratorId = vi.fn();

    renderHook(() =>
      usePlanData({
        compareView: false,
        selectedGeneratorId: "999",
        setSelectedGeneratorId,
        onTaskClicked: vi.fn(),
      })
    );

    await act(async () => {
      await flush();
    });

    expect(setSelectedGeneratorId).toHaveBeenCalledWith("total");
  });

  it("initGantt triggers onTaskClicked only when not in compareView", async () => {
    apiService.fetchPlanStatus.mockResolvedValue({
      currentlyRunning: false,
      hasSchedule: true,
    });

    apiService.fetchPlan.mockResolvedValue({
      tasks: [
        {
          id: 1,
          name: "T1",
          start: "2026-02-26T00:00:00.000Z",
          end: "2026-02-26T01:00:00.000Z",
        },
      ],
    });

    apiService.fetchPlanData.mockResolvedValue({
      timeline: [],
      pricesCtPerKwh: [],
      generationKw: [],
      batteries: [],
      variableActions: [],
      generationByGeneratorKw: [],
      constantActions: [],
    });

    const onTaskClicked = vi.fn();

    const { result, rerender } = renderHook(
      ({ compareView }) =>
        usePlanData({
          compareView,
          selectedGeneratorId: "total",
          setSelectedGeneratorId: vi.fn(),
          onTaskClicked,
        }),
      { initialProps: { compareView: false } }
    );

    await act(async () => {
      await flush();
    });

    const handlers = {};
    const api = {
      on: (event, cb) => {
        handlers[event] = cb;
      },
    };

    act(() => result.current.initGantt(api));

    act(() => handlers["select-task"]({ id: 1 }));
    expect(onTaskClicked).toHaveBeenCalledTimes(1);

    rerender({ compareView: true });

    act(() => handlers["select-task"]({ id: 1 }));
    expect(onTaskClicked).toHaveBeenCalledTimes(1);
  });
});