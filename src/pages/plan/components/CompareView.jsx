import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Gantt, Willow } from "@svar-ui/react-gantt";

import CollapsibleSection from "./CollapsibleSection.jsx";
import {
  buildBatterySeries,
  buildVariableActionSeries,
  buildConstantActionSeries,
  buildScheduledConsumerSeries,
  formatTimeTick,
  getXAxisInterval,
} from "../utils/planTransform.js";

const getDeviceChartTitle = (device, fallbackLabel) =>
  device?.name?.trim() || `${fallbackLabel} ${device?.id ?? ""}`.trim();

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
  const xAxisInterval = getXAxisInterval(planData.timeline, 120);

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
              cellWidth={cellWidth}
              durationUnit="hour"
              readonly={true}
              init={initGantt}
              columns={[
                {
                  id: "name",
                  label: "",
                  value: (task) => task.name,
                  width: LEFT_GUTTER,
                },
              ]}
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
          <LineChart
            width={chartWidth}
            height={320}
            data={priceDataFromBackend}
            margin={{ bottom: 30, left: 0, right: 0 }}
          >
            <CartesianGrid stroke="#aaa" strokeDasharray="1 1" />
            <Line dataKey="price" name="Preis (ct/kWh)" strokeWidth={2} dot={false} isAnimationActive={false} />
            <XAxis
              dataKey="time"
              tickFormatter={formatTimeTick}
              label={{ value: "Uhrzeit", position: "insideBottom", offset: -15 }}
              interval={xAxisInterval}
              minTickGap={30}
            />
            <YAxis
              width={LEFT_GUTTER}
              label={{ value: "Preis (ct/kWh)", position: "insideLeft", angle: -90 }}
              domain={[(min) => Math.floor(min * 0.95), (max) => Math.ceil(max)]}
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
          <LineChart
            width={chartWidth}
            height={320}
            data={generatorDataFromBackend}
            margin={{ bottom: 30, right: 0, left: 0 }}
          >
            <CartesianGrid stroke="#aaa" strokeDasharray="1 1" />
            <Line
              dataKey="generation"
              name="Stromerzeugung (Wh)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <XAxis
              dataKey="time"
              tickFormatter={formatTimeTick}
              label={{ value: "Uhrzeit", position: "insideBottom", offset: -15 }}
              interval={xAxisInterval}
              minTickGap={30}
            />
            <YAxis
              width={LEFT_GUTTER}
              label={{ value: "Erzeugung (Wh)", position: "insideLeft", angle: -90 }}
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

        {(planData.batteries ?? []).map((battery) => (
          <div key={String(battery.id)} className="compare-chart" style={{ marginTop: 12 }}>
            <div style={{ width: chartWidth }}>
              <div className="compare-chart-device-title">
                {getDeviceChartTitle(battery, "Speicher")}
              </div>
              <LineChart
                width={chartWidth}
                height={320}
                data={buildBatterySeries(planData, battery)}
                margin={{ bottom: 20, left: 0, right: 0 }}
              >
                <CartesianGrid strokeDasharray="1 1" />
                <XAxis
                  dataKey="time"
                  tickFormatter={formatTimeTick}
                  interval={xAxisInterval}
                  minTickGap={30}
                  label={{ value: "Uhrzeit", position: "insideBottom", offset: -15 }}
                />
                <YAxis
                  label={{ value: "Ladezustand (Wh)", position: "insideLeft", angle: -90 }}
                  width={LEFT_GUTTER}
                />
                <Line dataKey="value" strokeWidth={2} dot={false} isAnimationActive={false}/>
              </LineChart>
            </div>
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

        {(planData.variableActions ?? []).map((variableAction) => (
          <div key={String(variableAction.id)} className="compare-chart" style={{ marginTop: 12 }}>
            <div style={{ width: chartWidth }}>
              <div className="compare-chart-device-title">
                {getDeviceChartTitle(variableAction, "Variable Aktion")}
              </div>
              <LineChart
                width={chartWidth}
                height={320}
                data={buildVariableActionSeries(planData, variableAction)}
                margin={{ bottom: 20, left: 0, right: 0 }}
              >
                <CartesianGrid strokeDasharray="1 1" />
                <XAxis
                  dataKey="time"
                  tickFormatter={formatTimeTick}
                  interval={xAxisInterval}
                  minTickGap={30}
                  label={{ value: "Uhrzeit", position: "insideBottom", offset: -15 }}
                />
                <YAxis
                  label={{ value: "Leistung (W)", position: "insideLeft", angle: -90 }}
                  width={LEFT_GUTTER}
                />
                <Line dataKey="value" strokeWidth={2} dot={false} isAnimationActive={false}/>
              </LineChart>
            </div>
          </div>
        ))}
      </CollapsibleSection>

      <CollapsibleSection
        id="scheduledConsumers"
        title="Geplante Verbraucher (alle)"
        collapsed={collapsed.scheduledConsumers}
        onToggle={toggleCollapsed}
      >
        {(planData.scheduledConsumers ?? []).length === 0 && (
          <div>Keine geplanten Verbraucher vorhanden.</div>
        )}

        {(planData.scheduledConsumers ?? []).map((scheduledConsumer) => (
          <div
            key={String(scheduledConsumer.id)}
            className="compare-chart"
            style={{ marginTop: 12 }}
          >
            <div style={{ width: chartWidth }}>
              <div className="compare-chart-device-title">
                {getDeviceChartTitle(scheduledConsumer, "Geplanter Verbraucher")}
              </div>
              <LineChart
                width={chartWidth}
                height={320}
                data={buildScheduledConsumerSeries(planData, scheduledConsumer)}
                margin={{ bottom: 20, left: 0, right: 0 }}
              >
                <CartesianGrid strokeDasharray="1 1" />
                <XAxis
                  dataKey="time"
                  tickFormatter={formatTimeTick}
                  interval={xAxisInterval}
                  minTickGap={30}
                  label={{ value: "Uhrzeit", position: "insideBottom", offset: -15 }}
                />
                <YAxis
                  label={{ value: "Leistung (W)", position: "insideLeft", angle: -90 }}
                  width={LEFT_GUTTER}
                />
                <Line dataKey="value" strokeWidth={2} dot={false} isAnimationActive={false}/>
              </LineChart>
            </div>
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

        {(planData.constantActions ?? []).map((constantAction) => (
          <div key={String(constantAction.id)} className="compare-chart" style={{ marginTop: 12 }}>
            <div style={{ width: chartWidth }}>
              <div className="compare-chart-device-title">
                {getDeviceChartTitle(constantAction, "Konstante Aktion")}
              </div>
              <LineChart
                width={chartWidth}
                height={320}
                data={buildConstantActionSeries(planData, constantAction)}
                margin={{ bottom: 20, left: 0, right: 0 }}
              >
                <CartesianGrid strokeDasharray="1 1" />
                <XAxis
                  dataKey="time"
                  tickFormatter={formatTimeTick}
                  interval={xAxisInterval}
                  minTickGap={30}
                  label={{ value: "Uhrzeit", position: "insideBottom", offset: -15 }}
                />
                <YAxis
                  label={{ value: "Leistung (W)", position: "insideLeft", angle: -90 }}
                  width={LEFT_GUTTER}
                />
                <Line dataKey="value" strokeWidth={2} dot={false} isAnimationActive={false}/>
              </LineChart>
            </div>
          </div>
        ))}
      </CollapsibleSection>
    </div>
  );
}

export default CompareView;
