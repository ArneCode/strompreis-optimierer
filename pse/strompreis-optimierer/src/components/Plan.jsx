import {Gantt, Willow} from '@svar-ui/react-gantt';
import '@svar-ui/react-gantt/all.css'
import './Plan.css';

const tasks = [
  {
    id: "1",
    name: "E-Auto",
    text: "E-Auto laden",
    start: new Date(2025, 12, 6, 12),
    end: new Date(2025, 12, 6, 18),
    type: "task",
    lazy: false,
  }, {
    id: "2",
    name: "Waschmaschine",
    text: "Waschmaschine läuft",
    start: new Date(2025, 12, 6, 11),
    end: new Date(2025, 12, 6, 14),
    type: "task",
    lazy: false,
  }, {
    id: "3",
    name: "Heizung",
    text: "Heizung läuft",
    start: new Date(2025, 12, 6, 9),
    end: new Date(2025, 12, 6, 12),
    type: "task",
    lazy: false,
  }, {
    id: "2",
    name: "Waschmaschine",
    text: "Waschmaschine läuft",
    start: new Date(2025, 12, 6, 11),
    end: new Date(2025, 12, 6, 14),
    type: "task",
    lazy: false,
  }, {
    id: "2",
    name: "Waschmaschine",
    text: "Waschmaschine läuft",
    start: new Date(2025, 12, 6, 13),
    end: new Date(2025, 12, 6, 17),
    type: "task",
    lazy: false,
  }, {
    id: "2",
    name: "Waschmaschine",
    text: "Waschmaschine läuft",
    start: new Date(2025, 12, 6, 15),
    end: new Date(2025, 12, 6, 19),
    type: "task",
    lazy: false,
  }
];

const scales = [
  { unit: "day", step: 1, format: "d" },
  { unit: "hour", step: 1, format: "h"}
];

function Plan() {
  return (
    <>
      <div className="plan-header">
        <p>Ablaufplan</p>
        <button className="plan-refresh-button">
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
              start={new Date(2025, 12, 6, 6)}
              end={new Date(2025, 12, 7, 6)}
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
          <button className="plan-compare-button">
            Vergleichen
          </button>

          <button className="plan-export-button">
            Exportieren
          </button>
        </div>
      </div>
    </>
  );
}

export default Plan;