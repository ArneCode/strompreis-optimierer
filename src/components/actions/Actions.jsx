import "./Actions.css";
import { useState } from "react";
import ActionGrid from "./ActionGrid";

function Actions() {
    const [actions, setActions] = useState([
        { name: "Waschmaschine", type: "Konstant" },
        { name: "E-Auto laden", type: "Flexibel" }
    ]);


    const devices = [
        { id: 1, name: "Waschmaschine" },
        { id: 2, name: "E-Auto" },
    ];

    const [actionForm, setActionForm] = useState({
        deviceName: "",
        type: "konstant",
        duration: "",
        startTime: "",
        endTime: "",
        consumptionPerTime: ""
    });





    const [openCreateAction, setOpenCreateAction] = useState(false);
    const [openEditAction, setOpenEditAction] = useState(false);
    const [editIndex, setEditIndex] = useState(null);

    function toggleEditActionPopUp(index) {
        setEditIndex(index);
        setOpenEditAction(true);
    }





    function toggleCreateActionPopup() {
        setOpenCreateAction(!openCreateAction);
    }

    function addAction() {
        const newAction = {
            deviceName: actionForm.deviceName,
            type: actionForm.type,
            duration: actionForm.duration,
            startTime: actionForm.startTime,
            endTime: actionForm.endTime,
            consumptionPerTime: actionForm.consumptionPerTime,
        }

        setActions([...actions, newAction]);

    }

    return (
        <div className="action">
            <div className="action-head">
                <h1>Aktionen</h1>
            </div>

            <button className="new-action-button" onClick={toggleCreateActionPopup}>
                <img className="new-action-plus-image" src="./src/assets/plus.png"/>

                Aktion hinzufügen
            </button>







            {openCreateAction &&
                <div className="create-action-popup">
                    <div className="action-popup-window">
                        <p className="action-popup-header">
                            Aktion erstellen
                        </p>
                        <div
                            className="action-popup-inputs"
                        >

                            <select className="action-device-select">
                                {devices.map((device) => (
                                    <option key={device.id} value={device.name}>
                                        {device.name}
                                    </option>
                                ))}
                            </select>
                            <input/>
                            <input/>
                            <input/>
                            <input/>



                        </div>
                        <div className="action-popup-buttons">
                            <button
                                className="actions-create-cancel-button"
                                onClick={() => {
                                    toggleCreateActionPopup();
                                }}
                            >
                                Abbrechen
                            </button>
                            <button
                                className="actions-save-button"
                                onClick={addAction}
                            >
                                Weiter
                            </button>
                        </div>
                    </div>
                </div>
            }

            <ActionGrid
                actions={actions}
                onEdit={toggleEditActionPopUp}
            />
            {openEditAction && (
                <div className="edit-action-popup">
                    <div className="action-popup-window">
                        <h3>Aktion bearbeiten</h3>

                        <p>{actions[editIndex].name}</p>

                        <div className="action-popup-buttons">
                            <button
                                className="actions-save-button"
                                onClick={() => setOpenEditAction(false)}
                            >
                                Speichern
                            </button>

                            <button
                                className="actions-delete-button"
                                onClick={() => setOpenEditAction(false)}
                            >
                                Löschen
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default Actions;
