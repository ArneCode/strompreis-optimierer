import React, { useState, useMemo, useEffect } from "react";
import ActionGrid from "./components/ActionGrid.jsx";
import ActionModal from "./ActionModal";
import apiService from "../../services/apiService";
import plusIcon from "../../assets/images/plus.png";
import {
    roundToNext5Min,
    validateActionForm,
    timeToSlider,
    sliderToTime,
    getCurrentTimeStr,
    getDateLabel,
    combineToISO,
    extractTimeFromISO
} from "./Actionslogic";

import "../../styles/pages/Actions.css";
import "../../styles/components/Slider.css";



function ActionsPage() {
    const [devices, setDevices] = useState([]);
    const [referenceTime] = useState(roundToNext5Min(new Date()));
    const [modalMode, setModalMode] = useState(null);
    const [editIndex, setEditIndex] = useState({ deviceIndex: null, actionIndex: null });
    const [actionErrors, setActionErrors] = useState({});
    const [actionForm, setActionForm] = useState({
        deviceId: "", startTime: "", endTime: "",
        duration: "", consumption: "", totalConsumption: ""
    });

    const timeOffset = useMemo(() =>
            referenceTime.getHours() * 60 + referenceTime.getMinutes(),
        [referenceTime]);

    const refreshData = async () => {
        try {
            const data = await apiService.fetchDevices();
            setDevices(data);
        } catch (error) {
            console.error("Fehler beim Laden der Geräte:", error);
        }
    };

    useEffect(() => { refreshData(); }, []);

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

    const handleOpenCreate = () => {
        setActionForm({
            deviceId: "",
            startTime: getCurrentTimeStr(),
            endTime: sliderToTime(1435, timeOffset),
            duration: "", consumption: "", totalConsumption: ""
        });
        setActionErrors({});
        setModalMode('create');
    };

    const handleOpenEdit = (dIdx, aIdx) => {
        const device = devices[dIdx];
        const action = device.actions[aIdx];

        setEditIndex({ deviceIndex: dIdx, actionIndex: aIdx });
        setActionForm({
            deviceId: device.id,
            startTime: extractTimeFromISO(action.start || action.start_from),
            endTime: extractTimeFromISO(action.end || action.end_before),
            duration: action.duration || "",
            totalConsumption: action.totalConsumption || action.total_consumption || "",
            consumption: action.consumption || action.maxConsumption || ""
        });
        setActionErrors({});
        setModalMode('edit');
    };

    const closeModal = () => setModalMode(null);

    const saveAction = async (isEdit = false) => {
        const errors = validateActionForm(actionForm, devices, timeOffset, isEdit);
        if (Object.keys(errors).length > 0) {
            setActionErrors(errors);
            return;
        }

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
            } else {
                await apiService.createAction(selectedDevice.id, payload);
            }

            closeModal();
            await refreshData();
        } catch (error) {
            console.error("API Fehler beim Speichern:", error);
        }
    };

    const removeAction = async () => {
        try {
            const device = devices[editIndex.deviceIndex];
            const action = device.actions[editIndex.actionIndex];
            await apiService.deleteAction(device.id, action.id);
            closeModal();
            await refreshData();
        } catch (error) {
            console.error("API Fehler beim Löschen:", error);
        }
    };

    return (
        <div className="action">
            <header className="action-head">
                <h1>Aktionen</h1>
                <button className="new-action-button" onClick={handleOpenCreate}>
                    <img src={plusIcon} alt="plus" className="new-device-plus-image" />
                    Neue Aktion
                </button>
            </header>

            <ActionGrid
                devices={devices}
                onEdit={handleOpenEdit}
            />

            <ActionModal
                isOpen={!!modalMode}
                isEdit={modalMode === 'edit'}
                onClose={closeModal}
                onSave={saveAction}
                onDelete={removeAction}
                actionForm={actionForm}
                onChange={handleActionChange}
                devices={devices}
                errors={actionErrors}
                sliderToTime={(val) => sliderToTime(val, timeOffset)}
                timeToSlider={(val) => timeToSlider(val, timeOffset)}
                startLabel={getDateLabel(actionForm.startTime, timeOffset)}
                endLabel={getDateLabel(actionForm.endTime, timeOffset)}
                currentTimeStr={getCurrentTimeStr()}
            />
        </div>
    );
}

export default ActionsPage;