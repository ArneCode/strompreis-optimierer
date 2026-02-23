/** Plan Page
 * Displays the optimized schedule (Gantt) and related plan data (charts).
 */
import {useState, useEffect, useRef, useMemo} from 'react';
import {Gantt, Willow} from '@svar-ui/react-gantt';
import '@svar-ui/react-gantt/all.css'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

import apiService from "../../services/apiService.js";
import {downloadCSV, downloadPDF} from "./exportHelper.js";
import '../../styles/pages/Plan.css';

/** Gantt scale configuration (day + hour) */
const SCALES = [
    { unit: "day", step: 1, format: "d" },
    { unit: "hour", step: 1, format: "h"}
];

function PlanPage() {
  const pollRef = useRef(null);
  const tasksRef = useRef([]);

  const [tasks, setTasks] = useState ([]);
  const [planData, setPlanData] = useState({
    timeline: [],
    batteries: [],
    variableActions: [],
    generationByGeneratorKw: [],
  });
  const [status, setStatus] = useState({
    currentlyRunning: false,
    hasSchedule: false,
  });
  const [error, setError] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // 'total' for total prognoses. Else generator id.
  const [selectedGeneratorId, setSelectedGeneratorId] = useState("total");

  /** Map variable actions to their id for fast lookup of detail data */
  const variableActionById = useMemo(() => {
    const m = new Map();
    for (const va of planData.variableActions ?? []) {
      m.set(String(va.id), va);
    }
    return m;
  }, [planData.variableActions]);
  
  /** Map batteries to their id for fast lookup of detail data */
  const batteryById = useMemo(() => {
    const m = new Map();
    for (const b of planData.batteries ?? []) {
      m.set(String(b.id), b);
    }
    return m;
  }, [planData.batteries]);

  const generatorOptions = useMemo(() => {
    return (planData.generationByGeneratorKw ?? []).map((g) => ({
      id: String(g.id),
      name: g.name ?? `Generator ${g.id}`,
    }));
  }, [planData.generationByGeneratorKw]);

  /** Transform backend timeline/prices to chart-friendly format */
  const priceDataFromBackend = (planData.timeline ?? []).map((iso, i) => {
    const d = new Date(iso);

    return {
      hour: String(d.getHours()).padStart(2, "0") + ":00",
      price: planData.pricesCtPerKwh?.[i] ?? null,
    };
  });
  const selectedGenerationSeries = useMemo(() => {
    // total
    if (selectedGeneratorId === "total") {
      return planData.generationKw ?? [];
    }

    // single generator
    const g = (planData.generationByGeneratorKw ?? []).find(
      (x) => String(x.id) === String(selectedGeneratorId)
    );

    return g?.generationKw ?? [];
  }, [planData.generationKw, planData.generationByGeneratorKw, selectedGeneratorId]);

  /** Transform backend timeline/generation to chart-friendly format */
  const generatorDataFromBackend = (planData.timeline ?? []).map((iso, i) => {
    const d = new Date(iso);
    return {
      hour: String(d.getHours()).padStart(2, "0") + ":00",
      generation: selectedGenerationSeries?.[i] ?? 0,
    };
  });

  /** Open details modal for the clicked task */
  const openTaskModal = (task) => {
    setSelectedTask(task);
    setModalOpen(true);
  };
  /** Close details modal and clear selection */
  const closeTaskModal = () => {
    setModalOpen(false);
    setSelectedTask(null);
  };
  /** Trigger optimization in backend. Then load status and start polling until finished. */
  const handleGeneratePlan = async () => {
    setError(null);
    try {
      await apiService.generatePlan();
    } catch (e) {
      // ignore
    }

    await loadStatus();
    startPolling();
  };
  /** Refresh everything once (status + plan + plan-data).
   *  If no schedule exists, clears displayed data.
   */
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

  /**
   * Load optimization status from backend (/plan/status).
   * @returns Promise of {currentlyRunning: boolean, hasSchedule: boolean}
   */
  const loadStatus = async () => {
    const s = await apiService.fetchPlanStatus();
    setStatus(s);
    
    return s;
  };
  /** Load Gantt tasks from backend (/plan) and convert time strings to Date objects. */
  const loadPlan = async () => {
    const plan = await apiService.fetchPlan();
    setTasks(toGanttTasks(plan.tasks));
  };
  /** Load additional plan data from backend (/plan/data). */
  const loadPlanData = async () => {
    const data = await apiService.fetchPlanData();
    setPlanData(data);
  };

  /** Stops polling optimization status */
  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };
  /** Poll optimization status every second. When finished + schedule available,
   *  stop polling and refresh plan/plan-data.
   */
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
      } catch (e) {
        // Ignore
      }
    }, 1000);
  };

  /** Determine displayed time window for the Gantt chart. */
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


  /**
   * Build chart series for battery SOC (timeline aligned).
   * @param {object} battery Battery object from backend.
   * @returns {Array<{time: string, value: number | null}>}
   */
  const buildBatterySeries = (battery) => {
    const t = planData.timeline ?? [];
    const y = battery?.socWh ?? [];
    return t.map((iso, i) => ({
      time: iso,
      value: y[i] ?? null,
    }));
  };
  /**
   * Build chart series for variable action power.
   * @param {object} va Variable action object from backend.
   * @returns {Array<{time: string, value: number}>}
   */
  const buildVariableActionSeries = (va) => {
    if (!va) return [];
    const start = new Date(va.start);
    const stepMs = (va.stepMinutes ?? 30) * 60 * 1000;

    return (va.powerW ?? []).map((p, i) => ({
      time: new Date(start.getTime() + i * stepMs).toISOString(),
      value: p,
    }));
  };
  /**
   * Hook into Gantt events. On task select, open modal with detail data.
   * @param {object} api Svar Gantt API instance.
   */
  const initGantt = (api) => {
    api.on("select-task", (task) => {
      const clicked = tasksRef.current.find((t) => String(t.id) === String(task.id));
      if (clicked) {
        openTaskModal(clicked);
      }
    });
  };
  /**
   * Convert backend tasks to Gantt tasks.
   * @param {Array} apiTasks tasks from backend.
   */
  const toGanttTasks = (apiTasks) =>
    (apiTasks ?? []).map((t) => ({
      ...t,
      start: new Date(t.start),
      end: new Date(t.end),
      type: "task",
      lazy: false,
    }));
  
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);  
  useEffect(() => {
    refreshAll();
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
  }, [planData.generationByGeneratorKw, selectedGeneratorId]);

  const selectedId = selectedTask ? String(selectedTask.id) : null;
  const selectedBattery = selectedId ? batteryById.get(selectedId) : null;
  const selectedVA = selectedId ? variableActionById.get(selectedId) : null;

  return (
    <>
      {modalOpen && (
        <div className="data-popup">
          <div className="data-popup-window">
            <div className="data-popup-head">
              <p className="graph-title">{selectedTask?.name}</p>
              <button onClick={closeTaskModal}>✕</button>
            </div>
            {selectedBattery && (
              <>
                <p className="graph-y-axis">Speicherladung (Wh)</p>
                <LineChart width={600} height={300} data={buildBatterySeries(selectedBattery)} margin={{ bottom: 20 }}>
                  <CartesianGrid strokeDasharray="1 1" />
                  <XAxis
                    dataKey="time"
                    tickFormatter={(iso) => {
                      const d = new Date(iso);
                      return String(d.getHours()).padStart(2, "0") + ":00";
                    }}
                    label={{value: "Uhrzeit", position: "insideBottom", offset: -15}}
                  />
                  <YAxis />
                  <Line dataKey="value" strokeWidth={2} dot={false} />
                </LineChart>
              </>
            )}

            {!selectedBattery && selectedVA && (
              <>
                <p className="graph-y-axis">Leistung (W)</p>
                <LineChart width={600} height={300} data={buildVariableActionSeries(selectedVA)} margin={{ bottom: 20 }}>
                  <CartesianGrid strokeDasharray="1 1" />
                  <XAxis
                    dataKey="time"
                    tickFormatter={(iso) => {
                      const d = new Date(iso);
                      return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
                    }}
                    label={{value: "Uhrzeit", position: "insideBottom", offset: -15}}
                  />
                  <YAxis />
                  <Line dataKey="value" strokeWidth={2} dot={false} />
                </LineChart>
              </>
            )}

            {!selectedBattery && !selectedVA && (
              <div>Für diese Aufgabe sind keine Detaildaten verfügbar.</div>
            )}
                </div>
              </div>
            )}

      <div className="plan-header">
        <p>Ablaufplan</p>
        
        <div className="plan-header-info">
          <button
            className={status.currentlyRunning ? "generate-plan-button-running" : "generate-plan-button"}
            onClick={handleGeneratePlan}
            disabled={status.currentlyRunning}
          >
            {status.currentlyRunning ? "Plan wird generiert..." : "Plan generieren"}
          </button>

          <button
              className={status.currentlyRunning ? "plan-refresh-button-running" : "plan-refresh-button"}
              onClick={refreshAll}
              disabled={status.currentlyRunning}
          >
            Aktualisieren
            <img src="./src/assets/images/refresh.png" />
          </button>

          {!status.hasSchedule && !status.currentlyRunning && (
            <div>Noch kein Plan vorhanden. Klicke "Plan generieren".</div>
          )}

          {status.currentlyRunning && (
            <div>Optimierung läuft... bitte warten.</div>
          )}

          {error && <div className="error">{error}</div>}
        </div>

      </div>
      <div className="plan">
        <div className="plan-chart">
          <Willow>
            <Gantt 
              tasks={tasks} 
              scales={SCALES} 
              autoScale={false}
              start={ganttStart}
              end={ganttEnd}
              cellHeight={65}
              cellWidth={45}
              durationUnit="hour"
              readonly={true}
              init={initGantt}
              columns={[
                {
                  id: "name",
                  label: "",
                  value: (task) => task.name,
                  width: 120
                }
              ]}
            />
          </Willow>
        </div>
        <div className="plan-options">
            <button
                className="plan-export-button"
                onClick={() => downloadCSV(tasks, "ablaufplan.csv", setError)}
            >
                Exportieren als CSV
            </button>

            <button
                className="plan-export-button"
                onClick={() => downloadPDF(tasks, "ablaufplan.pdf", setError)}
            >
                Exportieren als PDF
            </button>
        </div>
      </div>
      <p className="charts-header">Prognosen</p>
      <div className="charts">
        <div className="chart">
          <p>Strompreis</p>
          <div className="diagram">
            <LineChart 
              style={{ width: '100%', aspectRatio: 1.5, maxWidth: 700}} 
              data={priceDataFromBackend}
              responsive
              margin={{bottom: 30}}
            >
              <CartesianGrid stroke="#aaa" strokeDasharray="1 1" />
              <Line dataKey="price" name="Preis (ct/kWh)" strokeWidth={2} />
              <XAxis dataKey="hour" label={{value: 'Uhrzeit', position: 'insideBottom', offset: -15}} interval={3}/>
              <YAxis width="auto" label={{value: 'Preis (ct/kWh)', position: 'insideLeft', angle: -90}} 
                domain={[
                  (min) => Math.floor(min * 0.95),
                  (max) => Math.ceil(max),
                ]}
                /*ticks={priceTicks}*/
              />
            </LineChart>
          </div>
        </div>
        
        <div className="chart">
          <div>
            <p>
              {selectedGeneratorId === "total" 
                ? "Gesamte Stromerzeugung" 
                : `Stromerzeugung ${
                  generatorOptions.find((g) => g.id === selectedGeneratorId)?.name ?? "Generator"
                }`}
            </p>

            <select
              value={selectedGeneratorId}
              onChange={(e) => setSelectedGeneratorId(e.target.value)}
              className="generator-select"
            >
              <option value="total">Gesamt</option>
              {generatorOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div className="diagram">
            <LineChart 
              style={{ width: '100%', aspectRatio: 1.5, maxWidth: 700}} 
              data={generatorDataFromBackend}
              responsive
              margin={{bottom: 30}}
            >
              <CartesianGrid stroke="#aaa" strokeDasharray="1 1" />
              <Line dataKey="generation" name="Stromerzeugung (kW)" strokeWidth={2} />
              <XAxis dataKey="hour" label={{value: 'Uhrzeit', position: 'insideBottom', offset: -15}} interval={3}/>
              <YAxis width="auto" label={{value: 'Stromerzeugung (kW)', position: 'insideLeft', angle: -90}} 
                domain={[
                  0,
                  (max) => Math.ceil(max * 1.1)
                ]}
                /*ticks={generationTicks}*/
              />
            </LineChart>
          </div>
        </div>
      </div>
    </>
  );
}

export default PlanPage;