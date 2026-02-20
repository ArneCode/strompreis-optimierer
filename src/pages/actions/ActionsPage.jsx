/**
 * ActionsPage
 * Manage device actions (scheduled tasks). Users can create, edit, and delete actions.
 * Provides time-range selection and validation.
 */
import React, { useState, useMemo, useEffect, useCallback } from "react";
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
    extractTimeFromISO, roundTimeToNearest5
} from "./Actionslogic";

import "../../styles/pages/Actions.css";
import "../../styles/components/Slider.css";

const MODAL_MODES = {
    CREATE: 'create',
    EDIT: 'edit',
    CLOSED: null
};



function ActionsPage() {
    const [devices, setDevices] = useState([]);
    const [referenceTime] = useState(roundToNext5Min(new Date()));
    const [modalMode, setModalMode] = useState(MODAL_MODES.CLOSED);
    const [editIndex, setEditIndex] = useState({ deviceIndex: null, actionIndex: null });
    const [actionErrors, setActionErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState("");
    const [actionForm, setActionForm] = useState({
        deviceId: "", startTime: "", endTime: "",
        duration: "", consumption: "", totalConsumption: ""
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const timeOffset = useMemo(() =>
            referenceTime.getHours() * 60 + referenceTime.getMinutes(),
        [referenceTime]);

    useEffect(() => {
        let timer;
        if (errorMessage) {
            timer = setTimeout(() => setErrorMessage(""), 3000);
        }
        return () => clearTimeout(timer);
    }, [errorMessage]);

    const refreshData = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await apiService.fetchDevices();
            setDevices(data);
        } catch (error) {
            console.error("Fehler beim Laden der Geräte:", error);
            setErrorMessage("Fehler beim Laden der Geräte.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { refreshData(); }, [refreshData]);

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

    // AI
    const handleTimeBlur = (e) => {
        const { name, value } = e.target;
        if (name !== 'startTime' && name !== 'endTime') return;
        const rounded = roundTimeToNearest5(value);
        setActionForm(prev => ({ ...prev, [name]: rounded }));
    };

    const handleOpenCreate = () => {
        setActionForm({
            deviceId: "",
            startTime: getCurrentTimeStr(),
            endTime: sliderToTime(1435, timeOffset),
            duration: "", consumption: "", totalConsumption: ""
        });
        setActionErrors({});
        setErrorMessage("");
        setModalMode(MODAL_MODES.CREATE);
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
        setErrorMessage("");
        setModalMode(MODAL_MODES.EDIT);
    };

    const closeModal = () => {
        setModalMode(MODAL_MODES.CLOSED);
        setErrorMessage("");
    };

    const saveAction = async (isEdit = false) => {
        const errors = validateActionForm(actionForm, devices, timeOffset, isEdit);
        if (Object.keys(errors).length > 0) {
            setActionErrors(errors);
            setErrorMessage("Bitte alle Felder prüfen!");
            return;
        }

        setIsLoading(true);
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
                try {
                    await apiService.deleteAction(device.id, oldAction.id);
                } catch (err) {
                    console.error("Error deleting old action:", err);
                    setErrorMessage("Löschen der alten Aktion fehlgeschlagen.");
                    setIsLoading(false);
                    return;
                }
                await apiService.createAction(device.id, payload);
            } else {
                await apiService.createAction(selectedDevice.id, payload);
            }

            await refreshData();
            closeModal();
        } catch (error) {
            console.error("API Fehler beim Speichern:", error);
            setErrorMessage("Speichern fehlgeschlagen.");
        } finally {
            setIsLoading(false);
        }
    };

    const removeAction = async () => {
        // Protection vor Doppelklicks
        if (isDeleting) return;

        setIsDeleting(true);
        try {
            const device = devices[editIndex.deviceIndex];
            const action = device.actions[editIndex.actionIndex];
            await apiService.deleteAction(device.id, action.id);
            await refreshData();
            closeModal();
        } catch (error) {
            console.error("API Fehler beim Löschen:", error);
            setErrorMessage("Löschen fehlgeschlagen.");
        } finally {
            setIsDeleting(false);
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
                isOpen={modalMode !== MODAL_MODES.CLOSED}
                isEdit={modalMode === MODAL_MODES.EDIT}
                onClose={closeModal}
                onSave={saveAction}
                onDelete={removeAction}
                errorMessage={errorMessage}
                isLoading={isLoading}
                isDeleting={isDeleting}
                actionForm={actionForm}
                onChange={handleActionChange}
                devices={devices}
                errors={actionErrors}
                sliderToTime={(val) => sliderToTime(val, timeOffset)}
                timeToSlider={(val) => timeToSlider(val, timeOffset)}
                startLabel={getDateLabel(actionForm.startTime, timeOffset)}
                endLabel={getDateLabel(actionForm.endTime, timeOffset)}
                currentTimeStr={getCurrentTimeStr()}
                onTimeBlur={handleTimeBlur}
             />
         </div>
     );
 }

 export default ActionsPage;
