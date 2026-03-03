import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Gantt, Willow } from "@svar-ui/react-gantt";

import CollapsibleSection from "./CollapsibleSection.jsx";
import {
  buildBatterySeries,
  buildVariableActionSeries,
  buildConstantActionSeries,
} from "../utils/planTransform.js";

function CompareView({
  tasks,
  planData,
  scales,
  ganttStart,
  ganttEnd,
  initGantt,
  collapsed,
  toggleCollapsed,
  generatorOptions,
  selectedGeneratorId,
  setSelectedGeneratorId,
  priceDataFromBackend,
  generatorDataFromBackend,
}) {

    const LEFT_GUTTER = 120; 
  const TIMELINE_WIDTH = 1000; 

  const startMs = new Date(ganttStart).getTime();
  const endMs = new Date(ganttEnd).getTime();
  const hours = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60)));

  const cellWidth = TIMELINE_WIDTH / hours; 
  const chartWidth = LEFT_GUTTER + TIMELINE_WIDTH; 

  return (
    <div className="compare-view">
      <CollapsibleSection
        id="gantt"
        title="Ablaufplan (Gantt)"
        collapsed={collapsed.gantt}
        onToggle={toggleCollapsed}
      >
        <div className="compare-chart-gantt">
          <Willow>
            <Gantt
              tasks={tasks}
              scales={scales}
              autoScale={false}
              start={ganttStart}
              end={ganttEnd}
              cellHeight={65}
              /*cellWidth={41}*/
              cellWidth={cellWidth}
              durationUnit="hour"
              readonly={true}
              init={initGantt}
              /*columns={[{ id: "name", label: "", value: (task) => task.name, width: 120 }]}*/
              columns={[{ id: "name", label: "", value: (task) => task.name, width: LEFT_GUTTER }]}
            />
          </Willow>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        id="price"
        title="Strompreis"
        collapsed={collapsed.price}
        onToggle={toggleCollapsed}
      >
        <div className="compare-chart">
          {/*<LineChart width={1000} height={320} data={priceDataFromBackend} margin={{ bottom: 30 }}>*/}
          <LineChart width={chartWidth} height={320} data={priceDataFromBackend} margin={{ bottom: 30, left: 0, right: 0}}>
            <CartesianGrid stroke="#aaa" strokeDasharray="1 1" />
            <Line dataKey="price" name="Preis (ct/kWh)" strokeWidth={2} dot={false} />
            <XAxis
              dataKey="hour"
              label={{ value: "Uhrzeit", position: "insideBottom", offset: -15 }}
              interval={1}
            />
            <YAxis
              /*width="auto"*/
              width={LEFT_GUTTER}
              label={{ value: "Preis (ct/kWh)", position: "insideLeft", angle: -90 }}
              domain={[
                (min) => Math.floor(min * 0.95),
                (max) => Math.ceil(max),
              ]}
            />
          </LineChart>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        id="generation"
        title={
          selectedGeneratorId === "total"
            ? "Gesamte Stromerzeugung"
            : `Stromerzeugung ${
                generatorOptions.find((g) => g.id === selectedGeneratorId)?.name ?? "Generator"
              }`
        }
        collapsed={collapsed.generation}
        onToggle={toggleCollapsed}
        right={
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
        }
      >
        <div className="compare-chart">
          <LineChart width={chartWidth} height={320} data={generatorDataFromBackend} margin={{ bottom: 30, right: 0, left: 0}}>
            <CartesianGrid stroke="#aaa" strokeDasharray="1 1" />
            <Line dataKey="generation" name="Stromerzeugung (kW)" strokeWidth={2} dot={false} />
            <XAxis
              dataKey="hour"
              label={{ value: "Uhrzeit", position: "insideBottom", offset: -15 }}
              interval={1}
            />
            <YAxis
              width={LEFT_GUTTER}
              label={{ value: "Erzeugung (kW)", position: "insideLeft", angle: -90 }}
              domain={[0, (max) => Math.ceil(max * 1.1)]}
            />
          </LineChart>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        id="batteries"
        title="Speicher (alle)"
        collapsed={collapsed.batteries}
        onToggle={toggleCollapsed}
      >
        {(planData.batteries ?? []).length === 0 && <div>Keine Speicher vorhanden.</div>}

        {(planData.batteries ?? []).map((b) => (
          <div key={String(b.id)} className="compare-chart" style={{ marginTop: 12 }}>
            <LineChart
              width={chartWidth}
              height={320}
              data={buildBatterySeries(planData, b)}
              margin={{ bottom: 20 , left: 0, right: 0}}
            >
              <CartesianGrid strokeDasharray="1 1" />
              <XAxis
                dataKey="time"
                tickFormatter={(iso) => {
                  const d = new Date(iso);
                  return String(d.getHours()).padStart(2, "0") + ":00";
                }}
                interval={1}
                label={{ value: "Uhrzeit", position: "insideBottom", offset: -15 }}
              />
              <YAxis label={{ value: "Ladezustand (kWh)", position: "insideLeft", angle: -90 }} width={LEFT_GUTTER} />
              <Line dataKey="value" strokeWidth={2} dot={false} />
            </LineChart>
          </div>
        ))}
      </CollapsibleSection>

      <CollapsibleSection
        id="variableActions"
        title="Variable Aktionen (alle)"
        collapsed={collapsed.variableActions}
        onToggle={toggleCollapsed}
      >
        {(planData.variableActions ?? []).length === 0 && (
          <div>Keine variablen Aktionen vorhanden.</div>
        )}

        {(planData.variableActions ?? []).map((va) => (
          <div key={String(va.id)} className="compare-chart" style={{ marginTop: 12 }}>
            <LineChart
              width={chartWidth}
              height={320}
              data={buildVariableActionSeries(planData, va)}
              margin={{ bottom: 20 , left: 0, right: 0}}
            >
              <CartesianGrid strokeDasharray="1 1" />
              <XAxis
                dataKey="time"
                tickFormatter={(iso) => {
                  const d = new Date(iso);
                  return String(d.getHours()).padStart(2, "0") + ":00";
                }}
                interval={1}
                label={{ value: "Uhrzeit", position: "insideBottom", offset: -15 }}
              />
              <YAxis label={{ value: "Leistung (W)", position: "insideLeft", angle: -90 }} width={LEFT_GUTTER}/>
              <Line dataKey="value" strokeWidth={2} dot={false} />
            </LineChart>
          </div>
        ))}
      </CollapsibleSection>

      <CollapsibleSection
        id="constantActions"
        title="Konstante Aktionen (alle)"
        collapsed={collapsed.constantActions}
        onToggle={toggleCollapsed}
      >
        {(planData.constantActions ?? []).length === 0 && (
          <div>Keine konstanten Aktionen vorhanden.</div>
        )}

        {(planData.constantActions ?? []).map((ca) => (
          <div key={String(ca.id)} className="compare-chart" style={{ marginTop: 12 }}>
            <LineChart
              width={chartWidth}
              height={320}
              data={buildConstantActionSeries(planData, ca)}
              margin={{ bottom: 20, left: 0, right: 0 }}
            >
              <CartesianGrid strokeDasharray="1 1" />
              <XAxis
                dataKey="time"
                tickFormatter={(iso) => {
                  const d = new Date(iso);
                  return String(d.getHours()).padStart(2, "0") + ":00";
                }}
                interval={1}
                label={{ value: "Uhrzeit", position: "insideBottom", offset: -15 }}
              />
              <YAxis label={{ value: "Leistung (W)", position: "insideLeft", angle: -90 }} width={LEFT_GUTTER} />
              <Line dataKey="value" strokeWidth={2} dot={false} />
            </LineChart>
          </div>
        ))}
      </CollapsibleSection>
    </div>
  );
}

export default CompareView;