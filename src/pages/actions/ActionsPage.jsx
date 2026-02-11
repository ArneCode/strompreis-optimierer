import "../../styles/pages/Actions.css";
import "../../styles/components/Slider.css";
import {useState, useMemo, useEffect} from "react";
import ActionGrid from "./ActionGrid.jsx";
import ActionForm from "./ActionForm.jsx";
import {
    roundToNext5Min,
    validateActionForm,
    timeToSlider,
    sliderToTime,
    getCurrentTimeStr,
    getDateLabel,
    combineToISO,
    extractTimeFromISO
} from "./Actionslogic.js"
import apiService from "../../services/apiService.js";

function ActionsPage() {
    const [referenceTime] = useState(roundToNext5Min(new Date()));
    const timeOffset = useMemo(() => referenceTime.getHours() * 60 + referenceTime.getMinutes(), [referenceTime]);
    const [devices, setDevices] = useState([]);

    const refreshData = async () => {
        try {
            const data = await apiService.fetchDevices();
            setDevices(data);
        } catch (error) {
            console.error("Fehler beim Laden:", error);
        }
    };

    useEffect(() => { refreshData(); }, []);

    const [actionForm, setActionForm] = useState({
        deviceId: "",
        startTime: "",
        endTime: "",
        duration: "",
        consumption: "",
        totalConsumption: ""
    });

    const [actionErrors, setActionErrors] = useState({});
    const [openCreateAction, setOpenCreateAction] = useState(false);
    const [openEditAction, setOpenEditAction] = useState(false);
    const [editIndex, setEditIndex] = useState({ deviceIndex: null, actionIndex: null });

    const handleActionChange = (e) => {
        const { name, value } = e.target;
        setActionForm(prev => {
            const updated = { ...prev, [name]: value };
            const selectedDevice = devices.find(d => String(d.id) === String(updated.deviceId));
            const isVariable = selectedDevice?.flexibility === "variable";
            const startMins = timeToSlider(updated.startTime, timeOffset);
            const endMins = timeToSlider(updated.endTime, timeOffset);
            let newErrors = { ...actionErrors };
            if (endMins <= startMins) newErrors.startTime = "Ungültig"; else delete newErrors.startTime;
            if (!isVariable && updated.duration && (endMins - startMins) < Number(updated.duration)) {
                newErrors.duration = "Zeitfenster zu klein";
            } else {
                delete newErrors.duration;
            }

            setActionErrors(newErrors);
            return updated;
        });
    };

    const toggleCreateActionPopup = () => {
        if (!openCreateAction) {
            setActionForm({
                deviceId: "",
                startTime: getCurrentTimeStr(),
                endTime: sliderToTime(1435, timeOffset),
                duration: "", consumption: "", totalConsumption: ""
            });
            setActionErrors({});
        }
        setOpenCreateAction(!openCreateAction);
    };

    const saveAction = async (isEdit = false) => {
        const errors = validateActionForm(actionForm, devices, timeOffset, isEdit);
        if (Object.keys(errors).length > 0) { setActionErrors(errors); return; }

        try {
            const selectedDevice = devices.find(d => String(d.id) === String(actionForm.deviceId));
            const isVariable = selectedDevice?.flexibility === "variable";

            const payload = {
                start: combineToISO(actionForm.startTime, timeOffset),
                end: combineToISO(actionForm.endTime, timeOffset),
                consumption: Number(actionForm.consumption)
            };

            if (isVariable) {
                payload.total_consumption = Number(actionForm.totalConsumption);
            } else {
                payload.duration_minutes = Number(actionForm.duration);
            }

            if (isEdit) {
                const device = devices[editIndex.deviceIndex];
                const oldAction = device.actions[editIndex.actionIndex];
                await apiService.deleteAction(device.id, oldAction.id);
                await apiService.createAction(device.id, payload);
                setOpenEditAction(false);
            } else {
                await apiService.createAction(selectedDevice.id, payload);
                toggleCreateActionPopup();
            }
            await refreshData();
        } catch (error) { console.error("API Fehler:", error); }
    };

    const removeAction = async () => {
        const device = devices[editIndex.deviceIndex];
        const action = device.actions[editIndex.actionIndex];
        await apiService.deleteAction(device.id, action.id);
        setOpenEditAction(false);
        await refreshData();
    };

    return (
        <div className="action">
            <div className="action-head">
                <h1>Aktionen</h1>
                <button className="new-action-button" onClick={toggleCreateActionPopup}>
                    <img className="new-device-plus-image" src="./src/assets/plus.png" alt="plus"/> Neue Aktion
                </button>
            </div>

            <ActionGrid
                devices={devices}
                onEdit={(dIdx, aIdx) => {
                    const device = devices[dIdx];
                    const action = device.actions[aIdx];
                    setEditIndex({ deviceIndex: dIdx, actionIndex: aIdx });

                    setActionForm({
                        deviceId: device.id,
                        startTime: extractTimeFromISO(action.start),
                        endTime: extractTimeFromISO(action.end),
                        duration: action.duration_minutes || "",
                        consumption: action.consumption || "",
                        totalConsumption: action.total_consumption || ""
                    });
                    setActionErrors({});
                    setOpenEditAction(true);
                }}
            />

            {openCreateAction && (
                <div className="create-action-popup">
                    <div className="action-popup-window">
                        <p className="action-popup-header">Aktion erstellen</p>
                        <ActionForm
                            actionForm={actionForm} onChange={handleActionChange} devices={devices} errors={actionErrors}
                            sliderToTime={(val) => sliderToTime(val, timeOffset)} timeToSlider={(val) => timeToSlider(val, timeOffset)}
                            startLabel={getDateLabel(actionForm.startTime, timeOffset)} endLabel={getDateLabel(actionForm.endTime, timeOffset)}
                            currentTimeStr={getCurrentTimeStr()}
                        />
                        <div className="action-popup-buttons">
                            <button onClick={toggleCreateActionPopup}>Abbrechen</button>
                            <button className="actions-save-button" onClick={() => saveAction(false)}>Erstellen</button>
                        </div>
                    </div>
                </div>
            )}

            {openEditAction && (
                <div className="edit-action-popup">
                    <div className="edit-action-popup-window">
                        <p className="action-popup-header">Aktion bearbeiten</p>
                        <ActionForm
                            actionForm={actionForm} onChange={handleActionChange} devices={devices} isEdit={true} errors={actionErrors}
                            sliderToTime={(val) => sliderToTime(val, timeOffset)} timeToSlider={(val) => timeToSlider(val, timeOffset)}
                            startLabel={getDateLabel(actionForm.startTime, timeOffset)} endLabel={getDateLabel(actionForm.endTime, timeOffset)}
                            currentTimeStr={getCurrentTimeStr()}
                        />
                        <div className="action-popup-buttons">
                            <button className="actions-edit-delete-button" onClick={removeAction}>Löschen</button>
                            <button onClick={() => setOpenEditAction(false)}>Abbrechen</button>
                            <button className="actions-save-button" onClick={() => saveAction(true)}>Speichern</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ActionsPage;