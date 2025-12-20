import "./Actions.css";
import "./Actions.css";

function Action({ name, startTime, endTime }) {
    return (
        <div className="action-card">
            <p className="action-name">{name}</p>
            {/* 
                <p className="action-time-card">{"Start-Zeitpunkt: " + startTime + " Uhr"}</p>
                <p className="action-time-card">{"End-Zeitpunkt: " + endTime + " Uhr"}</p>
            */}
            <p className="action-time-card">{startTime} Uhr - {endTime} Uhr</p>
        </div>
    );
}

export default Action;
