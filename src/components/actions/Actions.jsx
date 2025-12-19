import "./Actions.css";
import { useState } from "react";
import ActionGrid from "./ActionGrid";

function Actions({devices, setDevices}) {


    const [actionForm, setActionForm] = useState({
        startTime: "",
        endTime: "",
    });

    const [openCreateAction, setOpenCreateAction] = useState(false);
    const [openEditAction, setOpenEditAction] = useState(false);
    const [editIndex, setEditIndex] = useState({ deviceIndex: null, actionIndex: null });

    const toggleCreateActionPopup = () => {
        setOpenCreateAction(!openCreateAction);
        setActionForm({ deviceName: "", startTime: "", endTime: "" });
    };

    const toggleEditActionPopUp = () => setOpenEditAction(!openEditAction);

    const addAction = () => {
        if (!actionForm.deviceName) return;

        setDevices(prev =>
            prev.map((device) =>
                device.name === actionForm.deviceName
                    ? {
                        ...device,
                        actions: [
                            ...device.actions,
                            {
                                startTime: actionForm.startTime,
                                endTime: actionForm.endTime,
                            },
                        ],
                    }
                    : device
            )
        );

        toggleCreateActionPopup();
    };

    const editAction = () => {
        const { deviceIndex, actionIndex } = editIndex;
        if (deviceIndex === null || actionIndex === null) return;

        setDevices(prev =>
            prev.map((device, dIdx) =>
                dIdx === deviceIndex
                    ? {
                        ...device,
                        actions: device.actions.map((action, aIdx) =>
                            aIdx === actionIndex
                                ? { startTime: actionForm.startTime, endTime: actionForm.endTime }
                                : action
                        ),
                    }
                    : device
            )
        );

        toggleEditActionPopUp();
    };

    const removeAction = () => {
        const { deviceIndex, actionIndex } = editIndex;
        if (deviceIndex === null || actionIndex === null) return;

        setDevices(prev =>
            prev.map((device, dIdx) =>
                dIdx === deviceIndex
                    ? {
                        ...device,
                        actions: device.actions.filter((_, aIdx) => aIdx !== actionIndex),
                    }
                    : device
            )
        );

        toggleEditActionPopUp();
    };

    return (
        <div className="action">
            <div className="action-head">
                <h1>Aktionen</h1>
            </div>

            <button className="new-action-button" onClick={toggleCreateActionPopup}>
                <img className="new-action-plus-image" src="./src/assets/plus.png" />
                Aktion hinzufügen
            </button>

            {openCreateAction && (
                <div className="create-action-popup">
                    <div className="action-popup-window">
                        <p className="action-head">Aktion erstellen</p>
                        <div className="action-popup-inputs">
                            <select
                                className="action-device-select"
                                value={actionForm.deviceName}
                                onChange={(e) => setActionForm({ ...actionForm, deviceName: e.target.value })}
                            >
                                <option value="">-- Gerät auswählen --</option>
                                {devices.map((device, idx) => (
                                    <option key={idx} value={device.name}>
                                        {device.name}
                                    </option>
                                ))}
                            </select>

                            <label>Startzeit:</label>
                            <input
                                type="time"
                                value={actionForm.startTime}
                                onChange={(e) => setActionForm({ ...actionForm, startTime: e.target.value })}
                            />

                            <label>Endzeit:</label>
                            <input
                                type="time"
                                value={actionForm.endTime}
                                onChange={(e) => setActionForm({ ...actionForm, endTime: e.target.value })}
                            />
                        </div>

                        <div className="action-popup-buttons">
                            <button className="actions-create-cancel-button" onClick={toggleCreateActionPopup}>
                                Abbrechen
                            </button>
                            <button className="actions-save-button" onClick={addAction}>
                                Erstellen
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ActionGrid
                devices={devices}
                onEdit={(deviceIndex, actionIndex) => {
                    setEditIndex({ deviceIndex, actionIndex });
                    const action = devices[deviceIndex].actions[actionIndex];
                    setActionForm({
                        deviceName: devices[deviceIndex].name,
                        startTime: action.startTime,
                        endTime: action.endTime,
                    });
                    toggleEditActionPopUp();
                }}
            />

            {openEditAction && editIndex.deviceIndex !== null && editIndex.actionIndex !== null && (
                <div className="edit-action-popup">
                    <div className="action-popup-window">
                        <p className="action-head">Aktion bearbeiten</p>
                        <p className="action-head">{devices[editIndex.deviceIndex]?.name}</p>

                        <div className="action-popup-inputs">
                            <label>Start-Zeitpunkt:</label>
                            <input
                                type="time"
                                value={actionForm.startTime}
                                onChange={(e) => setActionForm({ ...actionForm, startTime: e.target.value })}
                            />

                            <label>End-Zeitpunkt:</label>
                            <input
                                type="time"
                                value={actionForm.endTime}
                                onChange={(e) => setActionForm({ ...actionForm, endTime: e.target.value })}
                            />
                        </div>

                        <div className="action-popup-buttons">
                            <button className="actions-save-button" onClick={editAction}>
                                Speichern
                            </button>
                            <button className="actions-delete-button" onClick={removeAction}>
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
