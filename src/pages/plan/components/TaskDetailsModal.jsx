import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  buildBatterySeries,
  buildVariableActionSeries,
  buildScheduledConsumerSeries,
  formatTimeTick,
  getXAxisInterval,
} from "../utils/planTransform.js";

function TaskDetailsModal({ open, onClose, selectedTask, selectedBattery, selectedVA, selectedSC, planData }) {
  if (!open) return null;

  const xAxisInterval = getXAxisInterval(planData.timeline, 120);

  return (
    <div className="data-popup" data-testid="task-modal">
      <div className="data-popup-window">
        <div className="data-popup-head">
          <p className="graph-title">{selectedTask?.name}</p>
          <button onClick={onClose} data-testid="task-modal-close">✕</button>
        </div>

        {selectedBattery && (
          <>
            <p className="graph-y-axis">Speicherladung (Wh)</p>
            <LineChart
              width={600}
              height={300}
              data={buildBatterySeries(planData, selectedBattery)}
              margin={{ bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="1 1" />
              <XAxis
                dataKey="time"
                tickFormatter={formatTimeTick}
                interval={xAxisInterval}
                minTickGap={30}
                label={{ value: "Uhrzeit", position: "insideBottom", offset: -15 }}
              />
              <YAxis />
              <Line dataKey="value" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </>
        )}

        {!selectedBattery && selectedVA && (
          <>
            <p className="graph-y-axis">Leistung (W)</p>
            <LineChart
              width={600}
              height={300}
              data={buildVariableActionSeries(planData, selectedVA)}
              margin={{ bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="1 1" />
              <XAxis
                dataKey="time"
                tickFormatter={formatTimeTick}
                interval={xAxisInterval}
                minTickGap={30}
                label={{ value: "Uhrzeit", position: "insideBottom", offset: -15 }}
              />
              <YAxis />
              <Line dataKey="value" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </>
        )}

        {!selectedBattery && !selectedVA && selectedSC && (
          <>
            <p className="graph-y-axis">Leistung (W)</p>
            <LineChart
              width={600}
              height={300}
              data={buildScheduledConsumerSeries(planData, selectedSC)}
              margin={{ bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="1 1" />
              <XAxis
                dataKey="time"
                tickFormatter={formatTimeTick}
                interval={xAxisInterval}
                minTickGap={30}
                label={{ value: "Uhrzeit", position: "insideBottom", offset: -15 }}
              />
              <YAxis />
              <Line dataKey="value" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </>
        )}

        {!selectedBattery && !selectedVA && !selectedSC && (
          <div>Für diese Aufgabe sind keine Detaildaten verfügbar.</div>
        )}
      </div>
    </div>
  );
}

export default TaskDetailsModal;