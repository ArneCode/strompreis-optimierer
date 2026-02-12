import {Gantt, Willow} from '@svar-ui/react-gantt';
import {downloadCSV, downloadPDF} from "./exportHelper.js";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import {useState, useEffect, useRef, useMemo} from 'react';
import '@svar-ui/react-gantt/all.css'
import '../../styles/pages/Plan.css';
import apiService from "../../services/apiService.js";

function PlanPage() {
  const pollRef = useRef(null);
  
  const scales = [
    { unit: "day", step: 1, format: "d" },
    { unit: "hour", step: 1, format: "h"}
  ];
  const priceTicks = Array.from({length: 12}, (_,i) => 20 + i * 1);
  const generationTicks = [0, 1, 2, 3, 4, 5];
  
  const [tasks, setTasks] = useState ([]);
  const [planData, setPlanData] = useState({
    timeline: [],
    batteries: [],
    variableActions: [],
  });
  const [status, setStatus] = useState({
    currentlyRunning: false,
    hasSchedule: false,
  });
  const [error, setError] = useState(null);
  
  const [priceData, setPriceData] = useState([
    { hour: '00:00', price: 22.4 },
    { hour: '01:00', price: 21.9 },
    { hour: '02:00', price: 21.5 },
    { hour: '03:00', price: 21.2 },
    { hour: '04:00', price: 21.0 },
    { hour: '05:00', price: 21.6 },
    { hour: '06:00', price: 23.1 },
    { hour: '07:00', price: 25.4 },
    { hour: '08:00', price: 26.8 },
    { hour: '09:00', price: 26.1 },
    { hour: '10:00', price: 25.0 },
    { hour: '11:00', price: 24.3 },
    { hour: '12:00', price: 23.9 },
    { hour: '13:00', price: 23.5 },
    { hour: '14:00', price: 23.8 },
    { hour: '15:00', price: 24.6 },
    { hour: '16:00', price: 25.9 },
    { hour: '17:00', price: 27.4 },
    { hour: '18:00', price: 28.6 },
    { hour: '19:00', price: 29.1 },
    { hour: '20:00', price: 28.3 },
    { hour: '21:00', price: 26.9 },
    { hour: '22:00', price: 25.1 },
    { hour: '23:00', price: 23.6 },
  ]);
  
  const [pvData, setPvData] = useState([
    { hour: '00:00', generation: 0 },
    { hour: '01:00', generation: 0 },
    { hour: '02:00', generation: 0 },
    { hour: '03:00', generation: 0 },
    { hour: '04:00', generation: 0 },
    { hour: '05:00', generation: 0 },
    { hour: '06:00', generation: 0.5 },
    { hour: '07:00', generation: 1.2 },
    { hour: '08:00', generation: 2.1 },
    { hour: '09:00', generation: 3.0 },
    { hour: '10:00', generation: 3.8 },
    { hour: '11:00', generation: 4.2 },
    { hour: '12:00', generation: 4.5 },
    { hour: '13:00', generation: 4.4 },
    { hour: '14:00', generation: 4.0 },
    { hour: '15:00', generation: 3.5 },
    { hour: '16:00', generation: 2.8 },
    { hour: '17:00', generation: 2.0 },
    { hour: '18:00', generation: 1.0 },
    { hour: '19:00', generation: 0.3 },
    { hour: '20:00', generation: 0 },
    { hour: '21:00', generation: 0 },
    { hour: '22:00', generation: 0 },
    { hour: '23:00', generation: 0 },
  ]);

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
      } catch (e) {
        // a
      }
    }, 1000);
  }

  const toGanttTasks = (apiTasks) =>
    (apiTasks ?? []).map((t) => ({
      ...t,
      start: new Date(t.start),
      end: new Date(t.end),
      type: "task",
      lazy: false,
    }));

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
    } catch (e) {
      // ignore
    }

    await loadStatus();
    startPolling();
  };

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
    

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, []);

  return (
    <>
      <div className="plan-header">
        <p>Ablaufplan</p>
        {!status.hasSchedule && !status.currentlyRunning && (
          <div>Noch kein Plan vorhanden. Klicke "Plan generieren".</div>
        )}

        {status.currentlyRunning && (
          <div>Optimierung läuft... bitte warten.</div>
        )}

        {error && <div className="error">{error}</div>}
        <button
            className="plan-refresh-button"
            onClick={refreshAll}
            disabled={status.currentlyRunning}
        >
          {isOptimizing ? "Optimierung läuft..." : "Aktualisieren"}
          <img src="./src/assets/images/refresh.png" />
        </button>
        <button
          onClick={handleGeneratePlan}
          disabled={status.currentlyRunning}
        >
          {status.currentlyRunning ? "Plan wird generiert..." : "Plan generieren"}
        </button>
      </div>
      <div className="plan">
        <div className="plan-chart">
          <Willow>
            <Gantt 
              tasks={tasks} 
              scales={scales} 
              autoScale={false}
              start={ganttStart}
              end={ganttEnd}
              cellHeight={65}
              cellWidth={45}
              durationUnit="hour"
              readonly={true}
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
            <button className="plan-export-button" onClick={() => downloadCSV(tasks)}>
                Exportieren als CSV
            </button>

            <button className="plan-export-button" onClick={() => downloadPDF(tasks)}>
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
              data={priceData}
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
                ticks={priceTicks}
              />
            </LineChart>
          </div>
        </div>
        
        <div className="chart">
          <p>Gesamte Stromerzeugung</p>
          <div className="diagram">
            <LineChart 
              style={{ width: '100%', aspectRatio: 1.5, maxWidth: 700}} 
              data={pvData}
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
                ticks={generationTicks}
              />
            </LineChart>
          </div>
        </div>
      </div>
    </>
  );
}

export default PlanPage;