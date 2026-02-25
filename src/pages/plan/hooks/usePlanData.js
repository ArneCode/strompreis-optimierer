import { useEffect, useMemo, useRef, useState } from "react";
import apiService from "../../../services/apiService.js";
import {
  computeGanttWindow,
  toGanttTasks,
  makePriceChartData,
  makeGeneratorChartData,
} from "../utils/planTransform.js";

export function usePlanData({
  compareView,
  selectedGeneratorId,
  setSelectedGeneratorId,
  onTaskClicked,
}) {
  const pollRef = useRef(null);
  const tasksRef = useRef([]);
  const compareViewRef = useRef(compareView);

  const [tasks, setTasks] = useState([]);
  const [planData, setPlanData] = useState({
    timeline: [],
    batteries: [],
    variableActions: [],
    generationByGeneratorKw: [],
    constantActions: [],
  });

  const [status, setStatus] = useState({
    currentlyRunning: false,
    hasSchedule: false,
  });

  const [error, setError] = useState(null);

  useEffect(() => {
    compareViewRef.current = compareView;
  }, [compareView]);

  const generatorOptions = useMemo(() => {
    return (planData.generationByGeneratorKw ?? []).map((g) => ({
      id: String(g.id),
      name: g.name ?? `Generator ${g.id}`,
    }));
  }, [planData.generationByGeneratorKw]);

  const selectedGenerationSeries = useMemo(() => {
    if (selectedGeneratorId === "total") return planData.generationKw ?? [];

    const g = (planData.generationByGeneratorKw ?? []).find(
      (x) => String(x.id) === String(selectedGeneratorId)
    );
    return g?.generationKw ?? [];
  }, [
    planData.generationKw,
    planData.generationByGeneratorKw,
    selectedGeneratorId,
  ]);

  const priceDataFromBackend = useMemo(() => {
    return makePriceChartData(planData);
  }, [planData]);

  const generatorDataFromBackend = useMemo(() => {
    return makeGeneratorChartData(planData.timeline ?? [], selectedGenerationSeries);
  }, [planData.timeline, selectedGenerationSeries]);

  const loadStatus = async () => {
    const s = await apiService.fetchPlanStatus();
    setStatus(s);
    return s;
  };

  const loadPlan = async () => {
    const plan = await apiService.fetchPlan();
    setTasks(toGanttTasks(plan.tasks));
  };

  const loadPlanData = async () => {
    const data = await apiService.fetchPlanData();
    setPlanData(data);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startPolling = () => {
    if (pollRef.current) return;

    pollRef.current = setInterval(async () => {
      try {
        const s = await loadStatus();
        if (!s.currentlyRunning && s.hasSchedule) {
          stopPolling();
          await loadPlan();
          await loadPlanData();
        }
      } catch {
        // ignore
      }
    }, 1000);
  };

  const refreshAll = async () => {
    setError(null);
    try {
      const s = await loadStatus();
      if (s.hasSchedule) {
        await loadPlan();
        await loadPlanData();
      } else {
        setTasks([]);
        setPlanData({ timeline: [], batteries: [], variableActions: [] });
      }
    } catch (e) {
      setError(e?.message ?? String(e));
    }
  };

  const handleGeneratePlan = async () => {
    setError(null);
    try {
      await apiService.generatePlan();
    } catch {
      // ignore
    }
    await loadStatus();
    startPolling();
  };

  const initGantt = (api) => {
    api.on("select-task", (task) => {
      const clicked = tasksRef.current.find(
        (t) => String(t.id) === String(task.id)
      );
      if (!clicked) return;
      if (compareViewRef.current) return;
      onTaskClicked?.(clicked);
    });
  };

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, []);

  useEffect(() => {
    if (selectedGeneratorId === "total") return;

    const exists = (planData.generationByGeneratorKw ?? []).some(
      (g) => String(g.id) === String(selectedGeneratorId)
    );
    if (!exists) setSelectedGeneratorId("total");
  }, [planData.generationByGeneratorKw, selectedGeneratorId, setSelectedGeneratorId]);

  const { ganttStart, ganttEnd } = useMemo(() => {
    return computeGanttWindow(planData, tasks);
  }, [planData, tasks]);

  return {
    tasks,
    planData,
    status,
    error,
    setError,
    refreshAll,
    handleGeneratePlan,
    initGantt,
    ganttStart,
    ganttEnd,
    generatorOptions,
    priceDataFromBackend,
    generatorDataFromBackend,
  };
}