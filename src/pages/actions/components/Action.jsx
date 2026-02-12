import "../../../styles/pages/Actions.css";

/**
 * Small card component showing action name and time range.
 */
function Action({ name, startTime, endTime }) {
    return (
        <div className="action-card">
            <p className="action-name">
                {name}
            </p>
            <p className="action-time-card">
                {startTime} Uhr - {endTime} Uhr
            </p>
        </div>
    );
}

export default Action;
