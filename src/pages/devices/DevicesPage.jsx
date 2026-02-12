import React, { useEffect, useState, useCallback } from 'react';
import Device from './components/Device.jsx';
import DeviceModal from './DeviceModal';
import apiService from "../../services/apiService";
import plusIcon from "../../assets/images/plus.png";
import { INITIAL_DEVICE_FORM, validateDevice } from './DevicesLogic';
import '../../styles/pages/Devices.css';

const MODAL_MODES = {
    CREATE: 'create',
    EDIT: 'edit',
    CLOSED: null
};

function DevicesPage() {
    const [devices, setDevices] = useState([]);
    const [modalMode, setModalMode] = useState(MODAL_MODES.CLOSED);
    const [deviceForm, setDeviceForm] = useState(INITIAL_DEVICE_FORM);
    const [deviceErrors, setDeviceErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState("");
    const [editIndex, setEditIndex] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        let timer;
        if (errorMessage) {
            timer = setTimeout(() => setErrorMessage(""), 3000);
        }
        return () => clearTimeout(timer);
    }, [errorMessage]);

    const refreshDevices = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await apiService.fetchDevices();
            setDevices(data);
        } catch (error) {
            setErrorMessage("Fehler beim Laden.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { refreshDevices(); }, [refreshDevices]);

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setDeviceForm(prev => ({ ...prev, [name]: value }));
        setDeviceErrors(prev => ({ ...prev, [name]: undefined }));
    };

    const openCreate = () => {
        setDeviceForm(INITIAL_DEVICE_FORM);
        setDeviceErrors({});
        setModalMode(MODAL_MODES.CREATE);
    };

    const handleDeviceClick = (index) => {
        const device = devices[index];
        setEditIndex(index);
        setDeviceForm({ ...INITIAL_DEVICE_FORM, ...device });
        setDeviceErrors({});
        setModalMode(MODAL_MODES.EDIT);
    };

    const closeModal = () => {
        setModalMode(MODAL_MODES.CLOSED);
        setErrorMessage("");
    };

    const saveDevice = async (isEdit) => {
        const errors = validateDevice(deviceForm);
        if (Object.keys(errors).length > 0) {
            setDeviceErrors(errors);
            setErrorMessage("Bitte alle Felder prüfen!");
            return;
        }

        setIsLoading(true);
        try {
            if (isEdit) {
                try {
                    await apiService.deleteDevice(devices[editIndex].id);
                } catch (error) {
                    setErrorMessage("Löschen des alten Gerätes fehlgeschlagen.");
                    setIsLoading(false);
                    return;
                }
            }

            try {
                // ID entfernen beim Speichern, damit Backend neue ID generiert
                const { id, ...deviceDataWithoutId } = deviceForm;
                await apiService.saveDevice(deviceDataWithoutId);
                await refreshDevices();
                closeModal();
            } catch (error) {
                setErrorMessage("Speichern fehlgeschlagen.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const deleteDevice = async () => {
        if (isDeleting) return;

        const deviceId = devices[editIndex]?.id || deviceForm.id;

        if (!deviceId) {
            setErrorMessage("Keine Geräte-ID gefunden.");
            return;
        }

        setIsDeleting(true);
        try {
            await apiService.deleteDevice(deviceId);
            await refreshDevices();
            closeModal();
        } catch (error) {
            setErrorMessage("Löschen fehlgeschlagen.");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="devices-page">
            <div className="devices-head">
                <p>Geräte</p>
                <button className="new-device-button" onClick={openCreate}>
                    <img className="new-device-plus-image" src={plusIcon} alt="+" />
                    Neues Gerät
                </button>
            </div>

            <div className="devices-grid">
                {devices.map((dev, idx) => (
                    <div key={dev.id || idx} onClick={() => handleDeviceClick(idx)}>
                        <Device type={dev.type} name={dev.name} />
                    </div>
                ))}
            </div>

            <DeviceModal
                isOpen={modalMode !== MODAL_MODES.CLOSED}
                isEdit={modalMode === MODAL_MODES.EDIT}
                onClose={closeModal}
                onSave={saveDevice}
                onDelete={deleteDevice}
                errorMessage={errorMessage}
                deviceForm={deviceForm}
                onChange={handleFormChange}
                errors={deviceErrors}
                isLoading={isLoading}
                isDeleting={isDeleting}
            />
        </div>
    );
}

export default DevicesPage;