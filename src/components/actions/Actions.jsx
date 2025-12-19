import "./Actions.css";
import { useState } from "react";
import ActionGrid from "./ActionGrid";

function Actions() {
    const [actions, setActions] = useState([
        { deviceName: "Waschmaschine", startTime: "10", endTime: "10" },
        { deviceName: "E-Auto laden",startTime: "10", endTime: "10" }
    ]);


    const devices = [
        { id: 1, name: "Waschmaschine" },
        { id: 2, name: "E-Auto" },
    ];

    const [actionForm, setActionForm] = useState({
        deviceId: "",
        startTime: "",
        endTime: "",
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
            startTime: actionForm.startTime,
            endTime: actionForm.endTime,
        }

        setActions([...actions, newAction]);
        toggleCreateActionPopup();


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
                        <p className="action-head">
                            Aktion erstellen
                        </p>
                        <div
                            className="action-popup-inputs"
                        >

                            <select
                                className="action-device-select"
                                value={actionForm.deviceName}
                                onChange={(e) =>
                                    setActionForm({ ...actionForm, deviceName: e.target.value })
                                }
                            >
                                <option value="">-- Gerät auswählen --</option>
                                {devices.map((device) => (
                                    <option key={device.id} value={device.name}>
                                        {device.name}
                                    </option>
                                ))}
                            </select>





                            <label className="action-time">Startzeit:</label>
                            <input
                                type="time"
                                placeholder="Startzeit"
                                value={actionForm.startTime}
                                onChange={(e) =>
                                    setActionForm({ ...actionForm, startTime: e.target.value })
                                }
                            />

                            <label className="action-time">Endzeit:</label>
                            <input
                                type="time"
                                placeholder="Endzeit"
                                value={actionForm.endTime}
                                onChange={(e) =>
                                    setActionForm({ ...actionForm, endTime: e.target.value })
                                }
                            />





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
                        <p className="action-head">Aktion bearbeiten</p>

                        <p className="action-head">{actions[editIndex].deviceName}</p>

                        <div className="action-popup-inputs">



                            <label className="action-time">Startzeit:</label>
                            <input
                                type="time"
                                placeholder="Startzeit"
                                value={actionForm.startTime}
                                onChange={(e) =>
                                    setActionForm({ ...actionForm, startTime: e.target.value })
                                }
                            />

                            <label className="action-time">Endzeit:</label>
                            <input
                                type="time"
                                placeholder="Endzeit"
                                value={actionForm.endTime}
                                onChange={(e) =>
                                    setActionForm({ ...actionForm, endTime: e.target.value })
                                }
                            />

                        </div>

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
