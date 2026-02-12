import Action from "./Action.jsx";
import { extractTimeFromISO } from "../Actionslogic.js";

function ActionGrid({ devices, onEdit }) {
    return (
        <div className="actions-grid">
            {devices.map((device, dIdx) =>
                device.actions?.map((action, aIdx) => (
                    <div
                        key={`${device.id}-${action.id || aIdx}`}
                        className="action-card-wrapper"
                        onClick={() => onEdit(dIdx, aIdx)}
                    >
                        <Action
                            name={device.name}
                            startTime={extractTimeFromISO(action.start || action.startTime)}
                            endTime={extractTimeFromISO(action.end || action.endTime)}
                        />
                    </div>
                ))
            )}
        </div>
    );
}

export default ActionGrid;