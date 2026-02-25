import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

function PrognosesCharts({
  planData,
  generatorOptions,
  selectedGeneratorId,
  setSelectedGeneratorId,
  priceDataFromBackend,
  generatorDataFromBackend,
}) {
  return (
    <>
      <p className="charts-header">Prognosen</p>

      <div className="charts">
        {/* Strompreis */}
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
              <Line dataKey="price" name="Preis (ct/kWh)" strokeWidth={2} />
              <XAxis
                dataKey="hour"
                label={{ value: "Uhrzeit", position: "insideBottom", offset: -15 }}
                interval={3}
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

        {/* Stromerzeugung */}
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
              <Line dataKey="generation" name="Stromerzeugung (kW)" strokeWidth={2} />
              <XAxis
                dataKey="hour"
                label={{ value: "Uhrzeit", position: "insideBottom", offset: -15 }}
                interval={3}
              />
              <YAxis
                width="auto"
                label={{ value: "Stromerzeugung (kW)", position: "insideLeft", angle: -90 }}
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