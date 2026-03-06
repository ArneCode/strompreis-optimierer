import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { formatTimeTick, getXAxisInterval } from "../utils/planTransform.js";

function PrognosesCharts({
  planData,
  generatorOptions,
  selectedGeneratorId,
  setSelectedGeneratorId,
  priceDataFromBackend,
  generatorDataFromBackend,
}) {
  const xAxisInterval = getXAxisInterval(planData.timeline, 120);

  return (
    <>
      <p className="charts-header">Prognosen</p>

      <div className="charts">
        <div className="chart">
          <p>Strompreis</p>
          <div className="diagram">
            <LineChart
              style={{ width: "100%", aspectRatio: 1.5, maxWidth: 700 }}
              data={priceDataFromBackend}
              responsive
              margin={{ bottom: 30 }}
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
                width="auto"
                label={{ value: "Preis (ct/kWh)", position: "insideLeft", angle: -90 }}
                domain={[
                  (min) => Math.floor(min * 0.95),
                  (max) => Math.ceil(max),
                ]}
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
              style={{ width: "100%", aspectRatio: 1.5, maxWidth: 700 }}
              data={generatorDataFromBackend}
              responsive
              margin={{ bottom: 30 }}
            >
              <CartesianGrid stroke="#aaa" strokeDasharray="1 1" />
              <Line dataKey="generation" name="Stromerzeugung (Wh)" strokeWidth={2} dot={false} isAnimationActive={false} />
              <XAxis
                dataKey="time"
                tickFormatter={formatTimeTick}
                label={{ value: "Uhrzeit", position: "insideBottom", offset: -15 }}
                interval={xAxisInterval}
                minTickGap={30}
              />
              <YAxis
                width="auto"
                label={{ value: "Stromerzeugung (Wh)", position: "insideLeft", angle: -90 }}
                domain={[0, (max) => Math.ceil(max * 1.1)]}
              />
            </LineChart>
          </div>
        </div>
      </div>
    </>
  );
}

export default PrognosesCharts;