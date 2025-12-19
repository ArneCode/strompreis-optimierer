import "./Actions.css";
import "./Actions.css";

function Action({ name, startTime, endTime }) {
    return (
        <div className="action-card">
            <p className="action-name">{name}</p>
            <p className="action-time-card">{"Startzeit: " + startTime + " Uhr"}</p>
            <p className="action-time-card">{"Endzeit: " + endTime + " Uhr"}</p>
        </div>
    );
}

export default Action;
