import ActionsPage from "./ActionsPage.jsx";
import "../../styles/pages/Actions.css";

function ActionGrid({ devices, onEdit }) {
    return (
        <div className="actions-grid">
            {devices.map((device, deviceIndex) =>
                device.actions?.map((action, actionIndex) => (
                    <div
                        key={`${deviceIndex}-${actionIndex}`}
                        className="action-card"
                        onClick={() => onEdit(deviceIndex, actionIndex)}
                    >
                        <ActionsPage
                            name={device.name}
                            startTime={action.startTime}
                            endTime={action.endTime}
                        />
                    </div>
                ))
            )}
        </div>
    );
}

export default ActionGrid;
