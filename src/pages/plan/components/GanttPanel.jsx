import { Gantt, Willow } from "@svar-ui/react-gantt";
import { downloadCSV, downloadPDF } from "../exportHelper.js";

function GanttPanel({ tasks, scales, ganttStart, ganttEnd, initGantt, setError }) {
  return (
    <>
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
              init={initGantt}
              columns={[{ id: "name", label: "", value: (task) => task.name, width: 120 }]}
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
    </>
  );
}

export default GanttPanel;