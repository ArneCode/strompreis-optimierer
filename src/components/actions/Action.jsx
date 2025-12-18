import "./Actions.css";
import "./Actions.css";

function Action({ name, type }) {
    return (
        <div className="action-card">
            <p className="action-name">{name}</p>
            <p className="action-type">{type}</p>
        </div>
    );
}

export default Action;
