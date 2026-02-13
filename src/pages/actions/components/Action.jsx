import "../../../styles/pages/Actions.css";

/**
 * Action card component - displays action name and time range.
 * @param {object} props
 * @param {string} props.name - Action display name (usually device name)
 * @param {string} props.startTime - Start time in HH:MM format (e.g., "14:30")
 * @param {string} props.endTime - End time in HH:MM format (e.g., "18:00")
 * @returns {JSX.Element} Action card element
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
