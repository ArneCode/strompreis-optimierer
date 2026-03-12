import Action from "./Action.jsx";
import { extractTimeFromISO } from "../Actionslogic.js";

/**
 * Grid layout for action cards - displays all actions from all devices.
 * Each card is clickable to edit the action.
 * @param {object} props
 * @param {Array} props.devices - Array of device objects with actions
 * @param {number} props.devices[].id - Device ID
 * @param {string} props.devices[].name - Device name for card display
 * @param {Array} props.devices[].actions - Array of action objects
 * @param {Function} props.onEdit - Callback(deviceIndex, actionIndex) when card clicked
 * @returns {JSX.Element} Grid container with action cards
 */
function ActionGrid({ devices, onEdit }) {
    return (
        <div className="actions-grid" data-testid="actions-grid">
            {devices.map((device, dIdx) =>
                device.actions?.map((action, aIdx) => {
                    const actionId = action.id ?? aIdx;

                    return (
                        <div
                            key={`${device.id}-${actionId}`}
                            className="action-card-wrapper"
                            onClick={() => onEdit(dIdx, aIdx)}
                            data-testid={`action-card-${device.id}-${actionId}`}
                            role="button"
                            tabIndex={0}
                        >
                            <Action
                                name={device.name}
                                startTime={extractTimeFromISO(action.start || action.startTime)}
                                endTime={extractTimeFromISO(action.end || action.endTime)}
                            />
                        </div>
                    );
                })
            )}
        </div>
    );
}

export default ActionGrid;