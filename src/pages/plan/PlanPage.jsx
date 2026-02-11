import {Gantt, Willow} from '@svar-ui/react-gantt';
import {downloadCSV, downloadPDF} from "./exportHelper.js";
import { CartesianGrid, Line, LineChart, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import {useState, useEffect, useMemo, useRef} from 'react';
import '@svar-ui/react-gantt/all.css'
import '../../styles/pages/Plan.css';
import apiService from '../../services/apiService.js';



function PlanPage() {
  const [openDataWindow, setOpenDataWindow] = useState(false);
  const [api, setApi] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const batteriesRef = useRef([]);
  const timelineRef = useRef([]);
  const tasksRef = useRef([]);

  const [tasks, setTasks] = useState ([]);
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
  const [timeline, setTimeline] = useState([]);
  const [batteries, setBatteries] = useState([]);
  const [variableActions, setVariableActions] = useState([]);
  const [error, setError] = useState("");
  
  const { ganttStart, ganttEnd } = useMemo(() => {
    if (tasks.length) {
      const minMs = Math.min(...tasks.map(t => t.start.getTime()));
      const maxMs = Math.max(...tasks.map(t => t.end.getTime()));
      return {
        ganttStart: new Date(minMs),
        ganttEnd: new Date(maxMs)
      };
    }
  
    //Fallback
    const fallbackStart = new Date("2026-01-01T00:00:00Z");
    const fallbackEnd = new Date("2026-01-01T06:00:00Z");
    return {
      ganttStart: fallbackStart,
      ganttEnd: fallbackEnd
    }
  }, [tasks]);
  
  const scales = [
    { unit: "day", step: 1, format: "d" },
    { unit: "hour", step: 1, format: "h"}
  ];
  const priceTicks = Array.from({length: 12}, (_,i) => 20 + i * 1);
  const generationTicks = [0, 1, 2, 3, 4, 5];

  
  useEffect(() => {
    tasksRef.current = tasks; 
  }, [tasks]);
  
  useEffect(() => {
    batteriesRef.current = batteries;
  }, [batteries]);
  
  useEffect(() => {
    timelineRef.current = timeline;
  }, [timeline]);
  
  function handleUpdate() {
    loadPlan();
  }
  
  function handleInit(apiInstance) {
    setApi(apiInstance);
    
    apiInstance.on("select-task", (ev) => {
      const sel = Array.isArray(ev) ? ev[0] : ev;
      const selectedId = sel?.id;
      
      if (selectedId == null) return;
      
      const task = tasksRef.current.find(t => String(t.id) === String(selectedId));
      if (!task) return;
      
      const battery = batteriesRef.current.find(b => b.name === task.name);
      if (!battery) return;
      
      if (battery) {
        setSelectedTask(task);
        setOpenDataWindow(true);
      }
    });
  }
  
  
  
  function mapTasks(rawTasks) {
    return rawTasks.map((t) => ({
      ...t,
      start: new Date(t.start),
      end: new Date(t.end),
      type: "task",
      lazy: false,
    }));
  }
  
  async function loadPlan() {
    setError("");
    try {
      const plan = await apiService.fetchPlan();
      setTasks(mapTasks(plan.tasks || []));
      
      const data = await apiService.fetchPlanData();
      setTimeline(data.timeline || []);
      setBatteries(data.batteries || []);
      setVariableActions(data.variableActions || []);
    } catch (e) {
      setError(e.message || "Error loading the plan");
    }
  }
  
  useEffect(() => {
    loadPlan();
  }, []);
  
  
  const selectedBattery = useMemo(() => {
    if (!selectedTask) return null;

    return batteries.find(b => b.name === selectedTask.name) || null;
  }, [selectedTask, batteries]);

  const batteryChartData = useMemo(() => {
    if (!selectedBattery || !timeline.length) return [];

    return timeline.map((t, i) => ({
      time: t,
      socWh: selectedBattery.socWh?.[i] ?? null,
    }))
  });

  const socTicks = useMemo(() => {
    if (!selectedBattery?.socWh?.length) return undefined;
    
    const vals = selectedBattery.socWh.filter((v) => typeof v === "number");
    if (!vals.length) return undefined;

    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const steps = 5;
    const step = (max - min) / steps || 1;

    return Array.from({ length: steps + 1 }, (_, i) => Math.round(min + i * step)); 
  }, [selectedBattery]);

  return (
    <>
      {openDataWindow && 
        <div className="data-popup">
          <div className="data-popup-window">
            <div className="data-popup-head">
              <p>
                {selectedBattery ? `Batterie: ${selectedBattery.name}` : "Batterie-Daten"}
              </p>
              <button onClick={() => setOpenDataWindow(false)}>
                ✕
              </button>
            </div>
            {!selectedBattery ? (
          <p>Keine Battery-Daten gefunden.</p>
            ) : batteryChartData.length === 0 ? (
              <p>Keine Timeline/SoC-Daten verfügbar.</p>
            ) : (
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={batteryChartData} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
                    <CartesianGrid stroke="#aaa" strokeDasharray="1 1" />
                    <Line dataKey="socWh" name="SoC (Wh)" strokeWidth={2} dot={false} />
                    <XAxis
                      dataKey="time"
                      tickFormatter={(iso) =>
                        new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
                      }
                      interval={3}
                      label={{ value: "Uhrzeit", position: "insideBottom", offset: -15 }}
                    />
                    <YAxis
                      label={{ value: "SoC (Wh)", position: "Left", angle: -90 }}
                      domain={["auto", "auto"]}
                      ticks={socTicks}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      }

      <div className="plan-header">
        <p>Ablaufplan</p>
        <button
            className="plan-refresh-button"
            onClick={handleUpdate}
        >
          Aktualisieren
          <img src="./src/assets/refresh.png" />
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
              init={handleInit}
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