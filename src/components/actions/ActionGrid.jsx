import Action from "./Action";
import "./Actions.css";

function ActionGrid({ actions, onEdit }) {
    return (
        <div className="actions-grid">
            {actions.map((action, index) => (
                <div key={index} onClick={() => onEdit(index)}>
                    <Action
                        name={action.deviceName}
                        startTime={action.startTime}
                        endTime={action.endTime}
                    />
                </div>
            ))}
        </div>
    );
}

export default ActionGrid;
