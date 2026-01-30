import "../../styles/pages/Actions.css";
import "../../styles/components/Slider.css"
import { useState, useMemo } from "react";
import ActionGrid from "./ActionGrid.jsx";
import ActionForm from "./ActionForm.jsx";

const roundToNext5Min = (date) => {
    const rounded = new Date(date);
    const mins = rounded.getMinutes();
    const roundedMins = Math.ceil(mins / 5) * 5;
    rounded.setMinutes(roundedMins);
    rounded.setSeconds(0);
    rounded.setMilliseconds(0);
    return rounded;
};

function Actions({ devices, setDevices }) {
    const [referenceTime] = useState(roundToNext5Min(new Date()));

    const timeOffset = useMemo(() => {
        return referenceTime.getHours() * 60 + referenceTime.getMinutes();
    }, [referenceTime]);

    const [actionForm, setActionForm] = useState({
        deviceName: "",
        startTime: "",
        endTime: "",
        duration: ""
    });

    const [actionErrors, setActionErrors] = useState({});
    const [openCreateAction, setOpenCreateAction] = useState(false);
    const [openEditAction, setOpenEditAction] = useState(false);
    const [editIndex, setEditIndex] = useState({ deviceIndex: null, actionIndex: null });


    const sliderToTime = (sliderMins) => {
        const totalMins = (sliderMins + timeOffset) % 1440;
        const h = Math.floor(totalMins / 60);
        const m = totalMins % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    const timeToSlider = (timeStr) => {
        if (!timeStr) return 0;
        const [h, m] = timeStr.split(':').map(Number);
        let diff = (h * 60 + m) - timeOffset;
        if (diff < 0) diff += 1440;
        return diff;
    };

    const getCurrentTimeStr = () => {
        return roundToNext5Min(new Date()).toTimeString().slice(0, 5);
    };

    const getDateLabel = (timeStr) => {
        if (!timeStr) return "";
        const sliderPos = timeToSlider(timeStr);
        const minsUntilMidnight = 1440 - timeOffset;
        return sliderPos >= minsUntilMidnight ? "(Morgen)" : "(Heute)";
    };


    const handleActionChange = (e) => {
        const { name, value } = e.target;

        const newStartTime = name === 'startTime' ? value : actionForm.startTime;
        const newEndTime = name === 'endTime' ? value : actionForm.endTime;
        const newDuration = name === 'duration' ? Number(value) : Number(actionForm.duration);

        const startMins = timeToSlider(newStartTime);
        const endMins = timeToSlider(newEndTime);
        const windowSize = endMins - startMins;

        if (name === 'startTime' || name === 'endTime') {
            if (endMins <= startMins) {
                setActionErrors(prev => ({ ...prev, [name]: "Überschreitung!" }));
                return;
            }
        }

        setActionForm(prev => ({ ...prev, [name]: value }));

        if (windowSize < newDuration) {
            setActionErrors(prev => ({
                ...prev,
                duration: "Dauer passt nicht ins Fenster!",
                startTime: "Zeitfenster zu klein",
                endTime: "Zeitfenster zu klein"
            }));
        } else {
            setActionErrors(prev => ({
                ...prev,
                startTime: undefined,
                endTime: undefined,
                duration: undefined
            }));
        }
    };


    const toggleCreateActionPopup = () => {
        if (!openCreateAction) {
            const start = getCurrentTimeStr();
            // Endzeit auf einen sauberen 5-Minuten-Wert (z.B. 1435 Min = 23:55 relativ)
            const end = sliderToTime(1435);

            setActionForm({
                deviceName: "",
                startTime: start,
                endTime: end,
                duration: ""
            });
            setActionErrors({});
        }
        setOpenCreateAction(!openCreateAction);
    };

    const validateFinal = (form) => {
        const errors = {};
        if (!form.deviceName && !openEditAction) errors.deviceName = "Pflichtfeld";
        if (!form.duration || Number(form.duration) <= 0) errors.duration = "Ungültig";

        return errors;
    };

    const addAction = () => {
        const errors = validateFinal(actionForm);
        if (Object.keys(errors).length > 0) {
            setActionErrors(errors);
            return;
        }
        setDevices(prev => prev.map(d => d.name === actionForm.deviceName ?
            { ...d, actions: [...d.actions, { ...actionForm }] } : d));
        toggleCreateActionPopup();
    };

    const editAction = () => {
        const errors = validateFinal(actionForm);
        if (Object.keys(errors).length > 0) {
            setActionErrors(errors);
            return;
        }
        const { deviceIndex, actionIndex } = editIndex;
        setDevices(prev => prev.map((d, di) => di === deviceIndex ?
            { ...d, actions: d.actions.map((a, ai) => ai === actionIndex ? { ...actionForm } : a) } : d));
        setOpenEditAction(false);
    };

    const removeAction = () => {
        const { deviceIndex, actionIndex } = editIndex;
        setDevices(prev => prev.map((d, di) => di === deviceIndex ?
            { ...d, actions: d.actions.filter((_, ai) => ai !== actionIndex) } : d));
        setOpenEditAction(false);
    };

    return (
        <div className="action">
            <div className="action-head"><h1>Aktionen</h1></div>
            <button
                className="new-action-button"
                onClick={toggleCreateActionPopup}
            >
                <img className="new-device-plus-image" src="./src/assets/plus.png" alt="plus" />
                Neue Aktion
            </button>

            <ActionGrid
                devices={devices}
                onEdit={(dIdx, aIdx) => {
                    setEditIndex({ deviceIndex: dIdx, actionIndex: aIdx });
                    setActionForm(devices[dIdx].actions[aIdx]);
                    setOpenEditAction(true);
                }}
            />

            {openCreateAction && (
                <div className="create-action-popup">
                    <div className="action-popup-window">
                        <p className="action-popup-header">Aktion erstellen</p>
                        <ActionForm
                            actionForm={actionForm}
                            onChange={handleActionChange}
                            devices={devices}
                            errors={actionErrors}
                            sliderToTime={sliderToTime}
                            timeToSlider={timeToSlider}
                            startLabel={getDateLabel(actionForm.startTime)}
                            endLabel={getDateLabel(actionForm.endTime)}
                            currentTimeStr={getCurrentTimeStr()}
                        />
                        <div className="action-popup-buttons">
                            <button onClick={toggleCreateActionPopup}>Abbrechen</button>
                            <button className="actions-save-button" onClick={addAction}>Erstellen</button>
                        </div>
                    </div>
                </div>
            )}

            {openEditAction && (
                <div className="edit-action-popup">
                    <div className="edit-action-popup-window">
                        <p className="action-popup-header">Aktion bearbeiten</p>
                        <ActionForm
                            actionForm={actionForm}
                            onChange={handleActionChange}
                            devices={devices}
                            isEdit={true}
                            errors={actionErrors}
                            sliderToTime={sliderToTime}
                            timeToSlider={timeToSlider}
                            startLabel={getDateLabel(actionForm.startTime)}
                            endLabel={getDateLabel(actionForm.endTime)}
                            currentTimeStr={getCurrentTimeStr()}
                        />
                        <div className="action-popup-buttons">
                            <button onClick={removeAction}>Löschen</button>
                            <button className="actions-save-button" onClick={editAction}>Speichern</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Actions;