import Action from "./Action.jsx";
import "../../styles/pages/Actions.css";
import { extractTimeFromISO } from "./Actionslogic.js";

function ActionGrid({ devices, onEdit }) {
    return (
        <div className="actions-grid">
            {devices.map((device, deviceIndex) =>
                device.actions?.map((action, actionIndex) => {
                    const displayStart = extractTimeFromISO(action.startTime || action.start);
                    const displayEnd = extractTimeFromISO(action.endTime || action.end);

                    return (
                        <div
                            key={`${deviceIndex}-${actionIndex}`}
                            className="action-card"
                            onClick={() => onEdit(deviceIndex, actionIndex)}
                        >
                            <Action
                                name={device.name}
                                startTime={displayStart}
                                endTime={displayEnd}
                            />
                        </div>
                    );
                })
            )}
        </div>
    );
}

export default ActionGrid;